# ROCKIT UI Design Document

## Project Overview

ROCKIT is a high-performance market intelligence dashboard built as a React application for visualizing premarket data, intraday technicals, volume/TPO profiles, and AI-driven market bias analysis. The application provides real-time trading insights through an immersive, technical interface designed for professional traders.

## Architecture & Technology Stack

### Core Technologies
- **Frontend Framework**: React 19.2.3 with TypeScript
- **Build Tool**: Vite 6.2.0
- **Styling**: Tailwind CSS with custom animations
- **Icons**: Lucide React 0.562.0
- **Charts**: Recharts 3.6.0
- **AI Integration**: Google GenAI 1.34.0
- **Deployment**: Vite-based static hosting

### Project Structure
```
LePhanFF-RockitUI/
├── components/
│   ├── Dashboard.tsx          # Main dashboard component with tabbed interface
│   ├── MigrationChart.tsx     # Interactive price chart with overlays
│   ├── ProfileLadder.tsx      # TPO profile ladder visualization
│   └── ProfileVisualizer.tsx  # Static profile visualizer
├── App.tsx                    # Main application logic and state management
├── types.ts                   # TypeScript interfaces and type definitions
├── package.json              # Dependencies and scripts
├── vite.config.ts            # Build configuration
└── index.html                # HTML template
```

## Data Architecture

### Core Data Types

#### MarketSnapshot
The primary data structure representing a market analysis snapshot:
```typescript
interface MarketSnapshot {
  input: {
    session_date: string;
    current_et_time: string;
    premarket: { /* Asia/London/Overnight ranges */ };
    intraday: {
      ib: { /* Initial Balance metrics */ };
      wick_parade: { /* Bullish/bearish wick counts */ };
      dpoc_migration: { /* DPOC movement tracking */ };
      volume_profile: { /* Volume distribution */ };
      tpo_profile: { /* Time-Price-Opportunity analysis */ };
      ninety_min_pd_arrays: { /* Price discovery arrays */ };
      fvg_detection: { /* Fair Value Gap detection */ };
    };
    core_confluences: { /* Technical confluence analysis */ };
  };
  decoded?: DecodedOutput; // AI-generated analysis
}
```

#### DecodedOutput
AI-processed market intelligence:
```typescript
interface DecodedOutput {
  day_type: { type: string; timestamp: string };
  bias: string; // LONG/SHORT/NEUTRAL
  liquidity_sweeps: Record<string, { status: string; strength: string }>;
  value_acceptance: string;
  tpo_read: {
    profile_signals: string;
    dpoc_migration: string;
    extreme_or_compression: string;
  };
  confidence: string;
  day_type_reasoning: string[];
  one_liner: string;
}
```

### Data Flow

1. **Data Ingestion**: Fetches JSON/JSONL files from Google Cloud Storage bucket (`rockit-data`)
2. **Processing Pipeline**:
   - Raw market data parsing
   - AI analysis via Google GenAI (Gemini 3-flash-preview)
   - TPO profile calculation
   - Volume profile analysis
   - Technical confluence detection
3. **State Management**: React hooks with localStorage persistence
4. **Real-time Updates**: 120-second polling with rate limiting

### Data Source Migration

**Previous Implementation**: GitHub API
- Repository: `LePhanFF/RockitDataFeed`
- Path: `local-analysis-format/`
- Authentication: GitHub token (rate-limited)

**Current Implementation**: Google Cloud Storage
- Bucket: `rockit-data`
- Path: `local-analysis-format/`
- Authentication: Configurable (currently set for public access)
- API Endpoints:
  - File listing: `https://storage.googleapis.com/storage/v1/b/rockit-data/o?prefix=local-analysis-format/`
  - File download: `https://storage.googleapis.com/rockit-data/local-analysis-format/{filename}`
- Security Note: For production deployment, implement proper authentication via backend service with JWT token generation

### Implementation Changes

#### Modified Files
- `App.tsx`: Updated data fetching functions to use GCS REST API
- `vite.config.ts`: Updated environment variable handling for Vite
- `package.json`: Removed unnecessary GCS client library dependency
- `rockit-ui-design.md`: Updated documentation

#### Key Functions Updated
- `fetchFileList()`: Now uses GCS objects list API instead of GitHub contents API
- `handleFileSelect()`: Now uses GCS download URLs instead of GitHub raw URLs
- `getGCSAuthHeaders()`: Placeholder for authentication headers (currently returns empty for public access)

## UI/UX Design System

### Visual Design Language

#### Color Palette
- **Primary**: Slate-950 (background), Slate-900 (surfaces)
- **Accent**: Indigo-500/600 (primary actions, highlights)
- **Success**: Emerald-500 (bullish signals)
- **Danger**: Rose-500 (bearish signals)
- **Warning**: Amber-500 (cautions, rate limits)
- **Neutral**: Slate-400/500 (text, borders)

#### Typography
- **Primary Font**: System font stack (sans-serif)
- **Code Elements**: Monospace font for data display
- **Hierarchy**: Black font-weight (900) for emphasis
- **Tracking**: Wide letter-spacing for technical labels
- **Case**: Uppercase for headers and labels

#### Layout Principles
- **Grid-based**: 12-column responsive grid system
- **Two-panel Layout**: Chart area (2/3) + Intelligence panel (1/3)
- **Tab Navigation**: Horizontal tabs with icon + label
- **Card-based**: Rounded containers with subtle borders
- **Depth**: Layered shadows and backdrop blur effects

### Component Patterns

#### Dashboard Component
Main container with tabbed interface:
- **Tabs**: Brief, Pulse, Logic, Migration, Globex, Profile, Gaps, Thinking
- **State Management**: Local state for active tab and visualization toggles
- **Responsive**: Adapts to different screen sizes

#### MigrationChart Component
Interactive price visualization:
- **Chart Type**: Composed chart (Area + Line + Scatter + Reference lines)
- **Overlays**: OHLC bars, VWAP, EMA lines, institutional levels
- **Interactive**: Toggle visibility of different data layers
- **Real-time**: Updates with current price marker

#### ProfileLadder Component
TPO distribution display:
- **Ladder Format**: Price levels with TPO letters and volume bars
- **Resolution**: 5-minute and 30-minute brackets
- **Navigation**: Auto-scroll to current price
- **Color Coding**: Time-based letter coloring

#### ProfileVisualizer Component
Static profile overview:
- **Vertical Layout**: Price scale with horizontal bands
- **Multiple Profiles**: Volume VA, TPO VA, IB range
- **Reference Lines**: Premarket highs/lows, historical extremes

## Key Features

### Real-time Data Integration
- GitHub API polling every 120 seconds
- Rate limit handling with fallback to demo mode
- Local storage persistence for session continuity
- Error handling with offline cache support

### AI-Powered Analysis
- Google Gemini integration for market bias analysis
- Structured JSON output with confidence scoring
- Reasoning trace display in "Thinking" tab
- Session audit functionality

### Technical Analysis Tools
- **DPOC Migration Tracking**: Point of Control movement analysis
- **Liquidity Sweep Detection**: Asia/IB session sweep identification
- **TPO Profile Analysis**: Time-based price distribution
- **Volume Profile Visualization**: Value area identification
- **Fair Value Gap Detection**: Multi-timeframe gap analysis
- **Wick Parade Counting**: Bullish/bearish momentum signals

### Interactive Visualizations
- **Migration Chart**: Price action with technical overlays
- **Profile Ladder**: Detailed TPO distribution
- **Logic Dashboard**: Boolean condition monitoring
- **Pulse Metrics**: Momentum and volatility indicators

## Performance Considerations

### Optimization Strategies
- **Memoization**: React.useMemo for expensive calculations
- **Virtual Scrolling**: Profile ladder with efficient rendering
- **Lazy Loading**: Component-based code splitting
- **Efficient Re-renders**: Targeted state updates

### Data Processing
- **Batch Processing**: Snapshot array processing with filtering
- **Memory Management**: Limited historical data retention
- **Type Safety**: Full TypeScript coverage for data integrity

## Deployment & Development

### Development Setup
```bash
npm install
npm run dev  # Development server on port 3000
npm run build  # Production build
npm run preview  # Preview production build
```

### Environment Configuration
- **API Key**: GEMINI_API_KEY environment variable
- **GitHub Integration**: Hardcoded repository endpoints
- **Build Optimization**: Vite with React plugin

### Browser Compatibility
- Modern browsers with ES2022 support
- CSS Grid and Flexbox support required
- WebGL acceleration for smooth animations

## Future Enhancements

### Potential Improvements
- **WebSocket Integration**: Real-time data streaming
- **Advanced Charting**: Additional technical indicators
- **Mobile Responsiveness**: Touch-optimized interface
- **Offline Mode**: Enhanced caching strategies
- **Multi-asset Support**: Expand beyond single instrument
- **Alert System**: Notification framework for bias changes

### Technical Debt
- **State Management**: Consider Redux/Zustand for complex state
- **Testing**: Add comprehensive test coverage
- **Error Boundaries**: Implement React error boundaries
- **Accessibility**: WCAG compliance improvements

## Conclusion

ROCKIT represents a sophisticated trading dashboard that successfully combines real-time market data, advanced technical analysis, and AI-driven insights in a cohesive, professional interface. The architecture demonstrates strong separation of concerns, efficient data processing, and a user-centric design focused on trader productivity.

The codebase exhibits clean TypeScript implementation, responsive design patterns, and scalable component architecture suitable for professional trading environments.
