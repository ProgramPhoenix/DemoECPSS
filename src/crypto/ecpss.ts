/**
 * ECPSS - Electing Committees Proactive Secret Sharing
 * Simulation of the protocol flow
 */

export interface Share {
  shareIndex: number
  value: string
}

export type LogCallback = (message: string, type: 'info' | 'success' | 'warning' | 'error') => void

export class Node {
  id: number
  name: string
  private randomValue: number = 0
  private isHolding: boolean = false
  private nominatedNode: number | null = null
  private share: Share | null = null
  private logCallback: LogCallback

  constructor(id: number, logCallback: LogCallback) {
    this.id = id
    this.name = `Node ${id}`
    this.logCallback = logCallback
  }

  /**
   * Generate a random value for committee election
   */
  generateRandomValue(): number {
    this.randomValue = Math.random()
    return this.randomValue
  }

  /**
   * Get the current random value
   */
  getRandomValue(): number {
    return this.randomValue
  }

  /**
   * Set this node as part of holding committee
   */
  setAsHolding(): void {
    this.isHolding = true
  }

  /**
   * Check if this node should be in nominating committee and nominate a holding member
   * Returns the nominated node ID if this node is in nominating committee, null otherwise
   */
  checkAndNominate(allValues: number[], nominatingSize: number, availableNodes: number[]): number | null {
    // Sort all values to find the threshold
    const sortedValues = [...allValues].sort((a, b) => a - b)
    const threshold = sortedValues[nominatingSize - 1]!
    
    // Check if this node is nominating
    if (this.randomValue <= threshold) {
      // Select a holding member
      const candidates = availableNodes.filter(nodeId => nodeId !== this.id)
      const randomIndex = Math.floor(Math.random() * candidates.length)
      const selected = candidates[randomIndex] ?? this.id
      
      this.nominatedNode = selected
      this.log(`Node ${this.id} nominates Node ${selected} for holding committee`, 'info')
      
      return selected
    }
    
    return null
  }

  /**
   * Receive a share
   */
  receiveShare(share: Share): void {
    this.share = share
  }

  /**
   * Get the share held by this node
   */
  getShare(): Share | null {
    return this.share
  }

  /**
   * Check if this node is in holding committee
   */
  isInHoldingCommittee(): boolean {
    return this.isHolding
  }

  /**
   * Get nominated node ID
   */
  getNominatedNode(): number | null {
    return this.nominatedNode
  }

  /**
   * Reset node to idle state
   */
  reset(): void {
    this.randomValue = 0
    this.isHolding = false
    this.nominatedNode = null
    this.share = null
  }

  /**
   * Helper: Logging with callback
   */
  private log(message: string, type: 'info' | 'success' | 'warning' | 'error'): void {
    this.logCallback(message, type)
  }
}

export class ECPSSSimulator {
  private logCallback: LogCallback
  private nodes: Map<number, Node> = new Map()
  private currentEpoch: number = 0
  private totalNodes: number = 10
  private nominatingSize: number = 5
  private threshold: number = 3

  constructor(logCallback: LogCallback) {
    this.logCallback = logCallback
    this.initializeNodes()
  }

  /**
   * Initialize all nodes in the network
   */
  private initializeNodes(): void {
    for (let i = 1; i <= this.totalNodes; i++) {
      const node = new Node(i, this.logCallback)
      this.nodes.set(i, node)
    }
  }

  /**
   * Reset all nodes to idle state
   */
  private resetAllNodes(): void {
    for (const node of this.nodes.values()) {
      node.reset()
    }
  }

  /**
   * Initialize the ECPSS protocol
   */
  async initialize(): Promise<void> {
    this.logCallback('ECPSS Protocol initialized', 'success')
    this.logCallback(`Network: ${this.totalNodes} nodes, nominating committee size ${this.nominatingSize}, threshold ${this.threshold}`, 'info')
  }

  /**
   * Encrypt the secret and start first epoch
   */
  async encryptSecret(_secret: string): Promise<void> {
    this.logCallback('Encrypting secret...', 'info')
    
    // Start first epoch
    await this.startNewEpoch()
    
    this.logCallback('Secret encrypted and first epoch started', 'success')
  }

  /**
   * Start a new epoch with committee election and share distribution
   */
  private async startNewEpoch(): Promise<void> {
    this.currentEpoch++
    this.resetAllNodes()
    
    // All nodes generate random values
    for (const node of this.nodes.values()) {
      node.generateRandomValue()
    }
    
    // Collect all random values (without IDs)
    const allValues = Array.from(this.nodes.values()).map(node => node.getRandomValue())
    
    // Get all available node IDs for selection
    const availableNodes = Array.from(this.nodes.keys())
    
    // Each node checks if it's nominating and nominates a holder
    const holdingMembers: number[] = []
    for (const node of this.nodes.values()) {
      const available = availableNodes.filter(id => !holdingMembers.includes(id))
      const nominated = node.checkAndNominate(allValues, this.nominatingSize, available)
      
      if (nominated !== null) {
        holdingMembers.push(nominated)
        const holder = this.nodes.get(nominated)
        if (holder) holder.setAsHolding()
      }
    }
    
    this.logCallback(`Holding committee formed: [${holdingMembers.join(', ')}]`, 'success')
    
    // Distribute shares to holding committee
    await this.distributeShares(holdingMembers)
  }

  /**
   * Distribute shares to holding committee members
   */
  private async distributeShares(holders: number[]): Promise<void> {
    for (let i = 0; i < holders.length; i++) {
      const holderId = holders[i]!
      const holder = this.nodes.get(holderId)
      
      if (!holder) continue
      
      const share: Share = {
        shareIndex: i,
        value: this.generateMockShare()
      }
      
      holder.receiveShare(share)
    }
    
    this.logCallback(`Distributed ${holders.length} shares to holding committee`, 'info')
  }

  /**
   * Keep alive - starts new epoch (called when timer expires with flag set)
   */
  async keepAlive(): Promise<void> {
    await this.startNewEpoch()
  }

  /**
   * Reconstruct secret when timeout occurs
   */
  async reconstructSecret(): Promise<void> {
    this.logCallback('Timeout - Reconstructing secret...', 'warning')
    
    // Gather shares from holding committee nodes
    const sharesCollected: Share[] = []
    for (const node of this.nodes.values()) {
      if (node.isInHoldingCommittee()) {
        const share = node.getShare()
        if (share) sharesCollected.push(share)
      }
    }
    
    this.logCallback(`Collected ${sharesCollected.length} shares from holding committee`, 'info')
    
    // Reset for next encryption
    this.currentEpoch = 0
    this.resetAllNodes()
  }

  /**
   * Helper: Generate mock share value
   */
  private generateMockShare(): string {
    return Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
  }

  /**
   * Get all nodes
   */
  getAllNodes(): Node[] {
    return Array.from(this.nodes.values())
  }

  /**
   * Get node by ID
   */
  getNode(id: number): Node | undefined {
    return this.nodes.get(id)
  }

  /**
   * Get current epoch
   */
  getCurrentEpoch(): number {
    return this.currentEpoch
  }
}