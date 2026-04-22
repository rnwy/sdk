// RNWY SDK — Main Client
// The intelligence layer for AI agents. 180,000+ agents, 3 registries, 12 chains.
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
  RiskTermsResponse,
} from './types'

import { RNWYError, RNWYNotFoundError, RNWYNetworkError, RNWYValidationError } from './errors'

const VALID_CHAINS: Set<string> = new Set([
  'ethereum', 'base', 'bnb', 'gnosis', 'avalanche',
  'celo', 'arbitrum', 'polygon', 'monad', 'megaeth', 'optimism', 'solana',
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

  private async requestPost<T>(
    path: string,
    body: Record<string, unknown>,
    headers?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(path, this.baseUrl)

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    let response: Response
    try {
      response = await this.fetchFn(url.toString(), {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(body),
      })
    } catch (err) {
      throw new RNWYNetworkError(0, `Network request failed: ${(err as Error).message}`)
    }

    const text = await response.text()

    if (response.status === 404) {
      throw new RNWYNotFoundError(
        String(body.agent_id ?? 'unknown'),
        String(body.chain ?? 'unknown'),
      )
    }

    if (!response.ok) {
      throw new RNWYNetworkError(response.status, text)
    }

    try {
      return JSON.parse(text) as T
    } catch {
      throw new RNWYError('Failed to parse API response as JSON')
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

  /**
   * Get full operator footprint for any wallet address.
   * Returns all agents owned, trust scores, sybil signals,
   * wallet intelligence, and MCP servers associated with that operator.
   *
   * @example
   * const entity = await rnwy.getEntity('0xf653068677a9a26d5911da8abd1500d043ec807e')
   * console.log(entity.agents)        // all agents owned by this wallet
   * console.log(entity.wallet_score)  // dual signal/risk scores
   * console.log(entity.mcp_servers)   // MCP servers linked to this operator
   */
  async getEntity(wallet: string): Promise<any> {
    const validAddress = this.validateAddress(wallet)
    return this.request<any>('/api/entity', { wallet: validAddress })
  }

  /**
   * Get an ES256-signed attestation for any MCP server.
   * Returns risk score, threat findings, and a signed envelope
   * verifiable against the JWKS endpoint using kid rnwy-mcp-v1.
   *
   * @example
   * const att = await rnwy.getMCPAttestation('vujasinovic/keycloak-source-mcp')
   * console.log(att.mcp_risk_score)   // 0–100 threat score
   * console.log(att.findings)         // rule violations detected
   * console.log(att.attestation.sig)  // ES256 signature
   * console.log(att.attestation.kid)  // "rnwy-mcp-v1"
   */
  async getMCPAttestation(canonicalId: string): Promise<any> {
    if (!canonicalId || typeof canonicalId !== 'string') {
      throw new RNWYValidationError('canonicalId must be a non-empty string')
    }
    return this.request<any>('/api/mcp-attestation', { canonical_id: canonicalId })
  }

  /**
   * Get counterparty risk intelligence for an agent.
   * Returns risk tier, raw trust signals, data coverage, and methodology reference.
   * Designed for marketplace operators and escrow providers setting transaction parameters.
   *
   * Unauthenticated: 5/min. With API key: 60/min.
   *
   * Full methodology with interactive calculator: https://rnwy.com/risk-intelligence
   *
   * @example
   * const risk = await rnwy.getRiskTerms('base', 16907)
   * console.log(risk.recommendation)                    // "terms"
   * console.log(risk.risk_tier.label)                   // "elevated"
   * console.log(risk.signals.trust_score)               // 54
   * console.log(risk.data_coverage.signals_available)   // 6
   *
   * @example
   * // With API key for higher rate limit
   * const risk = await rnwy.getRiskTerms('base', 16907, { apiKey: 'your-key' })
   *
   * @example
   * // Decline response (heavy sybil indicators)
   * const risk = await rnwy.getRiskTerms('base', 1380)
   * console.log(risk.recommendation)    // "decline"
   * console.log(risk.decline_reasons)   // [{ signal: "sybil_severity", ... }]
   *
   * @example
   * // Incomplete data coverage
   * const risk = await rnwy.getRiskTerms('monad', 182)
   * console.log(risk.data_coverage.signals_available)   // 3
   * console.log(risk.warning)  // "Trust score computed from incomplete data..."
   */
  async getRiskTerms(
    chain: string,
    agentId: number | string,
    options: { registry?: string; apiKey?: string } = {},
  ): Promise<RiskTermsResponse> {
    const validChain = this.validateChain(chain)
    const registry = options.registry ? this.validateRegistry(options.registry) : undefined

    const body: Record<string, unknown> = {
      agent_id: typeof agentId === 'string' ? parseInt(agentId, 10) : agentId,
      chain: validChain,
    }
    if (registry) body.registry = registry

    const headers: Record<string, string> = {}
    if (options.apiKey) {
      headers['Authorization'] = `Bearer ${options.apiKey}`
    }

    return this.requestPost<RiskTermsResponse>('/api/risk-terms', body, headers)
  }
}

// ─── Re-exports ───────────────────────────────────────────────────

export { RNWYError, RNWYNotFoundError, RNWYNetworkError, RNWYValidationError } from './errors'
export type * from './types'
