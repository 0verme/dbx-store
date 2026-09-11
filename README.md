# DBX Store

Official plugin catalog, publisher records, and review metadata for [DBX](https://github.com/t8y2/dbx).

[English](README.md) | [简体中文](README.zh-CN.md)

DBX reads the generated catalog from:

```text
https://raw.githubusercontent.com/t8y2/dbx-store/main/catalog/index.json
```

## Repository layout

```text
dbx-store/
├── plugins/                 # one reviewed plugin metadata file per plugin
├── publishers/              # publisher identity and review records; no private trust material
├── signing-keys.json        # DBX Store repository signing-key history
├── catalog/index.json       # generated catalog consumed by DBX
├── revoked.json             # revoked plugin versions and signing keys
├── schemas/                 # catalog schema snapshot
└── scripts/validate.mjs     # deterministic catalog builder and validator
```

Plugin source code stays in the plugin author's repository. CI-built `.dbxp` packages belong in GitHub Releases, object storage, or a CDN; binary packages must not be committed here.

## Where to submit

- Plugin source changes belong in the plugin's own source repository.
- DBX host, SDK, CLI, schema, and official-example changes belong in [`t8y2/dbx`](https://github.com/t8y2/dbx).
- Marketplace submissions are a **single pull request against `t8y2/dbx-store:main`**: add `publishers/<publisher-id>.json` (first submission) and `candidates/<plugin-id>.json`, then maintainers review and run the protected signing workflow, which finalizes `plugins/<plugin-id>.json` and `catalog/index.json` on the same PR.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the candidate format and the exact PR → review/signing → merge sequence.

## Validation

```bash
node scripts/validate.mjs
```

The validator builds `catalog/index.json` from `plugins/*.json`, checks identifiers, semantic versions, publisher records, DBX Store signing-key references, revocations, duplicate plugins/versions/targets, HTTPS artifact URLs, SHA-256 values, and rejects committed `.dbxp` files. Open `candidates/*.json` submissions are validated but fail the build with `open candidate(s) awaiting DBX Store signing` — the pull request merges only after the signing workflow finalizes them.

`revoked.json` records plugin versions as `{ "pluginId": "publisher.plugin", "version": "1.2.3" }` and signing keys by key ID. Revoked entries cannot remain in the generated catalog.

## Trust model

- Human review controls whether a candidate is approved for DBX Store signing and catalog inclusion.
- Catalog SHA-256 values bind reviewed metadata to exact release assets.
- DBX Store signs approved `.dbxp` candidates with a repository key; plugin authors do not receive or manage this key.
- DBX verifies the repository Ed25519 signature inside every official `.dbxp` before installation.
- Native plugin backends run with the current OS user's privileges; catalog inclusion is not an OS sandbox.

See [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a plugin.

## Publishing boundary

The catalog lists only artifacts built from the current manifest and SDK contract. Prototype packages must be rebuilt, signed, and reviewed before their metadata is added here; stale preview assets are intentionally not kept installable.

## Signing approved candidates

Plugin repositories publish unsigned candidate packages and `release-candidates.json`. After source and binary review, a maintainer runs the protected `Sign approved plugin candidate` workflow with the reviewed candidate URL, SHA-256, byte size, Manifest identity, and target. The workflow binds signing to those exact candidate bytes, rejects already-signed packages, adds the DBX Store signature with the protected `DBX_STORE_SIGNING_KEY` secret, and publishes the final artifact from `dbx-store` Releases.

Every signed asset is accompanied by target-specific final artifact metadata and a signing receipt that records the reviewed candidate hash and workflow run. Existing release assets are immutable: the workflow refuses to overwrite them, so any changed bytes require a new plugin version.

Configure the `plugin-signing` GitHub environment with required reviewers, the `DBX_STORE_SIGNING_KEY` environment secret, and the `DBX_STORE_SIGNING_KEY_ID` repository variable. The selected key must have status `active`, and the workflow verifies that the secret derives the public key recorded in `signing-keys.json`. Private keys never enter the repository or plugin-author CI.

The checked-in preview key is only a client-contract fixture and validator rules prohibit catalog artifacts from referencing it. Before enabling official signing, generate a production key through the protected key ceremony, add its public record with status `active`, ship the matching public key in DBX, and configure the environment secret and variable. Rotated historical keys may use status `retired`; compromised keys belong in `revoked.json`.
