"""Fixed-destination, bounded HTTP clients. No PR code or downloaded file execution."""
import base64
import json
import os
import urllib.error
import urllib.parse
import urllib.request

from contract import Incomplete, OPENCODE_GO_MODELS, SCHEMA, require, strict_json


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request(url, headers=None, data=None, method=None, limit=2_000_000, timeout=60, redirect=False):
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


def model_request(provider, model, key, instructions, evidence, images):
    require(bool(key), 'Set the repository secret REVIEW_API_KEY.')
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
    elif provider == 'opencode-go':
        require(model in OPENCODE_GO_MODELS, 'OpenCode Go reviewer must be an approved vision model: qwen3.7-plus.')
        content = [{'type': 'text', 'text': evidence}]
        for name, data in encoded:
            content.extend([{'type': 'text', 'text': name}, {'type': 'image', 'source':
                            {'type': 'base64', 'media_type': 'image/png', 'data': data}}])
        url = 'https://opencode.ai/zen/go/v1/messages'
        headers = {'x-api-key': key, 'anthropic-version': '2023-06-01', 'User-Agent': 'day4-review/1.0'}
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
    response = strict_json(request(url, headers, body, timeout=240, limit=200_000))
    if provider == 'openai':
        require(response.get('status') == 'completed', 'OpenAI response was incomplete or refused.')
        text = ''.join(c.get('text', '') for item in response.get('output', [])
                       if item.get('type') == 'message' for c in item.get('content', []) if c.get('type') == 'output_text')
    elif provider == 'anthropic':
        require(response.get('stop_reason') == 'end_turn', 'Anthropic response was incomplete or refused.')
        text = ''.join(c.get('text', '') for c in response.get('content', []) if c.get('type') == 'text')
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
