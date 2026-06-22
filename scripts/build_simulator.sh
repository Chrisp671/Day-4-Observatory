#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PROJECT=${PROJECT:-Observatory.xcodeproj}
SCHEME=${SCHEME:-Observatory}
CONFIGURATION=${CONFIGURATION:-Debug}
DESTINATION=${DESTINATION:-generic/platform=iOS Simulator}
DERIVED_DATA_PATH=${DERIVED_DATA_PATH:-$REPO_ROOT/.derivedData}

"$SCRIPT_DIR/doctor.sh"

cd "$REPO_ROOT"

xcodebuild \
    -project "$PROJECT" \
    -scheme "$SCHEME" \
    -configuration "$CONFIGURATION" \
    -destination "$DESTINATION" \
    -derivedDataPath "$DERIVED_DATA_PATH" \
    CODE_SIGNING_ALLOWED=NO \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGN_IDENTITY= \
    PROVISIONING_PROFILE= \
    PROVISIONING_PROFILE_SPECIFIER= \
    build \
    "$@"
