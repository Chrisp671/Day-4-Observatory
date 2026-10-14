#!/bin/sh

set -eu

MODE=${1:-https}

case "$MODE" in
    https|ssh)
        ;;
    *)
        printf 'usage: %s [https|ssh]\n' "$0" >&2
        exit 1
        ;;
esac

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PARENT_DIR=$(CDPATH= cd -- "$REPO_ROOT/.." && pwd)

repo_url() {
    name=$1
    if [ "$MODE" = "ssh" ]; then
        printf 'git@github.com:EmeraldSequoia/%s.git' "$name"
    else
        printf 'https://github.com/EmeraldSequoia/%s.git' "$name"
    fi
}

# Pinned commits, deliberately (PLAN.md RSK-002).
#
# These five repositories are third-party and are NOT archived: buildscripts was
# last pushed 2024-09-25, and esutil, estime, eslocation and esastro were all
# pushed 2026-09-16, without this repository noticing. Cloning them at HEAD meant
# that whatever they served that day was cloned, and doctor.sh from that clone
# executed, on every push to main and every pull request. Anyone able to push to
# those repositories could therefore run code here on every PR.
#
# Each is now fetched at a fixed commit, so the build is reproducible and the
# trust surface is reviewable: to change what is trusted, change a line in this
# table, in a commit of its own, with a build that goes green. Never as a side
# effect of a rebuild.
pin() {
    case "$1" in
        buildscripts) printf '%s' 22cf403bd03db8ddfc70ed459c7fa359487e8ebe ;;
        esutil)       printf '%s' e2e4c0fd1bbf95b745e7ccb9c9093eb8dd44afae ;;
        estime)       printf '%s' a9d95dbe9bdf522c4074b63f1b66c80a560b3ff8 ;;
        eslocation)   printf '%s' 8514ca30a34553f0db8c9ce1d1889977876708fb ;;
        esastro)      printf '%s' b94f870b156037d474fbeac0bf83ca2fdcaf7034 ;;
        *)
            printf 'no pin recorded for %s; refusing to fetch it unpinned\n' "$1" >&2
            return 1
            ;;
    esac
}

fetch_pinned() {
    name=$1
    sha=$(pin "$name")
    dest=$PARENT_DIR/$name

    if [ -d "$dest/.git" ]; then
        have=$(git -C "$dest" rev-parse --verify --quiet HEAD || printf 'unknown')
        if [ "$have" = "$sha" ]; then
            printf 'ok      %-14s already at %s\n' "$name" "$sha"
            return
        fi
        printf 'drift   %-14s is at %s, not the pinned %s\n' "$name" "$have" "$sha" >&2
        printf '        move it aside, or change the pin deliberately\n' >&2
        return 1
    fi

    if [ -e "$dest" ]; then
        printf 'blocked %-14s exists and is not a git clone\n' "$name" >&2
        printf '        move it aside; this script will not delete it\n' >&2
        return 1
    fi

    printf 'fetch   %-14s at %s\n' "$name" "$sha"
    git init -q "$dest"
    git -C "$dest" remote add origin "$(repo_url "$name")"
    git -C "$dest" fetch -q --depth 1 origin "$sha"
    git -C "$dest" checkout -q --detach FETCH_HEAD
    if [ "$(git -C "$dest" rev-parse --verify --quiet HEAD || printf unknown)" != "$sha" ]; then
        printf 'failed  %-14s did not land on the pinned commit\n' "$name" >&2
        return 1
    fi
    printf 'ok      %-14s at %s\n' "$name" "$sha"
}

printf 'Bootstrapping pinned sibling dependencies beside %s\n' "$REPO_ROOT"

for repo in buildscripts esutil estime eslocation esastro; do
    fetch_pinned "$repo"
done

"$SCRIPT_DIR/doctor.sh"
