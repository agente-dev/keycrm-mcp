# Source provenance and maintenance boundary

This repository is maintained by `agente.dev` from the public source project
[`IvanKlymenko/keycrm-mcp`](https://github.com/IvanKlymenko/keycrm-mcp). The
canonical repository is [`agente-dev/keycrm-mcp`](https://github.com/agente-dev/keycrm-mcp);
its `main` branch currently descends from upstream commit `8240784` and carries
the bounded API corrections at `122f013`.

The fork currently contains these intentional compatibility changes:

- corrected API paths and error responses;
- removed the invalid `list_warehouses` endpoint;
- removed request parameters from tool-call logs to avoid logging PII; and
- bounded client-side customer search over supported `/buyer` pages, with
  `search_truncated` when the scan cannot prove completeness; and
- defined zero-based non-aligned customer offsets as a bounded local slice over
  at most two adjacent native pages, with stale pagination URL metadata removed.

The package identity remains `keycrm-mcp@1.0.0` and the runtime entry point is
`index.js`. Downstream vendoring or packaging is a separate release decision;
this repository change does not publish a package or modify downstream
consumers.

## License decision required

`package.json` declares `ISC`, historical README text claimed `MIT`, and no
`LICENSE` file is present. Those facts are recorded for owner review only; they
do not select a license or grant rights. Public-maintenance readiness remains
blocked until an owner chooses one authoritative license and adds the matching
file.
