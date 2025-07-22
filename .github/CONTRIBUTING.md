# Contributing to Multirepo Setup Tool

Thank you for your interest in contributing to the Multirepo Setup Tool! We welcome contributions from the community and appreciate your help in making this tool better.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Development Guidelines](#development-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to a Code of Conduct to ensure a welcoming environment for all contributors. Please read and follow our [Code of Conduct](.github/CODE_OF_CONDUCT.md).

## Prerequisites

Before contributing, ensure you have:

- **Node.js 18+** and npm installed
- **Git** installed and configured
- A **GitHub account**
- Basic understanding of **JavaScript/Node.js** and **CLI tools**

## Development Setup

1. **Fork and clone the repository**
2. **Install dependencies**:
```shell script
npm install
```

3. **Test the installation**:
```shell script
./bin/console setup --verbose --dry-run
```


### Running in Development Mode

```shell script
# Run with maximum verbosity for debugging
NODE_ENV=development ./bin/console setup --verbose --dry-run

# Test specific functionality
./bin/console setup --force-all --verbose
```


### Project Structure

Understanding the codebase structure will help you contribute effectively:

```
multirepo-setup/
├── bin/                    # CLI entry points
├── scripts/               # Core functionality
│   ├── traits/           # Trait implementations
│   └── ...               # Main script files
├── .github/              # GitHub templates and workflows
├── package.json          # Dependencies and scripts
└── README.md             # Main documentation
```


## How to Contribute

### Finding Work

Check our [project boards and roadmap](https://github.com/RamirezRTG/multirepo.ramirezrtg.app/projects) to find:

- **Current priorities** and planned features
- **Open issues** that need attention
- **Roadmap items** for future development
- **Good first issues** for new contributors

### Before You Start

1. **Check existing issues** to avoid duplicating work
2. **Open an issue** to discuss significant changes before implementing
3. **Keep changes focused** - one feature/fix per pull request
4. **Follow the coding style** established in the project

### Workflow

1. **Create a feature branch** from main
2. **Make your changes** following the guidelines below
3. **Test thoroughly** using the testing guidelines
4. **Commit with clear messages** using conventional commit format
5. **Push and create a pull request**

## Development Guidelines

### Code Style

- Use **modern JavaScript/ES6+** features
- Follow **async/await** patterns consistently
- Use **meaningful variable names** and **clear function signatures**
- Keep functions **focused and small**
- Add **JSDoc comments** for public functions

### Error Handling

- Use **descriptive error messages**
- Implement **graceful degradation** where possible
- Consider **cache implications** of failures
- Log **appropriate detail levels** (info, warning, error)

### Caching Considerations

When making changes that affect caching:

- **Understand cache invalidation** triggers
- Test with **various cache states**
- Consider **team vs individual** caching scenarios
- Update **cache-related documentation**

### CLI Interface

- Maintain **backward compatibility** when possible
- Use **clear, consistent option names**
- Provide **helpful error messages**
- Include **examples** in help text

### Creating New Traits

When implementing new traits:

1. **Create the trait directory structure**:
```shell script
mkdir -p scripts/traits/your-trait-name
```


2. **Add configuration** (`config.yaml`):
```yaml
hasCheckFunction:
     preClone: true      # Use check() function
     postClone: false    # Use traditional script
   traits:
     - dependency-trait  # List dependencies
```


3. **Implement validation logic** with proper error handling and logging
4. **Add comprehensive documentation** and examples
5. **Test with various project configurations**

## Testing

### Manual Testing

```shell script
# Test basic functionality
./bin/console setup --dry-run --verbose

# Test cache behavior
./bin/console setup --force-all
./bin/console setup  # Should use cache

# Test error conditions
# (modify repos.yaml with invalid config and test recovery)
```


### Test Different Scenarios

- **First-time setup** (no cache)
- **Cached runs** (subsequent executions)
- **Partial cache invalidation** (change one trait script)
- **Error recovery** (fix errors and re-run)
- **Team scenarios** (shared lock files)

### Testing New Traits

- Test with **various project configurations**
- Verify **dependency detection** works correctly
- Test **error conditions** and recovery
- Ensure **cache behavior** is appropriate
- Test **integration** with existing traits

## Documentation

### Required Documentation for New Features

- **Update README.md** with new functionality
- **Add inline comments** for complex logic
- **Include usage examples**
- **Document configuration options**
- **Update CLI help text**

### Documentation Style

- Use **clear, concise language**
- Include **practical examples**
- Explain **"why"** not just "how"
- Keep **technical accuracy** high
- Consider **different user skill levels**

---

Thank you for contributing to Multirepo Setup Tool! Your efforts help make repository management easier for developers everywhere.
