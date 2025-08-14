# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of CampRush seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please do NOT:
- Open a public GitHub issue for security vulnerabilities
- Discuss the vulnerability in public forums, chat rooms, or social media

### Please DO:
- Email security details to [your-security-email@domain.com]
- Include detailed steps to reproduce the vulnerability
- Provide information about the potential impact
- Include any proof-of-concept code if applicable

### What to expect:
- We will acknowledge receipt of your vulnerability report within 24 hours
- We will provide a detailed response within 72 hours indicating next steps
- We will work with you to understand and resolve the issue
- We will notify you when the vulnerability is fixed
- We will publicly acknowledge your responsible disclosure (if desired)

## Security Measures

### Application Security
- All sensitive data is encrypted in transit and at rest
- Rate limiting is implemented on all API endpoints
- Input validation and sanitization is performed on all user inputs
- Authentication is required for all sensitive operations
- Row Level Security (RLS) is enabled on all database tables

### Infrastructure Security
- TLS 1.3 encryption for all communications
- Secure headers are implemented (HSTS, CSP, etc.)
- Regular security scans and dependency updates
- Environment variables are used for all secrets
- No hardcoded credentials in source code

### Third-Party Integrations
- VGS (Very Good Security) for payment data protection
- Supabase for secure database and authentication
- All API keys are stored as encrypted environment variables
- Regular review of third-party dependencies for vulnerabilities

### Development Security
- Automated security scanning in CI/CD pipeline
- Regular dependency updates via Dependabot
- Code review requirements for all changes
- Secrets scanning to prevent credential leaks

## Security Contacts

For security-related questions or concerns, contact:
- Email: [your-security-email@domain.com]
- Response time: Within 24 hours for critical issues

## Bug Bounty Program

We currently do not have a formal bug bounty program, but we appreciate responsible disclosure and will acknowledge security researchers who help improve our security.

## Security Updates

Security updates will be communicated through:
- GitHub Security Advisories
- Release notes
- Email notifications to users (for critical issues)

Last updated: [Current Date]