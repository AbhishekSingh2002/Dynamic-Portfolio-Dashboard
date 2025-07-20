// src/types/portfolio.ts
export interface Stock {
  stockName: string;
  exchangeCode: string;
  sector: string;
  quantity: number;
  purchasePrice: number;
}

export interface HistoricalDataPoint {
  date: string;
  value: number;
}

export interface PortfolioStock extends Stock {
  currentPrice?: number;
  peRatio?: number;
  eps?: number;
  marketCap?: string;
  dividendYield?: string;
  yearHigh?: number;
  yearLow?: number;
  investment: number;
  currentValue: number;
  gainLoss: number;
  gainLossPct: number;
  portfolioPct: number;
  cached?: boolean;
  error?: string;
  lastUpdated?: string;
  historicalData?: HistoricalDataPoint[];
}

export interface SectorSummary {
  sector: string;
  investment: number;
  currentValue: number;
  gainLoss: number;
  gainLossPct: number;
}

export interface PortfolioTableProps {
  onUpdate: (stocks: PortfolioStock[]) => void;
}