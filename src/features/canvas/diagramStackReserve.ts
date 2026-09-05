export type DiagramSize = { width: number; height: number };
import type { ProjectModel } from '../../types';

/** ACM no longer reserves a second drawing zone outside the canvas model area. */
export const externalStackBottomReserve = (_project: ProjectModel, _size: DiagramSize, _quantityCount: number): number => 0;
