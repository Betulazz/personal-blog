# Site Identity Media References

## Confirmed behavior

- Avatar, favicon, Background Gallery, About banner, and social media icons share managed-image lookup and resource identity parsing.
- Managed `/uploads/` references must point to an existing image Media Asset (both media kind and content type). Percent-encoded paths resolve once to the same exact key. Unsafe keys and query/fragment suffixes are rejected on new managed writes.
- External images and built-in static images retain their existing schema rules. Absolute external URLs never identify local assets merely because their path contains a local key.
- Deletion reference checks compare complete case-sensitive managed keys, preserve existing resource/field detail names, and recognize percent-encoded paths. Save validation also verifies the returned asset's exact key, even when MySQL collation is case-insensitive. Existing avatar/favicon query/fragment suffixes still protect the same bytes.
- Validate only submitted media fields. Preserve partial nested PATCH merges, null clearing, and empty arrays. Do not retrospectively validate unrelated stored references.
- Preserve existing social icon, About banner, and background error codes; introduce avatar/favicon image-asset error codes.
- Leave other content scanning, music archives, storage deletion/recovery, and save/delete transaction semantics unchanged.

## Module

`SiteIdentityMediaReferences` owns field traversal and managed identity resolution. Its interface accepts either a settings snapshot or a patch, validates images through the existing repository adapter, and returns matching reference fields. Save and deletion callers cross the same seam. This depth provides leverage at both call sites and locality for field changes.

## Validation

Exercise both module interfaces for all fields, missing/wrong-kind assets, URL encoding, unsafe paths, exact matches, external/static images, and omitted/cleared fields. Add native MySQL HTTP contracts for save/delete protection and failed-write atomicity. Run related existing identity/media contracts and backend formatting, lint, and typing checks. Use a fresh dedicated `_test` database and temporary media files; no live site writes or deployment.
