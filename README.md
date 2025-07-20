# Multirepo Setup Guide

This document outlines how to use the interactive setup script to clone and configure the necessary repositories for
this multirepo management system.

---

## Quick Start

1. Ensure you have `git` and the correct version of `node` installed (as defined in `.nvmrc`).
2. Run the setup command from the multirepo root:
```shell script
./bin/console setup
```

3. Follow the interactive prompts to select which repositories you want to clone.

---

## Command Line Interface

The multirepo tool provides a clean CLI interface for managing your repositories:

### Basic Usage
```shell script
multirepo <command> [options]
```

### Available Commands
- `setup` - Set up repositories from repos.yaml

### Options
- `--verbose, -v` - Enable verbose logging
- `--dry-run, -d` - Show what would be done without making changes
- `--help, -h` - Show help message

### Examples
```shell script
# Interactive repository setup
multirepo setup

# Setup with detailed logging
multirepo setup --verbose

# Preview what would happen
multirepo setup --dry-run

# Detailed dry-run preview
multirepo setup --dry-run --verbose
```

### Local Development Usage
If you haven't installed the tool globally, you can run it locally:
```shell script
# Direct execution
./bin/console setup

# Using npx
npx multirepo setup
```

---

## Configuration: `repos.yaml`

The setup script is controlled by the `repos.yaml` file in the root of the multirepo. This file defines all the available
sub-projects that can be cloned.

### Structure

The file uses a key-value map under the `repos` key. The key for each entry is the repository's short name, which will
also be used as the folder name inside the `packages/` directory.

```yaml
repos:
  # The key is the repo identifier (e.g., 'react-app')
  react-app:
  # ... configuration for this repo
  symfony-app:
  # ... configuration for this repo
```

### Repository Options

Each repository entry can have the following properties:

| Key       | Type                 | Required? | Description                                                                                                                              |
|-----------|----------------------|-----------|------------------------------------------------------------------------------------------------------------------------------------------|
| `url`     | `string`             | **Yes**   | The full Git URL (HTTPS or SSH) of the repository to clone. If omitted, the script will offer to create an empty folder instead.       |
| `traits`  | `string` or `array`  | No        | Assigns one or more "traits" to the repository. The script will run hook files from `scripts/traits/<trait-name>/` for each trait.     |
| `preClone`| `string`             | No        | A command or a path to a custom Node.js script (ending in `.js`) to run **before** cloning. Useful for environment checks.             |
| `postClone`| `string`            | No        | A command or a path to a custom Node.js script (ending in `.js`) to run **after** cloning. Useful for installing dependencies.         |

---

## Hooks and Custom Scripts

The setup script provides a powerful hook system to automate tasks before and after cloning repositories.

### Trait-Based Hooks

For common project types, you can create reusable scripts that run for any repository with a specific `trait`. These
scripts live in the `scripts/traits/` directory structure.

**Example:**
If a repo has `traits: symfony`, the setup script will automatically look for and execute:

- `scripts/traits/symfony/preClone.js` (before cloning)
- `scripts/traits/symfony/postClone.js` (after cloning)

#### Trait Configuration

Each trait uses a consolidated `config.yaml` file to define its behavior and dependencies:

**Example:** `scripts/traits/composer/config.yaml`
```yaml
hasCheckFunction:
  preClone: true
  postClone: true
traits:
  - php
```

##### Configuration Options

| Key               | Type      | Description                                                                                                               |
|-------------------|-----------|---------------------------------------------------------------------------------------------------------------------------|
| `hasCheckFunction`| `boolean` or `object` | Controls script execution mode. Can be a boolean (applies to all hooks) or an object with `preClone`/`postClone` keys specifying per-hook behavior. |
| `traits`          | `array`   | List of other traits this trait depends on. Creates a trait hierarchy where dependencies are processed first.            |

#### Check Functions vs Traditional Scripts

Traits can work in two modes, configurable per hook type:

1. **Check Function Mode** (`hasCheckFunction: true`):
```javascript
// scripts/traits/composer/preClone.js
export async function check(context) {
    // Custom logic with access to context object
    console.log('Checking composer installation...');
}
```

2. **Traditional Script Mode** (`hasCheckFunction: false` or omitted):
```javascript
// scripts/traits/symfony/postClone.js
console.log('Running Symfony setup...');
// Script runs from top to bottom
```

#### Hook-Specific Configuration

The consolidated config format allows different execution modes for different hook types:

```yaml
# scripts/traits/composer/config.yaml
hasCheckFunction:
  preClone: true   # Use check() function for preClone
  postClone: false # Use traditional execution for postClone
traits:
  - php
```

#### Trait Hierarchies and Dependency Resolution

Traits can depend on other traits, creating automatic dependency resolution. Dependencies are processed depth-first, ensuring all prerequisites are handled before the dependent trait:

```yaml
# scripts/traits/symfony/config.yaml
hasCheckFunction:
  preClone: false
  postClone: false
traits:
  - php       # Processed first
  - composer  # Processed second
  # symfony trait processed last
```

This ensures that `php` and `composer` traits are processed before `symfony` for all hook types.

### Custom Hooks

For repository-specific logic, you can use the `preClone` and `postClone` properties in `repos.yaml`.

- **As a Command**: If the value does not end in `.js`, it will be executed as a shell command.
```yaml
postClone: 'composer install'
```

- **As a Script**: If the value ends in `.js`, the script will look for that file inside a dedicated folder in
  `scripts/custom/<repo-name>/`.
```yaml
# This will execute scripts/custom/symfony-app/extra-setup.js
postClone: 'extra-setup.js'
```

### Hook Execution Order

The script processes hooks in three distinct phases:

1. **Pre-clone phase**: All `preClone` hooks for **all** selected repositories
    - Environment validation and dependency checks
    - Ensures prerequisites are met before any file system changes
    - Trait dependencies are resolved depth-first for each repository

2. **Clone phase**: Repository creation operations
    - Git clone operations or empty folder creation
    - Directory conflict resolution (delete/skip existing directories)
    - No hooks executed during this phase

3. **Post-clone phase**: All `postClone` hooks for each repository
    - Dependency installation and project setup
    - Runs with each repository as the working directory
    - Only runs for repositories that were successfully cloned

Within hook phases, hooks are processed in this order:
1. Trait-based hooks (with automatic dependency resolution)
2. Custom hooks (commands or scripts)

---

## Command Arguments

You can modify the behavior of the setup script with command-line flags:

```shell script
# Verbose logging
multirepo setup --verbose

# Dry run
multirepo setup --dry-run

# Combined flags
multirepo setup --dry-run --verbose

# Short flags
multirepo setup -d -v
```

---

## Error Handling

The script includes robust error handling:

- **Missing URLs**: If a repository doesn't have a valid Git URL, the script will offer to create an empty folder instead
- **Missing Scripts**: If a trait references a non-existent script file, it will be skipped with a warning (unless it has valid subtraits)
- **Failed Hooks**: If any hook fails during execution, the script will halt with an error message
- **Circular Dependencies**: The trait system automatically prevents circular dependencies between traits
- **Invalid Configurations**: Repository names and URLs are validated before processing begins

---

## Advanced Features

### Three-Phase Execution Model

The setup script uses a carefully orchestrated three-phase approach:

1. **Validation Phase**: All repositories and their configurations are validated
2. **Pre-clone Phase**: Environment checks run for all repositories before any cloning
3. **Clone & Setup Phase**: Each repository is cloned and configured individually

This approach ensures that environment issues are caught early and that all repositories are processed consistently.

### Async/Await Support

The script uses modern async/await patterns throughout:
- All Git operations are non-blocking with real-time output
- Hook execution is fully asynchronous with proper error propagation
- Log messages are properly synchronized to prevent output corruption

### Interactive Repository Selection

When multiple repositories are configured, the script provides an enhanced checkbox interface:
- Select individual repositories or choose "All Repositories"
- Visual separators and clear feedback on selections
- Empty selection prevention with helpful validation messages
- Clean display management that doesn't interfere with logging

### Flexible Repository Configuration

- **Empty Folder Support**: Repositories without URLs can be set up as empty folders for development
- **Trait Hierarchies**: Complex dependency management with automatic circular dependency prevention
- **Mixed Execution Modes**: Each trait can use different execution modes for different hook types
- **Context Passing**: Hook functions receive context objects with working directory and other metadata

### Smart Hook Resolution

The trait system includes sophisticated dependency resolution:
- **Depth-First Processing**: Dependencies are always processed before dependents
- **Duplicate Prevention**: Each trait is processed only once per repository per hook type
- **Consolidated Configuration**: Single `config.yaml` files replace multiple hook-specific configuration files
- **Graceful Degradation**: Traits without scripts for specific hook types are handled gracefully if they have valid dependencies

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
```