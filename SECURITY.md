# Security policy

Please do not publish API keys, `.env` files, customer records, phone numbers,
email addresses, or raw KeyCRM request/response payloads in issues, pull
requests, logs, or test fixtures.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for
[`agente-dev/keycrm-mcp`](https://github.com/agente-dev/keycrm-mcp/security/advisories/new).
Include the affected commit or version, a minimal reproduction, impact, and a
safe mitigation if known. Do not open a public issue for an unpatched
vulnerability.

If private reporting is unavailable, open a minimal issue that contains no
secrets or exploit details and request a private contact path from the
maintainers.

## Supported scope

Reports about the MCP server, its request handling, credential handling, log
redaction, and published dependencies are in scope. Production credentials and
customer data are never required for a report; use deterministic fixtures.
