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
   * Transfer shares from old to new holding committee
   */
  private async transferShares(newHolderIds: number[]): Promise<void> {
    let transferCount = 0
    
    // Save old nodes
    const oldNodes = new Map(this.nodes)
    
    // Create 10 new nodes
    this.nodes.clear()
    for (let i = 1; i <= this.totalNodes; i++) {
      const newNode = new Node(i, this.logCallback)
      this.nodes.set(i, newNode)
    }
    
    // Transfer shares from old nodes to new holding committee
    for (const newHolderId of newHolderIds) {
      const newNode = this.nodes.get(newHolderId)
      if (!newNode) continue
      
      // Find an old node that has a share
      for (const oldNode of oldNodes.values()) {
        if (oldNode.transferShareTo(newNode)) {
          transferCount++
          break
        }
      }
    }
    
    this.logCallback(`${transferCount} shares transferred to new committee`, 'success')
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