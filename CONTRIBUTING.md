# Contributing a plugin

Plugin submissions use a two-stage review flow:

1. Open a **Plugin submission Issue in `t8y2/dbx-store`** with the source tag and `release-candidates.json` URL.
2. After DBX Store signs the approved candidates, open the final **catalog Pull Request against `t8y2/dbx-store:main`**.

Do not submit ordinary plugin source code to `t8y2/dbx`. Keep it in the plugin's own source repository. Pull requests to `t8y2/dbx` are only for the host platform, SDKs, CLI, schemas, documentation, and official examples.

## Submission checklist

1. Publish the plugin source in a publicly reviewable repository.
2. Build one unsigned `.dbxp` candidate per supported target and publish `release-candidates.json`.
3. Open the Plugin submission Issue in this repository and disclose permissions, data access, network access, and native sidecar behavior.
4. After approval, a DBX maintainer runs the protected store-signing workflow with the reviewed candidate URL, SHA-256, size, Manifest identity, and target.
5. Fork `t8y2/dbx-store`, then add or update `publishers/<publisher-id>.json` and `plugins/<plugin-id>.json` using the signed artifact metadata.
6. Run `node scripts/validate.mjs`, commit the generated `catalog/index.json`, and open a PR against `t8y2/dbx-store:main`.

The review Issue comes first because unsigned candidates cannot be entered as final catalog artifacts. The catalog PR comes after signing and must reference only DBX Store-signed assets.

## Pull request contents

A final listing PR normally changes only:

```text
publishers/<publisher-id>.json    # first submission only
plugins/<plugin-id>.json
catalog/index.json
```

Do not include plugin source directories, `.dbxp` binaries, signing private keys, tokens, or unsigned candidate URLs as final artifact URLs.

## Review boundaries

- The `verified` flag is assigned by DBX maintainers; submissions must leave it `false` unless a maintainer changes it during review.
- A plugin ID and publisher identity cannot be transferred silently.
- Every official artifact `signingKeyId` must reference a non-revoked DBX Store repository key from `signing-keys.json`.
- Publisher records establish attribution and review ownership; they do not grant cryptographic trust and do not contain signing keys.
- Release URLs must be immutable or version-addressed.
- Candidate SHA-256 and size values must come from the reviewed `release-candidates.json`; signing does not trust a URL alone.
- Published signed assets are immutable and cannot be overwritten in place.
- Private keys, access tokens, `.dbxp` binaries, and other secrets must not be committed or exposed to plugin-author repositories.
- A reviewed update may still be rejected for excessive permissions, unclear licensing, unsafe native behavior, or unverifiable source-to-binary provenance.

The initial repository does not promise an automatic approval SLA. Review policy can evolve without changing the catalog v1 client protocol.
