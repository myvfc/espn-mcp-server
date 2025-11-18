# ESPN MCP Server

Multi-source college sports data API combining ESPN, CollegeFootballData.com, and NCAA.com data.

## Features

- **Real-time game scores** from ESPN (30-60 second delay)
- **Advanced analytics** from CollegeFootballData.com (EPA, Success Rate, etc.)
- **Multi-division coverage** from NCAA.com (FBS, FCS, D2, D3)
- **Recruiting rankings** and team talent composites
- **Betting lines** and SP+ ratings
- **Adaptive caching** for optimal performance

## Quick Start

### Local Development
```bash
# Install dependencies
npm install

# Start server
npm start

# Development mode with auto-reload
npm run dev
```

Server runs on `http://localhost:8080`

### Deploy to Railway

1. Push code to GitHub
2. Connect GitHub repo to Railway
3. Railway auto-deploys from Dockerfile
4. Optional: Add `CFBD_API_KEY` environment variable

## API Endpoints

### ESPN Data

- `GET /score?team=oklahoma&sport=football` - Current game score
- `GET /schedule?team=oklahoma&limit=5` - Team schedule
- `GET /scoreboard?sport=football` - Today's games
- `GET /rankings?sport=football&top=25` - AP Top 25

### CFBD Data (Advanced)

- `GET /cfbd/recruiting?team=oklahoma` - Recruiting rankings
- `GET /cfbd/talent?team=oklahoma` - Team talent composite
- `GET /cfbd/stats?team=oklahoma` - Advanced statistics
- `GET /cfbd/betting?team=oklahoma` - Betting lines
- `GET /cfbd/ratings?team=oklahoma` - SP+ ratings

### NCAA Data (Multi-Division)

- `GET /ncaa/scoreboard?sport=football&division=fbs` - NCAA scoreboard
- `GET /ncaa/rankings?sport=football&division=fbs` - NCAA rankings

## Response Formats

All endpoints support two formats:

- `format=json` (default) - Full JSON response
- `format=text` - Conversational text response for bots

Example:
```
/score?team=oklahoma&format=text
→ "🔴 LIVE: Oklahoma leading Texas 24-17 in 3rd quarter!"
```

## Environment Variables

- `PORT` - Server port (default: 8080)
- `CFBD_API_KEY` - Optional API key for CollegeFootballData.com

Get free CFBD key at: https://collegefootballdata.com

## Supported Teams

65+ major college teams mapped, including:
- Big 12: Oklahoma, Texas, Oklahoma State, etc.
- SEC: Alabama, Georgia, LSU, etc.
- Big Ten: Ohio State, Michigan, Penn State, etc.
- ACC: Clemson, Miami, Florida State, etc.

See `team-mapping.js` for complete list.

## Caching Strategy

**Adaptive caching** based on data freshness needs:
- Live games: 1 minute cache
- Completed games: 24 hour cache
- Schedules: 24 hour cache
- CFBD data: 6 hour cache
- NCAA data: 5 minute cache

## Tech Stack

- Node.js 20+
- Express.js
- node-fetch for API calls
- Docker for deployment

## Created By

Kevin - The Botosphere  
Built for BESN (Botosphere Entertainment & Sports Network)

## License

MIT
