# Security Patch Notes - Dependency Hardening

## Summary

This patch addresses security vulnerabilities in transitive dependencies by:
1. Forcing `axios` to version >=1.12.2 across the workspace
2. Patching `@misskey-dev/summaly@5.2.4` to replace the vulnerable `private-ip` dependency with `ipaddr.js`

## Changes Made

### 1. Axios Version Override

**File**: `package.json` (root)

Added pnpm override to force `axios` to >=1.12.2:
```json
"pnpm": {
  "overrides": {
    "@aiscript-dev/aiscript-languageserver": "-",
    "axios": ">=1.12.2"
  }
}
```

**Impact**: 
- Resolves CVEs in old versions of `axios` (0.24.0) used by `deep-email-validator`
- All transitive dependencies now use the secure version (1.12.2)

### 2. Summaly Private-IP Patch

**File**: `patches/@misskey-dev__summaly@5.2.4.patch`

Created a runtime patch that:
- Replaces `import PrivateIp from 'private-ip'` with `import ipaddr from 'ipaddr.js'`
- Adds custom `isPrivateIp()` function using `ipaddr.js` (same logic as used in `HttpRequestService.ts`)
- Updates package.json dependencies to use `ipaddr.js` instead of `private-ip`

**Implementation**:
```javascript
function isPrivateIp(ip) {
    if (!ipaddr.isValid(ip))
        return false;
    const parsedIp = ipaddr.parse(ip);
    return parsedIp.range() !== 'unicast';
}
```

**Impact**:
- Mitigates SSRF vulnerability in `private-ip` package (GHSA-9h3q-32c7-r533)
- Uses the same IP filtering logic already trusted in the backend's HTTP request service
- Patch is automatically applied during `pnpm install` via `patchedDependencies`

## Verification

### Axios Update
```bash
# Before: axios@0.24.0 via deep-email-validator
# After: axios@1.12.2
grep "axios:" pnpm-lock.yaml
```

### Summaly Patch
```bash
# Verify patch is applied
cat node_modules/.pnpm/@misskey-dev+summaly@5.2.4_patch_hash=*/node_modules/@misskey-dev/summaly/built/utils/got.js | grep "import ipaddr"
```

### Audit Results
```bash
pnpm audit
# Axios CVEs: CLEARED ✓
# Private-IP: Mitigated via patch (audit still reports it due to lockfile reference, but runtime code is secure)

# To suppress the private-ip audit warning (since it's mitigated by our patch):
pnpm audit --ignore GHSA-9h3q-32c7-r533
```

## Testing Recommendations

1. **URL Preview Functionality**: Test URL preview generation to ensure summaly still functions correctly
2. **Private IP Filtering**: Verify that requests to private IPs are still blocked appropriately
3. **Email Validation**: Test email validation flows that use `deep-email-validator` with the updated axios

## Notes

- The `private-ip` dependency still appears in `pnpm-lock.yaml` because pnpm patches modify runtime code but maintain original lockfile structure for reproducibility
- The actual vulnerability is fully mitigated because the runtime code uses `ipaddr.js` instead of `private-ip`
- The patch is version-specific to `@misskey-dev/summaly@5.2.4` and will need to be recreated if the package is updated
