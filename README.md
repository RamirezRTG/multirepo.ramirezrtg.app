# Multirepo Setup Tool

**Interactive Multi-Repository Management with Intelligent Caching**

A CLI tool that streamlines the setup and management of multiple repositories through intelligent caching, trait-based automation, and comprehensive validation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Key Features

### Intelligent Caching System
- **Smart change detection** through SHA256-based checksums
- **Automatic cache invalidation** when dependencies, scripts, or configurations change
- **Significant performance improvements** on subsequent runs
- **Team-shareable cache state** via lock file

### Interactive Repository Management
- Multi-select interface for choosing repositories to process
- Existing project detection with smart handling options
- Empty folder support for new project scaffolding
- Conflict resolution for existing directories

### Trait-Based Automation
- Reusable validation scripts for common project types (npm, PHP, React, Symfony, etc.)
- Hierarchical trait dependencies with automatic resolution
- Mixed execution modes (check functions vs traditional scripts)
- Custom hook support for repository-specific logic

### Comprehensive Reporting
- Real-time progress tracking with grouped, colored output
- Cache efficiency statistics showing operation optimization
- Detailed validation results with actionable suggestions
- Error handling with graceful degradation

### Performance & Reliability
- Three-phase execution model ensuring consistency
- Async/await throughout for non-blocking operations
- Robust error handling with automatic recovery
- Dry-run support for safe previewing

---

## Quick Start

### Prerequisites
- Node.js 16+ and npm
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
```

### What Happens Next
1. Interactive repository selection from your `repos.yaml`
2. Environment validation with intelligent caching
3. Automated cloning or project detection
4. Trait-based setup and validation
5. Comprehensive success reporting

**First run**: Full setup with cache creation  
**Subsequent runs**: Optimized execution with intelligent caching

---

## Command Line Interface

### Basic Usage
```bash
multirepo <command> [options]
```

### Core Commands
- `setup` - Interactive repository setup with intelligent caching

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
```

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
scripts/traits/symfony-api/config.yaml
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
- Cached when environment unchanged

**Phase 2: Repository Operations (clone)**
- Git cloning or folder creation
- Existing project detection
- Conflict resolution
- Always runs when needed

**Phase 3: Project Setup (postClone)**
- Dependency installation
- Configuration validation
- Project-specific setup
- Cached when content unchanged

### Error Recovery & Handling

- **Graceful degradation**: Continue processing other repositories on failure
- **Detailed error reporting**: Pinpoint exact failure reasons
- **Cache-aware recovery**: Failed operations don't pollute cache
- **Interactive problem solving**: Prompt for resolution when possible

### Team Collaboration Features

**Shared Cache State:**
- Commit `multirepo.lock` to share successful setup state
- Team members skip already-validated operations
- Consistent environment across development team

**Individual Flexibility:**
- Override cache for personal development needs
- Local customizations don't affect team setup
- Selective cache control per operation type

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
```

---

## Hook Execution Order

The script processes hooks in three distinct phases with intelligent caching:

1. **Pre-clone phase**: All `preClone` hooks for **all** selected repositories
    - Environment validation and dependency checks
    - Ensures prerequisites are met before any file system changes
    - Trait dependencies are resolved depth-first for each repository
    - **Cached based on**: trait script changes, repos.yaml changes, custom script changes

2. **Clone phase**: Repository creation operations
    - Git clone operations or empty folder creation
    - Directory conflict resolution (delete/skip existing directories)
    - No hooks executed during this phase
    - **No caching applied**: Always runs when needed

3. **Post-clone phase**: All `postClone` hooks for each repository
    - Dependency installation and project setup
    - Runs with each repository as the working directory
    - Only runs for repositories that were successfully cloned
    - **Cached based on**: repository content changes, dependency file changes, trait script changes, custom script changes

Within hook phases, hooks are processed in this order:
1. Trait-based hooks (with automatic dependency resolution)
2. Custom hooks (commands or scripts)

---

## Error Handling

The script includes robust error handling with caching awareness:

- **Missing URLs**: If a repository doesn't have a valid Git URL, the script will offer to create an empty folder instead
- **Missing Scripts**: If a trait references a non-existent script file, it will be skipped with a warning (unless it has valid subtraits)
- **Failed Hooks**: If any hook fails during execution, the failure is cached to prevent retry loops
- **Circular Dependencies**: The trait system automatically prevents circular dependencies between traits
- **Invalid Configurations**: Repository names and URLs are validated before processing begins
- **Cache Corruption**: Lock file integrity is validated, with automatic recovery from corruption
- **Version Compatibility**: Lock file format versions are checked for compatibility

---

## Installation Options

### Local Development (Recommended)
For development use, run commands directly from the project:
```shell script
./bin/console setup
```

### Global Installation
If you want to use the tool system-wide:
```shell script
npm install -g .
multirepo setup
```

### Using npx
For one-time usage without installation:
```shell script
npx multirepo setup
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

# Test your changes
./bin/console setup --verbose
```

### Contribution Guidelines

- **New traits**: Add comprehensive validation and documentation
- **Bug fixes**: Include test cases and clear reproduction steps
- **Performance improvements**: Provide clear reasoning for changes
- **Documentation**: Update README for any user-facing changes

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
- **Documentation and examples** for complex setups
- **Test coverage** and quality improvements

---

## License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## Author

Created by [Björn Berg](https://github.com/RamirezRTG)

---

## Acknowledgments

Built with modern Node.js patterns and inspired by the best practices from package managers and build tools. Special thanks to the open source community for the excellent libraries that make this tool possible.