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

clone_if_missing() {
    name=$1
    dest=$PARENT_DIR/$name

    if [ -d "$dest/.git" ]; then
        printf 'skip    %s already exists\n' "$name"
        return
    fi

    printf 'clone   %s\n' "$name"
    git clone "$(repo_url "$name")" "$dest"
}

printf 'Bootstrapping sibling dependencies beside %s\n' "$REPO_ROOT"

clone_if_missing buildscripts
clone_if_missing esutil
clone_if_missing estime
clone_if_missing eslocation
clone_if_missing esastro

"$SCRIPT_DIR/doctor.sh"
