# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-07-25

### Added
- **New trait implementations**:
    - `nodejs` trait: Node.js environment validation with version checking
    - `vite` trait: Comprehensive Vite build tool validation and setup
        - Vite plugin detection for React, Vue, and legacy browser support
        - Build tool conflict detection (webpack, create-react-app)
        - Vite-specific project structure validation
        - Entry point detection and configuration file validation
        - Vite-specific npm scripts validation
    - Enhanced `react` trait with comprehensive validation system
        - React DOM dependency validation
        - TypeScript types detection for React and React DOM
        - Source structure validation with component file detection
        - Main App component detection
        - React development scripts validation

### Enhanced
- **UI System Improvements**:
    - Enhanced `safePrompt` function with validated default value handling
    - Default value fallback to last choice when configured default is not selectable
    - Line-by-line YAML output for better logger integration
    - Extracted `displayYamlPlan` method for improved code organization
- **Trait System Enhancements**:
    - BaseTraitChecker integration for consistent trait validation patterns
    - Improved framework detection and plugin validation
    - Enhanced configuration file discovery with multiple naming conventions
    - Better error messaging and actionable suggestions
- **Intelligent project conflict resolution**: Significantly improved existing project handling with context-aware options
    - Git initialization option only appears when repository is not already initialized
    - Remote setup options adapt based on existing Git configuration state
    - Cleaner option labels without unnecessary suffixes
    - Dynamic option generation prevents display of irrelevant choices
    - Better handling of repositories with existing Git remotes vs. missing remotes

### Fixed
- **Post-clone phase processing**: Fixed issue where not all repositories were properly processed in the post-clone phase, ensuring complete setup workflows for all selected repositories
- **YAML output formatting**: Fixed YAML plan output to integrate properly with the logging system through line-by-line processing

### Updated
- **Dependencies**: Bumped inquirer from 9.3.7 to 12.8.2
    - Improved select prompt with better number key handling
    - Enhanced pagination logic for multi-line choices and pointer positioning
    - Better SIGINT handling to prevent unsettled promises on exit
    - Added new theme options and configuration capabilities

### Technical
- Enhanced configuration management system with comprehensive validation
- Improved cache option validation with conflict detection
- Added standardized JavaScript file documentation template
- Better error handling and system dependency checking
- More robust path resolution and directory management
- Modular trait checker architecture with inheritance-based validation
- Improved code organization through method extraction and refactoring
- Enhanced prompt system with better default value validation

### Documentation
- **Comprehensive README update**: Added detailed testing framework documentation, enhanced cache system explanation, and updated CLI usage examples
- **New command documentation**: Complete coverage of test command options and usage patterns
- Enhanced trait documentation with validation patterns and examples

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

[0.3.0]: https://github.com/RamirezRTG/multirepo.ramirezrtg.app/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/RamirezRTG/multirepo.ramirezrtg.app/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/RamirezRTG/multirepo.ramirezrtg.app/releases/tag/v0.1.0