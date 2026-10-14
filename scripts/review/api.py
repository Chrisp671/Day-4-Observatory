"""Fixed-destination, bounded HTTP clients. No PR code or downloaded file execution."""
import base64
import hashlib
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

from contract import Incomplete, opencode_go_family, SCHEMA, require, strict_json


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


MAX_TEXT_BYTES = 600_000
# The provider answers HTTP 400 to requests of 6,994,978 bytes and above and
# has accepted every request under about 6.0 MB — the shape of a 6 MB
# gateway payload limit. Eight 1x PNGs of this app base64-encode to about
# 4.8 MB, leaving room for 600,000 bytes of text.
MAX_REQUEST_BYTES = 6_000_000
# OpenCode Go serves its free-tier models only on the OpenAI-compatible
# chat-completions endpoint; every other approved Go model stays on
# /v1/messages. Membership here never bypasses the contract's allowlist.
OPENCODE_GO_CHAT_MODELS = frozenset({'step-5-preview-free', 'longcat-2.5-preview-free'})
# The free models reason before they answer, and on chat-completions the
# reasoning tokens count against max_tokens; the other adapters keep 12000.
OPENCODE_GO_CHAT_MAX_TOKENS = 32000
# The only provider value a chat-completions diagnostic may echo verbatim.
FINISH_REASON_WORD = re.compile(r'[a-z_]{1,32}')


def provider_error_excerpt(raw, headers):
    text = raw.decode('utf-8', errors='replace')
    for name, value in (headers or {}).items():
        if name.lower() in ('authorization', 'x-api-key', 'x-goog-api-key'):
            for secret in (value, value.removeprefix('Bearer ')):
                if secret:
                    text = text.replace(secret, '[REDACTED]')
    text = re.sub(r'data:[^\s"<>]+', '[IMAGE DATA]', text, flags=re.I)
    text = re.sub(r'https?://[^\s"<>]+', '[URL]', text, flags=re.I)
    text = re.sub(r'Bearer\s+[^\s"<>]+', 'Bearer [REDACTED]', text, flags=re.I)
    text = re.sub(r'(?:sk-|gh[pousr]_)[A-Za-z0-9_-]+', '[REDACTED]', text)
    text = re.sub(r'[A-Za-z0-9+/=_-]{80,}', '[LONG VALUE]', text)
    return ''.join(c if c.isprintable() else ' ' for c in text)[:500]


def request(url, headers=None, data=None, method=None, limit=2_000_000, timeout=60, redirect=False, provider_error=False):
    raw = None if data is None else json.dumps(data).encode()
    req = urllib.request.Request(url, data=raw, headers=headers or {}, method=method)
    try:
        with urllib.request.build_opener(NoRedirect).open(req, timeout=timeout) as response:
            payload = response.read(limit + 1)
            require(len(payload) <= limit, 'API response exceeded its size limit.')
            return payload
    except urllib.error.HTTPError as error:
        if redirect and error.code == 302:
            return error.headers['Location']
        if provider_error:
            excerpt = provider_error_excerpt(error.read(8192), headers)
            kind = ''.join(c if c.isprintable() else ' ' for c in str(error.headers.get('content-type', '')))[:60]
            raise Incomplete(f'Provider request failed (HTTP {error.code}, {kind or "no content-type"}): {excerpt}') from None
        raise Incomplete(f'API request failed (HTTP {error.code}); inspect repository configuration and provider account.') from None
    except (urllib.error.URLError, TimeoutError) as error:
        raise Incomplete('API request timed out or could not connect.') from error


class GitHub:
    def __init__(self, repo, token):
        require(repo == 'Chrisp671/Day-4-Observatory', 'Unexpected repository.')
        require(bool(token), 'GitHub token unavailable.')
        self.repo = repo
        self.prefix = f'https://api.github.com/repos/{repo}'
        self.headers = {'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json',
                        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'day4-review',
                        'Content-Type': 'application/json'}

    def call(self, path, data=None, method=None, accept=None, limit=2_000_000):
        require(path.startswith('/') and not path.startswith('//'), 'Invalid GitHub API path.')
        headers = dict(self.headers)
        if accept:
            headers['Accept'] = accept
        raw = request(self.prefix + path, headers, data, method, limit)
        return raw.decode('utf-8') if accept else strict_json(raw)

    def pages(self, path, key=None, max_pages=10):
        result = []
        for page in range(1, max_pages + 1):
            separator = '&' if '?' in path else '?'
            response = self.call(f'{path}{separator}per_page=100&page={page}')
            batch = response[key] if key else response
            require(type(batch) is list, 'Invalid GitHub list response.')
            result.extend(batch)
            if len(batch) < 100:
                return result
        raise Incomplete('GitHub pagination limit reached; review a smaller change.')

    def file(self, path, ref):
        content = self.call(f'/contents/{urllib.parse.quote(path, safe="/")}?ref={ref}')
        require(content.get('type') == 'file' and content.get('encoding') == 'base64'
                and content.get('size', 1_000_000) <= 300_000, 'Source file unavailable or too large.')
        try:
            return base64.b64decode(content['content']).decode('utf-8')
        except (ValueError, UnicodeError) as error:
            raise Incomplete('Source context contains a non-text file.') from error

    def artifact(self, run_id):
        artifacts = self.pages(f'/actions/runs/{run_id}/artifacts', 'artifacts')
        matching = [a for a in artifacts if a['name'] == 'web-review-evidence']
        require(len(matching) == 1 and not matching[0]['expired'], 'Screenshot artifact missing or expired.')
        artifact = matching[0]
        require(artifact['size_in_bytes'] <= 16 * 1024 * 1024, 'Screenshot artifact too large.')
        location = request(self.prefix + f'/actions/artifacts/{int(artifact["id"])}/zip', self.headers, redirect=True)
        require(type(location) is str, 'Artifact download did not return a signed redirect.')
        url = urllib.parse.urlsplit(location)
        allowed = (url.hostname or '').endswith(('.blob.core.windows.net', '.actions.githubusercontent.com'))
        require(url.scheme == 'https' and allowed and not url.username and not url.password
                and url.port in (None, 443), 'Unexpected artifact download destination.')
        # New unauthenticated request: never forward the GitHub token to storage.
        return request(location, limit=16 * 1024 * 1024)


def chat_completion_review(response):
    """The review text of a chat-completions response, or an Incomplete that names the failed check.

    The diagnostic is built only from a fixed vocabulary: counts, presence
    flags, a finish_reason that matches FINISH_REASON_WORD (else "other"), and
    token counts copied only as integers. No other provider value reaches the
    message. A reasoning field is reported as present but never accepted as
    the review: the review must be the model's final answer, in content.
    """
    choices = response.get('choices')
    choices = choices if type(choices) is list else []
    choice = choices[0] if choices and type(choices[0]) is dict else {}
    message = choice.get('message')
    message = message if type(message) is dict else {}
    finish = choice.get('finish_reason')
    content = message.get('content')
    if finish is None:
        finish_word = 'missing'
    elif type(finish) is str and FINISH_REASON_WORD.fullmatch(finish):
        finish_word = finish
    else:
        finish_word = 'other'
    if content is None:
        content_word = 'null'
    elif type(content) is not str:
        content_word = 'non-text'
    else:
        content_word = 'text' if content else 'empty'

    def presence(*keys):
        return 'present' if any(message.get(key) for key in keys) else 'absent'
    facts = [f'choices={len(choices) if len(choices) <= 9 else "9+"}', f'finish_reason={finish_word}',
             f'content={content_word}', f'reasoning={presence("reasoning_content", "reasoning")}',
             f'tool_calls={presence("tool_calls")}', f'function_call={presence("function_call")}',
             f'refusal={presence("refusal")}']
    usage = response.get('usage')
    usage = usage if type(usage) is dict else {}
    details = usage.get('completion_tokens_details')
    details = details if type(details) is dict else {}
    for name, count in (('completion_tokens', usage.get('completion_tokens')),
                        ('reasoning_tokens', details.get('reasoning_tokens'))):
        if type(count) is int and 0 <= count < 10 ** 9:
            facts.append(f'{name}={count}')
    accepted = (len(choices) == 1 and finish_word == 'stop' and content_word == 'text'
                and all(presence(key) == 'absent' for key in ('tool_calls', 'function_call', 'refusal')))
    require(accepted, f'OpenCode Go response was incomplete or refused ({", ".join(facts)}).')
    return content


def model_request(provider, model, key, instructions, evidence, images):
    require(bool(key), 'Set the repository secret REVIEW_API_KEY.')
    text_bytes = len(instructions.encode('utf-8')) + len(evidence.encode('utf-8'))
    require(text_bytes <= MAX_TEXT_BYTES, 'Review text exceeds 600,000 UTF-8 bytes; split the PR.')
    encoded = [(name, base64.b64encode(data).decode()) for name, data in images.items()]
    if provider == 'openai':
        content = [{'type': 'input_text', 'text': evidence}]
        for name, data in encoded:
            content.extend([{'type': 'input_text', 'text': name},
                            {'type': 'input_image', 'image_url': f'data:image/png;base64,{data}', 'detail': 'high'}])
        url = 'https://api.openai.com/v1/responses'
        headers = {'Authorization': f'Bearer {key}'}
        body = {'model': model, 'store': False, 'instructions': instructions,
                'input': [{'role': 'user', 'content': content}], 'max_output_tokens': 12000,
                'text': {'format': {'type': 'json_schema', 'name': 'review', 'strict': True, 'schema': SCHEMA}}}
    elif provider == 'anthropic':
        content = [{'type': 'text', 'text': evidence}]
        for name, data in encoded:
            content.extend([{'type': 'text', 'text': name}, {'type': 'image', 'source':
                            {'type': 'base64', 'media_type': 'image/png', 'data': data}}])
        url = 'https://api.anthropic.com/v1/messages'
        headers = {'x-api-key': key, 'anthropic-version': '2023-06-01'}
        body = {'model': model, 'system': instructions, 'max_tokens': 12000,
                'messages': [{'role': 'user', 'content': content}]}
    elif provider == 'opencode-go' and model in OPENCODE_GO_CHAT_MODELS:
        opencode_go_family(model)
        # Instructions ride as the system message, as on every other adapter;
        # the evidence and every screenshot are parts of one user message.
        content = [{'type': 'text', 'text': evidence}]
        for name, data in encoded:
            content.extend([{'type': 'text', 'text': name},
                            {'type': 'image_url', 'image_url': {'url': f'data:image/png;base64,{data}'}}])
        url = 'https://opencode.ai/zen/go/v1/chat/completions'
        headers = {'Authorization': f'Bearer {key}', 'User-Agent': 'day4-review/1.0',
                   'x-opencode-session': 'day4-' + hashlib.sha256((instructions + '\0' + evidence).encode()).hexdigest()}
        body = {'model': model, 'max_tokens': OPENCODE_GO_CHAT_MAX_TOKENS,
                'messages': [{'role': 'system', 'content': instructions}, {'role': 'user', 'content': content}]}
    elif provider == 'opencode-go':
        opencode_go_family(model)
        content = [{'type': 'text', 'text': evidence}]
        for name, data in encoded:
            content.extend([{'type': 'text', 'text': name}, {'type': 'image', 'source':
                            {'type': 'base64', 'media_type': 'image/png', 'data': data}}])
        url = 'https://opencode.ai/zen/go/v1/messages'
        headers = {'x-api-key': key, 'anthropic-version': '2023-06-01', 'User-Agent': 'day4-review/1.0',
                   'x-opencode-session': 'day4-' + hashlib.sha256((instructions + '\0' + evidence).encode()).hexdigest()}
        body = {'model': model, 'system': instructions, 'max_tokens': 12000,
                'messages': [{'role': 'user', 'content': content}]}
    else:
        require(provider == 'google', 'Unknown model provider.')
        parts = [{'text': evidence}]
        for name, data in encoded:
            parts.extend([{'text': name}, {'inlineData': {'mimeType': 'image/png', 'data': data}}])
        url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
        headers = {'x-goog-api-key': key}
        body = {'systemInstruction': {'parts': [{'text': instructions}]},
                'contents': [{'role': 'user', 'parts': parts}],
                'generationConfig': {'maxOutputTokens': 12000, 'responseMimeType': 'application/json',
                                     'responseJsonSchema': SCHEMA}}
    headers['Content-Type'] = 'application/json'
    request_bytes = len(json.dumps(body).encode())
    require(request_bytes <= MAX_REQUEST_BYTES,
            f'Serialized review request exceeds {MAX_REQUEST_BYTES:,} bytes; split the PR or reduce image byte size.')
    # The shape of a refused request is safe to publish and is what a replay
    # needs first: how big it was, how many images, how much text.
    shape = f'request {request_bytes:,} bytes, {len(encoded)} images, {text_bytes:,} text bytes'
    try:
        response = strict_json(request(url, headers, body, timeout=240, limit=200_000, provider_error=True))
    except Incomplete as failure:
        raise Incomplete(f'{failure} [{shape}]') from None
    if provider == 'openai':
        require(response.get('status') == 'completed', 'OpenAI response was incomplete or refused.')
        text = ''.join(c.get('text', '') for item in response.get('output', [])
                       if item.get('type') == 'message' for c in item.get('content', []) if c.get('type') == 'output_text')
    elif provider == 'anthropic':
        require(response.get('stop_reason') == 'end_turn', 'Anthropic response was incomplete or refused.')
        text = ''.join(c.get('text', '') for c in response.get('content', []) if c.get('type') == 'text')
    elif provider == 'opencode-go' and model in OPENCODE_GO_CHAT_MODELS:
        text = chat_completion_review(response)
    elif provider == 'opencode-go':
        require(response.get('stop_reason') == 'end_turn', 'OpenCode Go response was incomplete or refused.')
        blocks = response.get('content')
        require(type(blocks) is list and bool(blocks) and all(
            type(c) is dict and (c.get('type') in ('thinking', 'redacted_thinking') or
                                (c.get('type') == 'text' and type(c.get('text')) is str)) for c in blocks),
            'OpenCode Go returned non-text content instead of a review.')
        text = ''.join(c['text'] for c in blocks if c['type'] == 'text')
    else:
        candidates = response.get('candidates', [])
        require(len(candidates) == 1 and candidates[0].get('finishReason') == 'STOP', 'Google response was incomplete or refused.')
        text = ''.join(c.get('text', '') for c in candidates[0].get('content', {}).get('parts', []) if not c.get('thought'))
    require(bool(text), 'Reviewer returned no review text.')
    return text
