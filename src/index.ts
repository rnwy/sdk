// RNWY SDK — Main Client
// The intelligence layer for AI agents. 138K+ agents, 3 registries, 11 chains.
// https://rnwy.com

import type {
  ChainSlug,
  Registry,
  RNWYClientOptions,
  GetAgentOptions,
  ExplorerResponse,
  Agent,
  TrustCheckResponse,
  ReviewerProfileResponse,
  ReviewerAnalysisResponse,
} from './types'

import { RNWYError, RNWYNotFoundError, RNWYNetworkError, RNWYValidationError } from './errors'

const VALID_CHAINS: Set<string> = new Set([
  'ethereum', 'base', 'bnb', 'gnosis', 'avalanche',
  'celo', 'arbitrum', 'polygon', 'monad', 'megaeth', 'optimism',
])

const VALID_REGISTRIES: Set<string> = new Set(['erc8004', 'olas', 'virtuals'])

const CHAIN_SLUG_CORRECTIONS: Record<string, string> = {
  bsc: 'bnb',
  eth: 'ethereum',
  avax: 'avalanche',
  arb: 'arbitrum',
}

export class RNWYClient {
  private readonly baseUrl: string
  private readonly fetchFn: typeof globalThis.fetch

  constructor(options: RNWYClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'https://rnwy.com').replace(/\/$/, '')
    this.fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis)
  }

  // ─── Validation ─────────────────────────────────────────────────

  private validateChain(chain: string): ChainSlug {
    const corrected = CHAIN_SLUG_CORRECTIONS[chain.toLowerCase()]
    if (corrected) {
      throw new RNWYValidationError(
        `Invalid chain slug "${chain}". Did you mean "${corrected}"?`
      )
    }
    if (!VALID_CHAINS.has(chain)) {
      throw new RNWYValidationError(
        `Invalid chain slug "${chain}". Valid: ${[...VALID_CHAINS].join(', ')}`
      )
    }
    return chain as ChainSlug
  }

  private validateRegistry(registry: string): Registry {
    if (!VALID_REGISTRIES.has(registry)) {
      throw new RNWYValidationError(
        `Invalid registry "${registry}". Valid: ${[...VALID_REGISTRIES].join(', ')}`
      )
    }
    return registry as Registry
  }

  private validateAddress(address: string): string {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      throw new RNWYValidationError(`Invalid Ethereum address: "${address}"`)
    }
    return address.toLowerCase()
  }

  // ─── HTTP ───────────────────────────────────────────────────────

  private async request<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl)
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }

    let response: Response
    try {
      response = await this.fetchFn(url.toString())
    } catch (err) {
      throw new RNWYNetworkError(0, `Network request failed: ${(err as Error).message}`)
    }

    const body = await response.text()

    if (response.status === 404) {
      throw new RNWYNotFoundError(params.id ?? params.address ?? 'unknown', params.chain ?? 'unknown')
    }

    if (!response.ok) {
      throw new RNWYNetworkError(response.status, body)
    }

    try {
      return JSON.parse(body) as T
    } catch {
      throw new RNWYError(`Failed to parse API response as JSON`)
    }
  }

  // ─── Public Methods ─────────────────────────────────────────────

  /**
   * Get full agent data including trust score, badges, sybil analysis,
   * ownership history, commerce stats, and similar agents.
   *
   * @example
   * const data = await rnwy.getAgent('base', 16907)
   * console.log(data.agent.name)                // "Wolfpack Intelligence"
   * console.log(data.agent.scores.overall)       // 59
   * console.log(data.agent.scoreBreakdown)       // full math
   *
   * @example
   * // Olas agent
   * const olas = await rnwy.getAgent('gnosis', 2182, { registry: 'olas' })
   */
  async getAgent(
    chain: string,
    agentId: number | string,
    options: GetAgentOptions = {},
  ): Promise<ExplorerResponse> {
    const validChain = this.validateChain(chain)
    const params: Record<string, string> = {
      id: String(agentId),
      chain: validChain,
    }
    if (options.registry) {
      params.registry = this.validateRegistry(options.registry)
    }
    return this.request<ExplorerResponse>('/api/explorer', params)
  }

  /**
   * Get the trust score for an agent. Tier comes from the server (single source of truth).
   * Hits the same trust-check endpoint as getAttestation() but returns a simpler shape.
   *
   * @example
   * const trust = await rnwy.getTrustScore('base', 16907)
   * // { score: 59, tier: 'developing', badges: { earned: [...], warnings: [] },
   * //   sybilSeverity: 'moderate', sybilSignals: ['spray_pattern'] }
   */
  async getTrustScore(
    chain: string,
    agentId: number | string,
    options: GetAgentOptions = {},
  ): Promise<{
    score: number
    tier: string
    badges: { earned: string[]; warnings: string[] }
    sybilSeverity: string
    sybilSignals: string[]
    checkedAt: string
  }> {
    const data = await this.getAttestation(chain, agentId, options)
    return {
      score: data.score,
      tier: data.tier,
      badges: data.badges,
      sybilSeverity: data.sybilSeverity,
      sybilSignals: data.sybilSignals,
      checkedAt: data.checkedAt,
    }
  }

  /**
   * Get a signed ES256 trust attestation for an agent.
   * Part of the ERC-8183 multi-attestation standard.
   *
   * @example
   * const att = await rnwy.getAttestation('base', 16907)
   * console.log(att.attestation.sig)     // ES256 signature
   * console.log(att.attestation.jwks)    // JWKS endpoint for verification
   */
  async getAttestation(
    chain: string,
    agentId: number | string,
    options: GetAgentOptions = {},
  ): Promise<TrustCheckResponse> {
    const validChain = this.validateChain(chain)
    const params: Record<string, string> = {
      id: String(agentId),
      chain: validChain,
    }
    if (options.registry) {
      params.registry = this.validateRegistry(options.registry)
    }
    return this.request<TrustCheckResponse>('/api/trust-check', params)
  }

  /**
   * Check if an agent meets a minimum trust score threshold.
   * Calls trust-check and compares client-side.
   *
   * **Note:** This is a client-side convenience. For on-chain trust gating,
   * use the RNWYTrustOracle contract directly.
   *
   * @example
   * const passes = await rnwy.meetsThreshold('base', 16907, 60)
   * // false (score is 59)
   */
  async meetsThreshold(
    chain: string,
    agentId: number | string,
    threshold: number,
    options: GetAgentOptions = {},
  ): Promise<boolean> {
    const data = await this.getAttestation(chain, agentId, options)
    return data.score >= threshold
  }

  /**
   * Get a reviewer wallet's behavior profile.
   * Includes velocity, score distribution, sybil signals, and funder info.
   *
   * @example
   * const profile = await rnwy.getReviewerProfile('0x1c35...88fc', 'base')
   * console.log(profile.summary.sybil_signals)
   */
  async getReviewerProfile(
    address: string,
    chain: string,
  ): Promise<ReviewerProfileResponse> {
    const validChain = this.validateChain(chain)
    const validAddress = this.validateAddress(address)
    return this.request<ReviewerProfileResponse>('/api/reviewer', {
      address: validAddress,
      chain: validChain,
      summary: 'true',
    })
  }

  /**
   * Get independent reviewer wallet age analysis for a specific agent.
   * Detects same-day creation clusters and batch patterns.
   *
   * @example
   * const analysis = await rnwy.getReviewerAnalysis('base', 16907)
   * console.log(analysis.summary.lowHistoryPct)  // 100
   * console.log(analysis.reviewers)               // per-wallet breakdown
   */
  async getReviewerAnalysis(
    chain: string,
    agentId: number | string,
  ): Promise<ReviewerAnalysisResponse> {
    const validChain = this.validateChain(chain)
    return this.request<ReviewerAnalysisResponse>('/api/reviewer-analysis', {
      id: String(agentId),
      chain: validChain,
    })
  }
}

// ─── Re-exports ───────────────────────────────────────────────────

export { RNWYError, RNWYNotFoundError, RNWYNetworkError, RNWYValidationError } from './errors'
export type * from './types'
