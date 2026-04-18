# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.x | Yes |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please email **okoye.chidubem@go.stcloudstate.edu** with:

1. A description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Any suggested mitigations

You will receive a response within 48 hours. We will work with you to understand and address the issue before any public disclosure.

## Security Practices in This Project

- JWT tokens are stored in **HttpOnly cookies** — not `localStorage` — to prevent XSS access.
- All database queries use **parameterized statements** (asyncpg) to prevent SQL injection.
- CORS is restricted to the known frontend origin in production.
- Secrets (API keys, database passwords) are managed via **Azure Key Vault** in production and `.env` files locally (never committed).
- Passwords are hashed with **bcrypt** via `passlib`.
- The `Content-Security-Policy` header is set by the Azure Static Web Apps configuration.
