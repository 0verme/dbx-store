# Publisher records

Publisher identity, review status, and future organization verification records belong here. Plugin metadata uses the publisher record `id`, not its display name.

Publisher records are attribution metadata, not cryptographic trust roots. Official packages are signed by DBX Store after review; repository public keys and rotation history live in `../signing-keys.json`. Private signing keys remain in the protected `plugin-signing` GitHub environment and must never be committed or shared with plugin authors.
