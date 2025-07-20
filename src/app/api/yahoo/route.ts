import { NextResponse } from 'next/server';

const YAHOO_FINANCE_API = 'https://query1.finance.yahoo.com/v8/finance/chart/';

// Simple in-memory rate limiting
const rateLimit = {
  lastRequestTime: 0,
  minInterval: 1000, // 1 second minimum between requests
};

// Helper function to delay requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter is required' },
      { status: 400 }
    );
  }

  // Enforce rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - rateLimit.lastRequestTime;
  
  if (timeSinceLastRequest < rateLimit.minInterval) {
    await delay(rateLimit.minInterval - timeSinceLastRequest);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${YAHOO_FINANCE_API}${encodeURIComponent(symbol)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    rateLimit.lastRequestTime = Date.now();

    if (!response.ok) {
      // If we get rate limited, wait longer before retrying
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
      const price = data.chart.result[0].meta.regularMarketPrice;
      return NextResponse.json({
        price,
        currency: data.chart.result[0].meta.currency || 'USD',
        cached: false,
        timestamp: new Date().toISOString()
      });
    }

    throw new Error('Invalid response format from Yahoo Finance');
  } catch (error) {
    console.error('Error fetching from Yahoo Finance:', error);
    
    // Return a more specific error message
    let errorMessage = 'Failed to fetch stock price';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Request to Yahoo Finance timed out';
        statusCode = 504; // Gateway Timeout
      } else if (error.message.includes('429')) {
        errorMessage = 'Rate limited by Yahoo Finance. Please try again later.';
        statusCode = 429;
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        symbol,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}