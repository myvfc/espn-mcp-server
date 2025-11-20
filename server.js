/**
 * ESPN MCP SERVER - ESPN + NCAA ONLY
 * Multi-source sports data API combining ESPN and NCAA
 * JSON-RPC 2.0 Compliant MCP Server
 * Created for The Botosphere - Boomer Bot (Sky)
 */

import express from "express";
import cors from "cors";

import {
  getCurrentGame,
  getTeamSchedule,
  getScoreboard,
  getRankings,
  clearCache as clearESPNCache,
} from "./espn-api.js";

import {
  getNCAAScoreboard,
  getNCAAankings,
  getConferenceStandings,
  clearCache as clearNCAACache,
} from "./ncaa-api.js";

import { getGamePlayerStats } from "./espn-player.js";

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * ROOT ENDPOINT - Server info
 */
app.get("/", (req, res) => {
  res.json({
    name: "ESPN MCP Server",
    version: "3.0.0",
    description: "ESPN + NCAA college sports data API - JSON-RPC 2.0 Compliant",
    sources: ["ESPN", "NCAA.com"],
    mcpEndpoint: "POST /mcp (requires Bearer token)",
    tools: 7,
    status: "operational",
    timestamp: new Date().toISOString(),
    note: "CFBD has been removed. All stats are now powered by ESPN and NCAA.",
  });
});

/**
 * HEALTH CHECK
 */
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    sources: {
      espn: true,
      ncaa: true,
    },
  });
});

/**
 * MCP ENDPOINT - JSON-RPC 2.0 COMPLIANT
 * Handles tool discovery and tool calls
 */
app.post("/mcp", async (req, res) => {
  try {
    // Authentication check
    const authHeader = req.headers.authorization;
    const apiKey =
      process.env.MCP_API_KEY ||
      "sk_live_boomerbot_a8f7d2e9c4b1x6m3n5p9q2r8t4w7y1z3";

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.json({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message:
            "Missing or invalid authorization header. Use: Authorization: Bearer YOUR_API_KEY",
        },
        id: req.body?.id || null,
      });
    }

    const token = authHeader.substring(7);

    if (token !== apiKey) {
      return res.json({
        jsonrpc: "2.0",
        error: {
          code: -32002,
          message: "Invalid API key",
        },
        id: req.body?.id || null,
      });
    }

    // Parse JSON-RPC request
    const { jsonrpc, method, params = {}, id } = req.body;

    // Validate JSON-RPC version
    if (jsonrpc !== "2.0") {
      return res.json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: 'Invalid Request: jsonrpc must be "2.0"',
        },
        id: id || null,
      });
    }

    // Validate method exists
    if (!method) {
      return res.json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Invalid Request: method is required",
        },
        id: id || null,
      });
    }

    console.log(`JSON-RPC Method: ${method}`, params);

    // ===== INITIALIZE (MCP Handshake) =====
    if (method === "initialize") {
      return res.json({
        jsonrpc: "2.0",
        id: id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "ESPN-NCAA MCP Server",
            version: "3.0.0",
          },
        },
      });
    }

    // ===== TOOL DISCOVERY =====
    if (method === "tools/list") {
      return res.json({
        jsonrpc: "2.0",
        id: id,
        result: {
          tools: [
            // ESPN TOOLS
            {
              name: "get_score",
              description:
                "Get current or most recent game score for a specific team. Returns live score if game is in progress, or final score from most recent completed game.",
              inputSchema: {
                type: "object",
                properties: {
                  team: {
                    type: "string",
                    description:
                      'Team name (e.g., "oklahoma", "texas", "alabama")',
                  },
                  sport: {
                    type: "string",
                    description: 'Sport type (default: "football")',
                    enum: ["football", "basketball", "baseball"],
                  },
                },
                required: ["team"],
              },
            },
            {
              name: "get_schedule",
              description:
                "Get upcoming schedule for a specific team, including game dates, opponents, locations, and broadcast info.",
              inputSchema: {
                type: "object",
                properties: {
                  team: {
                    type: "string",
                    description: "Team name",
                  },
                  sport: {
                    type: "string",
                    description: 'Sport type (default: "football")',
                  },
                  limit: {
                    type: "number",
                    description:
                      "Number of games to return (default: 5, max: 20)",
                  },
                },
                required: ["team"],
              },
            },
            {
              name: "get_scoreboard",
              description:
                "Get scoreboard showing all games for a given date across all teams. Shows live scores and final scores.",
              inputSchema: {
                type: "object",
                properties: {
                  sport: {
                    type: "string",
                    description: 'Sport type (default: "football")',
                  },
                  date: {
                    type: "string",
                    description:
                      "Date in YYYYMMDD format (default: today, ESPN time zone)",
                  },
                },
                required: [],
              },
            },
            {
              name: "get_rankings",
              description:
                "Get current AP Top 25 or Coaches Poll rankings for a given sport.",
              inputSchema: {
                type: "object",
                properties: {
                  sport: {
                    type: "string",
                    description: 'Sport type (default: "football")',
                  },
                  poll: {
                    type: "string",
                    description:
                      'Poll type: "ap" (AP Top 25) or "coaches" (default: "ap")',
                  },
                },
                required: [],
              },
            },
            {
              name: "get_game_player_stats",
              description:
                "Get detailed per-game player statistics for a specific ESPN event (game). Returns passing, rushing, receiving, defensive, and special teams stats by team and player.",
              inputSchema: {
                type: "object",
                properties: {
                  eventId: {
                    type: "string",
                    description:
                      'ESPN event ID for the game (e.g., "401752675").',
                  },
                },
                required: ["eventId"],
              },
            },

            // NCAA TOOLS (Multi-division)
            {
              name: "get_ncaa_scoreboard",
              description:
                "Get NCAA scoreboard for any sport and any division (FBS, FCS, Division II, Division III).",
              inputSchema: {
                type: "object",
                properties: {
                  sport: {
                    type: "string",
                    description:
                      'Sport (e.g., "football", "basketball", "baseball", "softball")',
                  },
                  division: {
                    type: "string",
                    description:
                      'Division: "fbs", "fcs", "d2", "d3" (default: "fbs")',
                  },
                  date: {
                    type: "string",
                    description:
                      "Date in YYYYMMDD format (default: today, NCAA time zone)",
                  },
                },
                required: ["sport"],
              },
            },
            {
              name: "get_ncaa_rankings",
              description:
                "Get NCAA poll rankings for any sport and division (e.g., football AP poll, basketball rankings).",
              inputSchema: {
                type: "object",
                properties: {
                  sport: {
                    type: "string",
                    description: "Sport name",
                  },
                  division: {
                    type: "string",
                    description:
                      'Division: "fbs", "fcs", "d2", "d3" (default: "fbs")',
                  },
                  poll: {
                    type: "string",
                    description:
                      'Poll type: "ap", "coaches", "playoff" (default: "ap")',
                  },
                },
                required: ["sport"],
              },
            },
          ],
        },
      });
    }

    // ===== TOOL CALLS =====
    if (method === "tools/call") {
      const { name, arguments: args } = params;

      if (!name) {
        return res.json({
          jsonrpc: "2.0",
          error: {
            code: -32602,
            message: "Invalid params: tool name is required",
          },
          id: id,
        });
      }

      console.log(`Tool call: ${name}`, args);

      // Route to appropriate handler
      let result;

      try {
        switch (name) {
          // ESPN TOOLS
          case "get_score":
            result = await handleGetScore(args);
            break;
          case "get_schedule":
            result = await handleGetSchedule(args);
            break;
          case "get_scoreboard":
            result = await handleGetScoreboard(args);
            break;
          case "get_rankings":
            result = await handleGetRankings(args);
            break;
          case "get_game_player_stats":
            result = await handleGetGamePlayerStats(args);
            break;

          // NCAA TOOLS
          case "get_ncaa_scoreboard":
            result = await handleGetNCAAScoreboard(args);
            break;
          case "get_ncaa_rankings":
            result = await handleGetNCAAankings(args);
            break;

          default:
            return res.json({
              jsonrpc: "2.0",
              error: {
                code: -32601,
                message: `Unknown tool: ${name}. Use tools/list to see available tools.`,
              },
              id: id,
            });
        }

        // Return successful result
        return res.json({
          jsonrpc: "2.0",
          id: id,
          result: {
            content: [
              {
                type: "text",
                text:
                  typeof result === "string"
                    ? result
                    : JSON.stringify(result, null, 2),
              },
            ],
          },
        });
      } catch (error) {
        console.error(`Tool ${name} error:`, error);
        return res.json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: `Tool execution failed: ${error.message}`,
          },
          id: id,
        });
      }
    }

    // ===== NOTIFICATIONS =====
    if (method === "notifications/initialized") {
      // Client is notifying server that initialization is complete
      // No response needed for notifications
      return res.status(204).send();
    }

    // Unknown method
    return res.json({
      jsonrpc: "2.0",
      error: {
        code: -32601,
        message: `Method not found: ${method}`,
      },
      id: id,
    });
  } catch (error) {
    console.error("MCP endpoint error:", error);
    return res.json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal error",
        data: error.message,
      },
      id: req.body?.id || null,
    });
  }
});

/**
 * TOOL HANDLERS - ESPN
 */

async function handleGetScore(args) {
  const { team, sport = "football" } = args;
  const result = await getCurrentGame(team, sport);

  if (result.error) {
    return result.message;
  }

  const game = result.game;
  let text = `${game.name}\n`;
  text += `${game.status}`;

  if (game.isLive) {
    text += ` - ${game.period}Q ${game.clock}\n`;
  } else {
    text += `\n`;
  }

  text += `\n${game.awayTeam.name} (${game.awayTeam.record}): ${
    game.awayTeam.score?.displayValue ||
    game.awayTeam.score?.value ||
    game.awayTeam.score
  }`;
  text += `\n${game.homeTeam.name} (${game.homeTeam.record}): ${
    game.homeTeam.score?.displayValue ||
    game.homeTeam.score?.value ||
    game.homeTeam.score
  }`;

  if (game.venue) {
    text += `\n\nVenue: ${game.venue}`;
  }
  if (game.broadcast) {
    text += `\nTV: ${game.broadcast}`;
  }

  return text;
}

async function handleGetSchedule(args) {
  const { team, sport = "football", limit = 5 } = args;
  const result = await getTeamSchedule(team, sport, limit);

  if (result.error) {
    return result.message;
  }

  let text = `Upcoming Schedule for ${result.team}:\n\n`;

  result.games.forEach((game, i) => {
    text += `${i + 1}. ${game.time}\n`;
    text += `   vs ${game.opponent} (${game.location})\n`;
    if (game.venue) {
      text += `   ${game.venue}\n`;
    }
    if (game.broadcast) {
      text += `   TV: ${game.broadcast}\n`;
    }
    text += `\n`;
  });

  return text;
}

async function handleGetScoreboard(args) {
  const { sport = "football", date } = args;
  const result = await getScoreboard(sport, date);

  if (result.error) {
    return result.message;
  }

  let text = `Scoreboard for ${result.date}:\n\n`;

  result.games.forEach((game) => {
    text += `${game.awayTeam.name} ${game.awayTeam.score} @ ${game.homeTeam.name} ${game.homeTeam.score}`;
    text += ` - ${game.status}`;
    if (game.isLive) {
      text += ` (${game.period}Q ${game.clock})`;
    }
    text += `\n`;
  });

  return text;
}

async function handleGetRankings(args) {
  const { sport = "football", poll = "ap" } = args;
  const result = await getRankings(sport, poll);

  if (result.error) {
    return result.message;
  }

  let text = `${result.poll} - Week ${result.week}\n\n`;

  result.teams.slice(0, 25).forEach((team) => {
    text += `${team.rank}. ${team.team} (${team.record})`;
    if (team.points) {
      text += ` - ${team.points} pts`;
    }
    text += `\n`;
  });

  return text;
}

async function handleGetGamePlayerStats(args) {
  const { eventId } = args;

  if (!eventId) {
    return "Missing required argument: eventId";
  }

  console.log(`handleGetGamePlayerStats called: eventId=${eventId}`);

  const result = await getGamePlayerStats(eventId);

  if (result.error) {
    console.log(`getGamePlayerStats returned error: ${result.message}`);
    return result.message;
  }

  // You can either return raw structured JSON or a nicely formatted summary.
  // For MCP, we typically return structured data (so the model can format it).
  return result;
}

/**
 * TOOL HANDLERS - NCAA
 */

async function handleGetNCAAScoreboard(args) {
  const { sport, division = "fbs", date } = args;
  const result = await getNCAAScoreboard(sport, division, date);

  if (result.error) {
    return result.message;
  }

  let text = `${result.sport.toUpperCase()} ${
    result.division
  } Scoreboard (${result.date}):\n\n`;

  result.games.forEach((game) => {
    text += `${game.awayTeam.name} ${game.awayTeam.score} @ ${game.homeTeam.name} ${game.homeTeam.score}`;
    text += ` - ${game.status}`;
    if (game.isLive) {
      text += ` (${game.period}Q ${game.clock})`;
    }
    text += `\n`;
  });

  return text;
}

async function handleGetNCAAankings(args) {
  const { sport, division = "fbs", poll = "ap" } = args;
  const result = await getNCAAankings(sport, division, poll);

  if (result.error) {
    return result.message;
  }

  let text = `${result.sport.toUpperCase()} ${result.division} - ${
    result.poll
  }\n`;
  text += `Week ${result.week}, Season ${result.season}\n\n`;

  result.teams.slice(0, 25).forEach((team) => {
    text += `${team.rank}. ${team.team} (${team.record})`;
    if (team.points) {
      text += ` - ${team.points} pts`;
    }
    text += `\n`;
  });

  return text;
}

/**
 * UTILITY ENDPOINTS
 */

// Clear all caches
app.post("/clear-cache", (req, res) => {
  clearESPNCache();
  clearNCAACache();

  res.json({
    message: "All caches cleared successfully",
    timestamp: new Date().toISOString(),
  });
});

/**
 * ERROR HANDLING
 */
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    availableEndpoints: {
      "POST /mcp": "MCP JSON-RPC 2.0 endpoint (requires Bearer token)",
      "GET /": "Server information",
      "GET /health": "Health check",
      "POST /clear-cache": "Clear all caches",
    },
  });
});

app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({ error: "Internal server error" });
});

/**
 * SELF-PING KEEPALIVE — Prevent Railway from idling the container
 * Pings the server's own /health endpoint every 30 seconds.
 */
const KEEPALIVE_URL =
  process.env.KEEPALIVE_URL || `http://localhost:${PORT}/health`;

setInterval(async () => {
  try {
    const res = await fetch(KEEPALIVE_URL);
    await res.text();
    console.log(`[KEEPALIVE] Ping OK: ${KEEPALIVE_URL}`);
  } catch (err) {
    console.log(`[KEEPALIVE] Ping FAILED: ${KEEPALIVE_URL}`);
  }
}, 30000); // every 30 seconds

/**
 * START SERVER
 */
app.listen(PORT, () => {
  console.log("=".repeat(60));
  console.log("ESPN MCP SERVER - FULLY INTEGRATED (ESPN + NCAA ONLY)");
  console.log("=".repeat(60));
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`MCP endpoint:  http://localhost:${PORT}/mcp (POST with Bearer)`);
  console.log("=".repeat(60));
  console.log("Data Sources:");
  console.log("  ✓ ESPN API (scores, schedules, rankings, game player stats)");
  console.log("  ✓ NCAA API (multi-division coverage)");
  console.log("=".repeat(60));
  console.log("7 Tools Available:");
  console.log(
    "  ESPN: get_score, get_schedule, get_scoreboard, get_rankings, get_game_player_stats"
  );
  console.log("  NCAA: get_ncaa_scoreboard, get_ncaa_rankings");
  console.log("=".repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log("=".repeat(60));
});


