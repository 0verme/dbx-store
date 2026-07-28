# Contributing a plugin

Plugin submissions use pull requests and remain subject to manual review.

## Submission checklist

1. Publish the plugin source in a publicly reviewable repository.
2. Build one signed `.dbxp` release asset per supported target.
3. Add or update `plugins/<plugin-id>.json`.
4. Include exact artifact sizes and SHA-256 values.
5. Document requested permissions, data access, network access, and native sidecar behavior.
6. Run `node scripts/validate.mjs` and commit the generated `catalog/index.json`.

## Review boundaries

- The `verified` flag is assigned by DBX maintainers; submissions must leave it `false` unless a maintainer changes it during review.
- A plugin ID and publisher identity cannot be transferred silently.
- Release URLs must be immutable or version-addressed.
- Private keys, access tokens, `.dbxp` binaries, and other secrets must not be committed.
- A reviewed update may still be rejected for excessive permissions, unclear licensing, unsafe native behavior, or unverifiable source-to-binary provenance.

The initial repository does not promise an automatic approval SLA. Review policy can evolve without changing the catalog v1 client protocol.
