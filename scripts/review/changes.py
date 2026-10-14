"""Determine scope without interpolating PR metadata into a shell."""
import json
import os
from pathlib import Path
import re
import subprocess

from contract import relevant

event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text(encoding='utf-8'))
base = event['pull_request']['base']['sha']
head = event['pull_request']['head']['sha']
if not all(re.fullmatch('[0-9a-f]{40}', value) for value in (base, head)):
    raise ValueError('Invalid commit identity')
diff = subprocess.run(['git', 'diff', '--name-only', '-z', '--no-renames', f'{base}...{head}', '--'],
                      check=True, capture_output=True, timeout=30).stdout.decode('utf-8')
active = any(relevant(path) for path in diff.split('\0') if path)
with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as output:
    output.write(f'relevant={str(active).lower()}\n')
