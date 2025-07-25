# Multirepo Setup Tool

**Interactive Multi-Repository Management with Intelligent Caching & Comprehensive Testing**

A CLI tool that streamlines the setup and management of multiple repositories through intelligent caching, trait-based automation, comprehensive validation, and extensive testing capabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What this tool is about

Initially I just wanted to create a monorepo for a project that consists of 4 distinct sub-applications. But, as I started to simultaneously set up the components,
I realized this simply doesn't work for me. So I started with the wrapper project, aka the multirepo, approach. After learning a lot about nodejs that way, brainstorming
with real and artificial people, this is what was created. Maybe this solves someone else's problem someday.

Micro-Disclaimer: Many passages are created with the help of a coding AI. I am not ashamed of it, because the whole concept is still a good old HUMAN brain child. AI is a tool
like any other and will never replace human ingenuity. But it helped bring this project to life when I was stuck and will help in it's expansion.

## Key Features

### Intelligent Caching System
- **Smart change detection** through SHA256-based checksums
- **Automatic cache invalidation** when dependencies, scripts, or configurations change
- **Significant performance improvements** on subsequent runs (up to 90%+ cache efficiency)
- **Team-shareable cache state** via lock file
- **Cache effectiveness analytics** with detailed reporting

### Interactive Repository Management
- Multi-select interface for choosing repositories to process
- **Context-aware conflict resolution** with smart handling options
- Existing project detection with Git repository state analysis
- Empty folder support for new project scaffolding
- **Dynamic option generation** based on actual repository state

### Comprehensive Testing Framework
- **Automated test matrix** covering all repository handling scenarios
- **Interactive test mode** for focused debugging and development
- **Mock user interaction simulation** for testing interactive prompts
- **Cross-platform compatibility testing** with proper cleanup procedures
- **Comprehensive scenario coverage** (URL/no-URL, Git states, project types)

### Trait-Based Automation
- Reusable validation scripts for common project types (npm, PHP, React, Symfony, etc.)
- Hierarchical trait dependencies with automatic resolution
- Mixed execution modes (check functions vs traditional scripts)
- Custom hook support for repository-specific logic
- **Intelligent trait suggestion system** based on project analysis

### Enhanced Error Handling & Recovery
- **Three-phase execution model** ensuring consistency
- **Graceful degradation** with partial success scenarios
- **Comprehensive error recovery** with detailed diagnostics
- **Signal handling** for clean shutdown (SIGINT, SIGTERM)
- **Development vs production error levels** for appropriate detail

### Performance & Reliability
- Async/await throughout for non-blocking operations
- **Cache effectiveness reporting** with optimization metrics
- **Detailed progress tracking** with grouped, colored output
- Dry-run support for safe previewing
- **Statistical analysis** of setup operations

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git installed and configured
- Access to your repositories

### Installation & First Run

```bash
# Clone or download the multirepo tool
git clone https://github.com/your-org/multirepo-setup.git
cd multirepo-setup

# Install dependencies
npm install

# Run the interactive setup
./bin/console setup

# Or with detailed logging
./bin/console setup --verbose

# Test the repository handling logic
./bin/console test
```

### What Happens Next
1. Interactive repository selection from your `repos.yaml`
2. **Cache effectiveness analysis** and optimization reporting
3. Environment validation with intelligent caching
4. **Context-aware conflict resolution** for existing projects
5. Automated cloning or project detection
6. Trait-based setup and validation
7. **Comprehensive analytics** and success reporting

**First run**: Full setup with cache creation  
**Subsequent runs**: Optimized execution with intelligent caching (often 70-90% operations skipped)

---

## Command Line Interface

### Basic Usage
```bash
multirepo <command> [options]
```

### Core Commands
- `setup` - Interactive repository setup with intelligent caching
- `test` - Comprehensive test suite for repository handling logic

### Options Overview

#### Basic Controls
```bash
--verbose, -v      # Detailed logging and progress information
--dry-run, -d      # Preview actions without making changes
--help, -h         # Show comprehensive help
```

#### Cache Management
```bash
--force-all        # Skip all cache, run everything fresh
--force-preclone   # Re-run environment validation only
--force-postclone  # Re-run project setup only
--skip-cache       # Ignore cache system entirely
--clear-lock       # Delete cache and start fresh
--update-lock      # Update cache without skipping operations
```

#### Testing Options
```bash
--all              # Run complete test suite automatically
--list             # Display available test scenarios
--verbose, -v      # Enable detailed test debugging output
```

### Common Usage Examples
```bash
# Standard workflow - fast with caching
multirepo setup

# Debugging or troubleshooting
multirepo setup --verbose --dry-run

# After system updates
multirepo setup --force-preclone

# After dependency changes
multirepo setup --force-postclone

# Complete refresh
multirepo setup --force-all

# Team sync - update shared cache
multirepo setup --update-lock

# Run comprehensive tests
multirepo test --all

# Interactive testing for development
multirepo test

# List all test scenarios
multirepo test --list
```
---

## Comprehensive Testing System

### Test Matrix Coverage

The tool includes an extensive test suite that validates repository handling across all possible scenarios:

**Test Dimensions:**
- **URL Configuration**: Repository has URL vs no URL configured
- **Directory States**: Exists/doesn't exist, empty/contains files
- **Git Repository States**: No git, git without remote, git with wrong/correct remote
- **Project Indicators**: Has package.json and source files vs random files only

### Test Execution Modes

**Interactive Mode (Default):**
```bash
multirepo test
# Select individual scenarios or run complete suite
```

**Automated Full Suite:**
```bash
multirepo test --all
# Runs all 13+ test scenarios automatically
```

**Scenario Information:**
```bash
multirepo test --list
# Display all available test scenarios with descriptions
```

### Test Scenario Examples

The test matrix includes scenarios like:
- `URL_01`: Fresh clone into non-existent directory
- `URL_04`: Existing project with URL - offers integration options
- `NO_URL_04`: Existing project without URL - limited options
- `ERROR_GIT_NO_URL`: Git repo without URL configuration

### Mock Interaction Testing

- **Automated user response simulation** for interactive prompts
- **Realistic test environments** with proper Git repository setup
- **Cross-platform compatibility** testing and cleanup
- **Comprehensive result analysis** with performance metrics

---

## Intelligent Caching System

### How Smart Caching Works

The tool creates a `multirepo.lock` file tracking:

| What's Tracked | When Cache Invalidates | Benefit |
|----------------|----------------------|---------|
| **Repository content** | Any file changes in repos | Skip unchanged project setup |
| **Trait scripts** | Script or config modifications | Skip environment checks |
| **Dependencies** | package.json, composer.json changes | Skip installation steps |
| **Global config** | repos.yaml modifications | Skip validation steps |

### Cache Performance Analytics

The system provides detailed cache effectiveness reporting:
```bash
# Example cache efficiency output
Cache Optimization Performance:
PreClone operations cached: 4/5 (80%)
PostClone operations cached: 3/4 (75%)
Overall cache efficiency: 78% (7/9 operations optimized)
```

### Cache Control Strategies

**Team Development:**
```bash
# Commit multirepo.lock for shared cache state
git add multirepo.lock
git commit -m "Update multirepo cache"
```

**Individual Development:**
```bash
# Add to .gitignore for personal caching
echo "multirepo.lock" >> .gitignore
```

**Troubleshooting:**
```bash
# Nuclear option - fresh start
multirepo setup --clear-lock --force-all
```
---

## Enhanced Repository Conflict Resolution

### Context-Aware Options

The tool now intelligently adapts its options based on the actual state of repositories:

**For repositories WITH URLs:**
- Git initialization only shown when git is not already initialized
- Remote setup options adapt based on existing Git configuration
- Remote update prompts when URLs don't match
- Clean "Use existing project" option without unnecessary suffixes

**For repositories WITHOUT URLs:**
- Limited but appropriate options for local development
- Smart error handling for misconfigured Git repositories
- Helpful suggestions for configuration improvements

### Dynamic Option Generation

Instead of showing fixed options, the system analyzes:
- Current Git repository state
- Remote configuration status
- URL availability in configuration
- Project structure indicators

Then generates contextually appropriate choices for each situation.

---

## Configuration: `repos.yaml`

Define your repository ecosystem in a declarative format:
```yaml
repos:
  # Frontend applications
  react-dashboard:
    url: https://github.com/company/react-dashboard.git
    traits: ['npm', 'react', 'typescript']
    
  vue-storefront:
    url: https://github.com/company/vue-storefront.git
    traits: ['npm', 'vue']
    
  # Backend services
  api-gateway:
    url: https://github.com/company/api-gateway.git
    traits: ['php', 'composer', 'symfony']
    postClone: 'composer install --no-dev'
    
  user-service:
    url: https://github.com/company/user-service.git
    traits: ['npm', 'node', 'typescript']
    postClone: 'setup-database.js'
    
    # Development tools
  shared-configs:
    url: https://github.com/company/configs.git
    traits: ['tools']
    
  # Local development
  local-proxy:
    # No URL = creates empty folder for local development
    traits: ['nginx']
```

### Repository Configuration Options

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `url` | `string` | **Yes*** | Git repository URL (HTTPS/SSH). *Omit to create empty folder |
| `traits` | `string[]` | No | Automation traits to apply (npm, php, react, etc.) |
| `preClone` | `string` | No | Command or script to run before cloning |
| `postClone` | `string` | No | Command or script to run after cloning |

---

## Trait-Based Automation System

### Built-in Traits

Transform repetitive setup tasks into reusable automation:

**Language & Runtime**
- `npm` - Node.js package management
- `php` - PHP environment validation

**Frameworks & Tools**
- `react` - React application setup
- `vue` - Vue.js project validation
- `symfony` - Symfony framework setup
- `composer` - PHP Composer dependency management
- `typescript` - TypeScript configuration

**Development Tools**
- `jest` - JavaScript testing framework
- `eslint` - JavaScript linting
- `prettier` - Code formatting
- `vite` - Modern build tool
- `webpack` - Module bundler
- `nextjs` - Next.js framework
- `express` - Express.js server framework

### Intelligent Trait Suggestion

The system can analyze repositories and suggest missing traits:
```
bash
# Automatic trait recommendations based on project analysis
React dependencies detected. Consider adding 'react' trait for enhanced validation.
TypeScript configuration detected. Consider adding 'typescript' trait for enhanced setup.
```
### Creating Custom Traits

**1. Create trait structure:**
```bash
scripts/traits/my-trait/
├── config.yaml      # Trait configuration
├── preClone.js      # Environment validation
└── postClone.js     # Project setup
```

**2. Configure the trait:**
```yaml
# scripts/traits/my-trait/config.yaml
hasCheckFunction:
  preClone: true     # Use check() function
  postClone: false   # Use traditional script
  traits:
    - base-trait       # Dependencies
```

**3. Implement validation logic:**
```javascript
// scripts/traits/my-trait/preClone.js
export async function check(context) {
const { cwd, repo, logger } = context;

    // Your validation logic here
    logger.info(`Validating ${repo.name} environment...`);

    if (!isEnvironmentReady()) {
        throw new Error('Environment not ready');
    }

    logger.success('Environment validation passed');
}
```

### Trait Hierarchies

Build sophisticated automation with trait dependencies:
```yaml
# Complex trait with dependencies
# scripts/traits/symfony-api/config.yaml
traits:
- php           # Ensures PHP is available
- composer      # Ensures Composer works
- symfony       # Symfony-specific setup
# symfony-api runs last, after all dependencies
```

**Execution order**: `php` → `composer` → `symfony` → `symfony-api`

---

## Advanced Features

### Three-Phase Execution Model

The tool uses a carefully orchestrated approach ensuring reliability:

**Phase 1: Environment Validation (preClone)**
- System dependency checks
- Tool availability validation
- Environment prerequisites
- **Cached when environment unchanged**
- **Cache efficiency reporting**

**Phase 2: Repository Operations (clone)**
- Git cloning or folder creation
- **Context-aware conflict resolution**
- Existing project detection and integration
- **Always runs when needed**

**Phase 3: Project Setup (postClone)**
- Dependency installation
- Configuration validation
- Project-specific setup
- **Cached when content unchanged**
- **Graceful error recovery**

### Enhanced Error Recovery & Handling

- **Graceful degradation**: Continue processing other repositories on failure
- **Detailed error reporting**: Pinpoint exact failure reasons with stack traces in development
- **Cache-aware recovery**: Failed operations don't pollute cache
- **Interactive problem solving**: Context-aware prompts for resolution
- **Signal handling**: Clean shutdown on SIGINT/SIGTERM with proper cleanup

### Team Collaboration Features

**Shared Cache State:**
- Commit `multirepo.lock` to share successful setup state
- Team members skip already-validated operations
- Consistent environment across development team
- **Cache effectiveness analytics** for team optimization

**Individual Flexibility:**
- Override cache for personal development needs
- Local customizations don't affect team setup
- Selective cache control per operation type
- **Performance metrics** for optimization insights

---

## Development & Testing

### Running Tests

The comprehensive test suite validates all repository handling scenarios:
```bash
# Interactive test selection
multirepo test

# Run all tests automatically
multirepo test --all

# List available test scenarios
multirepo test --list

# Verbose testing with debugging information
multirepo test --all --verbose
```

### Test Results Analysis

The test suite provides detailed analytics:
- **Success rate calculations** with performance metrics
- **Failure analysis** with categorization and debugging information
- **Scenario breakdown** by repository type and configuration
- **Execution time analysis** for performance optimization

### Development Mode
```bash
# Maximum verbosity for development and troubleshooting
NODE_ENV=development multirepo setup --verbose --dry-run
NODE_ENV=development multirepo test --all --verbose
```

---

## Troubleshooting

### Common Issues & Solutions

**Cache appears stale:**
```bash
# Update cache checksums
multirepo setup --update-lock

# Or start completely fresh
multirepo setup --clear-lock --force-all
```

**Operations not being cached:**
```bash
# See detailed cache decisions
multirepo setup --verbose

# Check what's being detected as changed
multirepo setup --dry-run --verbose
```

**Performance problems:**
```bash
# Compare with/without cache
multirepo setup --skip-cache
multirepo setup

# Force specific operations only
multirepo setup --force-postclone
```

**Repository conflict resolution issues:**
```bash
# Test repository handling logic
multirepo test

# Run specific conflict scenarios
multirepo test
# Then select scenarios like URL_04, NO_URL_04
```

**Team synchronization issues:**
```bash
# Update shared cache state
multirepo setup --update-lock
git add multirepo.lock && git commit -m "Update setup cache"

# Or use individual caching
echo "multirepo.lock" >> .gitignore
```

### Debug Mode
```bash
# Maximum verbosity for troubleshooting
NODE_ENV=development multirepo setup --verbose --dry-run
NODE_ENV=development multirepo test --all --verbose
```

---

## Hook Execution Order

The script processes hooks in three distinct phases with intelligent caching:

1. **Pre-clone phase**: All `preClone` hooks for **all** selected repositories
    - Environment validation and dependency checks
    - Ensures prerequisites are met before any file system changes
    - Trait dependencies are resolved depth-first for each repository
    - **Cached based on**: trait script changes, repos.yaml changes, custom script changes
    - **Cache efficiency reporting**: Shows percentage of operations optimized

2. **Clone phase**: Repository creation operations
    - Git clone operations or empty folder creation
    - **Context-aware directory conflict resolution**
    - **Enhanced existing project integration**
    - No hooks executed during this phase
    - **No caching applied**: Always runs when needed

3. **Post-clone phase**: All `postClone` hooks for each repository
    - Dependency installation and project setup
    - Runs with each repository as the working directory
    - **Processes all repositories** (not just successfully cloned ones)
    - **Graceful error recovery**: Continue processing other repositories on failure
    - **Cached based on**: repository content changes, dependency file changes, trait script changes, custom script changes

Within hook phases, hooks are processed in this order:
1. Trait-based hooks (with automatic dependency resolution)
2. Custom hooks (commands or scripts)

---

## Error Handling

The script includes robust error handling with enhanced caching awareness:

- **Missing URLs**: Interactive prompts offer to create empty folders instead
- **Missing Scripts**: Trait references to non-existent scripts are skipped with warnings
- **Failed Hooks**: Failures are cached to prevent retry loops, with graceful degradation
- **Circular Dependencies**: Automatic prevention in trait dependency resolution
- **Invalid Configurations**: Comprehensive validation before processing begins
- **Cache Corruption**: Lock file integrity validation with automatic recovery
- **Version Compatibility**: Lock file format version checking
- **Context-Aware Conflicts**: Smart resolution based on actual repository state
- **Signal Handling**: Clean shutdown on interruption with proper cleanup

---

## Installation Options

### Local Development (Recommended)
For development use, run commands directly from the project:
```shell script
./bin/console setup
./bin/console test
```

```shell script
npm install -g .
multirepo setup
multirepo test
```

```shell script
npx multirepo setup
npx multirepo test
```

### Lock File Recommendations

**For team projects:**
```gitignore
# Commit lock file for shared cache state
# multirepo.lock
```

**For individual development:**
```gitignore
# Ignore lock file for per-developer caching
multirepo.lock
```

Choose based on your team's workflow and whether you want shared or individual caching behavior.

---

## Contributing

We welcome contributions! Here's how to get started:

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/your-fork/multirepo-setup.git
cd multirepo-setup

# Install development dependencies
npm install

# Run tests
npm test
# Or use the built-in test suite
./bin/console test --all

# Test your changes
./bin/console setup --verbose
```

### Contribution Guidelines

- **New traits**: Add comprehensive validation and documentation
- **Bug fixes**: Include test cases and clear reproduction steps
- **Performance improvements**: Provide clear reasoning and metrics
- **Documentation**: Update README for any user-facing changes
- **Testing**: Ensure all test scenarios pass with new features

### Areas for Contribution

- **New trait implementations**:
    - `python` - Python environment setup and virtual environments
    - `go` - Go workspace configuration and modules
    - `node` - Node.js runtime environment validation
    - `docker` - Docker environment validation and container setup
    - `nginx` - Nginx configuration and validation
    - `tools` - General development tooling setup
    - `ruby` - Ruby environment and gem management
    - `rust` - Rust toolchain and Cargo setup
    - `java` - Java environment and build tools (Maven/Gradle)
    - `dotnet` - .NET Core environment and project setup

- **Performance optimizations** in caching or execution
- **Additional CLI options** and workflow improvements
- **Test scenario expansion** for edge cases and new features
- **Documentation and examples** for complex setups
- **Enhanced error handling** and recovery mechanisms

---

## License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## Author

Created by [Björn Berg](https://github.com/RamirezRTG)

---

## Acknowledgments

Built with modern Node.js patterns and inspired by the best practices from package managers and build tools. Special thanks to the open source community for the excellent libraries that make this tool possible, and to the comprehensive testing methodologies that ensure reliable repository management.