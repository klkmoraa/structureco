import { describe, expect, it } from 'vitest';
import { createDefaultProject } from '../data/defaultProject';
import { projectChecksum } from '../storage/projectRepository';
import { confirmLocalProposal, prepareLocalProposal, proposeLocalCommand, validateLocalProposal } from './localCommandProposal';

describe('local command proposal', () => {
  it('previews an allowlisted update and only confirms the reviewed snapshot', async () => {
    const project = createDefaultProject();
    const hash = await projectChecksum(project);
    const memberId = project.members[0]!.id;
    const proposal = proposeLocalCommand({ intent: `${memberId} E = 210 GPa`, snapshotHash: hash, memberIds: project.members.map((member) => member.id), sectionIds: [], materialIds: [] });

    expect(proposal.status).toBe('ready');
    expect(validateLocalProposal(proposal).ok).toBe(true);
    if (proposal.status !== 'ready') throw new Error('Expected ready proposal');
    const prepared = prepareLocalProposal(project, hash, proposal);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) throw new Error(prepared.reason);
    expect(prepared.value.diff.summary.modified).toBe(1);
    expect(confirmLocalProposal(prepared.value, { proposalId: proposal.proposalId, snapshotHash: hash }, hash).ok).toBe(true);
    expect(confirmLocalProposal(prepared.value, { proposalId: proposal.proposalId, snapshotHash: hash }, '0'.repeat(64)).ok).toBe(false);
  });

  it('rejects external proposal fields outside the closed allowlist', async () => {
    const hash = await projectChecksum(createDefaultProject());
    expect(validateLocalProposal({ version: 1, proposalId: crypto.randomUUID(), snapshotHash: hash, summary: 'Cambiar M1', status: 'ready', operation: { kind: 'member.update', memberId: 'M1', changes: { E: { value: 200, unit: 'GPa' }, unexpected: true } } }).ok).toBe(false);
  });
});
