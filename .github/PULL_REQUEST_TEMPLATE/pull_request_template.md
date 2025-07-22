# Pull Request Template

## Description

**Summary**
Brief description of the changes made in this PR.

**Related Issue**
- Closes #[issue number]
- Fixes #[issue number]
- Relates to #[issue number]

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Changes Made

- **Change 1**: Brief description
- **Change 2**: Brief description
- **Change 3**: Brief description

## Testing

**Manual Testing Performed**
- [ ] Tested with `./bin/console setup --dry-run --verbose`
- [ ] Tested cache behavior with `--force-all` and normal runs
- [ ] Tested error conditions and recovery
- [ ] Tested with different repository configurations

**Test Cases**
1. **Scenario 1**: Brief description of what was tested and the result
2. **Scenario 2**: Brief description of what was tested and the result

## Breaking Changes

If this introduces breaking changes, describe:
- **What breaks**: Description of what will no longer work
- **Migration path**: How users should update their usage

## Checklist

**Code Quality**
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented complex code sections
- [ ] I have updated relevant documentation

**Testing**
- [ ] I have tested this change locally with various scenarios
- [ ] I have tested with different cache states (`--force-all`, `--skip-cache`)
- [ ] New and existing functionality works as expected
- [ ] No new warnings or errors introduced

**Documentation**
- [ ] README.md updated (if applicable)
- [ ] CLI help text updated (if applicable)
- [ ] Inline comments added for complex logic

## Additional Notes

Any additional context, implementation details, or areas that need special attention during review.
