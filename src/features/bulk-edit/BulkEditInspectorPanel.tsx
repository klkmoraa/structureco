import { useMemo, useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { useProjectModel } from '../../store/ProjectModelContext';
import type { Selection } from '../../types';
import { BulkEditPanel, type BulkEditApplyRequest } from './BulkEditPanel';
import { prepareBulkEdit } from './bulkEditCommand';
import { createBulkEditTranslator } from './bulkEditCopy';

/**
 * Conecta el panel de edición múltiple con el proyecto real.
 *
 * Es la única pieza de la funcionalidad que conoce el store, y hace exactamente
 * tres cosas: resolver la selección a entidades, preparar el comando cuando el
 * usuario confirma, y traducir un fallo del commit a un mensaje.
 *
 * La atomicidad, el historial y la invalidación del análisis no se implementan
 * aquí: `executeProjectCommand` calcula el proyecto resultante completo y sólo
 * entonces lo publica con una sola entrada de historial. Un fallo en cualquier
 * miembro deja cero cambios.
 */
export const BulkEditInspectorPanel = ({ selection }: { selection: Extract<Selection, { kind: 'multi' }> }) => {
  const { project, executeProjectCommand } = useProjectModel();
  const { language } = useI18n();
  const t = createBulkEditTranslator(language);
  const [error, setError] = useState<string>();

  // La selección guarda ids; el panel necesita las entidades. Un id que ya no
  // existe se descarta aquí, de modo que el panel nunca agrega un fantasma.
  const resolved = useMemo(() => {
    const members = project.members.filter((member) => selection.memberIds.includes(member.id));
    const nodes = project.nodes.filter((node) => selection.nodeIds.includes(node.id));
    const memberIds = new Set(members.map((member) => member.id));
    const nodeIds = new Set(nodes.map((node) => node.id));
    return {
      members,
      nodes,
      // La selección del modelo no transporta cargas, así que entran las que
      // cuelgan de lo seleccionado. Nunca se edita una carga suelta por error.
      nodalLoads: project.nodalLoads.filter((load) => nodeIds.has(load.nodeId)),
      memberLoads: project.memberLoads.filter((load) => memberIds.has(load.memberId)),
      loadCases: project.loadCases.map((item) => item.id),
    };
  }, [project.members, project.nodes, project.nodalLoads, project.memberLoads, project.loadCases,
    selection.memberIds, selection.nodeIds]);

  const apply = async ({ draft, aggregate }: BulkEditApplyRequest) => {
    setError(undefined);
    const prepared = prepareBulkEdit(project, aggregate, draft, t('command.description', {
      count: aggregate.total,
    }));
    if (prepared.command.entries.length === 0 && prepared.command.nodeEntries.length === 0) return;
    try {
      await executeProjectCommand(prepared.command);
    } catch (cause: unknown) {
      // Fail closed: si el modelo se movió bajo la intención preparada, el
      // comando la rechaza entera y aquí sólo se informa.
      setError(cause instanceof Error ? cause.message : t('action.applyFailed'));
    }
  };

  return <BulkEditPanel
    selection={resolved}
    units={project.settings.units}
    language={language}
    error={error}
    note={t('action.analysisNote')}
    onApply={apply}
    onCancel={() => setError(undefined)}
  />;
};
