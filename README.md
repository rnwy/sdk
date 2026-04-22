# rnwy-sdk

[![npm version](https://img.shields.io/npm/v/rnwy-sdk.svg)](https://www.npmjs.com/package/rnwy-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

TypeScript SDK for [RNWY](https://rnwy.com) — the multi-registry trust layer for AI agents.

180,000+ agents indexed across 12 chains and 3 registries (ERC-8004, Olas, Virtuals). Transparent trust scoring, sybil detection, signed attestations, and commerce data. No API key required.

## Install

```bash
npm install rnwy-sdk
```

## Quick Start

```typescript
import { RNWYClient } from 'rnwy-sdk'

const rnwy = new RNWYClient()

const data = await rnwy.getAgent('base', 16907)
console.log(data.agent.name)            // "Wolfpack Intelligence"
console.log(data.agent.scores.overall)   // 59
```

## Methods

### `getAgent(chain, agentId, options?)`

Full agent data: metadata, trust score with math, badges, sybil analysis, ownership history, commerce stats, and similar agents.

```typescript
// ERC-8004 agent on Base
const data = await rnwy.getAgent('base', 16907)

// Olas agent on Gnosis
const olas = await rnwy.getAgent('gnosis', 2182, { registry: 'olas' })

// Access the score breakdown — see exactly how the score was calculated
console.log(data.agent.scoreBreakdown)
// { base: 50, bonuses: { owner_wallet_age: { value: 3, reason: "..." } }, ... }

// Sybil analysis
console.log(data.agent.reviewerSybil?.signals.severity)
// "moderate"
```

### `getTrustScore(chain, agentId, options?)`

Trust score with tier from the server (single source of truth). Hits the same endpoint as `getAttestation()` but returns a simpler shape.

```typescript
const trust = await rnwy.getTrustScore('base', 16907)
// {
//   score: 59,
//   tier: "developing",
//   badges: { earned: ["original_owner"], warnings: [] },
//   sybilSeverity: "moderate",
//   sybilSignals: ["spray_pattern"],
//   checkedAt: "2026-03-20T13:26:43.190Z"
// }
```

### `getAttestation(chain, agentId, options?)`

ES256-signed trust attestation. Part of the [ERC-8183](https://github.com/erc-8183/hook-contracts) multi-attestation standard. Verify with the JWKS endpoint.

```typescript
const att = await rnwy.getAttestation('base', 16907)
console.log(att.attestation.sig)     // ES256 signature
console.log(att.attestation.jwks)    // "https://rnwy.com/.well-known/jwks.json"
console.log(att.attestation.expiry)  // 24-hour TTL
console.log(att.score)               // 59
console.log(att.sybilSeverity)       // "moderate"
```

### `meetsThreshold(chain, agentId, threshold, options?)`

Boolean check: does this agent meet a minimum trust score? This is a client-side convenience — for on-chain trust gating, use the [oracle contract](https://basescan.org/address/0xD5fdccD492bB5568bC7aeB1f1E888e0BbA6276f4) directly.

```typescript
const passes = await rnwy.meetsThreshold('base', 16907, 60)
// false (score is 59)

const ok = await rnwy.meetsThreshold('base', 16907, 50)
// true
```

### `getReviewerProfile(address, chain)`

Wallet-level behavior profile for a reviewer address. Includes velocity, score distribution, sybil signals, and common funder info.

```typescript
const profile = await rnwy.getReviewerProfile(
  '0x1c35d0545289042c8d786a5f98b80989a63e88fc',
  'base'
)
console.log(profile.summary.reviews_per_day)     // 4
console.log(profile.summary.score_variance)       // 0
console.log(profile.summary.sybil_signals)        // ["Funded by 0x9f55..."]
console.log(profile.summary.first_funder)          // "0x9f5504ba..."
```

### `getReviewerAnalysis(chain, agentId)`

Independent reviewer wallet age analysis for a specific agent. Detects same-day creation clusters and batch patterns.

```typescript
const analysis = await rnwy.getReviewerAnalysis('base', 16907)
console.log(analysis.summary.lowHistoryPct)  // 100
console.log(analysis.distribution)
// { sameDay: 0, under3d: 1, under15d: 0, under30d: 0, under1yr: 0, over1yr: 0, noHistory: 0 }
console.log(analysis.reviewers)
// [{ address: "0x130e...", ageAtReviewDays: 3, classification: "under_3d" }]
```

### `getEntity(wallet)`

Full operator footprint for any wallet address — all agents owned, trust scores, sybil signals, wallet intelligence, and MCP servers associated with that operator.

```typescript
const entity = await rnwy.getEntity('0xf653068677a9a26d5911da8abd1500d043ec807e')
console.log(entity.agents)           // all agents owned by this wallet
console.log(entity.wallet_score)     // dual signal/risk scores
console.log(entity.mcp_servers)      // MCP servers associated with this operator
```

### `getMCPAttestation(canonicalId)`

ES256-signed attestation for any MCP server. Returns risk score, threat findings, and a signed envelope verifiable against the JWKS endpoint using kid `rnwy-mcp-v1`.

```typescript
const att = await rnwy.getMCPAttestation('vujasinovic/keycloak-source-mcp')
console.log(att.mcp_risk_score)      // 0–100 threat score
console.log(att.findings)            // rule violations detected
console.log(att.attestation.sig)     // ES256 signature
console.log(att.attestation.kid)     // "rnwy-mcp-v1"
```

## Options

```typescript
const rnwy = new RNWYClient({
  baseUrl: 'https://rnwy.com',     // Default. Override for testing.
  fetch: customFetchFn,             // Default: globalThis.fetch
})
```

## Chains

12 supported chains: `ethereum`, `base`, `bnb`, `gnosis`, `avalanche`, `celo`, `arbitrum`, `polygon`, `monad`, `megaeth`, `optimism`, `solana`

Common mistakes caught automatically:
- `bsc` → suggests `bnb`
- `eth` → suggests `ethereum`
- `avax` → suggests `avalanche`
- `arb` → suggests `arbitrum`

## Registries

- `erc8004` (default)
- `olas`
- `virtuals` (coming soon)

## Error Handling

```typescript
import { RNWYNotFoundError, RNWYValidationError, RNWYNetworkError } from 'rnwy-sdk'

try {
  const data = await rnwy.getAgent('base', 999999)
} catch (err) {
  if (err instanceof RNWYNotFoundError) {
    console.log('Agent not found')
  } else if (err instanceof RNWYValidationError) {
    console.log('Bad input:', err.message)
  } else if (err instanceof RNWYNetworkError) {
    console.log('API error:', err.status)
  }
}
```

## TypeScript

Every response is fully typed. Import any type directly:

```typescript
import type {
  Agent,
  ExplorerResponse,
  TrustCheckResponse,
  ScoreBreakdown,
  ReviewerSybilSignals,
  Badge,
  ChainSlug,
  Registry,
} from 'rnwy-sdk'
```

## On-Chain Oracle

RNWY trust scores are also readable on-chain via the [`RNWYTrustOracle`](https://basescan.org/address/0xD5fdccD492bB5568bC7aeB1f1E888e0BbA6276f4) contract on Base — 180,000+ agents seeded. Smart contracts can call `getScore()`, `meetsThreshold()`, and `hasScore()` directly, enabling trust-gated agent interactions without any off-chain dependency.

No other agent trust SDK in this space has an on-chain component. The oracle is a dumb data store — scores are computed off-chain by the pipeline and written on-chain via delta sync. Same architecture as "fast pipeline + dumb API," extended to the blockchain.

```solidity
// Solidity — gate a job by RNWY score
IRNWYTrustOracle oracle = IRNWYTrustOracle(0xD5fdccD492bB5568bC7aeB1f1E888e0BbA6276f4);
require(oracle.meetsThreshold(agentId, 8453, "erc8004", 60), "Trust score too low");
```

This SDK wraps the HTTP endpoints. For direct on-chain reads, interact with the oracle contract via ethers.js or viem.

## How Scoring Works

RNWY uses transparent trust scoring — every score shows the math behind it. Base score of 50, cap of 95. Bonuses for wallet age, agent maturity, original ownership. Penalties for low-history reviewer wallets and sybil patterns. Four weighted sybil signals (common funder, inhuman velocity, sweep pattern, score clustering) plus coordination analysis.

No black box. `scoreBreakdown` gives you every input, bonus, and penalty that produced the number.

## Links

- [RNWY](https://rnwy.com) — Live platform
- [Explorer](https://rnwy.com/explorer) — Browse 180,000+ agents
- [API Docs](https://rnwy.com/api) — Full API reference
- [Oracle on BaseScan](https://basescan.org/address/0xD5fdccD492bB5568bC7aeB1f1E888e0BbA6276f4) — On-chain trust scores
- [JWKS](https://rnwy.com/.well-known/jwks.json) — Verify attestation signatures

## License

MIT
