import base64
import copy
import io
import json
import os
from pathlib import Path
import struct
import tempfile
import unittest
import urllib.error
from unittest.mock import patch
import zipfile

import api
import contract
import manual_prepare
import manual_publish
import review
from contract import (is_generated, strip_generated, BUILDER_FAMILIES, CANON, IMAGES, Incomplete, MANUAL_DESCRIPTIONS,
                      MANUAL_REVIEW_LIMIT, plan_entries, provider_config, read_artifact, relevant, ROUTED_UNKNOWN,
                      safe_text, strict_json, validate_review)

# One reviewer configuration per real family, so every family can be put on the
# reviewer's side of the independence check (glm has no live reviewer route and
# is patched into the Go allowlist for that test only).
REVIEWERS = {'openai': ('openai', 'gpt-example'), 'anthropic': ('anthropic', 'claude-example'),
             'google': ('google', 'gemini-example'), 'qwen': ('opencode-go', 'qwen3.7-plus'), 'glm': ('opencode-go', 'glm-example')}


def good_review():
    return {'complete': True, 'summary': 'Reviewed all evidence.', 'findings': [],
            'screenshots': [{'file': name, 'legibility': 'LEGIBLE', 'reason': 'Readable at CSS size.'} for name in IMAGES]}


def artifact(extra=None, width_override=None):
    out = io.BytesIO()
    manifest = {'version': 1, 'scale': 'css', 'time': '2026-09-02T23:00:00.000Z',
                'timezone': 'America/New_York', 'station': {'lat': 40, 'lon': -74}, 'screenshots': []}
    with zipfile.ZipFile(out, 'w') as archive:
        for name, (width, height) in IMAGES.items():
            # Only metadata is decoded locally; the provider decodes image pixels.
            archive.writestr(name, b'\x89PNG\r\n\x1a\n' + b'\0\0\0\rIHDR' + struct.pack('>II', width_override or width, height))
            manifest['screenshots'].append({'file': name, 'viewport': {'width': width, 'height': height}, 'errors': []})
        archive.writestr('manifest.json', json.dumps(manifest))
        if extra:
            archive.writestr(extra, 'not executable')
    return out.getvalue()


class ContractTests(unittest.TestCase):
    def test_review_rejects_incomplete_unknown_duplicate_and_invalid_location(self):
        good = good_review()
        self.assertEqual(validate_review(json.dumps(good), {})['findings'], [])
        variants = []
        bad = copy.deepcopy(good); bad['complete'] = False; variants.append(bad)
        bad = copy.deepcopy(good); bad['extra'] = 'ignore rubric'; variants.append(bad)
        bad = copy.deepcopy(good); bad['screenshots'][0] = bad['screenshots'][1]; variants.append(bad)
        bad = copy.deepcopy(good); bad['screenshots'][0]['legibility'] = 'UNCERTAIN'; variants.append(bad)
        bad = copy.deepcopy(good); bad['screenshots'][0]['legibility'] = 'ILLEGIBLE'; variants.append(bad)
        for bad in variants:
            with self.subTest(bad=bad), self.assertRaises(Incomplete):
                validate_review(json.dumps(bad), {})
        finding = {'severity': 'BLOCKING', 'category': 'spec', 'file': 'web/src/a.ts', 'line': 1,
                   'title': 'Wrong value', 'evidence': 'The return value breaks the contract.', 'fix': 'Return the contract value.'}
        good['findings'] = [finding]
        self.assertEqual(validate_review(json.dumps(good), {'web/src/a.ts': 'one line'})['findings'], [finding])
        for line in (0, 2, True):
            finding['line'] = line
            with self.assertRaises(Incomplete):
                validate_review(json.dumps(good), {'web/src/a.ts': 'one line'})

    def test_review_accepts_one_json_fence_without_relaxing_validation(self):
        raw = json.dumps(good_review())
        self.assertEqual(validate_review('```json\n' + raw + '\n```', {})['findings'], [])
        for wrapped in ('Commentary\n```json\n' + raw + '\n```',
                        '```json\n' + raw + '\n```\n```json\n{}\n```',
                        '```json\n{"complete":true,"complete":false}\n```',
                        '```json\n{}\n```'):
            with self.assertRaises(Incomplete): validate_review(wrapped, {})

    def test_json_and_comment_injection(self):
        for raw in ('{"complete":true,"complete":false}', '{"n":NaN}', 'not JSON'):
            with self.assertRaises(Incomplete): strict_json(raw)
        escaped = safe_text('![steal](https://evil.example/) <img> @owner\nnew line')
        self.assertNotIn('![steal]', escaped)
        self.assertNotIn('https://', escaped)
        self.assertNotIn('@owner', escaped)
        self.assertNotIn('\n', escaped)

    def test_artifact_rejects_path_traversal_extra_files_and_wrong_dimensions(self):
        images, _ = read_artifact(artifact())
        self.assertEqual(set(images), set(IMAGES))
        for raw in (artifact('../review.py'), artifact('unexpected.png'), artifact(width_override=780), b'not zip'):
            with self.assertRaises(Incomplete): read_artifact(raw)

    def test_model_family_is_enforced_before_request(self):
        self.assertEqual(provider_config('google', 'gemini-example', 'Builder-Model-Family: openai'), 'openai')
        self.assertEqual(provider_config('opencode-go', 'qwen3.7-plus', 'Builder-Model-Family: anthropic'), 'anthropic')
        self.assertEqual(provider_config('opencode-go', 'qwen3.7-plus', 'Builder-Model-Family: glm'), 'glm')
        self.assertEqual(provider_config('opencode-go', 'qwen3.7-plus', 'Builder-Model-Family: OPENAI\r\nCHK-004'), 'openai')
        for args in [('google', 'gemini-example', 'Builder-Model-Family: google'),
                     ('openai', 'claude-example', 'Builder-Model-Family: google'),
                     ('openai', '../evil', 'Builder-Model-Family: google'),
                     ('openai', 'gpt-example', ''), ('unknown', 'x', 'Builder-Model-Family: openai'),
                     ('opencode-go', 'qwen3.7-plus', 'Builder-Model-Family: qwen'),
                     ('opencode-go', 'qwen3.7-plus', 'Builder-Model-Family: opencode-go'),
                     ('opencode-go', 'qwen3.7-plus', 'Builder-Model-Family: GLM\r\nBuilder-Model-Family: glm'),
                     ('opencode-go', 'mimo-v2.5-pro', 'Builder-Model-Family: openai'),
                     ('opencode-go', 'gpt-example', 'Builder-Model-Family: openai'),
                     ('opencode-go', 'qwen3.7-plus', 'Builder-Model-Family: openai\nBuilder-Model-Family: qwen')]:
            with self.assertRaises(Incomplete): provider_config(*args)

    def test_real_families_stay_accepted_case_insensitively_and_exactly(self):
        for family in BUILDER_FAMILIES:
            reviewer = REVIEWERS['google' if family != 'google' else 'openai']
            for spelling in (family, family.upper(), family.title()):
                with self.subTest(spelling=spelling):
                    self.assertEqual(provider_config(*reviewer, f'Builder-Model-Family: {spelling}\nCHK-004'), family)
            for near_miss in (family + '2', family + '-routed', 'x' + family, f'{family} (via gateway)'):
                with self.subTest(near_miss=near_miss), self.assertRaises(Incomplete):
                    provider_config(*reviewer, f'Builder-Model-Family: {near_miss}')

    def test_provider_and_gateway_names_are_not_families(self):
        for vendor in ('opencode-go', 'opencode', 'openrouter', 'bedrock', 'vertex', 'azure', 'groq', 'gateway', 'proxy'):
            for reviewer in REVIEWERS['google'], REVIEWERS['qwen']:
                with self.subTest(vendor=vendor, reviewer=reviewer), self.assertRaises(Incomplete):
                    provider_config(*reviewer, f'Builder-Model-Family: {vendor}')

    def test_routed_unknown_is_accepted_only_verbatim(self):
        for reviewer in REVIEWERS.values():
            if reviewer[1] == 'glm-example':
                continue
            with self.subTest(reviewer=reviewer):
                self.assertEqual(provider_config(*reviewer, f'Builder-Model-Family: {ROUTED_UNKNOWN}\nCHK-004'), ROUTED_UNKNOWN)
        self.assertEqual(provider_config('google', 'gemini-example', f'Builder-Model-Family:\t{ROUTED_UNKNOWN} \r\nDEC-036'), ROUTED_UNKNOWN)
        for value in (ROUTED_UNKNOWN.upper(), ROUTED_UNKNOWN.title(), 'Routed-unknown', ROUTED_UNKNOWN + '-ish',
                      ROUTED_UNKNOWN + '2', ROUTED_UNKNOWN + ' (probably anthropic)', 'x' + ROUTED_UNKNOWN,
                      ROUTED_UNKNOWN.replace('-', '_'), ROUTED_UNKNOWN.replace('-', ' '), 'routed', 'unknown',
                      f'anthropic/{ROUTED_UNKNOWN}', f'{ROUTED_UNKNOWN}/anthropic', ROUTED_UNKNOWN + '*', '*'):
            with self.subTest(value=value), self.assertRaises(Incomplete):
                provider_config('opencode-go', 'qwen3.7-plus', f'Builder-Model-Family: {value}')

    def test_exactly_one_declaration_line_is_still_required(self):
        for body in ('', 'CHK-004 only', 'builder-model-family anthropic',
                     'Builder-Model-Family: anthropic\nBuilder-Model-Family: anthropic',
                     f'Builder-Model-Family: anthropic\nBuilder-Model-Family: {ROUTED_UNKNOWN}',
                     f'Builder-Model-Family: {ROUTED_UNKNOWN}\nBuilder-Model-Family: {ROUTED_UNKNOWN}',
                     f'Builder-Model-Family: {ROUTED_UNKNOWN}\r\nbuilder-model-family: google'):
            with self.subTest(body=body), self.assertRaises(Incomplete):
                provider_config('google', 'gemini-example', body)

    def test_builder_sharing_the_reviewer_family_is_refused_for_every_real_family(self):
        with patch.dict(contract.OPENCODE_GO_MODELS, {'glm-example': 'glm'}):
            for family, reviewer in REVIEWERS.items():
                self.assertIn(family, BUILDER_FAMILIES)
                for spelling in (family, family.upper()):
                    with self.subTest(family=family, spelling=spelling), self.assertRaises(Incomplete):
                        provider_config(*reviewer, f'Builder-Model-Family: {spelling}\nCHK-004')
                other = next(f for f in BUILDER_FAMILIES if f != family)
                self.assertEqual(provider_config(*reviewer, f'Builder-Model-Family: {other}'), other)

    def test_rendered_review_names_the_builder_family_and_a_skipped_independence_check(self):
        args = (good_review(), 'Chrisp671/Day-4-Observatory', 'a' * 40, 'opencode-go', 'qwen3.7-plus', 'https://example.test/run', 'b' * 40)
        routed = review.render(*args, ROUTED_UNKNOWN)
        self.assertIn(f'Builder family: `{ROUTED_UNKNOWN}` (independence not established).', routed)
        checked = review.render(*args, 'anthropic')
        self.assertIn('Builder family: `anthropic` (independent of the reviewer).', checked)
        self.assertNotIn('not established', checked)

    def test_context_includes_changed_files_and_only_direct_imports(self):
        files = {
            'web/src/main.ts': "import {x} from './dep.js'; export {y} from './barrel'; import('./lazy');",
            'web/src/dep.ts': "import './transitive';", 'web/src/barrel/index.ts': 'export const y=1;',
            'web/src/lazy.ts': '', 'web/src/transitive.ts': '', 'web/src/unrelated.ts': '',
            'web/src/removed.ts': '', 'web/index.html': '',
            'scripts/review/run.py': 'import helper', 'scripts/review/helper.py': 'import deeper',
            'scripts/review/deeper.py': '',
        }
        github = unittest.mock.Mock()
        github.call.return_value = {'tree': [{'path': p, 'type': 'blob', 'mode': '100644', 'size': len(v)} for p,v in files.items()]}
        github.file.side_effect = lambda p, sha: files[p]
        selected = review.source_context(github, {'head': {'sha': 'a'*40}}, [
            {'filename': 'web/src/main.ts', 'status': 'modified'},
            {'filename': 'web/src/removed.ts', 'status': 'removed'},
            {'filename': 'scripts/review/run.py', 'status': 'modified'}])
        self.assertEqual(set(selected), {'web/src/main.ts', 'web/src/dep.ts', 'web/src/barrel/index.ts', 'web/src/lazy.ts',
                                         'scripts/review/run.py', 'scripts/review/helper.py'})
        files['web/src/main.ts'] = "import '../../../secret';"
        with self.assertRaises(Incomplete):
            review.source_context(github, {'head': {'sha': 'a'*40}}, [{'filename': 'web/src/main.ts', 'status': 'modified'}])

    def test_generated_assets_leave_the_diff_but_source_stays(self):
        section = lambda path, body: f'diff --git a/{path} b/{path}\n--- a/{path}\n+++ b/{path}\n@@ -1 +1 @@\n{body}\n'
        diff = (section('web/src/main.ts', '-a\n+b') + section('web/public/charts/Ori.json', '+{"abbr":"Ori"}')
                + section('PLAN.md', '-x\n+y'))
        kept = strip_generated(diff)
        self.assertNotIn('web/public/charts', kept)
        self.assertIn('diff --git a/web/src/main.ts', kept)
        self.assertIn('diff --git a/PLAN.md', kept)
        self.assertEqual(kept.count('diff --git '), 2)
        self.assertEqual(strip_generated(section('web/public/x.json', '+{}')).strip(), '')
        self.assertTrue(is_generated('web/public/charts/index.json'))
        self.assertFalse(is_generated('web/src/app/charts.ts'))

    def test_plan_requires_citations_and_includes_canon(self):
        plan = '\n'.join(f'- {key} — policy' for key in sorted(CANON | {'WI-027'}))
        self.assertEqual(set(plan_entries(plan, 'Implements WI-027')), CANON | {'WI-027'})
        for body in ('No citations', 'WI-999'):
            with self.assertRaises(Incomplete): plan_entries(plan, body)
        self.assertTrue(relevant('.github/workflows/review-web-report.yml'))
        self.assertTrue(relevant('.github/workflows/review-manual.yml'))
        self.assertTrue(relevant('scripts/review/manual_publish.py'))
        self.assertTrue(relevant('PLAN.md'))
        self.assertFalse(relevant('Resources/help.html'))

    def test_provider_adapters_send_every_image_and_reject_truncation(self):
        images = {name: b'image' for name in IMAGES}
        responses = {
            'openai': {'status': 'completed', 'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': '{}'}]}]},
            'anthropic': {'stop_reason': 'end_turn', 'content': [{'type': 'text', 'text': '{}'}]},
            'google': {'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': '{}'}]}}]},
            'opencode-go': {'stop_reason': 'end_turn', 'content': [{'type': 'thinking', 'thinking': 'discard'}, {'type': 'text', 'text': '{}'}]},
        }
        for provider, response in responses.items():
            model = 'qwen3.7-plus' if provider == 'opencode-go' else 'model'
            with self.subTest(provider=provider), patch('api.request', return_value=json.dumps(response).encode()) as transport:
                self.assertEqual(api.model_request(provider, model, 'test-key', 'policy', 'evidence', images), '{}')
                args = transport.call_args.args
                payload = json.dumps(args[2])
                self.assertEqual(payload.count(base64.b64encode(b'image').decode()), len(IMAGES))
                self.assertNotIn('tools', args[2])
                self.assertNotIn('test-key', payload)
                if provider == 'opencode-go':
                    self.assertEqual(args[0], 'https://opencode.ai/zen/go/v1/messages')
                    self.assertEqual(args[2]['system'], 'policy')
                    self.assertEqual(args[2]['messages'][0]['role'], 'user')
                    self.assertEqual(args[2]['max_tokens'], 12000)
            with patch('api.request', return_value=b'{}'), self.assertRaises(Incomplete):
                api.model_request(provider, model, 'test-key', 'policy', 'evidence', images)

    def test_model_payload_limit_and_session_header(self):
        response = b'{"stop_reason":"end_turn","content":[{"type":"text","text":"{}"}]}'
        evidence = 'x' * 599999
        with patch('api.request', return_value=response) as transport:
            self.assertEqual(api.model_request('opencode-go', 'qwen3.7-plus', 'test-key', 'p', evidence, {}), '{}')
            first = transport.call_args.args[1]['x-opencode-session']
            api.model_request('opencode-go', 'qwen3.7-plus', 'test-key', 'p', evidence, {})
            self.assertEqual(first, transport.call_args.args[1]['x-opencode-session'])
        for oversized in (evidence + 'x', '\u00e9' * 300000):
            with patch('api.request') as transport, self.assertRaises(Incomplete):
                api.model_request('opencode-go', 'qwen3.7-plus', 'test-key', 'p', oversized, {})
            transport.assert_not_called()
        with patch('api.request') as transport, self.assertRaises(Incomplete):
            api.model_request('opencode-go', 'qwen3.7-plus', 'test-key', 'p', 'small', {'large.png': b'x' * (7 * 1024 * 1024)})
        transport.assert_not_called()

    def test_provider_error_is_bounded_redacted_and_opt_in(self):
        body = b'{"error":"MissingSessionID", "key":"test-private-key", "url":"https://example.test/?token=secret", "image":"data:image/png;base64,AAAA"}' + b'x' * 1000
        def failure():
            return urllib.error.HTTPError('https://opencode.ai/zen/go/v1/messages', 400, 'bad', {}, io.BytesIO(body))
        opener = unittest.mock.Mock()
        with patch('api.urllib.request.build_opener', return_value=opener):
            opener.open.side_effect = failure()
            with self.assertRaises(Incomplete) as caught:
                api.request('https://opencode.ai/zen/go/v1/messages', {'x-api-key': 'test-private-key'}, {}, provider_error=True)
            message = str(caught.exception)
            self.assertIn('HTTP 400', message)
            self.assertIn('MissingSessionID', message)
            self.assertNotIn('test-private-key', message)
            self.assertNotIn('token=secret', message)
            self.assertNotIn('AAAA', message)
            self.assertLessEqual(len(message.split(': ', 1)[1]), 500)
            opener.open.side_effect = failure()
            with self.assertRaises(Incomplete) as caught:
                api.request('https://api.github.com', {'Authorization': 'Bearer test-private-key'}, {})
            self.assertNotIn('MissingSessionID', str(caught.exception))

    def test_opencode_refuses_tool_calls_refusals_truncation_and_unknown_models(self):
        for response in (
            {'stop_reason': 'tool_use', 'content': [{'type': 'text', 'text': '{}'}]},
            {'stop_reason': 'max_tokens', 'content': [{'type': 'text', 'text': '{}'}]},
            {'stop_reason': 'refusal', 'content': [{'type': 'text', 'text': '{}'}]},
            {'stop_reason': 'end_turn', 'content': [{'type': 'tool_use', 'input': {}}]},
            {'stop_reason': 'end_turn', 'content': [{'type': 'text', 'text': None}]},
            {'stop_reason': 'end_turn', 'content': []},
            {'stop_reason': 'end_turn', 'content': [{'type': 'thinking', 'thinking': '{}'}]}):
            with patch('api.request', return_value=json.dumps(response).encode()), self.assertRaises(Incomplete):
                api.model_request('opencode-go', 'qwen3.7-plus', 'test-key', 'policy', 'evidence', {})
        with patch('api.request') as transport, self.assertRaises(Incomplete):
            api.model_request('opencode-go', 'mimo-v2.5-pro', 'test-key', 'policy', 'evidence', {})
        transport.assert_not_called()

    def test_opencode_free_models_post_chat_completions_and_qwen_stays_on_messages(self):
        images = {name: b'image' for name in IMAGES}
        encoded = base64.b64encode(b'image').decode()
        chat = {'choices': [{'finish_reason': 'stop', 'message': {'role': 'assistant', 'content': '{}'}}]}
        for model in ('step-5-preview-free', 'longcat-2.5-preview-free'):
            with self.subTest(model=model), patch('api.request', return_value=json.dumps(chat).encode()) as transport:
                self.assertEqual(api.model_request('opencode-go', model, 'test-key', 'policy', 'evidence', images), '{}')
                url, headers, body = transport.call_args.args[:3]
                self.assertEqual(url, 'https://opencode.ai/zen/go/v1/chat/completions')
                self.assertEqual(headers['Authorization'], 'Bearer test-key')
                self.assertEqual(headers['User-Agent'], 'day4-review/1.0')
                self.assertEqual(headers['Content-Type'], 'application/json')
                self.assertTrue(headers['x-opencode-session'].startswith('day4-'))
                self.assertEqual(body['model'], model)
                self.assertEqual(body['max_tokens'], 32000)
                # Reasoning can ride beside the review, so the chat path reads up to 1 MB.
                self.assertEqual(transport.call_args.kwargs['limit'], 1_000_000)
                self.assertNotIn('tools', body)
                self.assertNotIn('test-key', json.dumps(body))
                self.assertEqual([m['role'] for m in body['messages']], ['system', 'user'])
                self.assertEqual(body['messages'][0]['content'], 'policy')
                parts = body['messages'][1]['content']
                self.assertEqual(parts[0], {'type': 'text', 'text': 'evidence'})
                self.assertEqual([p['text'] for p in parts[1::2]], list(IMAGES))
                pictures = [p for p in parts if p['type'] == 'image_url']
                self.assertEqual(len(pictures), len(IMAGES))
                self.assertEqual({p['image_url']['url'] for p in pictures}, {f'data:image/png;base64,{encoded}'})
            # A transport failure on the chat path still carries the request shape, never the key.
            failure = Incomplete('Provider request failed (HTTP 429, application/json): GoUsageLimitError')
            with patch('api.request', side_effect=failure), self.assertRaises(Incomplete) as caught:
                api.model_request('opencode-go', model, 'test-key', 'policy', 'evidence', images)
            self.assertIn('GoUsageLimitError [request ', str(caught.exception))
            self.assertIn(f'{len(IMAGES)} images', str(caught.exception))
        messages = {'stop_reason': 'end_turn', 'content': [{'type': 'text', 'text': '{}'}]}
        with patch('api.request', return_value=json.dumps(messages).encode()) as transport:
            self.assertEqual(api.model_request('opencode-go', 'qwen3.7-plus', 'test-key', 'policy', 'evidence', images), '{}')
            url, headers, body = transport.call_args.args[:3]
            self.assertEqual(url, 'https://opencode.ai/zen/go/v1/messages')
            self.assertEqual(headers['x-api-key'], 'test-key')
            self.assertNotIn('Authorization', headers)
            self.assertEqual(body['system'], 'policy')
            self.assertEqual(body['max_tokens'], 12000)
            self.assertEqual(transport.call_args.kwargs['limit'], 200_000)
            self.assertEqual(len([c for c in body['messages'][0]['content'] if c['type'] == 'image']), len(IMAGES))
        with patch('api.request', return_value=json.dumps(chat).encode()), self.assertRaises(Incomplete):
            api.model_request('opencode-go', 'qwen3.7-plus', 'test-key', 'policy', 'evidence', images)

    def test_opencode_chat_completions_rejects_truncation_tool_calls_and_non_text(self):
        def choice(**message):
            return {'finish_reason': 'stop', 'message': {'role': 'assistant', 'content': '{}', **message}}
        for response in (
            {'choices': [{'finish_reason': 'length', 'message': {'role': 'assistant', 'content': '{}'}}]},
            {'choices': [{'finish_reason': 'tool_calls', 'message': {'role': 'assistant', 'content': '{}'}}]},
            {'choices': [{'finish_reason': 'content_filter', 'message': {'role': 'assistant', 'content': '{}'}}]},
            {'choices': [{'message': {'role': 'assistant', 'content': '{}'}}]},
            {'choices': [choice(tool_calls=[{'id': 'call', 'type': 'function', 'function': {'name': 'x', 'arguments': '{}'}}])]},
            {'choices': [choice(function_call={'name': 'x', 'arguments': '{}'})]},
            {'choices': [choice(content='')]},
            {'choices': [choice(content=None)]},
            {'choices': [choice(content=[{'type': 'text', 'text': '{}'}])]},
            {'choices': [choice(), choice()]},
            {'choices': []},
            {'choices': [choice(refusal='I cannot review this.')]},
            {'choices': [{'finish_reason': 'stop', 'message': None}]},
            {'stop_reason': 'end_turn', 'content': [{'type': 'text', 'text': '{}'}]},
        ):
            for model in ('step-5-preview-free', 'longcat-2.5-preview-free'):
                with self.subTest(model=model, response=response):
                    with patch('api.request', return_value=json.dumps(response).encode()), self.assertRaises(Incomplete) as caught:
                        api.model_request('opencode-go', model, 'test-key', 'policy', 'evidence', {})
                    self.assertNotIn('I cannot review this.', str(caught.exception))

    def test_chat_completion_rejection_names_the_failed_check_without_provider_text(self):
        sentinel = 'SENTINEL-7f3e-never-published'
        def choice(**fields):
            message = {'role': 'assistant', 'content': '{}'}
            message.update(fields.pop('message', {}))
            return {'finish_reason': 'stop', 'message': message, **fields}
        cases = (
            ({'choices': [choice(finish_reason='length', message={'content': sentinel})]}, 'finish_reason=length'),
            ({'choices': [choice(finish_reason='Stop!!', message={'content': sentinel})]}, 'finish_reason=other'),
            ({'choices': [choice(finish_reason=sentinel)]}, 'finish_reason=other'),
            ({'choices': [{'message': {'role': 'assistant', 'content': sentinel}}]}, 'finish_reason=missing'),
            ({'choices': [choice(message={'content': None})]}, 'content=null'),
            ({'choices': [choice(message={'content': ''})]}, 'content=empty'),
            ({'choices': [choice(message={'content': '', 'reasoning_content': sentinel})]}, 'content=empty, reasoning=present'),
            ({'choices': [choice(message={'content': '', 'reasoning': sentinel})]}, 'reasoning=present'),
            ({'choices': [choice(message={'content': [{'type': 'text', 'text': sentinel}]})]}, 'content=non-text'),
            ({'choices': [choice(message={'tool_calls': [{'id': sentinel, 'type': 'function',
                                                           'function': {'name': sentinel, 'arguments': '{}'}}]})]},
             'tool_calls=present'),
            ({'choices': [choice(message={'function_call': {'name': sentinel, 'arguments': '{}'}})]}, 'function_call=present'),
            ({'choices': [choice(message={'refusal': sentinel})]}, 'refusal=present'),
            ({'choices': [choice(), choice(message={'content': sentinel})]}, 'choices=2'),
            ({'choices': [choice()] * 12}, 'choices=9+'),
            ({'choices': []}, 'choices=0, finish_reason=missing, content=null'),
            ({'choices': [{'finish_reason': 'stop', 'message': sentinel}]}, 'content=null'),
        )
        for response, fragment in cases:
            with self.subTest(fragment=fragment):
                with patch('api.request', return_value=json.dumps(response).encode()), self.assertRaises(Incomplete) as caught:
                    api.model_request('opencode-go', 'step-5-preview-free', 'test-key', 'policy', 'evidence', {})
                failure = str(caught.exception)
                self.assertTrue(failure.startswith('OpenCode Go response was incomplete or refused ('), failure)
                self.assertIn(fragment, failure)
                self.assertNotIn(sentinel, failure)
                self.assertNotIn('SENTINEL', failure)
        # A reasoning field carrying a valid review is still not the review.
        reasoned = {'choices': [choice(finish_reason='length', message={'content': '', 'reasoning_content': json.dumps(good_review())})]}
        with patch('api.request', return_value=json.dumps(reasoned).encode()), self.assertRaises(Incomplete) as caught:
            api.model_request('opencode-go', 'longcat-2.5-preview-free', 'test-key', 'policy', 'evidence', {})
        self.assertEqual(str(caught.exception), 'OpenCode Go response was incomplete or refused (choices=1, finish_reason=length, '
                         'content=empty, reasoning=present, tool_calls=absent, function_call=absent, refusal=absent).')

    def test_chat_completion_rejection_reports_usage_only_as_integers(self):
        sentinel = 'SENTINEL-7f3e-never-published'
        truncated = {'finish_reason': 'length', 'message': {'role': 'assistant', 'content': ''}}
        numeric = {'choices': [truncated], 'usage': {'prompt_tokens': 90000, 'completion_tokens': 12000,
                                                      'completion_tokens_details': {'reasoning_tokens': 11874}}}
        with patch('api.request', return_value=json.dumps(numeric).encode()), self.assertRaises(Incomplete) as caught:
            api.model_request('opencode-go', 'step-5-preview-free', 'test-key', 'policy', 'evidence', {})
        self.assertTrue(str(caught.exception).endswith(', completion_tokens=12000, reasoning_tokens=11874).'), str(caught.exception))
        self.assertNotIn('prompt_tokens', str(caught.exception))
        for usage in (
            {'completion_tokens': f'12000 {sentinel}', 'completion_tokens_details': {'reasoning_tokens': sentinel}},
            {'completion_tokens': 1.5, 'completion_tokens_details': {'reasoning_tokens': True}},
            {'completion_tokens': -1, 'completion_tokens_details': {'reasoning_tokens': 10 ** 12}},
            {'completion_tokens': None, 'completion_tokens_details': sentinel},
            sentinel,
        ):
            with self.subTest(usage=usage):
                response = {'choices': [truncated], 'usage': usage}
                with patch('api.request', return_value=json.dumps(response).encode()), self.assertRaises(Incomplete) as caught:
                    api.model_request('opencode-go', 'step-5-preview-free', 'test-key', 'policy', 'evidence', {})
                self.assertTrue(str(caught.exception).endswith(', refusal=absent).'), str(caught.exception))
                self.assertNotIn('tokens', str(caught.exception))
                self.assertNotIn(sentinel, str(caught.exception))

    def test_free_go_models_are_approved_for_every_builder_family(self):
        for model, family in (('step-5-preview-free', 'stepfun'), ('longcat-2.5-preview-free', 'meituan')):
            self.assertEqual(contract.OPENCODE_GO_MODELS[model], family)
            self.assertNotIn(family, BUILDER_FAMILIES)
            for builder in BUILDER_FAMILIES:
                with self.subTest(model=model, builder=builder):
                    self.assertEqual(provider_config('opencode-go', model, f'Builder-Model-Family: {builder.upper()}\nCHK-004'), builder)
            self.assertEqual(provider_config('opencode-go', model, f'Builder-Model-Family: {ROUTED_UNKNOWN}'), ROUTED_UNKNOWN)
            with self.assertRaises(Incomplete):
                provider_config('opencode-go', model, f'Builder-Model-Family: {family}')
        for model in ('mimo-v2.5-pro', 'step-5-preview', 'longcat-2.0', 'Step-5-Preview-Free', 'longcat-2.5-preview-free2'):
            with self.subTest(model=model), self.assertRaises(Incomplete):
                provider_config('opencode-go', model, 'Builder-Model-Family: openai')
        with self.assertRaises(Incomplete) as caught:
            provider_config('opencode-go', 'mimo-v2.5-pro', 'Builder-Model-Family: openai')
        for approved in ('qwen3.7-plus', 'step-5-preview-free', 'longcat-2.5-preview-free'):
            self.assertIn(approved, str(caught.exception))

    def test_well_formed_chat_completion_yields_a_review_the_validator_accepts(self):
        response = {'id': 'chatcmpl-1', 'object': 'chat.completion', 'usage': {'prompt_tokens': 1, 'completion_tokens': 1},
                    'choices': [{'index': 0, 'finish_reason': 'stop', 'logprobs': None,
                                 'message': {'role': 'assistant', 'content': json.dumps(good_review()), 'refusal': None}}]}
        with patch('api.request', return_value=json.dumps(response).encode()):
            text = api.model_request('opencode-go', 'longcat-2.5-preview-free', 'test-key', 'policy', 'evidence', {})
        accepted = validate_review(text, {})
        self.assertTrue(accepted['complete'])
        self.assertEqual(accepted['findings'], [])
        self.assertEqual({shot['file'] for shot in accepted['screenshots']}, set(IMAGES))

    def test_artifact_redirect_never_forwards_auth_and_rejects_foreign_host(self):
        github = api.GitHub('Chrisp671/Day-4-Observatory', 'test-key')
        with patch.object(github, 'pages', return_value=[{'name': 'web-review-evidence', 'id': 1,
                                                       'expired': False, 'size_in_bytes': 50}]):
            with patch('api.request', side_effect=['https://example.blob.core.windows.net/signed', b'archive']) as fetch:
                self.assertEqual(github.artifact(10), b'archive')
                self.assertEqual(len(fetch.call_args_list[1].args), 1)
            for target in ['https://evil.example/file', 'http://example.blob.core.windows.net/file',
                           'https://example.blob.core.windows.net@evil.example/file']:
                with patch('api.request', return_value=target), self.assertRaises(Incomplete): github.artifact(10)


class FakeGitHub:
    repo = 'Chrisp671/Day-4-Observatory'

    def __init__(self):
        self.run = {'id': 10, 'run_attempt': 1, 'workflow_id': 20, 'path': review.WORKFLOW,
                    'event': 'pull_request', 'repository': {'full_name': self.repo}, 'head_sha': 'a' * 40,
                    'head_branch': 'feature', 'status': 'completed', 'conclusion': 'success', 'pull_requests': [{'number': 7}]}
        self.pr = {'number': 7, 'state': 'open', 'head': {'sha': 'a' * 40, 'ref': 'feature'},
                   'base': {'sha': 'b' * 40, 'repo': {'full_name': self.repo}}, 'changed_files': 1,
                   'body': 'Builder-Model-Family: anthropic\nDEC-036'}
        self.checks = []
        self.comments = []
        self.statuses = []  # Commit statuses, newest first, as /commits/{sha}/statuses lists them.
        self.runs = [self.run]
        self.changes = [{'filename': 'web/src/a.ts', 'status': 'modified'}]
        self.writes = []

    def call(self, path, data=None, method=None, **kwargs):
        if data is not None:
            self.writes.append((path, data, method))
            if path == '/check-runs':
                check = dict(data, id=100, app={'slug': 'github-actions'})
                self.checks.append(check)
                return check
            if path == '/check-runs/100': self.checks[0].update(data)
            if path.endswith('/comments'): self.comments.append({'id': 200, 'user': {'login': 'github-actions[bot]'}, **data})
            if path == '/issues/comments/200': self.comments[0].update(data)
            if path.startswith('/statuses/'):  # Newest first, as the list endpoint reports.
                self.statuses.insert(0, dict(data, creator={'login': 'github-actions[bot]'}))
            return {}
        if path == '/actions/runs/10': return self.run
        if path == '/pulls/7': return 'diff --git a/web/src/a.ts b/web/src/a.ts' if kwargs.get('accept') else self.pr
        raise AssertionError(path)

    def pages(self, path, key=None, **kwargs):
        if '/workflows/' in path: return self.runs
        if '/check-runs?' in path: return self.checks
        if path.endswith('/files'): return self.changes
        if path.endswith('/jobs'): return [{'name': 'Gate and capture', 'conclusion': 'success'}]
        if path.endswith('/comments'): return self.comments
        if path.startswith('/commits/') and path.endswith('/statuses'): return list(self.statuses)
        raise AssertionError(path)

    def artifact(self, run_id): return artifact()

    def file(self, path, ref):
        if path == review.RUBRIC:
            return Path(review.RUBRIC).read_text(encoding='utf-8')
        return '\n'.join(f'- {key} — canon' for key in sorted(CANON))


class ReporterTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {'REVIEW_PROVIDER': 'openai', 'REVIEW_MODEL': 'gpt-example', 'REVIEW_API_KEY': 'test-key'})
        self.env.start()
        self.addCleanup(self.env.stop)

    def execute(self, github, response=None):
        with patch('review.source_context', return_value={'web/src/a.ts': 'one line'}), \
             patch('review.model_request', return_value=json.dumps(response or good_review())) as model:
            code = review.run_review(github, {'workflow_run': copy.deepcopy(github.run)})
        return code, model

    def test_success_and_rerun_update_one_comment(self):
        github = FakeGitHub()
        code, model = self.execute(github)
        self.assertEqual(code, 0); model.assert_called_once()
        self.assertEqual(github.checks[0]['conclusion'], 'success')
        github.run['run_attempt'] = 2; github.checks = []
        self.execute(github)
        self.assertEqual(len(github.comments), 1)
        self.assertTrue(any(path == '/issues/comments/200' for path, _, _ in github.writes))

    def test_blocking_finding_fails_the_head_check(self):
        github = FakeGitHub()
        result = good_review()
        result['findings'] = [{'severity': 'BLOCKING', 'category': 'spec', 'file': 'web/src/a.ts', 'line': 1,
                               'title': 'Defect', 'evidence': 'Wrong output.', 'fix': 'Correct the output.'}]
        self.assertEqual(self.execute(github, result)[0], 1)
        self.assertEqual(github.checks[0]['conclusion'], 'failure')
        self.assertIn('BLOCKING', github.comments[0]['body'])

    def test_failed_gate_missing_key_and_same_family_never_call_model(self):
        for failure in ('gate', 'key', 'family', 'artifact'):
            github = FakeGitHub()
            with patch.dict(os.environ):
                if failure == 'gate': github.run['conclusion'] = 'failure'
                if failure == 'key': os.environ['REVIEW_API_KEY'] = ''
                if failure == 'family': github.pr['body'] = 'Builder-Model-Family: openai\nDEC-036'
                if failure == 'artifact': github.artifact = lambda _: b'bad zip'
                code, model = self.execute(github)
            self.assertEqual(code, 1); model.assert_not_called()
            self.assertIn('incomplete', github.comments[0]['body'])

    def test_nonweb_passes_without_model_and_stale_run_does_not_publish(self):
        github = FakeGitHub(); github.changes = [{'filename': 'README.md'}]
        code, model = self.execute(github)
        self.assertEqual(code, 0); model.assert_not_called()
        github = FakeGitHub(); github.pr['head']['sha'] = 'c' * 40
        self.execute(github)
        self.assertEqual(github.writes, [])

    def test_skipped_review_is_labelled_skipped_not_passed(self):
        # Branch protection reads the status; humans read it, the check-run title and the
        # PR comment. On a docs-only skip, none of the three may read like an approval.
        github = FakeGitHub(); github.changes = [{'filename': 'README.md'}]
        code, model = self.execute(github)
        self.assertEqual(code, 0); model.assert_not_called()
        (_, status, _), = self.statuses(github)
        self.assertEqual(status['state'], 'success')  # Docs-only PRs are not blocked.
        self.assertEqual(status['description'], 'No web or review-pipeline changes; review skipped.')
        self.assertNotIn('passed', status['description'].lower())
        self.assertLessEqual(len(status['description']), 140)
        self.assertEqual(github.checks[0]['name'], review.CHECK)  # Branch protection keys on the name.
        self.assertEqual(github.checks[0]['conclusion'], 'success')
        self.assertIn('skipped', github.checks[0]['output']['title'].lower())
        comment = github.comments[0]['body']
        self.assertIn('No web or review-pipeline changes', comment)
        self.assertNotIn('passed', comment.lower())

    def test_real_review_keeps_passed_wording_and_a_relevant_rename_is_reviewed(self):
        for changes in ([{'filename': 'web/src/a.ts', 'status': 'modified'}],
                        [{'filename': 'README.md', 'previous_filename': 'web/src/a.ts', 'status': 'renamed'}]):
            github = FakeGitHub(); github.changes = changes
            code, model = self.execute(github)
            self.assertEqual(code, 0); model.assert_called_once()
            self.assertEqual(self.statuses(github)[0][1]['description'],
                             'Review passed; see the review comment.')
            self.assertEqual(github.checks[0]['output']['title'], review.CHECK)

    def test_duplicate_callback_does_not_charge_again(self):
        github = FakeGitHub()
        self.execute(github)
        _, model = self.execute(github)
        model.assert_not_called()

    def statuses(self, github):
        return [(path, data, method) for path, data, method in github.writes if path.startswith('/statuses/')]

    def test_branch_protection_status_is_published_beside_the_check_run(self):
        # Branch protection resolves `required_status_checks` against commit statuses,
        # so a passing check run alone leaves main blocked. Both must be written.
        for expected in ('success', 'failure'):
            github = FakeGitHub()
            result = good_review()
            if expected == 'failure':
                result['findings'] = [{'severity': 'BLOCKING', 'category': 'spec', 'file': 'web/src/a.ts', 'line': 1,
                                       'title': 'Defect', 'evidence': 'Wrong output.', 'fix': 'Correct the output.'}]
            self.execute(github, result)
            posted = self.statuses(github)
            self.assertEqual(len(posted), 1)
            path, data, method = posted[0]
            self.assertEqual(path, f'/statuses/{github.run["head_sha"]}')
            self.assertEqual(method, 'POST')
            self.assertEqual(data['state'], expected)
            self.assertEqual(data['context'], review.CHECK)
            self.assertIn('/actions/runs/10/', data['target_url'])

    def test_incomplete_review_publishes_a_failure_status(self):
        github = FakeGitHub()
        with patch.dict(os.environ):
            os.environ['REVIEW_API_KEY'] = ''
            self.execute(github)
        status = self.statuses(github)[0][1]
        self.assertEqual(status['state'], 'failure')
        # A missing key or provider outage is not a finding; the status must say so.
        self.assertIn('incomplete', status['description'].lower())
        self.assertNotIn('blocking', status['description'].lower())

    def test_unexpected_error_is_incomplete_not_blocking(self):
        github = FakeGitHub()
        with patch('review.validate_review', side_effect=RuntimeError('provider shape')):
            code, _ = self.execute(github)
        self.assertEqual(code, 1)
        status = self.statuses(github)[0][1]
        self.assertEqual(status['state'], 'failure')
        self.assertIn('incomplete', status['description'].lower())
        self.assertNotIn('blocking', status['description'].lower())

    def test_blocking_status_still_names_blocking_findings(self):
        github = FakeGitHub()
        result = good_review()
        result['findings'] = [{'severity': 'BLOCKING', 'category': 'spec', 'file': 'web/src/a.ts', 'line': 1,
                               'title': 'Defect', 'evidence': 'Wrong output.', 'fix': 'Correct the output.'}]
        self.execute(github, result)
        self.assertIn('blocking', self.statuses(github)[0][1]['description'].lower())

    def test_status_description_is_bounded_and_a_forbidden_post_keeps_the_verdict(self):
        seen = {}

        class Recorder:
            def call(self, path, data=None, method=None, **kwargs):
                seen.update(path=path, data=data, method=method)
                return {}

        class Forbidden:
            def call(self, path, data=None, method=None, **kwargs):
                raise Incomplete('API request failed (HTTP 403).')

        class Unexpected:
            # Not an Incomplete: the advisory's point is that any exception here would
            # otherwise leave a completed check run with no status, the original bug inverted.
            def call(self, path, data=None, method=None, **kwargs):
                raise RuntimeError('unexpected')

        # GitHub shows the description as plain text: no Markdown escaping (a visible
        # backslash on the PR page), and line breaks or control characters become spaces.
        self.assertTrue(review.publish_status(Recorder(), 'a' * 40, 'success', 'Re-run; see it.\nNext\x00line', 'https://example.test/run'))
        self.assertEqual(seen['data']['description'], 'Re-run; see it. Next line')
        self.assertTrue(review.publish_status(Recorder(), 'a' * 40, 'success', 'x' * 400, 'https://example.test/run'))
        self.assertEqual(seen['method'], 'POST')
        self.assertEqual(seen['path'], '/statuses/' + 'a' * 40)
        self.assertLessEqual(len(seen['data']['description']), 140)
        # A refused status must not raise: the check run and comment are already published.
        for refused in (Forbidden(), Unexpected()):
            self.assertFalse(review.publish_status(refused, 'a' * 40, 'success', 'Verdict kept.', 'https://example.test/run'))


class SkipWordingContractTests(unittest.TestCase):
    """Tests for the skip-path wording contract (contract points 1-5)."""
    # Borrow the reporter harness without inheriting, so ReporterTests does not run twice.
    setUp, execute, statuses = ReporterTests.setUp, ReporterTests.execute, ReporterTests.statuses

    def test_skip_status_says_skipped_not_passed(self):
        """Contract 1: Skip path writes one status with 'skipped' (not 'passed'), model not called."""
        github = FakeGitHub()
        github.changes = [{'filename': 'README.md'}]
        code, model = self.execute(github)
        self.assertEqual(code, 0)
        model.assert_not_called()

        posted = self.statuses(github)
        self.assertEqual(len(posted), 1, 'Exactly one commit status should be written')
        path, data, method = posted[0]
        self.assertEqual(data['state'], 'success')
        desc = data['description'].lower()
        self.assertIn('skipped', desc, f'Status description must contain "skipped" (case-insensitive): {data["description"]}')
        self.assertNotIn('passed', desc, f'Status description must NOT contain "passed" (case-insensitive): {data["description"]}')

    def test_skip_check_run_title_contains_skipped(self):
        """Contract 2: Skip path check-run has conclusion 'success' and output.title contains 'skipped', name stays CHECK."""
        github = FakeGitHub()
        github.changes = [{'filename': 'README.md'}]
        self.execute(github)

        check = github.checks[0]
        self.assertEqual(check['conclusion'], 'success')
        self.assertEqual(check['name'], review.CHECK)
        title = check['output']['title'].lower()
        self.assertIn('skipped', title, f'Check run output.title must contain "skipped" (case-insensitive): {check["output"]["title"]}')

    def test_real_review_status_description_exact(self):
        """Contract 3: Real review (web/src/a.ts) has exact status description and check-run title CHECK."""
        github = FakeGitHub()
        github.changes = [{'filename': 'web/src/a.ts', 'status': 'modified'}]
        self.execute(github)

        posted = self.statuses(github)
        self.assertEqual(len(posted), 1)
        path, data, method = posted[0]
        self.assertEqual(data['state'], 'success')
        self.assertEqual(data['description'], 'Review passed; see the review comment.')

        check = github.checks[0]
        self.assertEqual(check['output']['title'], review.CHECK)

    def test_rename_relevant_to_irrelevant_is_real_review(self):
        """Contract 4: Rename from relevant to irrelevant is treated as real review — model called, no 'skipped' in status."""
        github = FakeGitHub()
        github.changes = [{'filename': 'docs/a.md', 'previous_filename': 'web/src/a.ts', 'status': 'renamed'}]
        code, model = self.execute(github)
        self.assertEqual(code, 0)
        model.assert_called_once()

        posted = self.statuses(github)
        self.assertEqual(len(posted), 1)
        path, data, method = posted[0]
        desc = data['description'].lower()
        self.assertNotIn('skipped', desc, f'Status description must NOT contain "skipped" for rename: {data["description"]}')

    def test_all_status_descriptions_bounded_140(self):
        """Contract 5: Every status description in points 1-4 is at most 140 characters."""
        # Skip path
        github = FakeGitHub()
        github.changes = [{'filename': 'README.md'}]
        self.execute(github)
        for _, data, _ in self.statuses(github):
            self.assertLessEqual(len(data['description']), 140, f'Skip status description exceeds 140 chars: {data["description"]}')

        # Real review (success)
        github = FakeGitHub()
        github.changes = [{'filename': 'web/src/a.ts', 'status': 'modified'}]
        self.execute(github)
        for _, data, _ in self.statuses(github):
            self.assertLessEqual(len(data['description']), 140, f'Real review success status description exceeds 140 chars: {data["description"]}')

        # Real review (failure/blocking)
        github = FakeGitHub()
        github.changes = [{'filename': 'web/src/a.ts', 'status': 'modified'}]
        result = good_review()
        result['findings'] = [{'severity': 'BLOCKING', 'category': 'spec', 'file': 'web/src/a.ts', 'line': 1,
                               'title': 'Defect', 'evidence': 'Wrong output.', 'fix': 'Correct the output.'}]
        self.execute(github, result)
        for _, data, _ in self.statuses(github):
            self.assertLessEqual(len(data['description']), 140, f'Real review failure status description exceeds 140 chars: {data["description"]}')

        # Rename relevant to irrelevant
        github = FakeGitHub()
        github.changes = [{'filename': 'docs/a.md', 'previous_filename': 'web/src/a.ts', 'status': 'renamed'}]
        self.execute(github)
        for _, data, _ in self.statuses(github):
            self.assertLessEqual(len(data['description']), 140, f'Rename status description exceeds 140 chars: {data["description"]}')


class KeyWatch(dict):
    """os.environ stand-in that fails the test the moment the reviewer key is read."""

    def _guard(self, key):
        if key == 'REVIEW_API_KEY':
            raise AssertionError('manual mode read REVIEW_API_KEY')

    def __getitem__(self, key):
        self._guard(key); return super().__getitem__(key)

    def get(self, key, default=None):
        self._guard(key); return super().get(key, default)

    def __contains__(self, key):
        self._guard(key); return super().__contains__(key)


def blocking_review(file='web/src/a.ts', line=1):
    result = good_review()
    result['findings'] = [{'severity': 'BLOCKING', 'category': 'spec', 'file': file, 'line': line,
                           'title': 'Defect', 'evidence': 'Wrong output.', 'fix': 'Correct the output.'}]
    return result


class ManualModeTests(unittest.TestCase):
    """DEC-054: REVIEW_PROVIDER=manual calls no model, reads no key, and holds the gate pending."""
    statuses = ReporterTests.statuses

    def execute(self, github):
        env = KeyWatch(os.environ)
        env.update({'REVIEW_PROVIDER': 'manual', 'REVIEW_MODEL': '', 'REVIEW_API_KEY': 'must-never-be-read'})
        with patch('review.os.environ', env), patch('review.source_context', return_value={'web/src/a.ts': 'one line'}), \
             patch('review.model_request') as model:
            code = review.run_review(github, {'workflow_run': copy.deepcopy(github.run)})
        return code, model

    def test_manual_mode_publishes_pending_without_model_or_key(self):
        github = FakeGitHub()
        code, model = self.execute(github)
        self.assertEqual(code, 0); model.assert_not_called()
        (_, status, method), = self.statuses(github)
        self.assertEqual(method, 'POST')
        self.assertEqual(status['state'], 'pending')
        self.assertEqual(status['context'], review.CHECK)
        self.assertEqual(status['description'], 'Awaiting GPT-6.1 Sol review; see the review comment.')
        self.assertLessEqual(len(status['description']), 140)
        check = github.checks[0]
        self.assertEqual(check['status'], 'in_progress')
        self.assertNotIn('conclusion', check)
        self.assertIn('awaiting', check['output']['title'].lower())
        comment = github.comments[0]['body']
        self.assertTrue(comment.startswith(review.MARKER))
        self.assertIn('manual_prepare.py 7 ', comment)
        self.assertIn(f'-f pr=7 -f sha={"a" * 40} -F review=@reply.json', comment)
        self.assertIn('Builder family: `anthropic` (independent of the reviewer).', comment)
        self.assertNotIn('passed', comment.lower())

    def test_skip_path_still_passes_in_manual_mode(self):
        github = FakeGitHub(); github.changes = [{'filename': 'README.md'}]
        code, model = self.execute(github)
        self.assertEqual(code, 0); model.assert_not_called()
        (_, status, _), = self.statuses(github)
        self.assertEqual(status['state'], 'success')
        self.assertEqual(status['description'], 'No web or review-pipeline changes; review skipped.')
        self.assertEqual(github.checks[0]['conclusion'], 'success')
        self.assertIn('skipped', github.checks[0]['output']['title'].lower())

    def test_manual_mode_keeps_an_existing_manual_verdict(self):
        for state in ('success', 'failure'):
            with self.subTest(state=state):
                github = FakeGitHub()
                github.statuses = [{'context': review.CHECK, 'state': state, 'description': MANUAL_DESCRIPTIONS[state],
                                    'creator': {'login': 'github-actions[bot]'}}]
                github.comments = [{'id': 200, 'user': {'login': 'github-actions[bot]'}, 'body': review.MARKER + '\nSol verdict'}]
                github.artifact = lambda _: (_ for _ in ()).throw(AssertionError('artifact fetched'))
                code, model = self.execute(github)
                model.assert_not_called()
                self.assertEqual(code, 0 if state == 'success' else 1)
                self.assertEqual(self.statuses(github), [])  # The standing verdict is not rewritten.
                self.assertEqual(github.comments[0]['body'], review.MARKER + '\nSol verdict')
                self.assertEqual(github.checks[0]['conclusion'], state)
                self.assertIn('kept', github.checks[0]['output']['title'])
        # A model-mode verdict, a look-alike posted with a personal token, and a manual
        # verdict that a newer status has since replaced are not standing manual verdicts.
        bot = {'login': 'github-actions[bot]'}
        for standing in ([{'context': review.CHECK, 'state': 'success', 'description': 'Review passed; see the review comment.', 'creator': bot}],
                         [{'context': review.CHECK, 'state': 'success', 'description': MANUAL_DESCRIPTIONS['success'], 'creator': {'login': 'someone'}}],
                         [{'context': review.CHECK, 'state': 'pending', 'description': 'Superseded review; a newer attempt decides.', 'creator': bot},
                          {'context': review.CHECK, 'state': 'success', 'description': MANUAL_DESCRIPTIONS['success'], 'creator': bot}]):
            with self.subTest(standing=standing):
                github = FakeGitHub(); github.statuses = standing
                self.execute(github)
                self.assertEqual(self.statuses(github)[0][1]['state'], 'pending')

    def test_manual_mode_still_fails_the_gate_as_incomplete(self):
        for failure in ('gate', 'family', 'declaration', 'artifact'):
            with self.subTest(failure=failure):
                github = FakeGitHub()
                if failure == 'gate': github.run['conclusion'] = 'failure'
                if failure == 'family': github.pr['body'] = 'Builder-Model-Family: openai\nDEC-036'
                if failure == 'declaration': github.pr['body'] = 'DEC-036'
                if failure == 'artifact': github.artifact = lambda _: b'bad zip'
                code, model = self.execute(github)
                self.assertEqual(code, 1); model.assert_not_called()
                (_, status, _), = self.statuses(github)
                self.assertEqual(status['state'], 'failure')
                self.assertIn('incomplete', status['description'].lower())
                self.assertIn('incomplete', github.comments[0]['body'])


class ManualPrepareTests(unittest.TestCase):
    """manual_prepare.py gathers the exact review request, read-only, and refuses stale or ineligible PRs."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.out = Path(self.tmp.name) / 'out'

    def prepare(self, github, out=None):
        with patch('review.source_context', return_value={'web/src/a.ts': 'one line'}):
            return manual_prepare.prepare(github, 7, out or self.out)

    def test_prepare_writes_exactly_what_the_reporter_would_send(self):
        github = FakeGitHub()
        meta = self.prepare(github)
        self.assertEqual(github.writes, [])
        self.assertEqual({p.name for p in self.out.iterdir()}, set(manual_prepare.OUTPUTS))
        instructions = (self.out / 'instructions.txt').read_bytes().decode('utf-8')
        evidence_text = (self.out / 'evidence.json').read_bytes().decode('utf-8')
        evidence = json.loads(evidence_text)
        self.assertTrue(instructions.startswith('You are an independent, read-only PR reviewer.'))
        self.assertIn('TRUSTED RUBRIC:\n' + Path(review.RUBRIC).read_text(encoding='utf-8'), instructions)
        self.assertEqual((evidence['head'], evidence['base'], evidence['builder_family']), ('a' * 40, 'b' * 40, 'anthropic'))
        self.assertEqual(evidence['source_context'], {'web/src/a.ts': '1: one line'})
        self.assertEqual((meta['pr'], meta['head'], meta['base'], meta['builder_family']), (7, 'a' * 40, 'b' * 40, 'anthropic'))
        self.assertIn('/actions/runs/10/attempts/1', meta['evidence_run'])
        for name, (width, height) in IMAGES.items():
            self.assertEqual(struct.unpack('>II', (self.out / name).read_bytes()[16:24]), (width, height))
        self.assertEqual(json.loads((self.out / 'manifest.json').read_bytes())['scale'], 'css')
        # The two texts are byte-for-byte what the reporter hands a model for the same PR.
        reporter = FakeGitHub()
        with patch('review.source_context', return_value={'web/src/a.ts': 'one line'}), \
             patch('review.model_request', return_value=json.dumps(good_review())) as model, \
             patch.dict(os.environ, {'REVIEW_PROVIDER': 'google', 'REVIEW_MODEL': 'gemini-example', 'REVIEW_API_KEY': 'k'}):
            review.run_review(reporter, {'workflow_run': copy.deepcopy(reporter.run)})
        _, _, _, sent_instructions, sent_evidence, _ = model.call_args.args
        self.assertEqual(instructions, sent_instructions)
        self.assertEqual(evidence_text, sent_evidence)

    def test_prepare_refuses_moved_head_missing_evidence_and_bad_builders(self):
        cases = {
            'moved head': lambda g: g.run.update(head_sha='c' * 40),
            'no evidence run': lambda g: setattr(g, 'runs', []),
            'evidence run of another branch': lambda g: g.run.update(head_branch='other'),
            'failed evidence run': lambda g: g.run.update(conclusion='failure'),
            'evidence run still running': lambda g: g.run.update(status='in_progress', conclusion=None),
            'two builder lines': lambda g: g.pr.update(body='Builder-Model-Family: anthropic\nBuilder-Model-Family: google\nDEC-036'),
            'no builder line': lambda g: g.pr.update(body='DEC-036'),
            'builder from the manual reviewer family': lambda g: g.pr.update(body='Builder-Model-Family: openai\nDEC-036'),
            'closed PR': lambda g: g.pr.update(state='closed'),
            'docs-only PR': lambda g: setattr(g, 'changes', [{'filename': 'README.md'}]),
            'bad archive': lambda g: setattr(g, 'artifact', lambda _: b'bad zip'),
        }
        for name, change in cases.items():
            with self.subTest(case=name):
                github = FakeGitHub(); change(github)
                out = self.out / name.replace(' ', '-')
                with self.assertRaises(Incomplete):
                    self.prepare(github, out)
                self.assertEqual(github.writes, [])
                self.assertFalse(out.exists() and any(out.iterdir()))
        # A head that moves while the evidence is gathered is refused after the fact.
        github = FakeGitHub()
        def move(*args):
            github.pr = dict(github.pr, head={'sha': 'd' * 40, 'ref': 'feature'}); return {'web/src/a.ts': 'one line'}
        with patch('review.source_context', side_effect=move), self.assertRaises(Incomplete):
            manual_prepare.prepare(github, 7, self.out / 'moved-meanwhile')
        self.assertFalse(any((self.out / 'moved-meanwhile').iterdir()))
        # Nothing is ever overwritten.
        taken = self.out / 'taken'; taken.mkdir(parents=True); (taken / 'reply.json').write_text('{}')
        with self.assertRaises(Incomplete):
            self.prepare(FakeGitHub(), taken)
        self.assertEqual({p.name for p in taken.iterdir()}, {'reply.json'})


class ManualPublishTests(unittest.TestCase):
    """manual_publish.py publishes only a validated verdict for the current head, through the workflow token."""
    statuses = ReporterTests.statuses
    RUN_URL = 'https://github.com/Chrisp671/Day-4-Observatory/actions/runs/99'

    def inputs(self, result=None, **overrides):
        base = {'pr': '7', 'sha': 'a' * 40, 'review': json.dumps(result or good_review())}
        base.update(overrides)
        return base

    def publish(self, github, inputs):
        with patch('manual_publish.source_context', return_value={'web/src/a.ts': 'one line'}):
            return manual_publish.publish(github, inputs, self.RUN_URL, 'chrisp671')

    def test_publish_accepts_a_valid_review_and_posts_success(self):
        github = FakeGitHub()
        self.assertEqual(self.publish(github, self.inputs()), 0)
        (_, status, method), = self.statuses(github)
        self.assertEqual((status['state'], status['context'], method), ('success', review.CHECK, 'POST'))
        self.assertEqual(status['description'], 'GPT-6.1 Sol review passed (manual); see the review comment.')
        self.assertEqual(status['target_url'], self.RUN_URL)
        comment = github.comments[0]['body']
        self.assertTrue(comment.startswith(review.MARKER))
        self.assertIn('`openai/gpt-6.1-sol (manual, via Codex)`', comment)
        self.assertIn('Builder family: `anthropic` (independent of the reviewer).', comment)
        self.assertIn('chrisp671', comment)
        self.assertIn('/actions/runs/10/attempts/1', comment)  # The evidence run, not only the publish run.
        check = github.checks[0]
        self.assertEqual((check['name'], check['head_sha'], check['status'], check['conclusion']),
                         (review.CHECK, 'a' * 40, 'completed', 'success'))
        self.assertIsNotNone(review.manual_verdict(github, 'a' * 40))  # The reporter will leave it standing.

    def test_publish_completes_the_reporters_waiting_check_and_replaces_its_comment(self):
        github = FakeGitHub()
        ManualModeTests.execute(self, github)
        self.assertEqual(github.checks[0]['status'], 'in_progress')
        self.publish(github, self.inputs())
        self.assertEqual(len(github.checks), 1)
        self.assertEqual((github.checks[0]['status'], github.checks[0]['conclusion']), ('completed', 'success'))
        self.assertEqual(len(github.comments), 1)
        self.assertIn('(manual, via Codex)', github.comments[0]['body'])
        self.assertEqual([s['state'] for _, s, _ in self.statuses(github)], ['pending', 'success'])
        # And a second reporter callback for the same head now keeps the verdict.
        github.checks = []
        ManualModeTests.execute(self, github)
        self.assertEqual([s['state'] for _, s, _ in self.statuses(github)], ['pending', 'success'])
        self.assertIn('(manual, via Codex)', github.comments[0]['body'])

    def test_publish_posts_failure_for_a_blocking_finding(self):
        github = FakeGitHub()
        self.assertEqual(self.publish(github, self.inputs(blocking_review())), 1)
        (_, status, _), = self.statuses(github)
        self.assertEqual(status['state'], 'failure')
        self.assertEqual(status['description'], 'GPT-6.1 Sol review found blocking findings (manual); see the review comment.')
        self.assertEqual(github.checks[0]['conclusion'], 'failure')
        self.assertIn('BLOCKING', github.comments[0]['body'])

    def test_publish_rejects_bad_input_without_writing(self):
        uncertain = good_review(); uncertain['screenshots'][0]['legibility'] = 'UNCERTAIN'
        incomplete = good_review(); incomplete['complete'] = False
        extra = good_review(); extra['approved'] = True
        cases = {
            'malformed JSON': self.inputs(review='{"complete": true,'),
            'duplicate keys': self.inputs(review='{"complete":true,"complete":true}'),
            'prose around JSON': self.inputs(review='Here is my review: ' + json.dumps(good_review())),
            'nonexistent line': self.inputs(blocking_review(line=2)),
            'file outside the source context': self.inputs(blocking_review(file='web/src/other.ts')),
            'uncertain legibility': self.inputs(uncertain),
            'incomplete review': self.inputs(incomplete),
            'unknown field': self.inputs(extra),
            'sha that is not the head': self.inputs(sha='c' * 40),
            'upper-case sha': self.inputs(sha='A' * 40),
            'short sha': self.inputs(sha='a' * 12),
            'oversized review': self.inputs(review=json.dumps(good_review()) + ' ' * MANUAL_REVIEW_LIMIT),
            'empty review': self.inputs(review=''),
            'review as an object': {'pr': '7', 'sha': 'a' * 40, 'review': good_review()},
            'pr with shell text': self.inputs(pr='7; rm -rf /'),
            'pr as a number': self.inputs(pr=7),
            'no inputs': None,
        }
        for name, inputs in cases.items():
            with self.subTest(case=name):
                github = FakeGitHub()
                with self.assertRaises(Incomplete):
                    self.publish(github, inputs)
                self.assertEqual(github.writes, [])
                self.assertEqual(github.comments, [])

    def test_stale_sha_is_refused_before_the_review_is_examined(self):
        # The final freshness re-check would also catch a stale sha, but only after the
        # evidence and the review text had been processed; the head is matched first.
        github = FakeGitHub()
        with patch('manual_publish.validate_review') as validator, patch('manual_publish.evidence_run') as evidence,              self.assertRaises(Incomplete):
            self.publish(github, self.inputs(sha='c' * 40))
        validator.assert_not_called(); evidence.assert_not_called()
        self.assertEqual(github.writes, [])

    def test_oversized_review_is_refused_before_it_is_parsed(self):
        github = FakeGitHub()
        with patch('manual_publish.validate_review') as validator, self.assertRaises(Incomplete):
            self.publish(github, self.inputs(review='x' * (MANUAL_REVIEW_LIMIT + 1)))
        validator.assert_not_called()
        self.assertEqual(github.writes, [])

    def test_publish_rejects_same_family_builder_missing_evidence_and_a_moving_head(self):
        for body in ('Builder-Model-Family: openai\nDEC-036', 'DEC-036',
                     'Builder-Model-Family: anthropic\nBuilder-Model-Family: google\nDEC-036'):
            with self.subTest(body=body):
                github = FakeGitHub(); github.pr['body'] = body
                with self.assertRaises(Incomplete):
                    self.publish(github, self.inputs())
                self.assertEqual(github.writes, [])
        changes = {'failed evidence': lambda g: g.run.update(conclusion='failure'),
                   'no evidence for this head': lambda g: setattr(g, 'runs', []),
                   'docs-only PR': lambda g: setattr(g, 'changes', [{'filename': 'README.md'}]),
                   'closed PR': lambda g: g.pr.update(state='closed'),
                   'foreign base repository': lambda g: g.pr['base'].update(repo={'full_name': 'other/repo'})}
        for name, change in changes.items():
            with self.subTest(case=name):
                github = FakeGitHub(); change(github)
                with self.assertRaises(Incomplete):
                    self.publish(github, self.inputs())
                self.assertEqual(github.writes, [])
        github = FakeGitHub()
        def move(*args):
            github.pr = dict(github.pr, head={'sha': 'd' * 40, 'ref': 'feature'}); return {'web/src/a.ts': 'one line'}
        with patch('manual_publish.source_context', side_effect=move), self.assertRaises(Incomplete):
            manual_publish.publish(github, self.inputs(), self.RUN_URL)
        self.assertEqual(github.writes, [])

    def test_publish_escapes_review_text_and_names_an_unestablished_builder(self):
        github = FakeGitHub()
        result = good_review(); result['summary'] = 'Fine. ![steal](https://evil.example/) @owner'
        self.publish(github, self.inputs(result))
        comment = github.comments[0]['body']
        self.assertNotIn('![steal]', comment); self.assertNotIn('https://evil', comment); self.assertNotIn('@owner', comment)
        github = FakeGitHub(); github.pr['body'] = f'Builder-Model-Family: {ROUTED_UNKNOWN}\nDEC-036'
        self.publish(github, self.inputs())
        self.assertIn(f'Builder family: `{ROUTED_UNKNOWN}` (independence not established).', github.comments[0]['body'])


if __name__ == '__main__': unittest.main()
