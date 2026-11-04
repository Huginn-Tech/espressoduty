// Espresso node build tags. Releases were dated (20260722) until mid-2026
// and are dotted versions (0.6.3.17) since. Shared by the monitor, the
// /metrics route and the dashboard, so it stays free of server imports.

const DATED_TAG_RE = /^\d{8}$/;
const DOTTED_TAG_RE = /^v?\d+(\.\d+)+$/;

/**
 * -1 when local is older than reference, 0 when equal, 1 when newer.
 * null when either tag is missing or the two have different shapes
 * (a dev build, or a dated tag against a dotted one): not comparable.
 */
export function compareVersions(local: string | null, reference: string | null): -1 | 0 | 1 | null {
  if (!local || !reference) return null;
  if (DATED_TAG_RE.test(local) && DATED_TAG_RE.test(reference)) {
    return local < reference ? -1 : local > reference ? 1 : 0;
  }
  if (DOTTED_TAG_RE.test(local) && DOTTED_TAG_RE.test(reference)) {
    const a = local.replace(/^v/, '').split('.').map(Number);
    const b = reference.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const x = a[i] ?? 0;
      const y = b[i] ?? 0;
      if (x !== y) return x < y ? -1 : 1;
    }
    return 0;
  }
  return null;
}

/** True when both tags are comparable and the local one is older. */
export function versionBehind(local: string | null, reference: string | null): boolean {
  return compareVersions(local, reference) === -1;
}
