// src/lib/cache.ts
interface CacheItem {
  data: any;
  expiry: number;
}

// In-memory cache store
const cache: Record<string, CacheItem> = {};

/**
 * Retrieves data from the cache if it exists and hasn't expired
 * @param key The cache key
 * @returns The cached data or null if not found or expired
 */
export const getFromCache = <T = any>(key: string): T | null => {
  const item = cache[key];
  
  // If no item exists, return null
  if (!item) {
    return null;
  }

  // If item has expired, remove it and return null
  if (Date.now() > item.expiry) {
    delete cache[key];
    return null;
  }

  // Return the cached data
  return item.data as T;
};

/**
 * Stores data in the cache with a time-to-live (TTL)
 * @param key The cache key
 * @param data The data to cache
 * @param ttl Time to live in milliseconds (default: 15 minutes)
 */
export const setToCache = (key: string, data: any, ttl: number = 15 * 60 * 1000): void => {
  cache[key] = {
    data,
    expiry: Date.now() + ttl
  };
};

/**
 * Removes an item from the cache
 * @param key The cache key to remove
 */
export const removeFromCache = (key: string): void => {
  if (key in cache) {
    delete cache[key];
  }
};

/**
 * Clears all items from the cache
 */
export const clearCache = (): void => {
  Object.keys(cache).forEach(key => {
    delete cache[key];
  });
};

/**
 * Gets all cache keys
 * @returns Array of cache keys
 */
export const getCacheKeys = (): string[] => {
  return Object.keys(cache);
};

/**
 * Gets the number of items in the cache
 * @returns The number of cached items
 */
export const getCacheSize = (): number => {
  return Object.keys(cache).length;
};

/**
 * Cleans up expired cache entries
 * @returns Number of items removed
 */
export const cleanupExpired = (): number => {
  const keys = Object.keys(cache);
  let removed = 0;
  
  keys.forEach(key => {
    if (cache[key] && Date.now() > cache[key].expiry) {
      delete cache[key];
      removed++;
    }
  });
  
  return removed;
};

// Periodically clean up expired cache entries
setInterval(cleanupExpired, 60 * 60 * 1000); // Run every hour

export default {
  get: getFromCache,
  set: setToCache,
  remove: removeFromCache,
  clear: clearCache,
  keys: getCacheKeys,
  size: getCacheSize,
  cleanup: cleanupExpired
};