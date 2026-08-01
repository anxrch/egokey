# EgoKey changelog

## 4.19.0-egokey.0

**Released:** 2026-08-02
**Based on Misskey:** 2025.12.2

### Changes

- The README now uses the built-in default logo (`packages/frontend/assets/egokey.svg`) instead of a duplicated temporary asset, which has been removed.

## 4.18.0-egokey.0

**Released:** 2026-08-01
**Based on Misskey:** 2025.12.2

This is the first public EgoKey prerelease.

### Highlights

- Rebranded the product, public metadata, documentation, and release artifacts as EgoKey.
- Added a per-account setting that can hide muted users from notifications, reaction-user lists, and related user lists.
- Publishes release images to `ghcr.io/anxrch/egokey`.

### Compatibility

- Existing database names, container paths, persisted browser keys, federation compatibility identifiers, and the `cherrypick-js` package name remain in place where changing them would break existing installations or SDK consumers.
- `CHERRYPICK_*` environment variables remain supported for existing deployments; EgoKey-specific aliases are preferred where available.
- Historical CherryPick release history remains in [CHANGELOG_CHERRYPICK.md](./CHANGELOG_CHERRYPICK.md).
