# ESPN MCP Server

**Multi-source college sports data API with JSON-RPC 2.0 compliance**

Built for The Botosphere - Boomer Bot

## 🎯 Overview

A unified MCP (Model Context Protocol) server that combines three powerful sports data sources into one JSON-RPC 2.0 compliant API:

- **ESPN** - Real-time scores, schedules, rankings (no key required)
- **CFBD** - Advanced analytics, recruiting, betting (free API key)
- **NCAA** - Multi-division coverage for all sports (no key required)

## 🚀 Quick Start

### Deploy to Railway

1. Upload these files to GitHub:
   - server.js
   - espn-api.js
   - cfbd-api.js
   - ncaa-api.js
   - package.json

2. Connect GitHub repo to Railway

3. Add environment variables:
   - `MCP_API_KEY` (required)
   - `CFBD_API_KEY` (optional but recommended)

4. Railway auto-deploys!

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 🔧 Features

### 12 Powerful Tools

**ESPN Tools:**
- `get_score` - Live/recent game scores
- `get_schedule` - Team schedules with broadcast info
- `get_scoreboard` - All games for any date
- `get_rankings` - AP Top 25 and coaches polls

**CFBD Tools:** *(requires free API key)*
- `get_stats` - Advanced analytics (EPA, Success Rate, Explosiveness)
- `get_recruiting` - National recruiting rankings
- `get_talent` - Team talent composite scores
- `get_betting` - Point spreads and over/under lines
- `get_ratings` - SP+ statistical power ratings
- `get_records` - Win-loss records (overall, home, away, conference)

**NCAA Tools:**
- `get_ncaa_scoreboard` - Multi-division scoreboards (FBS/FCS/D2/D3)
- `get_ncaa_rankings` - NCAA poll rankings

### Key Features

- ✅ JSON-RPC 2.0 compliant
- ✅ Bearer token authentication
- ✅ Intelligent caching (1min - 24hr TTL)
- ✅ 65+ team name mappings
- ✅ Comprehensive error handling
- ✅ Zero external dependencies beyond node-fetch

## 📊 Example Usage

### Tool Discovery

```json
POST /mcp
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}
```

### Get Oklahoma Score

```json
POST /mcp
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_score",
    "arguments": {
      "team": "oklahoma"
    }
  },
  "id": 1
}
```

### Get Advanced Stats

```json
POST /mcp
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_stats",
    "arguments": {
      "team": "oklahoma",
      "year": 2024
    }
  },
  "id": 1
}
```

## 🔑 API Keys

### MCP_API_KEY (Required)

Your authentication token for the MCP server. Set this in Railway environment variables.

Example: `sk_live_boomerbot_a8f7d2e9c4b1x6m3n5p9q2r8t4w7y1z3`

### CFBD_API_KEY (Optional but Recommended)

Free API key from https://collegefootballdata.com

Enables 6 additional tools:
- Advanced statistics
- Recruiting rankings
- Talent composites
- Betting lines
- SP+ ratings
- Team records

**Without CFBD key:** ESPN and NCAA tools still work perfectly!

## 🏈 Supported Teams

65+ major college teams mapped, including:

**Big 12:** Oklahoma, Texas, Oklahoma State, Baylor, TCU, Texas Tech, Kansas, Kansas State, Iowa State, West Virginia

**SEC:** Alabama, Georgia, LSU, Florida, Tennessee, Auburn, Texas A&M, Arkansas, Missouri, Kentucky, Mississippi State, Ole Miss, South Carolina, Vanderbilt

**Big Ten:** Ohio State, Michigan, Penn State, Wisconsin, Iowa, Nebraska, Minnesota, Northwestern, Illinois, Purdue, Indiana, Michigan State, Maryland, Rutgers

**ACC:** Clemson, Miami, Florida State, North Carolina, NC State, Virginia Tech, Virginia, Pittsburgh, Louisville, Duke, Wake Forest, Boston College, Syracuse, Georgia Tech

**Others:** USC, UCLA, Oregon, Washington, Stanford, Notre Dame, BYU, Utah, Colorado, Arizona, Arizona State

Team name variations accepted:
- "Oklahoma", "OU", "Sooners" → ESPN ID 201
- "Texas", "UT", "Longhorns" → ESPN ID 251
- "Alabama", "Bama" → ESPN ID 333

## 🎨 Response Format

All tools return formatted text responses optimized for chat interfaces:

```
Oklahoma vs Texas
Final

Texas (8-1): 34
Oklahoma (5-4): 30

Venue: Cotton Bowl
TV: ABC
```

## 🔄 Caching Strategy

Adaptive caching based on data freshness:

- **Live games:** 1 minute
- **Completed games:** 24 hours
- **Schedules:** 24 hours  
- **Rankings:** 24 hours
- **CFBD analytics:** 6 hours
- **Scoreboards:** 5 minutes

## 📁 File Structure

```
espn-mcp-server/
├── server.js          # Main MCP server (JSON-RPC 2.0)
├── espn-api.js        # ESPN API integration
├── cfbd-api.js        # CFBD API integration
├── ncaa-api.js        # NCAA API integration
├── package.json       # Dependencies
├── DEPLOYMENT.md      # Deployment guide
└── README.md          # This file
```

## 🧪 Testing

### Health Check
```bash
curl https://your-server.up.railway.app/health
```

### Tool Discovery
```bash
curl -X POST https://your-server.up.railway.app/mcp \
  -H "Authorization: Bearer YOUR_MCP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### Get Score
```bash
curl -X POST https://your-server.up.railway.app/mcp \
  -H "Authorization: Bearer YOUR_MCP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_score","arguments":{"team":"oklahoma"}},"id":1}'
```

## 🛠️ Local Development

```bash
# Clone repo
git clone https://github.com/yourusername/espn-mcp-server

# Install dependencies
npm install

# Set environment variables (optional)
export CFBD_API_KEY="your_key_here"

# Run server
npm start

# Or run with auto-reload
npm run dev
```

Server runs on http://localhost:8080

## 🔒 Security

- Bearer token authentication required
- Environment variable-based API keys
- No credentials in code
- CORS enabled for web clients

## 📊 Bot Integration

### PaymeGPT Configuration

**MCP Server URL:**
```
https://your-server.up.railway.app/mcp
```

**Authentication:**
```
Bearer YOUR_MCP_API_KEY
```

Click "Discover Tools" → All 12 tools appear!

### Example Bot Queries

- "What's the OU score?"
- "When does Oklahoma play next?"
- "Show me today's college football scores"
- "What's the AP Top 25?"
- "How is OU's offense performing statistically?"
- "What's OU's recruiting class ranked?"
- "What's the spread for OU vs Texas?"

## 🐛 Troubleshooting

**Tools not discovered?**
- Verify `MCP_API_KEY` is set in Railway
- Check Authorization header format
- View Railway logs for errors

**CFBD tools failing?**
- Get free key at https://collegefootballdata.com
- Set `CFBD_API_KEY` in Railway
- Restart deployment

**Team not found?**
- Check team name spelling
- Try abbreviations (OU, UT, Bama)
- See supported teams list above

**No recent games?**
- Check if it's off-season
- Try specific team schedule
- Verify team name is correct

## 📈 Performance

- **Adaptive caching** reduces API calls
- **Concurrent requests** handled efficiently
- **Sub-second responses** for cached data
- **Automatic cache invalidation** based on data type

## 🎯 Roadmap

Future enhancements:
- [ ] More CFBD analytics endpoints
- [ ] Player statistics integration
- [ ] Game play-by-play data
- [ ] Historical game archives
- [ ] Custom notification webhooks
- [ ] GraphQL interface option

## 📄 License

MIT License - See LICENSE file

## 👤 Author

**Kevin - The Botosphere**
- Website: https://thebotosphere.com
- Project: BESN (Botosphere Entertainment & Sports Network)
- Bot: Boomer Bot for Oklahoma Sooners fans

## 🙏 Acknowledgments

Data provided by:
- ESPN API
- CollegeFootballData.com
- NCAA.com

## 📞 Support

Issues? Questions? 

1. Check [DEPLOYMENT.md](DEPLOYMENT.md) for setup help
2. Review Railway logs for errors
3. Test endpoints with curl commands
4. Verify environment variables are set

## 🎉 Ready to Deploy!

Follow [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step instructions.

Your bot will have access to comprehensive college sports data in minutes!
