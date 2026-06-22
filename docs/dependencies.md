# Dependencies

## Required Sibling Repositories

This project does not use a package manager. The Xcode project expects these repositories to live beside this repo in the parent directory:

```text
workspace/
├── Day-4-Observatory/
├── buildscripts/
├── esutil/
├── estime/
├── eslocation/
└── esastro/
```

The paths are hardcoded in `Observatory.xcodeproj/project.pbxproj`:

- `../buildscripts/recordSVNVersion.pl`
- `../esutil/ios/esutil.xcodeproj`
- `../estime/ios/ESTime.xcodeproj`
- `../eslocation/ios/eslocation.xcodeproj`
- `../esastro/ios/esastro.xcodeproj`
- `../eslocation/data/*`

## Bootstrap

On macOS, run:

```sh
scripts/bootstrap_dependencies.sh
```

Use `scripts/bootstrap_dependencies.sh ssh` if you prefer SSH remotes instead of HTTPS.

## Verification

Check the layout and toolchain with:

```sh
scripts/doctor.sh
```

`doctor.sh` verifies:

- `xcodebuild` is available
- required sibling repositories exist
- required Xcode project references exist
- location data files and build helper scripts are present

## Build Entry Point

Use the canonical simulator build wrapper:

```sh
scripts/build_simulator.sh
```

This runs `doctor.sh` first, builds the `Observatory` scheme for `generic/platform=iOS Simulator`, and disables code signing for local simulator builds.

## GitHub Actions

The repository includes `.github/workflows/ios-simulator-build.yml` so Windows-based contributors can get real Xcode feedback without owning a Mac. The workflow runs on the pinned `macos-15` hosted runner, bootstraps the sibling repositories with HTTPS clones, lists the available Xcode schemes, and uploads bootstrap/build logs as the `ios-simulator-ci-logs` artifact.
