import base64
import copy
import io
import json
import os
from pathlib import Path
import struct
import unittest
from unittest.mock import patch
import zipfile

import api
import review
from contract import (CANON, IMAGES, Incomplete, plan_entries, provider_config,
                      read_artifact, relevant, safe_text, strict_json, validate_review)


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
        for args in [('google', 'gemini-example', 'Builder-Model-Family: google'),
                     ('openai', 'claude-example', 'Builder-Model-Family: google'),
                     ('openai', '../evil', 'Builder-Model-Family: google'),
                     ('openai', 'gpt-example', ''), ('unknown', 'x', 'Builder-Model-Family: openai')]:
            with self.assertRaises(Incomplete): provider_config(*args)

    def test_plan_requires_citations_and_includes_canon(self):
        plan = '\n'.join(f'- {key} — policy' for key in sorted(CANON | {'WI-027'}))
        self.assertEqual(set(plan_entries(plan, 'Implements WI-027')), CANON | {'WI-027'})
        for body in ('No citations', 'WI-999'):
            with self.assertRaises(Incomplete): plan_entries(plan, body)
        self.assertTrue(relevant('.github/workflows/review-web-report.yml'))
        self.assertTrue(relevant('PLAN.md'))
        self.assertFalse(relevant('Resources/help.html'))

    def test_provider_adapters_send_eight_images_and_reject_truncation(self):
        images = {name: b'image' for name in IMAGES}
        responses = {
            'openai': {'status': 'completed', 'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': '{}'}]}]},
            'anthropic': {'stop_reason': 'end_turn', 'content': [{'type': 'text', 'text': '{}'}]},
            'google': {'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': '{}'}]}}]},
        }
        for provider, response in responses.items():
            with self.subTest(provider=provider), patch('api.request', return_value=json.dumps(response).encode()) as transport:
                self.assertEqual(api.model_request(provider, 'model', 'test-key', 'policy', 'evidence', images), '{}')
                args = transport.call_args.args
                payload = json.dumps(args[2])
                self.assertEqual(payload.count(base64.b64encode(b'image').decode()), 8)
                self.assertNotIn('tools', args[2])
                self.assertNotIn('test-key', payload)
            with patch('api.request', return_value=b'{}'), self.assertRaises(Incomplete):
                api.model_request(provider, 'model', 'test-key', 'policy', 'evidence', images)

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
            return {}
        if path == '/actions/runs/10': return self.run
        if path == '/pulls/7': return 'diff --git a/web/src/a.ts b/web/src/a.ts' if kwargs.get('accept') else self.pr
        raise AssertionError(path)

    def pages(self, path, key=None, **kwargs):
        if '/workflows/' in path: return [self.run]
        if '/check-runs?' in path: return self.checks
        if path.endswith('/files'): return self.changes
        if path.endswith('/jobs'): return [{'name': 'Gate and capture', 'conclusion': 'success'}]
        if path.endswith('/comments'): return self.comments
        raise AssertionError(path)

    def artifact(self, run_id): return artifact()

    def file(self, path, ref): return '\n'.join(f'- {key} — canon' for key in sorted(CANON))


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

    def test_duplicate_callback_does_not_charge_again(self):
        github = FakeGitHub()
        self.execute(github)
        _, model = self.execute(github)
        model.assert_not_called()


if __name__ == '__main__': unittest.main()
