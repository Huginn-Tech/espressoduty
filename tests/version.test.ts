// The version check's reference and alert rule: the release Espresso ships
// on each network, read from release titles, and one message per release.

import { describe, it, expect } from 'vitest';
import { currentRelease, versionAlertDue, type ReleaseInfo } from '../src/lib/version';

// Newest first, titled as Espresso's release script left them on 2026-11-08:
// a superseded release loses its network marker.
const RELEASES: ReleaseInfo[] = [
  { tag_name: '0.7.0.6', name: '0.7.0.6 [decaf]' },
  { tag_name: '0.7.0.5', name: '0.7.0.5' },
  { tag_name: '0.6.3.17', name: '0.6.3.17 [mainnet]' },
  { tag_name: '0.6.3.16', name: '0.6.3.16' },
  { tag_name: '20260910', name: '20260910' },
];

describe('current release per network', () => {
  it('follows the network marker in the title, not the newest tag', () => {
    expect(currentRelease(RELEASES, 'mainnet')).toBe('0.6.3.17');
    expect(currentRelease(RELEASES, 'decaf')).toBe('0.7.0.6');
  });

  it('accepts a release that holds several networks', () => {
    expect(currentRelease([{ tag_name: '0.6.3.16', name: '0.6.3.16 [decaf, mainnet]' }], 'mainnet')).toBe('0.6.3.16');
  });

  it('takes the highest tag when a failed run left two holders', () => {
    const two: ReleaseInfo[] = [
      { tag_name: '0.6.3.17', name: '0.6.3.17 [mainnet]' },
      { tag_name: '0.6.3.18', name: '0.6.3.18 [mainnet]' },
    ];
    expect(currentRelease(two, 'mainnet')).toBe('0.6.3.18');
  });

  it('returns null when no title carries the marker', () => {
    expect(currentRelease([{ tag_name: '0.7.0.5', name: '0.7.0.5' }, { tag_name: '0.7.0.4', name: null }], 'mainnet')).toBeNull();
    expect(currentRelease([], 'mainnet')).toBeNull();
  });
});

describe('one message per release', () => {
  it('warns once while behind, however many polls see it', () => {
    expect(versionAlertDue('0.6.3.17', '0.6.3.18', null)).toBe('behind');
    expect(versionAlertDue('0.6.3.17', '0.6.3.18', '0.6.3.18')).toBeNull();
  });

  it('warns again for a newer release while still behind', () => {
    expect(versionAlertDue('0.6.3.17', '0.6.3.19', '0.6.3.18')).toBe('behind');
  });

  it('says "current" once the node reaches the release it was warned about', () => {
    expect(versionAlertDue('0.6.3.18', '0.6.3.18', '0.6.3.18')).toBe('current');
    expect(versionAlertDue('0.6.3.18', '0.6.3.18', null)).toBeNull();
  });

  it('stays quiet when the reference drops back and returns (the 2026-11-07 flapping)', () => {
    // A source alternating 0.7.0.6 / 0.6.3.17 under a 0.6.3.17 node: at most
    // one warning, no "current" on the drop, no repeat on the return.
    expect(versionAlertDue('0.6.3.17', '0.7.0.6', null)).toBe('behind');
    expect(versionAlertDue('0.6.3.17', '0.6.3.17', '0.7.0.6')).toBeNull();
    expect(versionAlertDue('0.6.3.17', '0.7.0.6', '0.7.0.6')).toBeNull();
  });

  it('never warns on missing or incomparable versions', () => {
    expect(versionAlertDue(null, '0.6.3.17', null)).toBeNull();
    expect(versionAlertDue('0.6.3.17', null, null)).toBeNull();
    expect(versionAlertDue('dev-build', '0.6.3.17', null)).toBeNull();
  });
});
