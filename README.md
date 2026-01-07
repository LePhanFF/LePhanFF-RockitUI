<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ROCKIT Market Intelligence Dashboard

A high-performance trading dashboard visualizing premarket data, intraday technicals, volume/TPO profiles, and AI-driven market bias analysis.

## Prerequisites

- **Node.js** (v18 or higher)
- **Google Cloud Storage** bucket named `rockit-data` (optional, for data storage)
- **Google Gemini API** key (for AI analysis features)

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env.local` file in the project root with your API keys:

```env
# Required: Google Gemini API Key for AI analysis features
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Alternative Vite environment variable
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**Note**: Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### 3. Data Source Setup (Choose One)

#### Option A: Use Demo Data (Recommended for Testing)
The app includes mock data and will automatically fall back to demo mode if no external data source is available.

#### Option B: Google Cloud Storage (Production)
1. Create a GCS bucket named `rockit-data`
2. Upload your market data files to the `local-analysis-format/` folder in the bucket
3. Make the bucket publicly readable OR implement authentication (see below)

#### Option C: Local Development
Place your data files in a `public/data/` folder for local development.

### 4. Run the Application
```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

The application will be available at `http://localhost:3000`

## Configuration Options

### Google Cloud Storage Authentication

For authenticated access to private GCS buckets:

1. Ensure `google-rockitsa-key.json` is in the project root
2. The app is configured for public access by default
3. For production, implement backend JWT token generation

### Environment Variables

- `GEMINI_API_KEY`: Your Google Gemini API key for AI analysis
- `VITE_GEMINI_API_KEY`: Alternative environment variable name for Vite

## Data Format

The application expects market data in JSON or JSONL format with the following structure:

```json
{
  "input": {
    "session_date": "2025-12-31",
    "current_et_time": "09:30",
    "premarket": { /* market data */ },
    "intraday": { /* technical data */ },
    "core_confluences": { /* analysis */ }
  },
  "output": "AI analysis response..."
}
```

## Features

- **Real-time Data Visualization**: Interactive charts with technical overlays
- **AI-Powered Analysis**: Market bias detection using Google Gemini
- **TPO Profile Analysis**: Time-Price-Opportunity distribution
- **Volume Profile**: Value area identification
- **Liquidity Analysis**: Sweep detection and order flow analysis
- **Multi-timeframe Support**: Daily, 4H, 1H, 90min, 15min, 5min analysis

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**: Run `npm install` to install dependencies
2. **GCS access denied**: Check bucket permissions or use demo mode
3. **AI features not working**: Verify your Gemini API key
4. **Build errors**: Ensure Node.js version is v18+

### Demo Mode

If external data sources are unavailable, the app automatically switches to demo mode with sample data.

## Deployment

### Vercel/Netlify Deployment
1. Build the project: `npm run build`
2. Deploy the `dist/` folder
3. Set environment variables in your hosting platform

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary. See LICENSE file for details.
