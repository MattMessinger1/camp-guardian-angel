/**
 * Provider Profile Caching with TTL
 * Optimizes provider detection by caching profiles in localStorage
 */

import { supabase } from '@/integrations/supabase/client';
import type { ProviderProfile } from '@/lib/providers/types';

const CACHE_KEY = 'provider_profiles_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

interface CacheData {
  profiles: ProviderProfile[];
  timestamp: number;
  version: string;
}

class ProviderCache {
  private memoryCache: ProviderProfile[] | null = null;
  private readonly version = '1.0.0';

  async getProfiles(): Promise<ProviderProfile[]> {
    // First check memory cache
    if (this.memoryCache) {
      return this.memoryCache;
    }

    // Then check localStorage cache
    const cached = this.getFromLocalStorage();
    if (cached && this.isValidCache(cached)) {
      this.memoryCache = cached.profiles;
      return cached.profiles;
    }

    // Fetch from database
    const profiles = await this.fetchFromDatabase();
    
    // Cache the results
    this.cacheProfiles(profiles);
    this.memoryCache = profiles;
    
    return profiles;
  }

  private getFromLocalStorage(): CacheData | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Failed to parse provider cache:', error);
      this.clearCache();
      return null;
    }
  }

  private isValidCache(cached: CacheData): boolean {
    const now = Date.now();
    const isExpired = (now - cached.timestamp) > CACHE_TTL;
    const isWrongVersion = cached.version !== this.version;
    
    if (isExpired || isWrongVersion) {
      this.clearCache();
      return false;
    }
    
    return true;
  }

  private async fetchFromDatabase(): Promise<ProviderProfile[]> {
    try {
      const { data, error } = await supabase
        .from('provider_profiles')
        .select('*');
      
      if (error) {
        console.error('Failed to load provider profiles:', error);
        return [];
      }
      
      return data as ProviderProfile[];
    } catch (error) {
      console.error('Database fetch error:', error);
      return [];
    }
  }

  private cacheProfiles(profiles: ProviderProfile[]): void {
    try {
      const cacheData: CacheData = {
        profiles,
        timestamp: Date.now(),
        version: this.version
      };
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache provider profiles:', error);
    }
  }

  clearCache(): void {
    this.memoryCache = null;
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear provider cache:', error);
    }
  }

  // Force refresh from database
  async refresh(): Promise<ProviderProfile[]> {
    this.clearCache();
    return this.getProfiles();
  }
}

export const providerCache = new ProviderCache();