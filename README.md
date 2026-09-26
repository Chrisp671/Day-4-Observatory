# Emerald Observatory

## Overview

This directory contains code for the iOS "Emerald Observatory" app.

## Dependencies

Please see the note in the `docs` repository about dependent libraries -- the Xcode build process
requires that all of the libraries required by this app be at the same level as the app directory
itself.

One way to set up the dependencies required for Observatory would be to use [ssh](https://docs.github.com/en/authentication/connecting-to-github-with-ssh):

```shell
mkdir emeraldsequoia
cd emeraldsequoia
git clone git@github.com:EmeraldSequoia/Observatory.git
git clone git@github.com:EmeraldSequoia/buildscripts.git
git clone git@github.com:EmeraldSequoia/esutil.git
git clone git@github.com:EmeraldSequoia/estime.git
git clone git@github.com:EmeraldSequoia/eslocation.git
git clone git@github.com:EmeraldSequoia/esastro.git

```

## Xcode project

The Xcode project file for the app is at the top level of this repository, at `Observatory.xcodeproj`.
It has only one target, so to build and run the app, just choose a destination (a simulator or,
if you have set up your Xcode development profiles, a device) and select Product -> Run.


## Cloud development from Windows and Codex Cloud

This legacy iPad app still requires Xcode on macOS for authoritative builds. If you are working
from Windows or Codex Cloud on Ubuntu, use GitHub Actions rather than trying to run Xcode locally.

### Trigger the simulator build

The workflow is named **iOS Simulator Build** and lives at
`.github/workflows/ios-simulator-build.yml`. It runs automatically for pushes to `main` and for
pull requests. You can also start it manually from GitHub:

1. Open the repository on GitHub.
2. Select **Actions**.
3. Select **iOS Simulator Build**.
4. Choose **Run workflow**, select the branch, and confirm **Run workflow**.

### Download the simulator app artifact

After a successful run, open the completed workflow run and scroll to **Artifacts**. Download
**Observatory-simulator-app**, which contains `Observatory-simulator-app.zip`. The zip packages the
unsigned simulator-only `Observatory.app` built from `.derivedData/Build/Products/Debug-iphonesimulator/`.
It is useful for simulator inspection and debugging, but it is not signed for devices, TestFlight, or
the App Store.

The workflow also uploads **ios-simulator-ci-logs**. Download that artifact when the build fails or
when you need to inspect dependency bootstrapping and `xcodebuild` output from a machine without macOS.

### What Codex Cloud can and cannot do

Codex Cloud runs on Ubuntu, so it can review and edit source files, scripts, documentation, project
metadata, and GitHub Actions configuration. It can run non-Xcode checks such as shell syntax checks
and repository searches. It cannot run Xcode, launch an iOS simulator, open Interface Builder files,
or perform manual iPad smoke testing. Treat the macOS GitHub Actions workflow as the source of truth
for simulator build validation until a local Mac is available.

## Versioning

TBD

## Links to Emerald Sequoia website

The help file has links to the Emerald Sequoia website for
things like Copyright notices and release notes. These should be
changed to point to GitHub somewhere, as the Emerald Sequoia website
is going away.
