// src/lib/exportUtils.ts
import { PortfolioStock } from '@/types/portfolio';
import { utils, writeFile } from 'xlsx';

// Helper function to format currency
const formatCurrency = (value: number | undefined): string => {
  if (value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const exportToCsv = (data: PortfolioStock[], filename: string = 'portfolio') => {
  if (!data || data.length === 0) return;

  // Calculate totals
  const totalInvestment = data.reduce((sum, stock) => sum + (stock.investment || 0), 0);
  const totalCurrentValue = data.reduce((sum, stock) => sum + (stock.currentValue || 0), 0);
  const totalGainLoss = data.reduce((sum, stock) => sum + (stock.gainLoss || 0), 0);
  const totalGainLossPct = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;

  // Prepare CSV content
  const headers = [
    'Stock Name',
    'Symbol',
    'Sector',
    'Quantity',
    'Avg. Cost',
    'Current Price',
    'Investment',
    'Current Value',
    'P&L',
    'P&L %',
    'Portfolio %',
    'Last Updated'
  ];

  // Format data rows
  const rows = data.map((stock) => [
    stock.stockName,
    stock.exchangeCode,
    stock.sector || 'N/A',
    stock.quantity.toString(),
    formatCurrency(stock.purchasePrice),
    formatCurrency(stock.currentPrice),
    formatCurrency(stock.investment),
    formatCurrency(stock.currentValue),
    formatCurrency(stock.gainLoss),
    stock.gainLossPct ? `${stock.gainLossPct.toFixed(2)}%` : '0.00%',
    stock.portfolioPct ? `${stock.portfolioPct.toFixed(2)}%` : '0.00%',
    stock.lastUpdated || new Date().toISOString().split('T')[0]
  ]);

  // Add totals row
  rows.push([
    '', '', '', '', '', 'Total:',
    formatCurrency(totalInvestment),
    formatCurrency(totalCurrentValue),
    formatCurrency(totalGainLoss),
    `${totalGainLossPct.toFixed(2)}%`,
    '100.00%',
    ''
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(field => 
        `"${String(field).replace(/"/g, '""')}"`
      ).join(',')
    )
  ].join('\n');

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = (data: PortfolioStock[], filename: string = 'portfolio') => {
  if (!data || data.length === 0) return;

  // Format data for Excel
  const excelData = data.map((stock) => ({
    'Stock Name': stock.stockName,
    'Symbol': stock.exchangeCode,
    'Sector': stock.sector || 'N/A',
    'Quantity': stock.quantity,
    'Avg. Cost': stock.purchasePrice,
    'Current Price': stock.currentPrice,
    'Investment': stock.investment,
    'Current Value': stock.currentValue,
    'P&L': stock.gainLoss,
    'P&L %': stock.gainLossPct ? stock.gainLossPct / 100 : 0, // Store as decimal for Excel percentage format
    'Portfolio %': stock.portfolioPct ? stock.portfolioPct / 100 : 0, // Store as decimal for Excel percentage format
    'Last Updated': stock.lastUpdated || new Date().toISOString().split('T')[0]
  }));

  // Create worksheet and workbook
  const worksheet = utils.json_to_sheet(excelData);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Portfolio');

  // Set column formats
  const wscols = [
    { wch: 20 }, // Stock Name
    { wch: 10 }, // Symbol
    { wch: 15 }, // Sector
    { wch: 10 }, // Quantity
    { wch: 12 }, // Avg. Cost
    { wch: 12 }, // Current Price
    { wch: 12 }, // Investment
    { wch: 12 }, // Current Value
    { wch: 12 }, // P&L
    { wch: 10 }, // P&L %
    { wch: 12 }, // Portfolio %
    { wch: 15 }  // Last Updated
  ];
  worksheet['!cols'] = wscols;

  // Generate Excel file
  writeFile(
    workbook,
    `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`,
    { bookType: 'xlsx', type: 'array' }
  );
};

export const exportToPrint = (data: PortfolioStock[], printRef: React.RefObject<HTMLDivElement>) => {
  if (!data || data.length === 0 || !printRef.current) return;

  // Calculate totals
  const totalInvestment = data.reduce((sum, stock) => sum + (stock.investment || 0), 0);
  const totalCurrentValue = data.reduce((sum, stock) => sum + (stock.currentValue || 0), 0);
  const totalGainLoss = data.reduce((sum, stock) => sum + (stock.gainLoss || 0), 0);
  const totalGainLossPct = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;

  // Create print content
  const printContent = `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-6">Portfolio Snapshot</h1>
      <div class="mb-6">
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 p-4 rounded">
            <div class="text-sm text-gray-500">Total Investment</div>
            <div class="text-xl font-semibold">${formatCurrency(totalInvestment)}</div>
          </div>
          <div class="bg-gray-50 p-4 rounded">
            <div class="text-sm text-gray-500">Current Value</div>
            <div class="text-xl font-semibold">${formatCurrency(totalCurrentValue)}</div>
          </div>
          <div class="bg-gray-50 p-4 rounded">
            <div class="text-sm text-gray-500">Total P&L</div>
            <div class="text-xl font-semibold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}">
              ${formatCurrency(totalGainLoss)} (${totalGainLossPct.toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Cost</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Investment</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P&L</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${data.map(stock => `
            <tr>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="font-medium text-gray-900">${stock.stockName}</div>
                <div class="text-sm text-gray-500">${stock.exchangeCode}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${stock.sector || 'N/A'}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${stock.quantity}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${formatCurrency(stock.purchasePrice)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${formatCurrency(stock.currentPrice)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${formatCurrency(stock.investment)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${formatCurrency(stock.currentValue)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm ${(stock.gainLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'} text-right">
                ${formatCurrency(stock.gainLoss)} (${stock.gainLossPct ? stock.gainLossPct.toFixed(2) : '0.00'}%)
              </td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot class="bg-gray-50">
          <tr>
            <th colspan="5" class="px-6 py-3 text-right text-sm font-medium text-gray-500">Total</th>
            <th class="px-6 py-3 text-right text-sm font-medium text-gray-900">${formatCurrency(totalInvestment)}</th>
            <th class="px-6 py-3 text-right text-sm font-medium text-gray-900">${formatCurrency(totalCurrentValue)}</th>
            <th class="px-6 py-3 text-right text-sm font-medium ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}">
              ${formatCurrency(totalGainLoss)} (${totalGainLossPct.toFixed(2)}%)
            </th>
          </tr>
        </tfoot>
      </table>
      <div class="mt-8 text-xs text-gray-500 text-center">
        Generated on ${new Date().toLocaleString()}
      </div>
    </div>
  `;

  // Set the print content
  printRef.current.innerHTML = printContent;

  // Open print dialog
  window.setTimeout(() => {
    window.print();
  }, 100);
};