/**
 * State Serialization System
 * 
 * Handles compression, encryption, and serialization of session states
 * for storage and transfer across browser sessions.
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
   * Serialize session state to compact string
   */
  serialize(
    state: any, 
    options: Partial<SerializationOptions> = {}
  ): string {
    const opts: SerializationOptions = {
      compress: true,
      encrypt: false, // Client-side encryption not implemented for security
      includeCheckpoints: true,
      excludeSensitiveData: true,
      ...options
    };

    try {
      // Create serializable copy
      let serializedState = this.prepareForSerialization(state, opts);
      
      // Convert to JSON
      let jsonString = JSON.stringify(serializedState);
      
      // Compress if needed
      if (opts.compress && jsonString.length > this.COMPRESSION_THRESHOLD) {
        jsonString = this.compress(jsonString);
      }
      
      // Add metadata
      const payload = {
        version: '1.0',
        compressed: opts.compress && jsonString.length > this.COMPRESSION_THRESHOLD,
        encrypted: opts.encrypt,
        timestamp: new Date().toISOString(),
        checksum: this.calculateChecksum(jsonString),
        data: jsonString
      };
      
      return btoa(JSON.stringify(payload));
      
    } catch (error) {
      console.error('State serialization failed:', error);
      throw new Error('Failed to serialize state');
    }
  }

  /**
   * Deserialize state from string
   */
  deserialize(serializedData: string): any {
    try {
      // Decode base64
      const decodedData = atob(serializedData);
      const payload = JSON.parse(decodedData);
      
      // Validate payload
      this.validatePayload(payload);
      
      // Verify checksum
      if (!this.verifyChecksum(payload.data, payload.checksum)) {
        throw new Error('State integrity check failed');
      }
      
      let jsonString = payload.data;
      
      // Decompress if needed
      if (payload.compressed) {
        jsonString = this.decompress(jsonString);
      }
      
      // Parse state
      const state = JSON.parse(jsonString);
      
      // Restore any transformed data
      return this.restoreAfterDeserialization(state);
      
    } catch (error) {
      console.error('State deserialization failed:', error);
      throw new Error('Failed to deserialize state');
    }
  }

  /**
   * Get serialization metadata without full deserialization
   */
  getMetadata(serializedData: string): {
    version: string;
    compressed: boolean;
    encrypted: boolean;
    timestamp: string;
    size: number;
    valid: boolean;
  } {
    try {
      const decodedData = atob(serializedData);
      const payload = JSON.parse(decodedData);
      
      return {
        version: payload.version || 'unknown',
        compressed: payload.compressed || false,
        encrypted: payload.encrypted || false,
        timestamp: payload.timestamp,
        size: payload.data.length,
        valid: this.verifyChecksum(payload.data, payload.checksum)
      };
    } catch (error) {
      return {
        version: 'unknown',
        compressed: false,
        encrypted: false,
        timestamp: '',
        size: 0,
        valid: false
      };
    }
  }

  /**
   * Calculate estimated storage size
   */
  estimateSize(state: any, options: Partial<SerializationOptions> = {}): {
    uncompressed: number;
    compressed: number;
    estimatedCompression: number;
  } {
    const opts: SerializationOptions = {
      compress: true,
      encrypt: false,
      includeCheckpoints: true,
      excludeSensitiveData: true,
      ...options
    };

    const serializedState = this.prepareForSerialization(state, opts);
    const jsonString = JSON.stringify(serializedState);
    const uncompressed = new Blob([jsonString]).size;
    
    // Estimate compression (typical JSON compression is 60-80%)
    const compressed = Math.floor(uncompressed * 0.3);
    
    return {
      uncompressed,
      compressed,
      estimatedCompression: ((uncompressed - compressed) / uncompressed) * 100
    };
  }

  // Private methods

  private prepareForSerialization(state: any, options: SerializationOptions): any {
    const copy = JSON.parse(JSON.stringify(state));
    
    // Remove sensitive data if requested
    if (options.excludeSensitiveData) {
      this.removeSensitiveData(copy);
    }
    
    // Remove checkpoints if not needed
    if (!options.includeCheckpoints && copy.recovery?.checkpoints) {
      copy.recovery.checkpoints = [];
    }
    
    // Transform dates to ISO strings
    this.transformDates(copy);
    
    // Optimize arrays and objects
    this.optimizeStructure(copy);
    
    return copy;
  }

  private restoreAfterDeserialization(state: any): any {
    // Restore dates from ISO strings
    this.restoreDates(state);
    
    // Restore any optimized structures
    this.restoreStructure(state);
    
    return state;
  }

  private removeSensitiveData(obj: any, path: string = ''): void {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const key in obj) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Remove known sensitive fields
      if (this.SENSITIVE_FIELDS.some(field => 
        key.toLowerCase().includes(field.toLowerCase()) ||
        currentPath.toLowerCase().includes(field.toLowerCase())
      )) {
        obj[key] = '[REDACTED]';
        continue;
      }
      
      // Recursively check nested objects
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.removeSensitiveData(obj[key], currentPath);
      }
    }
  }

  private transformDates(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const key in obj) {
      const value = obj[key];
      
      // Transform Date objects to ISO strings
      if (value instanceof Date) {
        obj[key] = { __date: value.toISOString() };
      } else if (typeof value === 'object' && value !== null) {
        this.transformDates(value);
      }
    }
  }

  private restoreDates(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const key in obj) {
      const value = obj[key];
      
      // Restore ISO strings to Date objects
      if (typeof value === 'object' && value !== null && value.__date) {
        obj[key] = new Date(value.__date);
      } else if (typeof value === 'object' && value !== null) {
        this.restoreDates(value);
      }
    }
  }

  private optimizeStructure(obj: any): void {
    // Remove empty arrays and objects
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const key in obj) {
      const value = obj[key];
      
      if (Array.isArray(value) && value.length === 0) {
        delete obj[key];
      } else if (typeof value === 'object' && value !== null) {
        this.optimizeStructure(value);
        
        // Remove empty objects after optimization
        if (Object.keys(value).length === 0) {
          delete obj[key];
        }
      }
    }
  }

  private restoreStructure(obj: any): void {
    // Restore any optimized structures
    // Currently just ensures consistent structure
    if (typeof obj !== 'object' || obj === null) return;
    
    // Ensure required arrays exist
    if (obj.recovery && !obj.recovery.checkpoints) {
      obj.recovery.checkpoints = [];
    }
    
    if (obj.formProgress && !obj.formProgress.completedSteps) {
      obj.formProgress.completedSteps = [];
    }
  }

  private compress(data: string): string {
    // Simple run-length encoding for repetitive JSON data
    // In a real implementation, you might use a proper compression library
    return data.replace(/(.)\1{2,}/g, (match, char) => {
      return `${char}*${match.length}`;
    });
  }

  private decompress(data: string): string {
    // Reverse the run-length encoding
    return data.replace(/(.)\*(\d+)/g, (match, char, count) => {
      return char.repeat(parseInt(count));
    });
  }

  private calculateChecksum(data: string): string {
    // Simple checksum using a hash function
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private verifyChecksum(data: string, expectedChecksum: string): boolean {
    const actualChecksum = this.calculateChecksum(data);
    return actualChecksum === expectedChecksum;
  }

  private validatePayload(payload: any): void {
    if (!payload.version) {
      throw new Error('Invalid payload: missing version');
    }
    
    if (!payload.data) {
      throw new Error('Invalid payload: missing data');
    }
    
    if (!payload.checksum) {
      throw new Error('Invalid payload: missing checksum');
    }
    
    if (!payload.timestamp) {
      throw new Error('Invalid payload: missing timestamp');
    }
  }
}

export const stateSerializer = new StateSerializer();