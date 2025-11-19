# ESPN MCP SERVER - DEPLOYMENT GUIDE

## 🚀 Quick Deploy to Railway

### Step 1: Upload Files to GitHub

Upload these 5 files to your GitHub repository:

1. **server.js** - Main MCP server
2. **espn-api.js** - ESPN integration
3. **cfbd-api.js** - CFBD integration  
4. **ncaa-api.js** - NCAA integration
5. **package.json** - Dependencies

### Step 2: Configure Railway Environment Variables

In Railway, add these environment variables:

**Required:**
- `MCP_API_KEY` = `sk_live_boomerbot_a8f7d2e9c4b1x6m3n5p9q2r8t4w7y1z3`

**Optional (but recommended):**
- `CFBD_API_KEY` = Your CFBD API key from https://collegefootballdata.com

### Step 3: Deploy

Railway will automatically:
1. Detect Node.js project
2. Run `npm install`
3. Start server with `npm start`
4. Expose public URL

### Step 4: Test

Once deployed, your bot can connect to:
```
https://your-project.up.railway.app/mcp
```

With Bearer token authentication:
```
Authorization: Bearer sk_live_boomerbot_a8f7d2e9c4b1x6m3n5p9q2r8t4w7y1z3
```

## 🔑 Getting CFBD API Key

1. Go to https://collegefootballdata.com
2. Click "Sign Up" or "Get API Key"
3. Create free account
4. Copy your API key
5. Add to Railway as `CFBD_API_KEY`

## ✅ Verify Deployment

### Test Health Check
```bash
curl https://your-project.up.railway.app/health
```

Should return:
```json
{
  "status": "healthy",
  "uptime": 123.45,
  "cfbdEnabled": true,
  "timestamp": "2025-11-19T..."
}
```

### Test Tool Discovery
```bash
curl -X POST https://your-project.up.railway.app/mcp \
  -H "Authorization: Bearer sk_live_boomerbot_a8f7d2e9c4b1x6m3n5p9q2r8t4w7y1z3" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

Should return list of 12 tools.

### Test Get Score
```bash
curl -X POST https://your-project.up.railway.app/mcp \
  -H "Authorization: Bearer sk_live_boomerbot_a8f7d2e9c4b1x6m3n5p9q2r8t4w7y1z3" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_score",
      "arguments": {
        "team": "oklahoma"
      }
    },
    "id": 1
  }'
```

Should return Oklahoma's most recent game score.

## 🎯 12 Available Tools

**ESPN Tools (Always work):**
1. get_score - Current/recent game scores
2. get_schedule - Team schedules
3. get_scoreboard - Daily scoreboards
4. get_rankings - AP Top 25

**CFBD Tools (Require API key):**
5. get_stats - Advanced analytics (EPA, Success Rate)
6. get_recruiting - Recruiting rankings
7. get_talent - Talent composites
8. get_betting - Betting lines
9. get_ratings - SP+ ratings
10. get_records - Win-loss records

**NCAA Tools (Always work):**
11. get_ncaa_scoreboard - Multi-division scores
12. get_ncaa_rankings - NCAA rankings

## 🔧 Troubleshooting

**Tools not discovered?**
- Check MCP_API_KEY is set correctly
- Verify Authorization header format: `Bearer YOUR_KEY`
- Check Railway logs for errors

**CFBD tools failing?**
- Make sure CFBD_API_KEY is set in Railway
- Get free key at https://collegefootballdata.com
- Check Railway logs to confirm key is loaded

**Server not starting?**
- Check Railway build logs
- Ensure all 5 files are uploaded
- Verify package.json is present

## 📊 Bot Configuration

In your PaymeGPT bot settings:

**MCP Server URL:**
```
https://your-project.up.railway.app/mcp
```

**Authentication:**
```
Bearer sk_live_boomerbot_a8f7d2e9c4b1x6m3n5p9q2r8t4w7y1z3
```

Then click "Discover Tools" - should find all 12 tools!

## ⚙️ Local Development

```bash
# Install dependencies
npm install

# Set environment variables (optional)
export CFBD_API_KEY="your_cfbd_key"

# Run server
npm start

# Or run with auto-reload
npm run dev
```

Server runs on http://localhost:8080

## 🎉 You're Done!

Your ESPN MCP Server is now:
- ✅ Fully deployed on Railway
- ✅ JSON-RPC 2.0 compliant
- ✅ Integrated with 3 data sources
- ✅ Ready for bot discovery
- ✅ 12 tools available
