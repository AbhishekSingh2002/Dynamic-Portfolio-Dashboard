# Dynamic Portfolio Dashboard

A real-time portfolio tracking dashboard built with Next.js, TypeScript, and Tailwind CSS. This application fetches stock market data from Alpha Vantage API to provide up-to-date portfolio information.

## Features

- Real-time stock price updates
- Portfolio performance tracking
- Sector-wise analysis
- Gain/loss calculations
- Responsive design
- Auto-refresh every 15 seconds

## Prerequisites

- Node.js 16.14 or later
- npm or yarn
- Alpha Vantage API key (free tier available)

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/AbhishekSingh2002/Dynamic-Portfolio-Dashboard.git
   cd dynamic-portfolio-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env.local`
   - Get your free API key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
   - Add your API key to `.env.local`
   ```env
   NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=your_api_key_here
   ```

4. **Add your portfolio data**
   Edit `src/app/data/portfolio.json` to add your stock holdings:
   ```json
   [
     {
       "stockName": "HDFC Bank",
       "purchasePrice": 1490,
       "quantity": 50,
       "sector": "Financial",
       "exchangeCode": "HDFCBANK"
     },
     // Add more stocks as needed
   ]
   ```

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Open your browser**
   Visit [http://localhost:3000](http://localhost:3000) to view your portfolio dashboard.

## Project Structure

- `src/app/` - Next.js app router pages and API routes
  - `api/` - API endpoints for fetching stock data
  - `data/` - Portfolio data in JSON format
- `src/components/` - Reusable React components
- `src/types/` - TypeScript type definitions

## Technologies Used

- [Next.js](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type checking
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Alpha Vantage API](https://www.alphavantage.co/) - Stock market data

## Deployment

### Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_campaign=create-next-app) from the creators of Next.js.

1. Push your code to a GitHub/GitLab/Bitbucket repository
2. Import the repository into Vercel
3. Add your `NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY` to the environment variables
4. Deploy!

## Rate Limiting

Note that the free tier of Alpha Vantage API has rate limits (5 API requests per minute, 500 requests per day). For production use, consider upgrading to a paid plan or implementing caching.

## License

This project is open source and available under the [MIT License](LICENSE).

# Dynamic-Portfolio-Dashboard
