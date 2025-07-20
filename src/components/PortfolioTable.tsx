// src/components/PortfolioTable.tsx
'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Stock, PortfolioStock, SectorSummary, PortfolioTableProps } from '@/types/portfolio';
import { getFromCache, setToCache } from '@/lib/cache';
import dynamic from 'next/dynamic';
import ErrorBoundary from './ErrorBoundary';
import ThemeToggle from './ThemeToggle';
import ExportButton from './ExportButton';

// Dynamically import the chart with SSR disabled
const PerformanceChart = dynamic(() => import('./PerformanceChart'), { ssr: false });

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export default function PortfolioTable({ onUpdate }: PortfolioTableProps) {
  const [stocks, setStocks] = useState<PortfolioStock[]>([]);
  const [sectorSummaries, setSectorSummaries] = useState<SectorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ 
    key: keyof PortfolioStock; 
    direction: 'asc' | 'desc' 
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStock, setSelectedStock] = useState<PortfolioStock | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // First try to get from cache
      const cachedData = getFromCache('portfolio');
      if (cachedData) {
        setStocks(cachedData as PortfolioStock[]);
        onUpdate(cachedData as PortfolioStock[]);
      }

      // Then fetch fresh data
      const res = await fetch('/api/portfolio');
      if (!res.ok) throw new Error('Failed to fetch portfolio data');
      
      const portfolioData: Stock[] = await res.json();
      
      // Fetch prices and fundamentals in parallel with delays
      const stocksWithPrices = await Promise.all(
        portfolioData.map(async (stock, index) => {
          // Add delay between requests (500ms)
          if (index > 0) await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            const [priceRes, fundamentalsRes] = await Promise.all([
              fetch(`/api/cmp?symbol=${stock.exchangeCode}.NS`),
              fetch(`/api/fundamentals?symbol=${stock.exchangeCode}`)
            ]);

            if (!priceRes.ok) throw new Error('Failed to fetch price');
            
            const priceData = await priceRes.json();
            const fundamentals = await fundamentalsRes.json();
            
            return {
              ...stock,
              currentPrice: priceData.price,
              peRatio: fundamentals.peRatio,
              eps: fundamentals.eps,
              marketCap: fundamentals.marketCap,
              dividendYield: fundamentals.dividendYield,
              yearHigh: fundamentals.yearHigh,
              yearLow: fundamentals.yearLow,
              cached: priceData.cached || false,
              lastUpdated: priceData.lastUpdated
            };
          } catch (err) {
            console.error(`Error processing ${stock.exchangeCode}:`, err);
            return {
              ...stock,
              currentPrice: 0,
              error: err instanceof Error ? err.message : 'Unknown error'
            };
          }
        })
      );

      // Calculate portfolio metrics
      const totalInvestment = stocksWithPrices.reduce(
        (sum, stock) => sum + (stock.purchasePrice * stock.quantity), 
        0
      );

      const processedStocks = stocksWithPrices.map(stock => {
        const investment = stock.purchasePrice * stock.quantity;
        const currentValue = (stock.currentPrice || 0) * stock.quantity;
        const gainLoss = currentValue - investment;
        const gainLossPct = investment > 0 ? (gainLoss / investment) * 100 : 0;
        const portfolioPct = totalInvestment > 0 ? (currentValue / totalInvestment) * 100 : 0;

        return {
          ...stock,
          investment,
          currentValue,
          gainLoss,
          gainLossPct,
          portfolioPct
        };
      });

      // Update cache
      setToCache('portfolio', processedStocks, CACHE_DURATION);
      
      setStocks(processedStocks);
      onUpdate(processedStocks);
      setSectorSummaries(calculateSectorSummaries(processedStocks));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error in fetchData:', err);
    } finally {
      setLoading(false);
    }
  }, [onUpdate]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;
    
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Calculate sector summaries
  const calculateSectorSummaries = (stocks: PortfolioStock[]): SectorSummary[] => {
    const summaryMap = new Map<string, SectorSummary>();

    stocks.forEach(stock => {
      if (!summaryMap.has(stock.sector)) {
        summaryMap.set(stock.sector, {
          sector: stock.sector,
          investment: 0,
          currentValue: 0,
          gainLoss: 0,
          gainLossPct: 0
        });
      }

      const summary = summaryMap.get(stock.sector)!;
      summary.investment += stock.investment;
      summary.currentValue += stock.currentValue;
      summary.gainLoss += stock.gainLoss;
      summary.gainLossPct = summary.investment > 0 
        ? (summary.gainLoss / summary.investment) * 100 
        : 0;
    });

    return Array.from(summaryMap.values());
  };

  // Sort stocks
  const sortedStocks = useMemo(() => {
    if (!sortConfig) return [...stocks];
    
    return [...stocks].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue === undefined || bValue === undefined) return 0;
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [stocks, sortConfig]);

  // Filter stocks by search term
  const filteredStocks = useMemo(() => {
    if (!searchTerm) return sortedStocks;
    
    const term = searchTerm.toLowerCase();
    return sortedStocks.filter((stock: PortfolioStock) => 
      stock.stockName.toLowerCase().includes(term) ||
      stock.exchangeCode.toLowerCase().includes(term) ||
      stock.sector.toLowerCase().includes(term)
    );
  }, [sortedStocks, searchTerm]);

  const requestSort = (key: keyof PortfolioStock) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const exportToCSV = () => {
    const headers = [
      'Stock', 'Code', 'Sector', 'Quantity', 'Avg Cost', 'CMP', 
      'Invested', 'Current', 'P&L', 'P&L %', 'P/E', 'EPS', 'Market Cap', 'Dividend Yield'
    ].join(',');

    const csvContent = [
      headers,
      ...stocks.map((stock: PortfolioStock) => [
        `"${stock.stockName}"`,
        stock.exchangeCode,
        `"${stock.sector}"`,
        stock.quantity,
        stock.purchasePrice.toFixed(2),
        stock.currentPrice?.toFixed(2) || 'N/A',
        stock.investment.toFixed(2),
        stock.currentValue.toFixed(2),
        stock.gainLoss.toFixed(2),
        stock.gainLossPct.toFixed(2),
        stock.peRatio || 'N/A',
        stock.eps || 'N/A',
        'N/A',
        'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `portfolio-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mock historical data for the chart
  const historicalData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (29 - i));
      return {
        date: date.toISOString(),
        value: 1000000 + (Math.random() * 500000 - 250000)
      };
    });
  }, []);

  if (loading && stocks.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4" role="alert">
        <p className="font-bold">Error</p>
        <p>{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header with controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">Portfolio Dashboard</h1>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search stocks..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg
                className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <ExportButton 
              portfolio={stocks} 
            />
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg ${
                autoRefresh ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              {autoRefresh ? 'Auto-refresh: ON' : 'Auto-refresh: OFF'}
            </button>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Performance Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Portfolio Performance (30 Days)</h2>
          <div className="h-64">
            <PerformanceChart 
              data={historicalData.map((item: { date: string; value: number }) => ({
                date: item.date,
                open: item.value,
                high: item.value,
                low: item.value,
                close: item.value,
                volume: 0
              }))} 
            />
          </div>
        </div>

        {/* Sector Summaries */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sectorSummaries.map((sector: SectorSummary) => (
            <div
              key={sector.sector}
              className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <h3 className="font-medium text-gray-900 dark:text-white">{sector.sector}</h3>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Value:</span>
                  <span className="font-medium">
                    ₹{sector.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">P&L:</span>
                  <span
                    className={`font-medium ${
                      sector.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {sector.gainLoss >= 0 ? '↑' : '↓'}{' '}
                    {Math.abs(sector.gainLossPct).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stocks Table */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => requestSort('stockName')}
                  >
                    <div className="flex items-center">
                      Stock
                      {sortConfig?.key === 'stockName' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => requestSort('sector')}
                  >
                    <div className="flex items-center">
                      Sector
                      {sortConfig?.key === 'sector' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => requestSort('quantity')}
                  >
                    <div className="flex justify-end items-center">
                      Qty
                      {sortConfig?.key === 'quantity' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => requestSort('purchasePrice')}
                  >
                    <div className="flex justify-end items-center">
                      Avg Cost
                      {sortConfig?.key === 'purchasePrice' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => requestSort('currentPrice')}
                  >
                    <div className="flex justify-end items-center">
                      CMP
                      {sortConfig?.key === 'currentPrice' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => requestSort('investment')}
                  >
                    <div className="flex justify-end items-center">
                      Invested
                      {sortConfig?.key === 'investment' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => requestSort('currentValue')}
                  >
                    <div className="flex justify-end items-center">
                      Current
                      {sortConfig?.key === 'currentValue' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => requestSort('gainLoss')}
                  >
                    <div className="flex justify-end items-center">
                      P&L
                      {sortConfig?.key === 'gainLoss' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredStocks.length > 0 ? (
                  filteredStocks.map((stock: PortfolioStock, index: number) => (
                    <tr
                      key={`${stock.exchangeCode}-${index}`}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        stock.error ? 'bg-red-50 dark:bg-red-900/20' : ''
                      }`}
                      onClick={() => setSelectedStock(stock)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {stock.stockName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {stock.exchangeCode}
                              {stock.error && (
                                <span className="ml-2 text-red-500 text-xs" title={stock.error}>
                                  (Error)
                                </span>
                              )}
                              {stock.cached && (
                                <span className="ml-2 text-yellow-500 text-xs">(Cached)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{stock.sector}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                        {stock.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                        ₹{stock.purchasePrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                        {stock.currentPrice ? `₹${stock.currentPrice.toFixed(2)}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                        ₹{stock.investment.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                        ₹{stock.currentValue.toFixed(2)}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                          stock.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {stock.gainLoss >= 0 ? '↑' : '↓'}{' '}
                        ₹{Math.abs(stock.gainLoss).toFixed(2)} (
                        {Math.abs(stock.gainLossPct).toFixed(2)}%)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStock(stock);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      No stocks found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock Details Modal */}
        {selectedStock && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedStock.stockName} ({selectedStock.exchangeCode})
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">{selectedStock.sector}</p>
                  </div>
                  <button
                    onClick={() => setSelectedStock(null)}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Key Metrics</h3>
                    <dl className="mt-2 space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Quantity</dt>
                        <dd className="text-sm text-gray-900 dark:text-white">{selectedStock.quantity}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Average Cost</dt>
                        <dd className="text-sm text-gray-900 dark:text-white">₹{selectedStock.purchasePrice.toFixed(2)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Current Price</dt>
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {selectedStock.currentPrice ? `₹${selectedStock.currentPrice.toFixed(2)}` : 'N/A'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">P/E Ratio</dt>
                        <dd className="text-sm text-gray-900 dark:text-white">{selectedStock.peRatio || 'N/A'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">EPS</dt>
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {selectedStock.eps ? `₹${selectedStock.eps}` : 'N/A'}
                        </dd>
                      </div>
                      {selectedStock.marketCap && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500 dark:text-gray-400">Market Cap</dt>
                          <dd className="text-sm text-gray-900 dark:text-white">{selectedStock.marketCap}</dd>
                        </div>
                      )}
                      {selectedStock.dividendYield && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500 dark:text-gray-400">Dividend Yield</dt>
                          <dd className="text-sm text-gray-900 dark:text-white">{selectedStock.dividendYield}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Performance</h3>
                    <dl className="mt-2 space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Invested Amount</dt>
                        <dd className="text-sm text-gray-900 dark:text-white">₹{selectedStock.investment.toFixed(2)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Current Value</dt>
                        <dd className="text-sm text-gray-900 dark:text-white">₹{selectedStock.currentValue.toFixed(2)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">P&L</dt>
                        <dd className={`text-sm font-medium ${
                          selectedStock.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {selectedStock.gainLoss >= 0 ? '↑' : '↓'} ₹
                          {Math.abs(selectedStock.gainLoss).toFixed(2)} (
                          {Math.abs(selectedStock.gainLossPct).toFixed(2)}%)
                        </dd>
                      </div>
                      {selectedStock.yearHigh && selectedStock.yearLow && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex justify-between">
                            <dt className="text-sm text-gray-500 dark:text-gray-400">52-Week Range</dt>
                            <dd className="text-sm text-gray-900 dark:text-white">
                              ₹{selectedStock.yearLow} - ₹{selectedStock.yearHigh}
                            </dd>
                          </div>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                {/* Historical Price Chart */}
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Price History
                  </h3>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <PerformanceChart 
                      data={selectedStock?.historicalData?.map((item: { date: string; value: number }) => ({
                        date: item.date,
                        open: item.value,
                        high: item.value,
                        low: item.value,
                        close: item.value,
                        volume: 0
                      })) || []}
                      symbol={selectedStock?.exchangeCode} 
                      currentPrice={selectedStock?.currentPrice}
                      className="h-80"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setSelectedStock(null)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}