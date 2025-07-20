// src/app/api/fundamentals/route.ts
import { NextResponse } from 'next/server';

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
    const response = await fetch(
      `https://www.google.com/finance/quote/${symbol}:NSE`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Google Finance request failed with status ${response.status}`);
    }

    const html = await response.text();
    
    // Enhanced data extraction
    const extractValue = (regex: RegExp) => {
      const match = html.match(regex);
      return match ? match[1] : null;
    };

    const peRatio = extractValue(/"PE_RATIO\"\s*:\s*"([^"]+)"/);
    const eps = extractValue(/"EPS\s*\([^)]+\)\"[^>]*>[^<]*<[^>]*>([^<]+)</);
    const marketCap = extractValue(/"MARKET_CAP\"\s*:\s*"([^"]+)"/);
    const dividendYield = extractValue(/"DIVIDEND_AND_YIELD\"\s*:\s*"([^"]+)"/);
    const yearHigh = extractValue(/"FIFTY_TWO_WK_HIGH\"\s*:\s*"([^"]+)"/);
    const yearLow = extractValue(/"FIFTY_TWO_WK_LOW\"\s*:\s*"([^"]+)"/);

    return NextResponse.json({
      peRatio: peRatio ? parseFloat(peRatio) : null,
      eps: eps ? parseFloat(eps.replace(/,/g, '')) : null,
      marketCap,
      dividendYield,
      yearHigh: yearHigh ? parseFloat(yearHigh) : null,
      yearLow: yearLow ? parseFloat(yearLow) : null
    });

  } catch (error) {
    console.error('Error fetching fundamentals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fundamental data' },
      { status: 500 }
    );
  }
}