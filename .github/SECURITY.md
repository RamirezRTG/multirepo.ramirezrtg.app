# Security Policy

## Reporting Security Vulnerabilities

We take security vulnerabilities seriously and appreciate your efforts to responsibly disclose any issues you may find.

## Supported Versions

Security updates are provided for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## How to Report a Security Vulnerability

### For High/Critical Severity Issues

**DO NOT create a public GitHub issue.** Instead:

1. **Email us directly** at [me@bjoern-berg.com](mailto:me@bjoern-berg.com)
2. **Include "SECURITY:" in the subject line**
3. **Provide detailed information** using the template below
4. **Wait for acknowledgment** before public disclosure

### For Low/Medium Severity Issues

You may use our [Security Vulnerability Issue Template](https://github.com/RamirezRTG/multirepo.ramirezrtg.app/issues/new?template=security-vulnerability.md) to create a public issue, but please:

- **Avoid including sensitive exploitation details**
- **Mark the issue as a security concern**
- **Consider private disclosure** if you're unsure about the severity

## Security Report Template

When reporting security vulnerabilities, please include:

```
**Vulnerability Description**
Clear description of the security issue and potential impact.

**Vulnerability Type**
- Code Execution / Information Disclosure / Privilege Escalation / etc.

**Affected Components**
- CLI tool / Trait system / Cache system / Repository operations / etc.

**Reproduction Steps**
1. Step-by-step instructions to reproduce
2. Include configuration details
3. Specify environment requirements

**Impact Assessment**
- Severity Level: [Critical/High/Medium/Low]
- Affected Users: Description of who is impacted
- Potential Damage: What an attacker could achieve

**Environment Information**
- OS and version
- Node.js version  
- Tool version
- Installation method

**Proof of Concept**
Safe demonstration of the vulnerability (no actual exploits)

**Suggested Fix**
Your recommendations for addressing the issue
```


## Response Timeline

We are committed to responding to security reports promptly:

- **Initial Response**: Within 48 hours
- **Triage and Assessment**: Within 1 week
- **Fix Development**: Within 2-4 weeks (depending on complexity)
- **Public Disclosure**: After fix is released and users have time to update

## Security Measures

### Current Security Practices

- **Input Validation**: Repository URLs and configuration files are validated
- **Command Injection Prevention**: User inputs are sanitized before shell execution
- **Path Traversal Protection**: File operations are restricted to intended directories
- **Dependency Management**: Regular updates and security scanning of dependencies
- **Code Review**: All changes go through review process

### Areas of Security Focus

This tool handles several security-sensitive operations:

- **Git Repository Cloning**: URL validation and path restrictions
- **Script Execution**: Trait scripts and custom commands
- **File System Operations**: Cache files and project directories
- **Configuration Parsing**: YAML and JSON configuration files
- **Shell Command Execution**: Various CLI tools and commands

## Scope

### In Scope

Security issues related to:
- Command injection vulnerabilities
- Path traversal attacks
- Malicious repository handling
- Cache poisoning attacks
- Configuration file vulnerabilities
- Privilege escalation
- Information disclosure

### Out of Scope

- Issues requiring physical access to the machine
- Social engineering attacks
- Third-party service vulnerabilities (unless directly exploitable through our tool)
- Issues in dependencies (please report to respective maintainers)
- General software bugs without security implications

## Recognition

We believe in recognizing security researchers who help keep our project secure:

- **Public Recognition**: Contributors will be credited in release notes (with permission)
- **Hall of Fame**: Security contributors listed in our documentation
- **Coordinated Disclosure**: We work with reporters on appropriate disclosure timing

## Security Best Practices for Users

To use this tool securely:

1. **Verify Repository URLs**: Only clone from trusted sources
2. **Review Trait Scripts**: Understand what scripts will be executed
3. **Use Dry-Run Mode**: Preview operations before execution with `--dry-run`
4. **Keep Updated**: Regularly update to the latest version
5. **Secure Environment**: Run in appropriate user context, not as root/administrator
6. **Validate Configuration**: Review `repos.yaml` for unexpected entries

## Contact Information

- **Security Email**: [me@bjoern-berg.com](mailto:me@bjoern-berg.com)
- **Maintainer**: Björn Berg
- **Response Languages**: English, German

## Legal

By reporting security vulnerabilities to us, you agree to:

- Allow us reasonable time to investigate and fix the issue
- Not publicly disclose the vulnerability until we've had a chance to address it
- Not access or modify data beyond what's necessary to demonstrate the vulnerability
- Act in good faith and avoid privacy violations or service disruption

We commit to:

- Respond promptly to your report
- Keep you informed of our progress
- Credit you appropriately (with your permission)
- Not pursue legal action against good-faith security research

---

**Last Updated**: 2025-07-22

Thank you for helping keep Multirepo Setup Tool secure!
