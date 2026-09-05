/**
 * Tipos y contratos para el módulo de diseño normativo ANSI/AISC 360-16 / 360-22 (LRFD).
 *
 * Sigue la regla canónica de arquitectura de StructureCo:
 * `ProjectModel → Analysis Engine → AnalysisResult → Design Module → DesignResult`
 * Es una proyección pura que nunca muta el solver, unidades ni la persistencia del proyecto.
 */

import type { MemberType } from '../types';

export type AiscCheckKind = 'tension' | 'compression' | 'flexure' | 'shear' | 'interaction';

export type AiscCheckStatus = 'pass' | 'warning' | 'fail' | 'not-applicable' | 'indeterminate';

export interface AiscVariable {
  readonly symbol: string;
  readonly label: string;
  readonly value: number;
  readonly unit: 'kN' | 'kN·m' | 'm' | 'm²' | 'm³' | 'm⁴' | 'kN/m²' | '1';
  readonly source: string;
}

export interface AiscCheckDetail {
  readonly kind: AiscCheckKind;
  readonly title: string;
  readonly clause: string;
  readonly equation: string;
  readonly inequality: string;
  readonly demand: number;
  readonly nominalCapacity: number;
  readonly phi: number;
  readonly designCapacity: number;
  readonly ratio: number;
  readonly status: AiscCheckStatus;
  readonly variables: readonly AiscVariable[];
}

export interface AiscMemberDesignResult {
  readonly memberId: string;
  readonly sectionId: string;
  readonly sectionName: string;
  readonly materialId: string;
  readonly materialName: string;
  readonly memberType: MemberType;
  readonly length: number;
  readonly unbracedLength: number;
  readonly effectiveLengthFactorK: number;
  readonly slendernessKLr: number;
  readonly governingCheck: AiscCheckKind;
  readonly maxRatio: number;
  readonly status: AiscCheckStatus;
  readonly checks: {
    readonly tension?: AiscCheckDetail;
    readonly compression?: AiscCheckDetail;
    readonly flexure?: AiscCheckDetail;
    readonly shear?: AiscCheckDetail;
    readonly interaction?: AiscCheckDetail;
  };
  readonly isEligible: boolean;
  readonly ineligibilityReason?: string;
}

export interface AiscProjectDesignSummary {
  readonly standard: {
    readonly code: 'ANSI/AISC 360-16 / 360-22';
    readonly method: 'LRFD';
    readonly title: 'Specification for Structural Steel Buildings';
  };
  readonly combinationId: string | null;
  readonly totalMembers: number;
  readonly evaluatedMembers: number;
  readonly passingMembers: number;
  readonly warningMembers: number;
  readonly failingMembers: number;
  readonly criticalMember: AiscMemberDesignResult | null;
  readonly resultsByMemberId: Record<string, AiscMemberDesignResult>;
}
