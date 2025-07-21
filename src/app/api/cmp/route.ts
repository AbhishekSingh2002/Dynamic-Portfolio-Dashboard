import { NextResponse } from 'next/server';
import { getFromCache, setToCache } from '@/lib/cache';

interface CachedPriceData {
  price: number;
  lastUpdated: string;
  currency: string;
  source: string;
}

interface CmpResponse {
  price: number;
  lastUpdated: string;
  currency: string;
  cached: boolean;
  source: string;
  warning?: string;
  error?: string;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const MAX_RETRIES = 1; // Reduced retries to fail faster
const RETRY_DELAY = 1000; // 1 second

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const useCache = searchParams.get('cache') !== 'false';

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter is required' },
      { status: 400 }
    );
  }

  const cacheKey = `price:${symbol}`;
  let cachedData: CachedPriceData | null = null;
  
  // Only check cache if enabled
  if (useCache) {
    cachedData = getFromCache<CachedPriceData>(cacheKey);
    // If we have valid cached data, return it
    if (cachedData && cachedData.price && cachedData.lastUpdated) {
      return NextResponse.json({
        price: cachedData.price,
        lastUpdated: cachedData.lastUpdated,
        currency: cachedData.currency || 'USD',
        source: cachedData.source || 'cache',
        cached: true
      });
    }
  }

  let lastError: Error | null = null;
  
  // Try to fetch fresh data with retries
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Add delay between retries
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }

      // Call our updated Yahoo API route with fallback enabled
      const yahooRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/yahoo?symbol=${encodeURIComponent(symbol)}&fallback=true`,
        { 
          next: { revalidate: 300 }, // Revalidate every 5 minutes
          cache: 'no-store' // Disable Next.js cache for this request
        }
      );
      
      if (!yahooRes.ok) {
        throw new Error(`API request failed with status ${yahooRes.status}`);
      }

      const data = await yahooRes.json();
      
      // If we got a valid price, cache and return it
      if (typeof data.price === 'number') {
        const result: CachedPriceData = {
          price: data.price,
          lastUpdated: new Date().toISOString(),
          currency: data.currency || 'USD',
          source: data.source || 'unknown'
        };
        
        // Cache the successful response
        setToCache(cacheKey, result, CACHE_DURATION);
        
        return NextResponse.json({
          price: result.price,
          lastUpdated: result.lastUpdated,
          currency: result.currency,
          source: result.source,
          cached: false,
          warning: data.warning
        });
      }
      
      throw new Error('Invalid response format from data source');
      
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed for ${symbol}:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If this is the last attempt, try to use cached data as fallback
      if (attempt === MAX_RETRIES) {
        // If we have cached data, return it with a warning
        if (cachedData) {
          return NextResponse.json({
            price: cachedData.price,
            lastUpdated: cachedData.lastUpdated,
            currency: cachedData.currency,
            source: cachedData.source,
            cached: true,
            warning: 'Using cached data due to API failure',
            error: lastError?.message
          });
        }
        
        // If no cached data, return the error
        return NextResponse.json(
          { 
            error: 'Failed to fetch stock price',
            details: lastError?.message || 'Unknown error',
            symbol,
            suggestion: 'Please try again later or check the stock symbol.'
          },
          { status: 500 }
        );
      }
    }
  }

  // This should never be reached due to the return in the loop
  return NextResponse.json(
    {
      error: 'Failed to fetch stock price',
      details: lastError?.message || 'Unknown error',
      symbol,
      timestamp: new Date().toISOString()
    },
    { status: 503 }
  );
}