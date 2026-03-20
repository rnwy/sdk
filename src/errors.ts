// RNWY SDK — Error Classes

export class RNWYError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RNWYError'
  }
}

export class RNWYNotFoundError extends RNWYError {
  public readonly agentId: string | number
  public readonly chain: string

  constructor(agentId: string | number, chain: string) {
    super(`Agent ${agentId} not found on ${chain}`)
    this.name = 'RNWYNotFoundError'
    this.agentId = agentId
    this.chain = chain
  }
}

export class RNWYNetworkError extends RNWYError {
  public readonly status: number
  public readonly body: string

  constructor(status: number, body: string) {
    super(`RNWY API returned ${status}: ${body}`)
    this.name = 'RNWYNetworkError'
    this.status = status
    this.body = body
  }
}

export class RNWYValidationError extends RNWYError {
  constructor(message: string) {
    super(message)
    this.name = 'RNWYValidationError'
  }
}
