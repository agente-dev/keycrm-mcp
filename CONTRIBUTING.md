# Contributing

`agente-dev/keycrm-mcp` is the canonical public repository for this connector.
The package and MCP server remain named `keycrm-mcp`; proposals should preserve
that runtime identity unless an owner explicitly decides otherwise.

## Before opening a pull request

1. Start from the current `main` branch and keep the change focused.
2. Do not include API keys, `.env` files, customer data, or request payloads.
3. For connector behavior, verify the documented KeyCRM endpoint and test the
   public tool seam with a deterministic client stub.
4. Run `npm ci` and `npm test` locally.
5. Update the README or provenance documentation when endpoint behavior,
   configuration, or maintenance boundaries change.

The CI workflow runs the same dependency installation and test command. Tests
must not call the live KeyCRM API or require `KEYCRM_API_KEY`.

## Pull requests and issues

Describe the user-visible behavior, the KeyCRM endpoint involved, and the
verification performed. Include a reproduction for bugs. Security reports
must use the process in [`SECURITY.md`](SECURITY.md), not a public issue.

The repository is maintained from the upstream project
[`IvanKlymenko/keycrm-mcp`](https://github.com/IvanKlymenko/keycrm-mcp); preserve
that provenance when adapting upstream changes.
