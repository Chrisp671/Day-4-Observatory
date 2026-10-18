"""Gather what GPT-6.1 Sol reviews, on the maintainer's machine, read-only (DEC-054).

Usage, from a checkout of main:

    python scripts/review/manual_prepare.py <pr-number> <empty-output-folder>

Reads the PR, its latest evidence run and that run's artifact through the
GitHub API with GITHUB_TOKEN or the token `gh auth token` prints, builds the
exact instructions and evidence the reporter would send to a model, and writes
them beside the eight screenshots, the capture manifest and a meta.json. It
never writes to GitHub: the verdict is published by review-manual.yml.

Refused: a closed PR or one from another repository, a head without a
successful evidence run (the head moved, or the build failed), a body without
exactly one accepted Builder-Model-Family line, a builder from the manual
reviewer's own family, a PR the reporter would skip, and a non-empty folder.
"""
import json
import os
from pathlib import Path
import re
import subprocess
import sys

from api import GitHub
from contract import (IMAGES, Incomplete, MANUAL_REVIEWER, provider_config, read_artifact, relevant, require,
                      ROUTED_UNKNOWN)
from review import evidence_run, review_request, RUBRIC

REPO = 'Chrisp671/Day-4-Observatory'
# The reporter reads the rubric from its default-branch checkout; the helper
# fetches the same branch's copy so a PR cannot hand Sol its own rubric.
DEFAULT_BRANCH = 'main'
OUTPUTS = ('instructions.txt', 'evidence.json', 'manifest.json', 'meta.json') + tuple(IMAGES)


def token():
    value = os.environ.get('GITHUB_TOKEN', '').strip()
    if value:
        return value
    try:
        done = subprocess.run(['gh', 'auth', 'token'], check=True, capture_output=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        raise Incomplete('No GITHUB_TOKEN and `gh auth token` failed; run `gh auth login` first.') from None
    return done.stdout.decode('utf-8', errors='replace').strip()


def changed_files(github, pr):
    changed = github.pages(f'/pulls/{pr["number"]}/files', max_pages=30)
    require(len(changed) == pr['changed_files'], 'PR file list was truncated.')
    require(any(relevant(f['filename']) or relevant(f.get('previous_filename', '')) for f in changed),
            'No web or review-pipeline changes; the reporter skips this PR and no manual review is needed.')
    return changed


def open_pr(github, number):
    """The PR, checked to be an open PR of this repository with a well-formed head."""
    pr = github.call(f'/pulls/{number}')
    require(pr['state'] == 'open' and pr['base']['repo']['full_name'] == github.repo,
            'Not an open pull request of this repository.')
    require(re.fullmatch('[0-9a-f]{40}', pr['head']['sha']), 'Invalid PR head commit.')
    return pr


def prepare(github, number, outdir):
    """Write the review request for PR `number` into `outdir`; returns the meta record."""
    folder = Path(outdir)
    folder.mkdir(parents=True, exist_ok=True)
    require(not any(folder.iterdir()), 'Output folder must be empty; nothing is overwritten.')
    pr = open_pr(github, number)
    sha = pr['head']['sha']
    body = pr.get('body') or ''
    builder = provider_config(*MANUAL_REVIEWER, body)
    changed = changed_files(github, pr)
    run = evidence_run(github, pr)
    images, manifest = read_artifact(github.artifact(run['id']))
    rubric = github.file(RUBRIC, DEFAULT_BRANCH)
    instructions, evidence, sources = review_request(github, pr, changed, builder, manifest, rubric)
    fresh = github.call(f'/pulls/{number}')
    require(fresh['state'] == 'open' and fresh['head']['sha'] == sha and fresh['body'] == pr['body']
            and fresh['base']['sha'] == pr['base']['sha'],
            'PR head, base or body changed while gathering evidence; run again.')
    run_url = f'https://github.com/{github.repo}/actions/runs/{run["id"]}/attempts/{run["run_attempt"]}'
    meta = {'pr': pr['number'], 'head': sha, 'base': pr['base']['sha'], 'builder_family': builder,
            'independence': 'not established' if builder == ROUTED_UNKNOWN else 'checked',
            'reviewer': '/'.join(MANUAL_REVIEWER), 'evidence_run': run_url,
            'evidence_run_id': run['id'], 'evidence_run_attempt': run['run_attempt'],
            'source_files': sorted(sources), 'images': sorted(images)}
    (folder / 'instructions.txt').write_bytes(instructions.encode('utf-8'))
    (folder / 'evidence.json').write_bytes(evidence.encode('utf-8'))
    (folder / 'manifest.json').write_bytes(json.dumps(manifest, indent=1).encode('utf-8'))
    for name in IMAGES:  # Fixed names from the contract, never from the archive.
        (folder / name).write_bytes(images[name])
    (folder / 'meta.json').write_bytes(json.dumps(meta, indent=1).encode('utf-8'))
    return meta


if __name__ == '__main__':
    try:
        require(len(sys.argv) == 3 and re.fullmatch(r'[1-9][0-9]{0,6}', sys.argv[1]) is not None,
                'Usage: manual_prepare.py <pr-number> <empty-output-folder>')
        record = prepare(GitHub(REPO, token()), int(sys.argv[1]), sys.argv[2])
        print(f'PR #{record["pr"]} head {record["head"]}: review request written to {sys.argv[2]} '
              f'({len(record["source_files"])} source files, {len(record["images"])} images). '
              f'Give instructions.txt, evidence.json and the images to GPT-6.1 Sol; publish the reply with:')
        print(f'  gh -R {REPO} workflow run review-manual.yml -f pr={record["pr"]} -f sha={record["head"]} -F review=@reply.json')
    except Incomplete as error:
        print(f'Not prepared: {error}', file=sys.stderr)
        sys.exit(1)
    except Exception:
        print('Not prepared: unexpected evidence or API shape.', file=sys.stderr)
        sys.exit(1)
