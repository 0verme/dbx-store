# DBX Store

Official plugin catalog, publisher records, and review metadata for [DBX](https://github.com/t8y2/dbx).

DBX reads the generated catalog from:

```text
https://raw.githubusercontent.com/t8y2/dbx-store/main/catalog/index.json
```

## Repository layout

```text
dbx-store/
├── plugins/                 # one reviewed plugin metadata file per plugin
├── publishers/              # publisher identity and review records
├── catalog/index.json       # generated catalog consumed by DBX
├── revoked.json             # revoked plugin versions and signing keys
├── schemas/                 # catalog schema snapshot
└── scripts/validate.mjs     # deterministic catalog builder and validator
```

Plugin source code stays in the plugin author's repository. CI-built `.dbxp` packages belong in GitHub Releases, object storage, or a CDN; binary packages must not be committed here.

## Validation

```bash
node scripts/validate.mjs
```

The validator builds `catalog/index.json` from `plugins/*.json`, checks identifiers, semantic versions, duplicate plugins/versions/targets, HTTPS artifact URLs, SHA-256 values, and rejects committed `.dbxp` files.

## Trust model

- Human review controls whether metadata is accepted into the official catalog.
- Catalog SHA-256 values bind reviewed metadata to exact release assets.
- DBX verifies the Ed25519 signature inside every official `.dbxp` before installation.
- Native plugin backends run with the current OS user's privileges; catalog inclusion is not an OS sandbox.

See [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a plugin.
