#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PARENT_DIR=$(CDPATH= cd -- "$REPO_ROOT/.." && pwd)
FAILURES=0

check_path() {
    path=$1
    label=$2

    if [ -e "$path" ]; then
        printf 'ok      %s -> %s\n' "$label" "$path"
    else
        printf 'missing %s -> %s\n' "$label" "$path"
        FAILURES=$((FAILURES + 1))
    fi
}

check_executable() {
    path=$1
    label=$2

    if [ -x "$path" ]; then
        printf 'ok      %s -> %s\n' "$label" "$path"
    else
        printf 'missing %s executable -> %s\n' "$label" "$path"
        FAILURES=$((FAILURES + 1))
    fi
}

printf 'Checking Emerald Observatory workspace in %s\n' "$REPO_ROOT"

if command -v xcodebuild >/dev/null 2>&1; then
    printf 'ok      xcodebuild -> %s\n' "$(command -v xcodebuild)"
else
    printf 'missing xcodebuild -> install Xcode command line tools on macOS\n'
    FAILURES=$((FAILURES + 1))
fi

check_path "$PARENT_DIR/buildscripts/recordSVNVersion.pl" "buildscripts helper"
check_path "$PARENT_DIR/esutil/ios/esutil.xcodeproj" "esutil project"
check_path "$PARENT_DIR/estime/ios/ESTime.xcodeproj" "ESTime project"
check_path "$PARENT_DIR/eslocation/ios/eslocation.xcodeproj" "eslocation project"
check_path "$PARENT_DIR/esastro/ios/esastro.xcodeproj" "esastro project"
check_path "$PARENT_DIR/eslocation/data/loc-data.dat" "eslocation data"
check_path "$REPO_ROOT/Observatory.xcodeproj" "Observatory project"
check_path "$REPO_ROOT/Observatory.xcodeproj/xcshareddata/xcschemes/Observatory.xcscheme" "shared Observatory scheme"
check_executable "$SCRIPT_DIR/bootstrap_dependencies.sh" "bootstrap script"
check_executable "$SCRIPT_DIR/build_simulator.sh" "simulator build script"
check_executable "$SCRIPT_DIR/checkForNSCalendar.pl" "NSCalendar build phase script"
check_executable "$SCRIPT_DIR/copyHelpFile.pl" "help file build phase script"

if [ "$FAILURES" -ne 0 ]; then
    printf 'doctor failed with %s problem(s)\n' "$FAILURES"
    exit 1
fi

printf 'doctor passed\n'
