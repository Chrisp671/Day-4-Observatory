# Repository Guidelines

## Project Structure & Module Organization
`Classes/` contains the Objective-C and Objective-C++ app code, including controllers such as `MainViewController.mm`, rendering code in `EOClock.mm`, and shared utilities. `EC/` holds supporting audio code. UI resources live in `Resources/` and `Resources-iPad/` as `.xib`, images, audio, and help files. Localized strings are stored in `*.lproj/Localizable.strings`. The Xcode project is [`Observatory.xcodeproj`](./Observatory.xcodeproj), and maintenance scripts live in `scripts/`.

## Build, Test, and Development Commands
Open the app in Xcode with `open Observatory.xcodeproj` and run the `Observatory` scheme on an iPad simulator or device.

Use `xcodebuild -project Observatory.xcodeproj -scheme Observatory -configuration Debug build` to perform a command-line build.

Use `xcodebuild -project Observatory.xcodeproj -scheme Observatory -destination "platform=iOS Simulator,name=iPad (10th generation)" build` for a simulator build check.

There is no dedicated test target in this repository today, so verification is primarily build-based plus manual smoke testing.

## Coding Style & Naming Conventions
Match the existing file style: tabs are common in older files, braces stay on the same line, and Objective-C method formatting should remain unchanged within touched files. Preserve the `.m`/`.mm` split: use `.mm` only when C++ interop is required. Class names use the existing prefixes (`EO`, `EC`), constants are uppercase macros in `Constants.h`, and localized keys should stay stable across languages.

## Testing Guidelines
Before submitting, build the app and manually verify the affected flow in the simulator. For UI changes, check both portrait and landscape layouts, the main observatory screen, and the info/options screen. If you edit localization or help content, confirm the relevant `.strings` file still loads cleanly and that text appears in-app.

## Commit & Pull Request Guidelines
Recent commits use short, imperative subjects such as `Update README.md` and `Add .gitignore file`. Follow that pattern: one concise summary line per commit.

Pull requests should include a brief problem statement, the user-visible change, manual verification steps, and screenshots for UI or text-layout changes. Note any edited localization files and any external dependency assumptions from the README.

## Configuration Notes
This app depends on sibling Emerald Sequoia libraries outside this repo. Read [`README.md`](./README.md) before attempting a full build on a new machine.
