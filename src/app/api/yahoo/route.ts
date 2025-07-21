import { NextResponse } from 'next/server';

const YAHOO_FINANCE_API = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const ALPHA_VANTAGE_API = 'https://www.alphavantage.co/query';

// Simple in-memory rate limiting
const rateLimit = {
  lastRequestTime: 0,
  minInterval: 1000, // 1 second minimum between requests
};

// Helper function to delay requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to fetch from Alpha Vantage as fallback
async function fetchFromAlphaVantage(symbol: string) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `${ALPHA_VANTAGE_API}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`,
      { next: { revalidate: 300 } } // 5 minutes cache
    );

    if (!response.ok) return null;
    
    const data = await response.json();
    const quote = data?.['Global Quote'];
    
    if (quote?.['05. price']) {
      return {
        price: parseFloat(quote['05. price']),
        currency: 'USD', // Default to USD for Alpha Vantage
        source: 'alpha_vantage',
      };
    }
  } catch (error) {
    console.error('Alpha Vantage API error:', error);
  }
  
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const useFallback = searchParams.get('fallback') !== 'false';

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter is required' },
      { status: 400 }
    );
  }

  try {
    // First try to get from Yahoo Finance
    const yahooData = await fetchFromYahooFinance(symbol);
    if (yahooData) {
      return NextResponse.json({
        ...yahooData,
        cached: false,
        timestamp: new Date().toISOString()
      });
    }

    // If Yahoo fails and fallback is enabled, try Alpha Vantage
    if (useFallback) {
      const alphaVantageData = await fetchFromAlphaVantage(symbol);
      if (alphaVantageData) {
        return NextResponse.json({
          ...alphaVantageData,
          cached: false,
          timestamp: new Date().toISOString(),
          warning: 'Using alternative data source'
        });
      }
    }

    throw new Error('Failed to fetch stock price from all available sources');
  } catch (error) {
    console.error('Error in Yahoo API route:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch stock price',
        symbol,
        timestamp: new Date().toISOString(),
        suggestion: 'Try again later or check if the stock symbol is correct.'
      },
      { status: 500 }
    );
  }
}

async function fetchFromYahooFinance(symbol: string) {
  // Enforce rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - rateLimit.lastRequestTime;
  
  if (timeSinceLastRequest < rateLimit.minInterval) {
    await delay(rateLimit.minInterval - timeSinceLastRequest);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(`${YAHOO_FINANCE_API}${encodeURIComponent(symbol)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: controller.signal,
      next: { revalidate: 300 } // 5 minutes cache
    });

    clearTimeout(timeoutId);
    rateLimit.lastRequestTime = Date.now();

    if (!response.ok) {
      if (response.status === 429) {
        await delay(5000); // Wait 5 seconds if rate limited
      }
      throw new Error(`Yahoo Finance API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (data.chart?.error) {
      throw new Error(data.chart.error.description || 'Error from Yahoo Finance API');
    }
    
    if (data.chart?.result?.[0]?.meta?.regularMarketPrice !== undefined) {
      return {
        price: data.chart.result[0].meta.regularMarketPrice,
        currency: data.chart.result[0].meta.currency || 'USD',
        source: 'yahoo_finance'
      };
    }

    throw new Error('Invalid response format from Yahoo Finance');
  } catch (error) {
    console.error('Yahoo Finance API error:', error);
    return null;
  }
}