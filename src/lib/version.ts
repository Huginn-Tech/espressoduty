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

/** The fields of a GitHub release the version check reads. */
export interface ReleaseInfo {
  tag_name: string;
  /** Release title, e.g. "0.6.3.17 [mainnet]". */
  name: string | null;
}

// Espresso's release script (scripts/release in espresso-network) titles a
// release "<tag> [<networks>]" and moves a network's marker to each newly
// published release, and back on a rollback.
const TITLE_RE = /^\S+ \[([^\]]+)\]$/;

/**
 * The release Espresso currently ships on `network`: the one whose title
 * carries the marker, the highest tag if a failed run left several (the
 * script's own rule). null when none does.
 */
export function currentRelease(releases: ReleaseInfo[], network: 'mainnet' | 'decaf'): string | null {
  let best: string | null = null;
  for (const r of releases) {
    const marked = TITLE_RE.exec(r.name ?? '')?.[1].split(',').some((n) => n.trim() === network);
    if (!marked || compareVersions(r.tag_name, r.tag_name) === null) continue;
    if (best === null || compareVersions(r.tag_name, best) === 1) best = r.tag_name;
  }
  return best;
}

/**
 * The version check's next message, given the release last warned about:
 * 'behind' once per release the node lags, 'current' once the node itself
 * reaches that release. The same release is never announced twice, and a
 * reference that drops back (a rollback, a flaky source) is not news.
 */
export function versionAlertDue(
  local: string | null,
  reference: string | null,
  alertedFor: string | null,
): 'behind' | 'current' | null {
  if (versionBehind(local, reference)) return reference === alertedFor ? null : 'behind';
  const reached = compareVersions(local, alertedFor);
  return reached !== null && reached >= 0 ? 'current' : null;
}
