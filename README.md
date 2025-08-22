# Sports Analysis Platform

A comprehensive web application for sports analysis using RSS feeds and AI agents. The platform fetches sports news from RSS feeds, stores them in a SQLite database, and provides AI-powered analysis through local Ollama models.

## Features

- **RSS Feed Management**: Add, edit, and manage RSS feeds for sports news
- **Article Storage**: Automatically fetch and store articles from RSS feeds
- **AI Analysis**: Two specialized AI agents:
  - **Sports Specialist**: Analyzes articles to extract teams, players, injuries, and betting signals
  - **Reasoning Agent**: Provides advanced analysis and predictions for betting scenarios
- **Real-time Updates**: Server-Sent Events (SSE) for live status updates
- **Modern UI**: React frontend with Material-UI components
- **Local AI**: Uses local Ollama models for privacy and performance

## Tech Stack

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **SQLite** with better-sqlite3 for fast local storage
- **RSS Parser** for feed processing
- **Ollama Integration** for local AI models
- **Server-Sent Events** for real-time updates

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Material-UI** for modern UI components
- **React Query** for data fetching
- **React Router** for navigation

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Ollama** installed and running locally
3. **Sports AI Models** (recommended):
   - `llava:13b` for sports specialist
   - `hir0rameel/qwen-claude:latest` for reasoning agent

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd sports-analysis-app
   ```

2. **Install dependencies**:
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**:
   ```bash
   cp backend/.env.example backend/.env
   ```
   
   Edit `backend/.env` with your configuration:
   ```env
   PORT=3001
   OLLAMA_URL=http://localhost:11434
   SPORTS_AGENT_MODEL=llava:13b
   REASONING_AGENT_MODEL=hir0rameel/qwen-claude:latest
   RSS_FETCH_INTERVAL=*/30 * * * *
   ```

4. **Start Ollama and pull models**:
   ```bash
   # Start Ollama
   ollama serve
   
   # Pull required models
   ollama pull llava:13b
   ollama pull hir0rameel/qwen-claude:latest
   ```

## Running the Application

### Development Mode
```bash
# Start both backend and frontend
npm run dev

# Or start individually
npm run dev:backend  # Backend on http://localhost:3001
npm run dev:frontend # Frontend on http://localhost:5173
```

### Production Mode
```bash
# Build both applications
npm run build

# Start production server
npm start
```

## Usage

### 1. Adding RSS Feeds
- Navigate to the "Feeds" page
- Click "Add Feed" and enter the RSS URL
- The system will validate the feed and start fetching articles

### 2. Managing Articles
- View all articles on the "Articles" page
- Search and filter articles
- Click "Analyze" to run AI analysis on specific articles

### 3. AI Analysis
- Use the "Analysis" page for interactive AI chat
- Select context articles to provide background information
- Ask questions about sports analysis, betting predictions, or team comparisons

### 4. Dashboard
- Monitor system health and statistics
- View recent articles and feed status
- Check AI model connectivity

## API Endpoints

### Feeds
- `GET /api/feeds` - List all feeds
- `POST /api/feeds` - Create new feed
- `PUT /api/feeds/:id` - Update feed
- `DELETE /api/feeds/:id` - Delete feed
- `POST /api/feeds/:id/fetch` - Manually fetch feed

### Articles
- `GET /api/articles` - List articles with pagination
- `GET /api/articles/recent` - Get recent articles
- `GET /api/articles/:id` - Get specific article
- `DELETE /api/articles/:id` - Delete article

### Analysis
- `POST /api/analysis/article/:id` - Analyze specific article
- `POST /api/analysis/reasoning` - Run reasoning analysis
- `POST /api/analysis/reasoning/stream` - Stream reasoning analysis

### Real-time Events
- `GET /api/events` - SSE endpoint for real-time updates

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `3001` |
| `DB_PATH` | SQLite database path | `./data/sports.db` |
| `OLLAMA_URL` | Ollama API URL | `http://localhost:11434` |
| `SPORTS_AGENT_MODEL` | Model for sports specialist | `llava:13b` |
| `REASONING_AGENT_MODEL` | Model for reasoning agent | `hir0rameel/qwen-claude:latest` |
| `RSS_FETCH_INTERVAL` | Cron schedule for RSS fetching | `*/30 * * * *` |
| `CORS_ORIGIN` | Frontend URL for CORS | `http://localhost:5173` |

### AI Model Configuration

The application uses two AI models with different specializations:

1. **Sports Specialist** (`llava:13b`):
   - Analyzes sports articles
   - Extracts teams, players, injuries
   - Identifies betting signals
   - Provides structured insights

2. **Reasoning Agent** (`hir0rameel/qwen-claude:latest`):
   - Advanced reasoning and analysis
   - Betting predictions and odds estimation
   - Team comparison analysis
   - Risk assessment

## Database Schema

The SQLite database includes the following tables:

- **feeds**: RSS feed information
- **articles**: Stored articles from feeds
- **insights**: AI analysis results from sports specialist
- **analyses**: Reasoning agent analysis results
- **jobs**: Background job tracking

## Development

### Project Structure
```
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── database/       # Database setup and migrations
│   │   ├── repositories/   # Data access layer
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API endpoints
│   │   └── types/          # TypeScript interfaces
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API and SSE services
│   │   └── types/          # TypeScript interfaces
│   └── package.json
└── package.json           # Root workspace configuration
```

### Adding New Features

1. **Backend**: Add new routes in `backend/src/routes/`
2. **Frontend**: Create new components in `frontend/src/components/`
3. **Database**: Update schema in `backend/src/database/schema.sql`
4. **Types**: Update interfaces in both `backend/src/types/` and `frontend/src/types/`

## Troubleshooting

### Common Issues

1. **Ollama Connection Error**:
   - Ensure Ollama is running: `ollama serve`
   - Check the `OLLAMA_URL` in your `.env` file
   - Verify models are pulled: `ollama list`

2. **RSS Feed Issues**:
   - Validate RSS URLs before adding
   - Check feed accessibility and format
   - Review error logs in the backend console

3. **Database Issues**:
   - Ensure write permissions for the database directory
   - Check database path in environment variables
   - Restart the application to reinitialize the database

### Logs

- Backend logs are displayed in the console
- Check the browser console for frontend errors
- Database operations are logged with timestamps

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs for error messages
3. Ensure all prerequisites are met
4. Create an issue with detailed information
