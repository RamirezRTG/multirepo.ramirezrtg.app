# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-07-24

### Added
- **New `test` command**: Comprehensive test suite for repository handling logic
    - Interactive test mode with scenario selection
    - `--all` flag to run all test scenarios automatically
    - `--list` flag to display available test scenarios
    - Test matrix covering all combinations of URL configuration, directory states, Git repository states, and project indicators
- **Enhanced Git repository detection**: Improved handling of existing Git repositories
    - Automatic detection of Git repositories without configured URLs
    - Remote origin URL detection and helpful configuration suggestions
    - Better error messages for misconfigured Git repositories
- **Extended CLI help documentation**: Updated help text with test command examples and usage patterns

### Fixed
- **Critical path import issue**: Fixed "path is not defined" error that caused dry-run and verbose modes to fail
    - Added missing `import path from 'path';` in `scripts/core/ui.js`
    - Resolves crashes in `displayDryRunSummary()` function during dry-run operations

### Enhanced
- **Repository validation**: Improved pre-checks for existing directories with Git repositories
- **Error messaging**: More informative error messages with actionable configuration suggestions
- **Code organization**: Better separation of test functionality from core setup logic

### Technical
- Added comprehensive test matrix with 7+ test scenarios
- Implemented mock user interaction simulation for automated testing
- Enhanced repository handling logic with Git state detection
- Improved error handling and user guidance for configuration issues

## [0.1.0] - 2025-07-21

### Added
- Initial release of multirepo management tool
- Repository setup and cloning functionality
- Intelligent caching system for operations
- Interactive repository selection
- Dry-run and verbose modes
- Pre-clone and post-clone hook system
- Support for existing project detection
- Comprehensive logging and error handling

[0.2.0]: https://github.com/RamirezRTG/multirepo.ramirezrtg.app/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/RamirezRTG/multirepo.ramirezrtg.app/releases/tag/v0.1.0