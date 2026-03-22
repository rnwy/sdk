// RNWY SDK — TypeScript Types
// Derived from live API responses on March 22, 2026

// ─── Chain & Registry ───────────────────────────────────────────────

export type ChainSlug =
  | 'ethereum'
  | 'base'
  | 'bnb'
  | 'gnosis'
  | 'avalanche'
  | 'celo'
  | 'arbitrum'
  | 'polygon'
  | 'monad'
  | 'megaeth'
  | 'optimism'

export type Registry = 'erc8004' | 'olas' | 'virtuals'

// ─── Explorer / Agent ───────────────────────────────────────────────

export interface AgentMetadata {
  name: string | null
  description: string | null
  image: string | null
  mcpEndpoint: string | null
  mcpVersion: string | null
  capabilities: string[]
  a2aEndpoint: string | null
  a2aVersion: string | null
  ens: string | null
  did: string | null
  supportedTrusts: string[]
  x402Support: boolean
  domains: string[]
  email: string | null
  website: string | null
  twitter: string | null
  github: string | null
  discord: string | null
  services: string[]
  a2aCapabilities: unknown | null
  a2aSecurityScheme: unknown | null
}

export interface FeedbackItem {
  score: number
  tag1: string | null
  tag2: string | null
  clientAddress: string
  createdAt: string
  text: string | null
}

export interface Ownership {
  isOriginalOwner: boolean
  transferCount: number
  originalOwner: string
  transfers: unknown[]
}

export interface FeedbackerBucketCounts {
  sameDay: number
  d1to3: number
  d4to15: number
  d16to30: number
  m1to12: number
  over1yr: number
}

export interface AddressAgeDetails {
  label: string
  score: number
  method: string
  chain_id: number
  computed_at: string
  owner_address: string
  first_seen_date: string | null
  wallet_age_days: number
  first_seen_block: number | null
  walletsWithNoHistory: number
  totalAddresses: number
  feedbackerPctFresh: number
  feedbackerAvgAge: number
  feedbackerLabel: string
  feedbackerBucketCounts: FeedbackerBucketCounts
  precomputedOverall: number
}

export interface ScoreBreakdownBonus {
  value: number
  reason: string
}

export interface ScoreBreakdownCap {
  applied: boolean
  original_score: number
  capped_score: number
  reason: string
  missing_signals: string[]
}

export interface ScoreBreakdown {
  base: number
  inputs: {
    avg_score: number | null
    age_in_days: number
    total_feedback: number
    transfer_count: number
    address_age_days: number
    is_original_owner: boolean
    feedbacker_pct_fresh: number
    feedbacker_no_history: number
    feedbacker_total_checked: number
    sybil_severity: string | null
  }
  bonuses: Record<string, ScoreBreakdownBonus>
  penalties: Record<string, ScoreBreakdownBonus>
  cap?: ScoreBreakdownCap
  computed_at: string
  /** Current formula version. As of March 2026: "2.4" */
  formula_version: string
}

/** Known badge IDs as of v2.4 */
export type BadgeId =
  | 'verified_reviews'
  | 'high_volume'
  | 'long_standing'
  | 'original_owner'
  | 'established_wallet'
  | 'low_history_reviewers'
  | 'ghost_reviewers'
  | 'recently_registered'
  | 'transferred'
  | 'sybil_heavy'
  | 'sybil_elevated'
  | 'incomplete_data'

export interface Badge {
  id: BadgeId | string
  type: string
  label: string
}

export interface SybilSignalBreakdown {
  common_funder: number
  inhuman_velocity: number
  spray_pattern: number
  score_clustering: number
}

export interface FlaggedAddress {
  address: string
  signals: string[]
}

export interface FunderCluster {
  funder: string
  wallets_funded: number
  wallets_that_reviewed_this_agent: number
  is_agent_owner: boolean
}

export interface Coordination {
  born_to_review_pct: number
  score_variance: number
  unique_scores: number
  cohort_size: number
  total_reviewers: number
  level: 'heavy' | 'elevated'
}

/** Sybil severity levels: heavy (20+), elevated (10-19), moderate (3-9), low (0-2) */
export type SybilSeverity = 'heavy' | 'elevated' | 'moderate' | 'low'

export interface ReviewerSybilSignals {
  severity: SybilSeverity
  by_signal: SybilSignalBreakdown
  computed_at: string
  flagged_pct: number
  coordination: Coordination | null
  flagged_count: number
  total_reviewed: number
  weighted_score: number
  flagged_addresses: FlaggedAddress[]
  score_distribution: {
    all: Record<string, number>
    flagged: Record<string, number>
  }
  funder_clusters?: FunderCluster[]
  flagged_addresses_truncated: boolean
}

export interface ReviewerSybil {
  count: number
  pct: number
  signals: ReviewerSybilSignals
}

export interface CommerceStats {
  agent_id: string
  chain_id: number
  registry: string
  protocol: string
  total_jobs_as_client: number
  total_jobs_as_provider: number
  total_jobs_as_evaluator: number
  unique_counterparties: number
  repeat_counterparty_pct: number
  circular_job_count: number
  total_payment_received: number
  total_payment_sent: number
  avg_delivery_time_seconds: number | null
  first_job_at: string | null
  last_job_at: string | null
  updated_at: string
}

export interface SimilarAgent {
  id: number
  name: string | null
  description: string | null
  image: string | null
  score: number
  sharedAttributes: {
    mcpTools: number
    a2aSkills: number
    domains: number
  }
  fallback: boolean
}

export interface QualityTrajectory {
  current: number
  previous: number | null
  resolvedAt: string
}

export interface Agent {
  id: number
  name: string | null
  owner: string
  agentURI: string
  registeredAt: string
  ageInDays: number
  metadata: AgentMetadata
  reputation: {
    totalFeedback: string
    avgScore: number | null
    feedbackAddresses: string[]
    feedbackDates: string[]
  }
  feedback: FeedbackItem[]
  ownership: Ownership
  addressAgeDetails: AddressAgeDetails | null
  addressAgeScore: number | null
  scores: {
    addressAge: number | null
    continuity: number | null
    overall: number | null
  }
  scoreBreakdown: ScoreBreakdown | null
  badges: Badge[]
  reviewerSybil: ReviewerSybil | null
  chain: string
  registry: string
  commerceStats: CommerceStats[]
}

export interface ExplorerResponse {
  agent: Agent
  blockExplorer: string
  similarAgents: SimilarAgent[]
  qualityTrajectory: QualityTrajectory | null
}

// ─── Trust Check / Attestation ──────────────────────────────────────

export interface AttestationSigned {
  agentId: number
  chain: string
  registry: string
  score: number
  tier: string
  badges: string[]
  sybilSeverity: string
  sybilSignals: string[]
  attestedAt: string
}

export interface Attestation {
  issuer: string
  type: string
  kid: string
  alg: string
  jwks: string
  signed: AttestationSigned
  sig: string
  expiry: string
}

export interface TrustCheckResponse {
  agentId: number
  chain: string
  name: string | null
  score: number
  threshold: number
  pass: boolean
  tier: string
  badges: {
    earned: string[]
    warnings: string[]
  }
  reason: string
  owner: string
  isOriginalOwner: boolean
  feedbackCount: number
  ageDays: number
  checkedAt: string
  sybilSeverity: string
  sybilSignals: string[]
  attestation: Attestation
}

// ─── Reviewer Profile ───────────────────────────────────────────────

export interface ReviewerSummary {
  unique_agents_reviewed: number
  avg_score: number
  score_variance: number
  unique_scores_used: number
  score_distribution: Record<string, number>
  first_review: string
  last_review: string
  active_days: number
  reviews_per_day: number
  first_funder: string | null
  sybil_signals: string[]
}

export interface ReviewerProfileResponse {
  address: string
  chain: string
  chain_id: number
  total_reviews: number
  summary: ReviewerSummary
}

// ─── Reviewer Analysis ──────────────────────────────────────────────

export interface ReviewerWallet {
  address: string
  ageAtReviewDays: number
  currentAgeDays: number
  classification: string
}

export interface ReviewerAnalysisResponse {
  agentId: number
  chain: string
  totalReviews: number
  uniqueReviewers: number
  analyzedWallets: number
  uncachedWallets: number
  metric: string
  distribution: {
    sameDay: number
    under3d: number
    under15d: number
    under30d: number
    under1yr: number
    over1yr: number
    noHistory: number
  }
  summary: {
    sameDayPct: number
    lowHistoryPct: number
    lowHistoryCount: number
    establishedPct: number
    establishedCount: number
  }
  sybilFlags: string[]
  clustering: unknown | null
  reviewers: ReviewerWallet[]
}

// ─── Risk Terms ─────────────────────────────────────────────────────

export interface RiskTier {
  level: number
  label: 'low' | 'moderate' | 'elevated' | 'high' | 'severe' | 'critical'
  description: string
  computed: boolean
}

export interface RiskSignals {
  trust_score: number | null
  score_available: boolean
  sybil_severity: string | null
  address_age_days: number | null
  is_original_owner: boolean
  review_count: number
  reviewer_credibility: 'high' | 'medium' | 'low' | null
}

export interface RiskDataCoverage {
  address_age: boolean
  sybil_analysis: boolean
  reviewer_credibility: boolean
  signals_available: number
  signals_total: number
}

export interface RiskDeclineReason {
  signal: string
  value: string
  reason: string
}

export interface RiskMethodology {
  version: string
  url: string
  description: string
}

export interface RiskDisclaimer {
  status: string
  text: string
  data_limitations: string
  tos_url: string
}

export interface RiskTermsResponse {
  recommendation: 'terms' | 'decline' | 'insufficient_data'
  agent_id: number
  agent_name: string | null
  chain: string
  chain_id: number
  registry: string
  explorer_url: string
  risk_tier: RiskTier
  signals: RiskSignals
  data_coverage: RiskDataCoverage
  decline_reasons?: RiskDeclineReason[]
  methodology: RiskMethodology
  disclaimer: RiskDisclaimer
  warning: string | null
  timestamp: string
  auth?: { status: string; limit: string }
}

// ─── SDK Options ────────────────────────────────────────────────────

export interface RNWYClientOptions {
  /** Base URL override. Default: https://rnwy.com */
  baseUrl?: string
  /** Custom fetch implementation. Default: globalThis.fetch */
  fetch?: typeof globalThis.fetch
}

export interface GetAgentOptions {
  registry?: Registry
}
