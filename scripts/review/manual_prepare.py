"""Gather what GPT-6.1 Sol reviews, on the maintainer's machine, read-only (DEC-054).

Usage, from a checkout of main:

    python scripts/review/manual_prepare.py <pr-number> <empty-output-folder>

Reads the PR, its latest evidence run and that run's artifact through the
GitHub API with GITHUB_TOKEN or the token `gh auth token` prints, builds the
exact instructions and evidence the reporter would send to a model, and writes
them beside the eight screenshots, the capture manifest and a meta.json. It
never writes to GitHub: the verdict is published by review-manual.yml.

evidence.json is one line that can approach a megabyte, more than a reviewer's
file tool returns in one piece, so the same text is also written as small
ordered files under parts/ with an INDEX.txt (DEC-058). The parts are a reading
aid: evidence.json stays the authority, and nothing reads the parts back.

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
PARTS = 'parts'
INDEX = 'INDEX.txt'
OUTPUTS = ('instructions.txt', 'evidence.json', 'manifest.json', 'meta.json', PARTS) + tuple(IMAGES)
# A part holds at most this many characters: about what a reviewer's file tool
# returns whole, and a few hundred lines to read in slices.
PART_CHARS = 40_000
# The evidence keys too large to read in one piece. Each gets parts of its own;
# every other key, present or future, travels together in the first part.
SPLIT_KEYS = ('diff', 'source_context', 'plan_entries', 'base_design_canon')
SLUG_CHARS = 100
PART_NAME = re.compile(r'[0-9][A-Za-z0-9._-]{0,159}')


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


def cut(text, size):
    """`text` as consecutive pieces of at most `size` characters.

    ''.join(cut(text, size)) == text for every text: nothing is added, dropped
    or changed. A piece ends after a line feed wherever one falls within reach;
    only a single line longer than `size` is cut inside the line. An empty text
    is one empty piece, so an empty file still has a part to show for it.
    """
    pieces = []
    start = 0
    while len(text) - start > size:
        end = text.rfind('\n', start, start + size) + 1
        if end <= start:
            end = start + size
        pieces.append(text[start:end])
        start = end
    pieces.append(text[start:])
    return pieces


def part_slug(path):
    """A repository path as a harmless fragment of a file name.

    The path is PR data, so nothing in it is trusted to be a path: `/` becomes
    `__`, every character outside A-Z a-z 0-9 . _ - becomes `_` (backslash,
    drive colon, control characters, spaces, everything non-ASCII), and a run of
    dots or a final dot becomes `_`, so no separator survives and no `..` can
    appear, even where the slug meets the `.partK` that follows it. Long paths
    keep their tail, where the file name is. Two paths may share a slug; the
    caller numbers the sources, so names never rely on the slug to be unique.
    """
    slug = re.sub(r'[^A-Za-z0-9._-]', '_', path.replace('/', '__'))
    return re.sub(r'\.{2,}|\.$', '_', slug)[-SLUG_CHARS:]


def numbered(prefix, items, suffix='.txt'):
    """(name, item, number) for each item, named `prefix01suffix`, `prefix02suffix`...

    Zero-padded to the count, so the names sorted as text are in reading order.
    """
    width = max(2, len(str(len(items))))
    return [(f'{prefix}{number:0{width}}{suffix}', item, number) for number, item in enumerate(items, 1)]


def evidence_parts(evidence, size=PART_CHARS):
    """The evidence text as an ordered list of (file name, text, what it holds).

    A reading aid for evidence.json, derived from that very text and from
    nothing else, so the two cannot disagree (DEC-058):

    - `00-meta-and-pr-body.json`: every evidence key outside SPLIT_KEYS.
    - `01-plan-entries.txt`, `02-base-design-canon.txt`: one block per entry.
    - `10-diff-NN.txt`: the diff. Joined in order they are evidence['diff'].
    - `20-src-NN-<slug>.partK.txt`: one source_context entry per NN, in path
      order. The parts of one NN joined in order are that entry, exactly.

    The list order is the reading order and also the order of the names sorted
    as text. Every name is a plain file name built from fixed text, counters
    and part_slug, checked against PART_NAME before it is returned: a name that
    is not one is a refusal, never a write.
    """
    data = json.loads(evidence)
    rest = {key: value for key, value in data.items() if key not in SPLIT_KEYS}
    parts = [('00-meta-and-pr-body.json', json.dumps(rest, indent=1, ensure_ascii=False),
              'evidence keys ' + ', '.join(rest))]
    for name, key in (('01-plan-entries.txt', 'plan_entries'), ('02-base-design-canon.txt', 'base_design_canon')):
        parts.append((name, ''.join(f'===== {entry} =====\n{text}\n\n' for entry, text in data[key].items()),
                      f'evidence key {key}, one block per entry'))
    pieces = cut(data['diff'], size)
    parts += [(name, text, f'diff, part {number} of {len(pieces)}')
              for name, text, number in numbered('10-diff-', pieces)]
    sources = sorted(data['source_context'])
    for prefix, path, _ in numbered('20-src-', sources, ''):
        pieces = cut(data['source_context'][path], size)
        width = len(str(len(pieces)))
        # json.dumps keeps the real path exact and on one line whatever it contains.
        parts += [(f'{prefix}-{part_slug(path)}.part{number:0{width}}.txt', text,
                   f'source_context {json.dumps(path)}, part {number} of {len(pieces)}')
                  for number, text in enumerate(pieces, 1)]
    names = [name for name, _, _ in parts]
    require(all(PART_NAME.fullmatch(name) and '..' not in name for name in names)
            and len({name.lower() for name in names}) == len(names),
            'A review part would not have a plain, unique file name; nothing was written.')
    return parts


def lines_of(text):
    """How many lines a reader's tool counts in `text`: line feeds, plus an unfinished last line."""
    return text.count('\n') + (1 if text and not text.endswith('\n') else 0)


def index_text(parts):
    """INDEX.txt: one line per part in reading order, tab-separated: name, characters, lines, what it holds."""
    return ''.join(f'{name}\t{len(text)}\t{lines_of(text)}\t{what}\n' for name, text, what in parts)


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
    instructions, evidence, sources = review_request(github, pr, changed, builder, manifest, rubric, 'manual')
    # Every name is settled, and seen to resolve inside parts/, before anything is written.
    parts = evidence_parts(evidence, PART_CHARS)
    root = (folder / PARTS).resolve()
    require(all((root / name).resolve().parent == root for name, _, _ in parts),
            'A review part would be written outside the parts folder; nothing was written.')
    fresh = github.call(f'/pulls/{number}')
    require(fresh['state'] == 'open' and fresh['head']['sha'] == sha and fresh['body'] == pr['body']
            and fresh['base']['sha'] == pr['base']['sha'],
            'PR head, base or body changed while gathering evidence; run again.')
    run_url = f'https://github.com/{github.repo}/actions/runs/{run["id"]}/attempts/{run["run_attempt"]}'
    meta = {'pr': pr['number'], 'head': sha, 'base': pr['base']['sha'], 'builder_family': builder,
            'independence': 'not established' if builder == ROUTED_UNKNOWN else 'checked',
            'reviewer': '/'.join(MANUAL_REVIEWER), 'evidence_run': run_url,
            'evidence_run_id': run['id'], 'evidence_run_attempt': run['run_attempt'],
            'source_files': sorted(sources), 'images': sorted(images),
            'parts': [name for name, _, _ in parts]}
    (folder / 'instructions.txt').write_bytes(instructions.encode('utf-8'))
    (folder / 'evidence.json').write_bytes(evidence.encode('utf-8'))
    (folder / 'manifest.json').write_bytes(json.dumps(manifest, indent=1).encode('utf-8'))
    for name in IMAGES:  # Fixed names from the contract, never from the archive.
        (folder / name).write_bytes(images[name])
    (folder / PARTS).mkdir()
    for name, text, _ in parts:  # Names passed PART_NAME; 'xb' creates and never replaces.
        with open(folder / PARTS / name, 'xb') as part:
            part.write(text.encode('utf-8'))
    (folder / PARTS / INDEX).write_bytes(index_text(parts).encode('utf-8'))
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
        print(f'For a large review, evidence.json is also in {len(record["parts"])} readable parts: '
              f'start at {PARTS}/{INDEX} (scripts/review/README.md, "Large reviews").')
    except Incomplete as error:
        print(f'Not prepared: {error}', file=sys.stderr)
        sys.exit(1)
    except Exception:
        print('Not prepared: unexpected evidence or API shape.', file=sys.stderr)
        sys.exit(1)
