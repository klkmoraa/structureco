// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createDefaultProject } from '../data/defaultProject';
import { SHARE_LINK_LIMIT, buildShareLink, decodeProjectFragment, encodeProjectFragment } from './shareLink';

describe('local share link', () => {
  it('round-trips a normalized project entirely in the URL fragment', () => {
    const project = createDefaultProject();
    project.name = 'Pórtico compartido';
    const link = buildShareLink(project, 'https://example.test/workspace?source=mail');
    expect(link.ok).toBe(true);
    if (!link.ok) return;
    const url = new URL(link.url);
    expect(url.hash.startsWith('#m1:')).toBe(true);
    expect(url.search).toBe('?source=mail');
    const decoded = decodeProjectFragment(url.hash);
    expect(decoded).toMatchObject({ ok: true, project: { name: 'Pórtico compartido' } });
  });

  it('rejects malformed and overlong data instead of returning a fragile link', () => {
    expect(decodeProjectFragment('#access_token=elsewhere')).toEqual({ ok: false, reason: 'absent' });
    expect(decodeProjectFragment('#m1:not-base64!!')).toEqual({ ok: false, reason: 'malformed' });
    const project = createDefaultProject();
    project.nodalLoads = [];
    project.memberLoads = [];
    project.prescribedDisplacements = [];
    project.memberInitialEffects = [];
    project.nodes = Array.from({ length: 1100 }, (_, index) => ({ id: `N-${index}`, x: index, y: index, support: { type: 'none' as const } }));
    project.members = Array.from({ length: 1099 }, (_, index) => ({ id: `M-${index}`, i: `N-${index}`, j: `N-${index + 1}`, type: 'frame' as const, E: 2e8 + index, A: 0.01, I: 1e-4 }));
    const encoded = encodeProjectFragment(project);
    expect(encoded.ok).toBe(false);
    if (!encoded.ok) expect(encoded.characters).toBeGreaterThan(SHARE_LINK_LIMIT);
  });
});
