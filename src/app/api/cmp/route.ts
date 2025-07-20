import { NextResponse } from 'next/server';
import { getFromCache, setToCache } from '@/lib/cache';

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes cache

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter is required' },
      { status: 400 }
    );
  }

  // Check cache first
  const cachedData = getFromCache<{ price: number }>(`price:${symbol}`);
  if (cachedData) {
    return NextResponse.json({
      price: cachedData.price,
      cached: true,
      lastUpdated: new Date().toISOString()
    });
  }

  try {
    // Use the full URL for the request
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const yahooRes = await fetch(`${baseUrl}/api/yahoo?symbol=${encodeURIComponent(symbol)}`);
    
    if (!yahooRes.ok) {
      throw new Error(`Yahoo API request failed with status ${yahooRes.status}`);
    }

    const data = await yahooRes.json();
    
    if (data.price) {
      // Cache the successful response
      setToCache(`price:${symbol}`, { price: data.price }, CACHE_DURATION);
      
      return NextResponse.json({
        price: data.price,
        cached: false,
        lastUpdated: new Date().toISOString()
      });
    }

    throw new Error('Invalid response format from Yahoo Finance');
  } catch (error) {
    console.error('Error in CMP API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch current market price',
        details: error instanceof Error ? error.message : 'Unknown error',
        cached: false
      },
      { status: 500 }
    );
  }
}