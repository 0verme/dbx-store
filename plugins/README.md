# Plugin metadata

Add one JSON document per plugin using the filename `<plugin-id>.json`.

Each document is the same plugin object used inside catalog v1. The catalog builder sorts plugins, versions, and artifacts deterministically before writing `catalog/index.json`.

Do not place `.dbxp` packages in this directory.
