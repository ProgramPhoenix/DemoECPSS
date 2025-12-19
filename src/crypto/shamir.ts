/**
 * Shamir's Secret Sharing implementation
 */

const PRIME = 2n ** 127n - 1n

export interface Share {
  shareIndex: number
  value: string
  x: number
  y: bigint 
}

export class ShamirSecretSharing {
  /**
   * Convert a string to a bigint
   */
  static stringToBigInt(str: string): bigint {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(str)
    let result = 0n
    for (let i = 0; i < bytes.length; i++) {
      result = (result << 8n) | BigInt(bytes[i]!)
    }
    return result
  }

  /**
   * Convert a bigint back to a string
   */
  static bigIntToString(num: bigint): string {
    const bytes: number[] = []
    let temp = num
    while (temp > 0n) {
      bytes.unshift(Number(temp & 0xFFn))
      temp = temp >> 8n
    }
    const decoder = new TextDecoder()
    return decoder.decode(new Uint8Array(bytes))
  }

  /**
   * Generate a random coefficient in the field
   */
  static randomCoefficient(): bigint {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    let result = 0n
    for (const byte of bytes) {
      result = (result << 8n) | BigInt(byte)
    }
    return result % PRIME
  }

  /**
   * Evaluate polynomial at point x
   * f(x) = a0 + a1*x + a2*x^2 + ... + ak*x^k (mod PRIME)
   */
  static evaluatePolynomial(coefficients: bigint[], x: number): bigint {
    let result = 0n
    const xBig = BigInt(x)
    
    for (let i = coefficients.length - 1; i >= 0; i--) {
      result = (result * xBig + coefficients[i]!) % PRIME
    }
    
    return result
  }

  /**
   * Create shares using Shamir's Secret Sharing
   * @param secret The secret to share
   * @param n Total number of shares to create
   * @param threshold Minimum shares needed to reconstruct (k)
   */
  static createShares(secret: string, n: number, threshold: number): Share[] {
    // Convert secret to bigint
    const secretNum = this.stringToBigInt(secret)
    
    // Create polynomial: f(x) = secret + a1*x + a2*x^2 + ... + a(t-1)*x^(t-1)
    const coefficients: bigint[] = [secretNum]
    for (let i = 1; i < threshold; i++) {
      coefficients.push(this.randomCoefficient())
    }
    
    // Generate shares by evaluating polynomial at x = 1, 2, 3, ..., n
    const shares: Share[] = []
    for (let x = 1; x <= n; x++) {
      const y = this.evaluatePolynomial(coefficients, x)
      shares.push({
        shareIndex: x - 1,
        x: x,
        y: y,
        value: y.toString(16) // hex representation for display
      })
    }
    
    return shares
  }

  /**
   * Modular multiplicative inverse using Extended Euclidean Algorithm
   */
  static modInverse(a: bigint, m: bigint): bigint {
    let [oldR, r] = [a, m]
    let [oldS, s] = [1n, 0n]
    
    while (r !== 0n) {
      const quotient = oldR / r
      ;[oldR, r] = [r, oldR - quotient * r]
      ;[oldS, s] = [s, oldS - quotient * s]
    }
    
    return oldS < 0n ? oldS + m : oldS
  }

  /**
   * Lagrange interpolation to reconstruct secret
   * @param shares Array of shares (at least threshold shares needed)
   */
  static reconstructSecret(shares: Share[]): string {
    // Use Lagrange interpolation to find f(0) = secret
    let secret = 0n
    
    for (let i = 0; i < shares.length; i++) {
      const share = shares[i]!
      let numerator = 1n
      let denominator = 1n
      
      for (let j = 0; j < shares.length; j++) {
        if (i !== j) {
          const otherShare = shares[j]!
          // For x=0: numerator = product of -xj, denominator = product of (xi - xj)
          numerator = (numerator * BigInt(-otherShare.x)) % PRIME
          denominator = (denominator * BigInt(share.x - otherShare.x)) % PRIME
        }
      }
      
      // Ensure positive numerator
      if (numerator < 0n) {
        numerator = (numerator % PRIME + PRIME) % PRIME
      }
      
      // Ensure positive denominator
      if (denominator < 0n) {
        denominator = (denominator % PRIME + PRIME) % PRIME
      }
      
      // Compute Lagrange basis polynomial at x=0
      const lagrangeCoeff = (numerator * this.modInverse(denominator, PRIME)) % PRIME
      const term = (share.y * lagrangeCoeff) % PRIME
      secret = (secret + term) % PRIME
    }
    
    // Ensure positive result
    if (secret < 0n) {
      secret = (secret % PRIME + PRIME) % PRIME
    }
    
    return this.bigIntToString(secret)
  }
}
