"""Publish GPT-6.1 Sol's verdict from inside GitHub Actions (DEC-054).

Runs from review-manual.yml on the default branch with GITHUB_TOKEN. Branch
protection accepts the required `Web review` status only from GitHub Actions,
which is why a maintainer cannot post the verdict with a personal token.

Everything in the dispatch inputs is untrusted text, even when the maintainer
pasted it: `pr` and `sha` are matched exactly against the open PR's current
head, and `review` is bounded, parsed with strict_json and validated by the
same validate_review, against the same source context, that gates a model's
reply. Nothing is written to GitHub until every check has passed, and no input
is echoed to the log: failures print the pipeline's own fixed messages.
"""
import os
from pathlib import Path
import re
import sys
from urllib.parse import quote

from api import GitHub
from contract import (Incomplete, MANUAL_DESCRIPTIONS, MANUAL_REVIEWER, MANUAL_REVIEWER_LABEL, MANUAL_REVIEW_LIMIT,
                      provider_config, require, safe_text, strict_json, validate_review)
from manual_prepare import changed_files, open_pr
from review import CHECK, evidence_run, publish_status, render, source_context, update_comment


def validated_inputs(inputs):
    """(pr number, sha, review text) from the dispatch inputs, or an Incomplete naming the field."""
    require(type(inputs) is dict, 'Dispatch inputs are missing.')
    number = inputs.get('pr')
    require(type(number) is str and re.fullmatch(r'[1-9][0-9]{0,6}', number) is not None,
            'Input pr must be the pull request number.')
    sha = inputs.get('sha')
    require(type(sha) is str and re.fullmatch('[0-9a-f]{40}', sha) is not None,
            'Input sha must be the 40-hex PR head commit the review judged.')
    review = inputs.get('review')
    require(type(review) is str and 0 < len(review.encode('utf-8')) <= MANUAL_REVIEW_LIMIT,
            f'Input review must be the JSON reply, at most {MANUAL_REVIEW_LIMIT:,} UTF-8 bytes.')
    return int(number), sha, review


def publish(github, inputs, run_url, actor=''):
    number, sha, raw = validated_inputs(inputs)
    pr = open_pr(github, number)
    require(pr['head']['sha'] == sha, 'Input sha is not the current PR head; prepare and review the current head.')
    body = pr.get('body') or ''
    builder = provider_config(*MANUAL_REVIEWER, body)
    changed = changed_files(github, pr)
    run = evidence_run(github, pr)
    evidence_url = f'https://github.com/{github.repo}/actions/runs/{run["id"]}/attempts/{run["run_attempt"]}'
    sources = source_context(github, pr, changed)
    review = validate_review(raw, sources)
    conclusion = 'failure' if any(f['severity'] == 'BLOCKING' for f in review['findings']) else 'success'
    message = render(review, github.repo, sha, MANUAL_REVIEWER[0], MANUAL_REVIEWER_LABEL, evidence_url, pr['base']['sha'], builder)
    # The actor is GitHub's own login for the dispatcher, bounded and escaped like
    # any other free text; it names who published, beside the run that did.
    message += f'\n\nPublished through `review-manual.yml` by `{safe_text(str(actor)[:60])}` ([publish run]({run_url})).'
    require(len(message) <= 60000, 'Formatted review exceeds GitHub comment limits.')
    fresh = github.call(f'/pulls/{number}')
    require(fresh['state'] == 'open' and fresh['head']['sha'] == sha and fresh['body'] == pr['body']
            and fresh['base']['sha'] == pr['base']['sha'],
            'PR head, base or body changed while validating; dispatch again against the current head.')
    update_comment(github, pr, message)
    # Complete the reporter's waiting check run when there is one, else create
    # the check run the reporter would have completed. Branch protection reads
    # the status below; the check run carries the comment into the checks tab.
    checks = github.pages(f'/commits/{sha}/check-runs?check_name={quote(CHECK)}&filter=all', 'check_runs')
    waiting = [c for c in checks if c.get('app', {}).get('slug') == 'github-actions' and c.get('status') != 'completed']
    completion = {'status': 'completed', 'conclusion': conclusion,
                  'output': {'title': f'{CHECK} (manual)', 'summary': message}}
    if waiting:
        github.call(f'/check-runs/{waiting[0]["id"]}', completion, 'PATCH')
    else:
        github.call('/check-runs', {'name': CHECK, 'head_sha': sha, 'details_url': run_url,
                                    'external_id': f'day4-manual:{os.environ.get("GITHUB_RUN_ID", "local")}', **completion})
    require(publish_status(github, sha, conclusion, MANUAL_DESCRIPTIONS[conclusion], run_url),
            'The commit status could not be published; the comment and check run are in place. Re-run this workflow.')
    print(f'{CHECK}: {conclusion} (manual) published on {sha}')
    return 0 if conclusion == 'success' else 1


if __name__ == '__main__':
    try:
        event = strict_json(Path(os.environ['GITHUB_EVENT_PATH']).read_bytes())
        run_url = f'https://github.com/{os.environ["GITHUB_REPOSITORY"]}/actions/runs/{int(os.environ["GITHUB_RUN_ID"])}'
        github = GitHub(os.environ['GITHUB_REPOSITORY'], os.environ['GITHUB_TOKEN'])
        sys.exit(publish(github, event.get('inputs') if type(event) is dict else None, run_url, os.environ.get('GITHUB_ACTOR', '')))
    except Incomplete as error:
        print(f'Manual review not published: {error}', file=sys.stderr)
        sys.exit(1)
    except Exception:
        print('Manual review not published: unexpected input, evidence or API shape.', file=sys.stderr)
        sys.exit(1)
