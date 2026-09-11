## DBX Store catalog submission

Review Issue: <!-- https://github.com/t8y2/dbx-store/issues/... -->

Plugin ID and version: <!-- com.example.plugin 1.0.0 -->

Source tag or commit: <!-- immutable source URL -->

## Repository routing confirmation

- [ ] This PR targets `t8y2/dbx-store:main`.
- [ ] Plugin source remains in the plugin's own repository.
- [ ] This PR does not modify `t8y2/dbx` unless a separate host/SDK change is required.

## Artifact confirmation

- [ ] Every catalog artifact was signed by the protected DBX Store workflow.
- [ ] URLs, SHA-256 values, sizes, targets, and `signingKeyId` values come from final signed artifact metadata.
- [ ] No `.dbxp` binary, private key, token, or credential is committed.
- [ ] Existing release assets were not overwritten.

## Catalog files

- [ ] Added or updated `publishers/<publisher-id>.json` when required.
- [ ] Added or updated `plugins/<plugin-id>.json`.
- [ ] Ran `node scripts/validate.mjs` and committed `catalog/index.json`.
