import { NextResponse } from 'next/server';
import { getFromCache, setToCache } from '@/lib/cache';

interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Helper function to fetch historical data from Yahoo Finance
async function fetchYahooHistoricalData(symbol: string, range: string = '1mo'): Promise<HistoricalData[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?range=${range}&interval=1d`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      next: { revalidate: 3600 } // Revalidate every hour
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.statusText}`);
    }

    const data = await response.json();
    const { timestamp, indicators } = data.chart.result[0];
    const quotes = indicators.quote[0];
    
    return timestamp.map((time: number, index: number) => ({
      date: new Date(time * 1000).toISOString().split('T')[0],
      open: quotes.open[index],
      high: quotes.high[index],
      low: quotes.low[index],
      close: quotes.close[index],
      volume: quotes.volume[index]
    }));
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    throw error;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') || '1mo';
  const cacheKey = `historical:${symbol}:${range}`;

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Check cache first
    const cachedData = getFromCache<HistoricalData[]>(cacheKey);
    if (cachedData) {
      return NextResponse.json({ data: cachedData, cached: true });
    }

    // Fetch fresh data
    const historicalData = await fetchYahooHistoricalData(symbol, range);
    
    // Cache the result
    setToCache(cacheKey, historicalData, CACHE_DURATION);
    
    return NextResponse.json({ 
      data: historicalData,
      cached: false 
    });
    
  } catch (error) {
    console.error('Error in historical API route:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch historical data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
