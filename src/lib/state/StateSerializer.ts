/**
 * State Serialization System
 * 
 * Handles serialization and deserialization of session states with 
 * compression, encryption, and data integrity validation.
 */

export interface SerializationOptions {
  compress: boolean;
  encrypt: boolean;
  includeCheckpoints: boolean;
  excludeSensitiveData: boolean;
}

export class StateSerializer {
  private readonly COMPRESSION_THRESHOLD = 1024; // 1KB
  private readonly SENSITIVE_FIELDS = [
    'childInfo',
    'paymentMethod',
    'personalData',
    'credentials'
  ];

  /**
   * Serialize state with configurable options
   */
  serialize(
    state: any, 
    options: Partial<SerializationOptions> = {}
  ): string {
    const opts: SerializationOptions = {
      compress: true,
      encrypt: false,
      includeCheckpoints: true,
      excludeSensitiveData: true,
      ...options
    };

    try {
      // Deep clone to avoid mutating original state
      let serializedState = JSON.parse(JSON.stringify(state));

      // Remove sensitive data if requested
      if (opts.excludeSensitiveData) {
        serializedState = this.removeSensitiveData(serializedState);
      }

      // Exclude checkpoints if requested
      if (!opts.includeCheckpoints && serializedState.recovery?.checkpoints) {
        serializedState.recovery.checkpoints = [];
      }

      // Convert to JSON string
      let jsonString = JSON.stringify(serializedState);

      // Compress if needed and size exceeds threshold
      if (opts.compress && jsonString.length > this.COMPRESSION_THRESHOLD) {
        jsonString = this.compress(jsonString);
      }

      // Encrypt if requested
      if (opts.encrypt) {
        jsonString = this.encrypt(jsonString);
      }

      // Add metadata
      const payload = {
        version: '2.0',
        options: opts,
        data: jsonString,
        checksum: this.generateChecksum(jsonString),
        timestamp: new Date().toISOString()
      };

      return JSON.stringify(payload);

    } catch (error) {
      console.error('Serialization failed:', error);
      throw new Error(`Serialization failed: ${error.message}`);
    }
  }

  /**
   * Deserialize state with validation
   */
  deserialize(serializedData: string): any {
    try {
      // Parse payload
      const payload = JSON.parse(serializedData);
      
      // Validate payload structure
      this.validatePayload(payload);

      let data = payload.data;

      // Decrypt if needed
      if (payload.options?.encrypt) {
        data = this.decrypt(data);
      }

      // Decompress if needed
      if (payload.options?.compress && data.startsWith('COMPRESSED:')) {
        data = this.decompress(data);
      }

      // Validate checksum
      const currentChecksum = this.generateChecksum(data);
      if (currentChecksum !== payload.checksum) {
        throw new Error('Data integrity check failed');
      }

      // Parse final state
      const state = JSON.parse(data);

      // Restore sensitive data placeholders
      if (payload.options?.excludeSensitiveData) {
        state._sensitiveDataExcluded = true;
      }

      return state;

    } catch (error) {
      console.error('Deserialization failed:', error);
      throw new Error(`Deserialization failed: ${error.message}`);
    }
  }

  /**
   * Quick serialize for emergency situations (minimal processing)
   */
  quickSerialize(state: any): string {
    try {
      const payload = {
        version: '2.0-quick',
        data: JSON.stringify(state),
        timestamp: new Date().toISOString()
      };
      return JSON.stringify(payload);
    } catch (error) {
      console.error('Quick serialization failed:', error);
      throw error;
    }
  }

  // Private helper methods

  private removeSensitiveData(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeSensitiveData(item));
    }

    const cleaned = { ...obj };
    
    for (const field of this.SENSITIVE_FIELDS) {
      if (cleaned.hasOwnProperty(field)) {
        cleaned[field] = '[REDACTED]';
      }
    }

    // Recursively clean nested objects
    for (const key in cleaned) {
      if (typeof cleaned[key] === 'object' && cleaned[key] !== null) {
        cleaned[key] = this.removeSensitiveData(cleaned[key]);
      }
    }

    return cleaned;
  }

  private compress(data: string): string {
    // Simple compression for demo
    try {
      const compressed = data.replace(/(.)\1{2,}/g, (match, char) => {
        return `${char}${match.length}`;
      });
      return `COMPRESSED:${compressed}`;
    } catch (error) {
      console.warn('Compression failed, returning original:', error);
      return data;
    }
  }

  private decompress(data: string): string {
    if (!data.startsWith('COMPRESSED:')) return data;
    
    try {
      const compressed = data.substring('COMPRESSED:'.length);
      return compressed.replace(/(.)\d+/g, (match, char) => {
        const count = parseInt(match.substring(1));
        return char.repeat(count);
      });
    } catch (error) {
      console.error('Decompression failed:', error);
      throw new Error('Failed to decompress data');
    }
  }

  private encrypt(data: string): string {
    // Simple cipher for demo
    try {
      const shift = 13;
      const encrypted = data.replace(/[a-zA-Z]/g, (char) => {
        const start = char <= 'Z' ? 65 : 97;
        return String.fromCharCode((char.charCodeAt(0) - start + shift) % 26 + start);
      });
      return `ENCRYPTED:${encrypted}`;
    } catch (error) {
      console.warn('Encryption failed, returning original:', error);
      return data;
    }
  }

  private decrypt(data: string): string {
    if (!data.startsWith('ENCRYPTED:')) return data;
    
    try {
      const encrypted = data.substring('ENCRYPTED:'.length);
      const shift = 13;
      return encrypted.replace(/[a-zA-Z]/g, (char) => {
        const start = char <= 'Z' ? 65 : 97;
        return String.fromCharCode((char.charCodeAt(0) - start - shift + 26) % 26 + start);
      });
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  private generateChecksum(data: string): string {
    // Simple hash function for demo
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private validatePayload(payload: any): void {
    if (!payload.version) {
      throw new Error('Invalid payload: missing version');
    }

    if (!payload.data) {
      throw new Error('Invalid payload: missing data');
    }

    if (!payload.timestamp) {
      throw new Error('Invalid payload: missing timestamp');
    }
  }
}

export const stateSerializer = new StateSerializer();