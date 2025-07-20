import { NextResponse } from 'next/server';
import { getFromCache, setToCache } from '@/lib/cache';

interface CachedPriceData {
  price: number;
  lastUpdated: string;
  currency?: string;
}

interface CmpResponse {
  price: number;
  lastUpdated: string;
  currency: string;
  cached: boolean;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000; // 2 seconds

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter is required' },
      { status: 400 }
    );
  }

  const cacheKey = `price:${symbol}`;
  const cachedData = getFromCache<CachedPriceData>(cacheKey);
  
  // Create a safe response object from cached data
  const createCachedResponse = (data: unknown): CmpResponse | null => {
    // Type guard to check if data is a valid CachedPriceData
    const isValidCachedData = (obj: unknown): obj is CachedPriceData => {
      return (
        obj !== null &&
        typeof obj === 'object' &&
        'price' in obj &&
        typeof (obj as any).price === 'number' &&
        'lastUpdated' in obj &&
        typeof (obj as any).lastUpdated === 'string'
      );
    };

    if (!isValidCachedData(data)) {
      return null;
    }
    
    return {
      price: data.price,
      lastUpdated: data.lastUpdated,
      currency: data.currency || 'USD',
      cached: true
    };
  };
  
  // Try to create a response from cached data
  const cachedResponse = createCachedResponse(cachedData);
  if (cachedResponse) {
    return NextResponse.json(cachedResponse);
  }

  let lastError: Error | null = null;
  
  // Try multiple times before giving up
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Add delay between retries
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }

      const yahooRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/yahoo?symbol=${encodeURIComponent(symbol)}`,
        { next: { revalidate: 300 } } // Revalidate every 5 minutes
      );
      
      if (!yahooRes.ok) {
        // If rate limited, wait longer before retrying
        if (yahooRes.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        throw new Error(`Yahoo API request failed with status ${yahooRes.status}`);
      }

      const data = await yahooRes.json() as { price?: number; currency?: string };
      
      if (data.price !== undefined) {
        const result: CachedPriceData = {
          price: data.price,
          lastUpdated: new Date().toISOString(),
          currency: data.currency || 'USD'
        };
        
        // Cache the successful response
        const cachedResponse: CmpResponse = {
          price: result.price,
          lastUpdated: result.lastUpdated,
          currency: result.currency || 'USD',
          cached: false
        };
        setToCache(cacheKey, result, CACHE_DURATION);
        
        return NextResponse.json(cachedResponse);
      }
      
      throw new Error('Invalid response format from Yahoo Finance');
      
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed for ${symbol}:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If this is the last attempt, try to use cached data as fallback
      if (attempt === MAX_RETRIES) {
        // Try to create a response from cached data
        const fallbackResponse = createCachedResponse(cachedData);
        if (fallbackResponse) {
          return NextResponse.json({
            ...fallbackResponse,
            warning: 'Using cached data due to API failure',
            error: lastError?.message || 'Unknown error'
          });
        }
        
        // If no valid cached data, return the error
        return NextResponse.json(
          { 
            error: 'Failed to fetch data', 
            details: lastError?.message || 'Unknown error',
            symbol
          },
          { status: 500 }
        );
      }
    }
  }

  // If we get here, all attempts failed
  return NextResponse.json(
    {
      error: 'Failed to fetch stock price after multiple attempts',
      details: lastError?.message || 'Unknown error',
      symbol,
      timestamp: new Date().toISOString()
    },
    { status: 503 } // Service Unavailable
  );
}