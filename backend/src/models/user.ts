// ============================================================
// CrisisAlpha — User Context Models
// Attachment Points bridge macro graph to micro business impact
// ============================================================

export type ProfileTier = 1 | 2 | 3;
export type AttachmentRelationship = 'source' | 'manufacture' | 'ship_through' | 'warehouse' | 'sell_to';
export type DependencyStrength = 'critical' | 'high' | 'medium' | 'low';

export interface UserProfile {
  id: string;
  companyName: string;
  industry: string;
  headquartersCountry: string;
  profileTier: ProfileTier;
  attachmentPoints: AttachmentPoint[];
  savedSimulations: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AttachmentPoint {
  id: string;
  hubId: string;                      // FK to TradeHubNode in Knowledge Graph
  relationship: AttachmentRelationship;
  goodsCategory: string;              // "semiconductors", "raw_materials", etc.

  // Dependency assessment
  dependencyStrength: DependencyStrength;
  hasAlternative: boolean;
  alternativeHubId?: string;
  switchCostDays?: number;            // days to switch to alternative

  // Tier 3 only — financial exposure
  monthlyVolume?: number;
  monthlyValueUsd?: number;
  contractLockMonths?: number;
}

export interface IndustryTemplate {
  industry: string;
  typicalSources: string[];           // hub IDs
  typicalRoutes: string[];            // chokepoint IDs
  typicalMarkets: string[];           // hub IDs
  criticalDependencies: string[];     // goods categories
  defaultAttachments: Array<{
    hubId: string;
    relationship: AttachmentRelationship;
    goodsCategory: string;
    dependencyStrength: DependencyStrength;
  }>;
}

// Impact report structures
export interface ImpactProjection {
  attachmentPointId: string;
  hubName: string;
  relationship: string;
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'unaffected';
  delayDays: number;
  bufferDepletionDay: number | null;
  costImpactUsd: number | null;
  narrative: string;
}

export interface PersonalizedImpactReport {
  simulationId: string;
  userId: string;
  generatedAt: string;
  overallSeverity: 'critical' | 'high' | 'moderate' | 'low';
  projections: ImpactProjection[];
  recommendations: string[];
  financialSummary?: {
    estimatedLoss: number;
    mitigatedLoss: number;
    timeHorizonDays: number;
  };
  narrative: string;                   // AI-generated or template-based full report
}
