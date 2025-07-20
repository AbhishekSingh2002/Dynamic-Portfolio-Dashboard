import { NextResponse } from 'next/server';

const YAHOO_FINANCE_API = 'https://query1.finance.yahoo.com/v8/finance/chart/';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${YAHOO_FINANCE_API}${symbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
      const price = data.chart.result[0].meta.regularMarketPrice;
      return NextResponse.json({
        price,
        currency: data.chart.result[0].meta.currency,
        cached: false
      });
    }

    throw new Error('Invalid response format from Yahoo Finance');
  } catch (error) {
    console.error('Error fetching from Yahoo Finance:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch stock price',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}