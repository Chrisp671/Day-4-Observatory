"""Boundaries for model output and untrusted screenshot artifacts; no I/O."""
import io
import json
import re
import struct
import zipfile

STATES = ('loaded', 'month', 'tonight', 'second-row')
IMAGES = {f'{device}-{state}.png': size for device, size in
          [('phone', (390, 844)), ('tablet', (820, 1180))] for state in STATES}
CANON = {'DEC-026', 'DEC-027', 'DEC-035', 'DEC-036', 'REQ-011'}
OPENCODE_GO_MODELS = {'qwen3.7-plus': 'qwen'}


class Incomplete(Exception):
    """Messages are pipeline-authored and safe to publish; never include API bodies."""


def require(condition, message):
    if not condition:
        raise Incomplete(message)


def object_schema(properties):
    return {'type': 'object', 'properties': properties, 'required': list(properties),
            'additionalProperties': False}


def string_schema(limit=1000):
    return {'type': 'string', 'minLength': 1, 'maxLength': limit}


SCHEMA = object_schema({
    'complete': {'type': 'boolean'},
    'summary': string_schema(1500),
    'findings': {'type': 'array', 'maxItems': 30, 'items': object_schema({
        'severity': {'type': 'string', 'enum': ['BLOCKING', 'ADVISORY']},
        'category': {'type': 'string', 'enum': ['spec', 'architecture', 'visual', 'security']},
        'file': string_schema(250), 'line': {'type': 'integer', 'minimum': 1},
        'title': string_schema(160), 'evidence': string_schema(1200), 'fix': string_schema(500),
    })},
    'screenshots': {'type': 'array', 'minItems': 8, 'maxItems': 8, 'items': object_schema({
        'file': {'type': 'string', 'enum': list(IMAGES)},
        'legibility': {'type': 'string', 'enum': ['LEGIBLE', 'ILLEGIBLE', 'UNCERTAIN']},
        'reason': string_schema(700),
    })},
})


def validate_schema(value, schema):
    kind = schema['type']
    expected = {'object': dict, 'array': list, 'string': str, 'integer': int, 'boolean': bool}[kind]
    require(type(value) is expected, 'Reviewer response has an invalid field type.')
    if kind == 'object':
        require(set(value) == set(schema['properties']), 'Reviewer response has missing or unknown fields.')
        for key, child in schema['properties'].items():
            validate_schema(value[key], child)
    elif kind == 'array':
        require(schema.get('minItems', 0) <= len(value) <= schema['maxItems'], 'Reviewer response has an invalid array size.')
        for item in value:
            validate_schema(item, schema['items'])
    elif kind == 'string':
        require(schema.get('minLength', 1) <= len(value) <= schema.get('maxLength', 1000), 'Reviewer text exceeds field limits.')
    elif kind == 'integer':
        require(value >= schema['minimum'], 'Reviewer line number is invalid.')
    if 'enum' in schema:
        require(value in schema['enum'], 'Reviewer response has an unknown enum value.')


def strict_json(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, 'Duplicate JSON keys in evidence or response.')
            result[key] = value
        return result
    try:
        return json.loads(raw, object_pairs_hook=pairs,
                          parse_constant=lambda _: require(False, 'Non-finite JSON number.'))
    except (ValueError, RecursionError, UnicodeError) as error:
        raise Incomplete('Evidence or reviewer returned invalid JSON.') from error


def validate_review(raw, sources):
    review = strict_json(raw)
    validate_schema(review, SCHEMA)
    require(review['complete'], 'The model could not complete its review.')
    require({item['file'] for item in review['screenshots']} == set(IMAGES), 'Every screenshot needs exactly one judgement.')
    require(all(item['legibility'] != 'UNCERTAIN' for item in review['screenshots']), 'The model could not assess screenshot legibility.')
    for finding in review['findings']:
        require(finding['file'] in sources, 'A finding cites a file outside the supplied source context.')
        require(finding['line'] <= len(sources[finding['file']].splitlines()), 'A finding cites a nonexistent line.')
    for shot in review['screenshots']:
        if shot['legibility'] == 'ILLEGIBLE':
            require(any(f['severity'] == 'BLOCKING' and f['category'] == 'visual'
                        and shot['file'] in f['evidence'] for f in review['findings']),
                    'An illegible screenshot requires a located BLOCKING visual finding.')
    review['findings'].sort(key=lambda item: item['severity'] != 'BLOCKING')
    return review


def read_artifact(data):
    require(len(data) <= 16 * 1024 * 1024, 'Screenshot archive too large.')
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            entries = archive.infolist()
            require(len(entries) == 9 and {e.filename for e in entries} == set(IMAGES) | {'manifest.json'},
                    'Screenshot archive has missing, duplicate or unexpected entries.')
            require(sum(e.file_size for e in entries) <= 16 * 1024 * 1024, 'Expanded screenshot archive too large.')
            require(all(e.file_size <= (100000 if e.filename == 'manifest.json' else 2 * 1024 * 1024)
                        and not e.is_dir() for e in entries), 'Invalid screenshot archive entry size.')
            images = {name: archive.read(name) for name in IMAGES}
            manifest = strict_json(archive.read('manifest.json'))
    except (zipfile.BadZipFile, RuntimeError, OSError) as error:
        raise Incomplete('Invalid screenshot archive.') from error
    for name, image in images.items():
        require(len(image) >= 24 and image[:8] == b'\x89PNG\r\n\x1a\n' and image[12:16] == b'IHDR', 'Invalid PNG screenshot.')
        require(struct.unpack('>II', image[16:24]) == IMAGES[name], 'Screenshot dimensions do not match CSS viewport.')
    require(type(manifest) is dict and manifest.get('version') == 1 and manifest.get('scale') == 'css', 'Invalid capture manifest.')
    require(manifest.get('time') == '2026-09-02T23:00:00.000Z'
            and manifest.get('timezone') == 'America/New_York'
            and manifest.get('station') == {'lat': 40, 'lon': -74}, 'Capture fixture changed; update trusted policy first.')
    shots = manifest.get('screenshots')
    require(type(shots) is list and len(shots) == 8 and all(type(s) is dict for s in shots), 'Incomplete capture manifest.')
    require({s.get('file') for s in shots} == set(IMAGES), 'Capture manifest does not match images.')
    for shot in shots:
        require(shot.get('errors') == [], 'Browser errors were recorded during capture.')
        width, height = IMAGES[shot['file']]
        require(shot.get('viewport') == {'width': width, 'height': height}, 'Manifest viewport mismatch.')
    return images, manifest


def provider_config(provider, model, body):
    require(provider in ('openai', 'anthropic', 'google', 'opencode-go'),
            'Set REVIEW_PROVIDER to openai, anthropic, google or opencode-go.')
    require(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,99}', model or ''), 'Set REVIEW_MODEL to a valid vision model ID.')
    prefixes = {'openai': r'(?:gpt-|o[1-9])', 'anthropic': r'claude-', 'google': r'gemini-'}
    if provider == 'opencode-go':
        require(model in OPENCODE_GO_MODELS, 'OpenCode Go reviewer must be an approved vision model: qwen3.7-plus.')
        family = OPENCODE_GO_MODELS[model]
    else:
        require(re.match(prefixes[provider], model), 'REVIEW_MODEL does not match the configured provider family.')
        family = provider
    declarations = re.findall(r'^Builder-Model-Family:[ \t]*([^\r\n]*)\r?$', body, re.M | re.I)
    require(len(declarations) == 1, 'PR body must contain exactly one Builder-Model-Family line.')
    builder = declarations[0].strip().lower()
    require(builder in ('openai', 'anthropic', 'google', 'qwen'),
            'Builder-Model-Family must be openai, anthropic, google or qwen (not a proxy provider).')
    require(builder != family, 'Reviewer and builder must use different model families.')
    return builder


def plan_entries(plan, body):
    cited = set(re.findall(r'\b(?:DEC|REQ|WI|CHK|SEAM)-\d{3}\b', body))
    require(cited, 'PR body must cite at least one PLAN.md entry.')
    wanted = cited | CANON
    lines = plan.splitlines()
    selected = {}
    for index, line in enumerate(lines):
        match = re.match(r'^- ((?:DEC|REQ|WI|CHK|SEAM)-\d{3})\b', line)
        if match and match[1] in wanted:
            end = index + 1
            while end < len(lines) and not re.match(r'^(?:- [A-Z]+-\d{3}\b|## )', lines[end]):
                end += 1
            selected[match[1]] = '\n'.join(f'{i + 1}: {lines[i]}' for i in range(index, end)).strip()
    require(wanted <= set(selected), 'One or more cited/standing PLAN.md entries are missing.')
    return selected


def relevant(path):
    return path.startswith(('web/', 'scripts/review/')) or path in {
        'PLAN.md', '.github/review-rubric.md', '.github/workflows/review-web.yml',
        '.github/workflows/review-web-report.yml', '.github/workflows/deploy-web.yml'}


def safe_text(value):
    # Backslash-escape Markdown, HTML and URL punctuation; suppress mention parsing.
    return re.sub(r'([\\`*_{}\[\]()<>#+\-.!|:/&])', r'\\\1', value).replace('@', '@\u200b').replace('\r', '').replace('\n', ' ')
