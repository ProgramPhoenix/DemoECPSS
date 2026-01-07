/**
 * ECPSS - Electing Committees Proactive Secret Sharing
 * Simulation of the protocol flow with Shamir's Secret Sharing
 */

import { type Share, ShamirSecretSharing } from './shamir'

export type LogCallback = (message: string, type: 'info' | 'success' | 'warning' | 'error') => void

export class Node {
  id: number
  name: string
  private randomValue: number = 0
  private share: Share | null = null
  private logCallback: LogCallback

  constructor(id: number, logCallback: LogCallback) {
    this.id = id
    this.name = `Node ${id}`
    this.logCallback = logCallback
  }

  /**
   * Create sub-shares for handover protocol (Section 3.1.3)
   * Creates random polynomial G_j where G_j(0) = current share value
   * Returns sub-shares for each evaluation point k in [1, numNewSeats]
   */
  createSubShares(numNewSeats: number, threshold: number): bigint[] {
    if (!this.share) {
      throw new Error('Node has no share to create sub-shares from')
    }

    // Create random polynomial G_j where G_j(0) = this.share.y
    const coefficients: bigint[] = [this.share.y]
    for (let i = 1; i < threshold; i++) {
      coefficients.push(ShamirSecretSharing.randomCoefficient())
    }

    // Evaluate polynomial at points 1, 2, ..., numNewSeats
    const subShares: bigint[] = []
    for (let k = 1; k <= numNewSeats; k++) {
      const subShareValue = ShamirSecretSharing.evaluatePolynomial(coefficients, k)
      subShares.push(subShareValue)
    }

    return subShares
  }

  /**
   * Receive sub-shares and compute new share using Lagrange interpolation
   * @param seatIndex New seat index (x-coordinate) for this node
   * @param subShareValues Sub-shares from old committee members
   * @param oldSeatIndices Original seat indices of old committee members
   */
  computeNewShareFromSubShares(
    seatIndex: number,
    subShareValues: bigint[],
    oldSeatIndices: number[]
  ): void {
    // Compute new share: Σ λ_j · σ_{j,k} where j are old seat indices
    let newShareValue = 0n

    for (let j = 0; j < subShareValues.length; j++) {
      const lambda = ShamirSecretSharing.lagrangeCoefficient(oldSeatIndices, j)
      const term = (lambda * subShareValues[j]!) % ShamirSecretSharing.PRIME
      newShareValue = (newShareValue + term) % ShamirSecretSharing.PRIME
    }

    // Ensure positive
    if (newShareValue < 0n) {
      newShareValue = (newShareValue % ShamirSecretSharing.PRIME + ShamirSecretSharing.PRIME) % ShamirSecretSharing.PRIME
    }

    // Store only the final share (not sub-shares)
    this.share = {
      shareIndex: seatIndex - 1,
      x: seatIndex,
      y: newShareValue,
      value: newShareValue.toString(16)
    }

    this.log(`Computed new share for seat ${seatIndex}`, 'info')
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
      this.logCallback(`Node ${this.id} received share #${share.x}`, 'info')
  }

  /**
   * Get the share held by this node
   */
  getShare(): Share | null {
    return this.share
  }




  /**
   * Transfer share to next holding member
   * @param nextHolder The node that will receive this node's share
   * @returns true if this node had a share and transferred it, false otherwise
   */
  transferShareTo(nextHolder: Node): boolean {
    if (this.share) {
      const shareCopy = { ...this.share }
      this.share = null
      nextHolder.receiveShare(shareCopy)
      this.log(`Node ${this.id} -> Node ${nextHolder.id}: Share #${shareCopy.x}`, 'info')
      return true
    }
    return false
  }

  /**
   * Reset node to idle state
   */
  reset(): void {
    this.randomValue = 0
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
  async encryptSecret(secret: string): Promise<void> {
    this.logCallback('Encrypting secret...', 'info')
    this.logCallback(`Using Shamir's Secret Sharing with threshold ${this.threshold}`, 'info')
    
    // Create shares once using Shamir's Secret Sharing
    this.logCallback(`Creating ${this.nominatingSize} shares using Shamir's Secret Sharing...`, 'info')
    const initialShares = ShamirSecretSharing.createShares(
      secret,
      this.nominatingSize,
      this.threshold
    )
    this.logCallback(`Created ${initialShares.length} shares (threshold: ${this.threshold})`, 'success')
    
    // Start first epoch with initial shares
    await this.startNewEpoch(initialShares)
    
    this.logCallback('Secret encrypted and first epoch started', 'success')
  }

  /**
   * Start a new epoch with committee election and share distribution
   */
  private async startNewEpoch(initialShares?: Share[]): Promise<void> {
    this.currentEpoch++
    
    // All nodes generate random values
    for (const node of this.nodes.values()) {
      node.generateRandomValue()
    }
    
    // Collect all random values (without IDs)
    const allValues = Array.from(this.nodes.values()).map(node => node.getRandomValue())
    
    // Get all available node IDs for selection
    const availableNodes = Array.from(this.nodes.keys())
    
    // Each node checks if it's nominating and nominates a holder
    const newHoldingMembers: number[] = []
    for (const node of this.nodes.values()) {
      const available = availableNodes.filter(id => !newHoldingMembers.includes(id))
      const nominated = node.checkAndNominate(allValues, this.nominatingSize, available)
      
      if (nominated !== null) {
        newHoldingMembers.push(nominated)
      }
    }
    
    this.logCallback(`Epoch ${this.currentEpoch}: New holding committee [${newHoldingMembers.join(', ')}]`, 'success')
    
    // Transfer shares from old to new holding committee
    if (initialShares) {
      // First epoch: distribute initial shares
      await this.distributeInitialShares(newHoldingMembers, initialShares)
    } else {
      // Subsequent epochs: nodes transfer shares
      await this.transferShares(newHoldingMembers)
    }
  }

  /**
   * Distribute initial shares to first holding committee
   */
  private async distributeInitialShares(holders: number[], shares: Share[]): Promise<void> {
    for (let i = 0; i < holders.length && i < shares.length; i++) {
      const holderId = holders[i]!
      const holder = this.nodes.get(holderId)
      
      if (!holder) continue
      
      holder.receiveShare(shares[i]!)
    }
    
    this.logCallback(`Initial shares distributed`, 'success')
  }

  /**
   * Transfer shares from old to new holding committee using handover protocol (Section 3.1.3)
   * 
   * Previous committee members create sub-shares via random polynomials.
   * New committee members combine sub-shares using Lagrange interpolation.
   * Only final shares are stored (sub-shares are temporary).
   */
  private async transferShares(newHolderIds: number[]): Promise<void> {
    this.logCallback('Starting handover protocol (Section 3.1.3)...', 'info')
    
    // Step 1: Collect old nodes with shares
    const oldNodesWithShares = Array.from(this.nodes.values())
      .filter(node => node.getShare() !== null)
    
    if (oldNodesWithShares.length === 0) {
      this.logCallback('No shares to transfer', 'warning')
      return
    }
    
    // Step 2: Old committee members create sub-shares
    const subShareMatrix: bigint[][] = []
    const oldSeatIndices: number[] = []
    
    for (const oldNode of oldNodesWithShares) {
      const subShares = oldNode.createSubShares(newHolderIds.length, this.threshold)
      subShareMatrix.push(subShares)
      oldSeatIndices.push(oldNode.getShare()!.x)
      
      this.logCallback(`Node ${oldNode.id} created ${subShares.length} sub-shares`, 'info')
    }
    
    // Step 3: Create new nodes
    this.nodes.clear()
    for (let i = 1; i <= this.totalNodes; i++) {
      this.nodes.set(i, new Node(i, this.logCallback))
    }
    
    // Step 4: New committee members compute shares from first t sub-shares
    const oldIndicesToUse = oldSeatIndices.slice(0, this.threshold)
    
    for (let k = 0; k < newHolderIds.length; k++) {
      const newHolderId = newHolderIds[k]!
      const newNode = this.nodes.get(newHolderId)
      if (!newNode) continue
      
      // Collect k-th sub-share from first t old committee members
      const subSharesForThisSeat: bigint[] = []
      for (let j = 0; j < this.threshold; j++) {
        subSharesForThisSeat.push(subShareMatrix[j]![k]!)
      }
      
      // Node computes its new share using Lagrange interpolation
      newNode.computeNewShareFromSubShares(
        k + 1,  // Seat index: 1, 2, ..., ci+1
        subSharesForThisSeat,
        oldIndicesToUse
      )
    }
    
    this.logCallback(`${newHolderIds.length} new shares created via handover`, 'success')
  }

  /**
   * Keep alive - starts new epoch (called when timer expires with flag set)
   */
  async keepAlive(): Promise<void> {
    this.logCallback('Proactive refresh: Re-sharing secret with new committee...', 'info')
    await this.startNewEpoch()
  }

  /**
   * Reconstruct secret when timeout occurs
   */
  async reconstructSecret(): Promise<string | null> {
    this.logCallback('Timeout - Reconstructing secret...', 'warning')
    
    // Gather shares from holding committee nodes
    const sharesCollected: Share[] = []
    for (const node of this.nodes.values()) {
      const share = node.getShare()
      if (share) {
        sharesCollected.push(share)
        this.logCallback(`Collected share #${share.x} from Node ${node.id}`, 'info')
      }
    }
    
    this.logCallback(`Collected ${sharesCollected.length} shares from holding committee`, 'info')
    
    // Reconstruct the secret using Shamir's Secret Sharing
    if (sharesCollected.length >= this.threshold) {
      const reconstructed = ShamirSecretSharing.reconstructSecret(
        sharesCollected.slice(0, this.threshold)
      )
      this.logCallback(`Secret successfully reconstructed`, 'success')
      
      // Reset for next encryption
      this.currentEpoch = 0
      this.resetAllNodes()
      
      return reconstructed
    } else {
      this.logCallback(`Not enough shares (${sharesCollected.length}/${this.threshold})`, 'error')
      
      // Reset for next encryption
      this.currentEpoch = 0
      this.resetAllNodes()
      
      return null
    }
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