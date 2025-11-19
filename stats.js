// stats.js
import axios from "axios";

const base = "https://api.collegefootballdata.com";

// Simple in-memory cache for traditional stats
// key: `${team.toLowerCase()}_${year}`
const traditionalCache = new Map();
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function makeKey(team, year) {
  return `${team.toLowerCase()}_${year}`;
}

function isFresh(entry) {
  if (!entry) return false;
  return Date.now() - entry.timestamp < TTL_MS;
}

// Fetch full traditional stats (season, games, players, player_totals)
async function fetchFullTraditionalStats(team, year) {
  const headers = {
    Authorization: `Bearer ${process.env.CFBD_API_KEY}`,
  };

  // 1) Season team stats
  const seasonRes = await axios.get(`${base}/stats/season`, {
    params: { year, team },
    headers,
  });
  const seasonStats = seasonRes.data || [];

  // 2) Team game-by-game stats
  const teamGamesRes = await axios.get(`${base}/games/teams`, {
    params: { year, team },
    headers,
  });
  const teamGameStats = teamGamesRes.data || [];

  // 3) Player game-by-game stats
  const playerGamesRes = await axios.get(`${base}/games/players`, {
    params: { year, team },
    headers,
  });
  const playerGameStats = playerGamesRes.data || [];

  // 4) Aggregate player season totals
  const seasonPlayerTotals = {};

  for (const game of playerGameStats) {
    if (!game.teams) continue;

    for (const t of game.teams) {
      if (!t.school) continue;
      if (t.school.toLowerCase() !== team.toLowerCase()) continue;

      if (!Array.isArray(t.players)) continue;

      for (const player of t.players) {
        const name = player.name || "Unknown Player";

        if (!seasonPlayerTotals[name]) {
          seasonPlayerTotals[name] = {
            name,
            categories: {},
          };
        }

        if (!Array.isArray(player.stats)) continue;

        for (const stat of player.stats) {
          const category = stat.category || player.statCategory || "unknown";
          const statName = stat.stat || "value";
          const value = Number(stat.value) || 0;

          if (!seasonPlayerTotals[name].categories[category]) {
            seasonPlayerTotals[name].categories[category] = {};
          }

          if (!seasonPlayerTotals[name].categories[category][statName]) {
            seasonPlayerTotals[name].categories[category][statName] = 0;
          }

          seasonPlayerTotals[name].categories[category][statName] += value;
        }
      }
    }
  }

  return {
    team,
    year,
    season_team_stats: seasonStats,
    games_team: teamGameStats,
    games_players: playerGameStats,
    season_player_totals: seasonPlayerTotals,
  };
}

/**
 * Main entry: getTraditionalStats(team, year, subset)
 *
 * subset can be:
 *  - "season"
 *  - "game_team"
 *  - "game_players"
 *  - "player_totals"
 *  - "all" (default, returns everything)
 */
async function getTraditionalStats(team, year, subset = "all") {
  if (!team) {
    throw new Error("Team is required for traditional stats");
  }

  const key = makeKey(team, year || new Date().getFullYear());

  try {
    let entry = traditionalCache.get(key);

    if (!isFresh(entry)) {
      const data = await fetchFullTraditionalStats(team, year);
      entry = { timestamp: Date.now(), data };
      traditionalCache.set(key, entry);
    }

    const full = entry.data;

    // Return only what was requested
    switch (subset) {
      case "season":
        return {
          team: full.team,
          year: full.year,
          season_team_stats: full.season_team_stats,
        };

      case "game_team":
        return {
          team: full.team,
          year: full.year,
          games_team: full.games_team,
        };

      case "game_players":
        return {
          team: full.team,
          year: full.year,
          games_players: full.games_players,
        };

      case "player_totals":
        return {
          team: full.team,
          year: full.year,
          season_player_totals: full.season_player_totals,
        };

      case "all":
      default:
        return full;
    }
  } catch (err) {
    console.error("CFBD Traditional Stats Error:", err.response?.data || err);
    throw new Error("Failed to fetch traditional stats");
  }
}

function clearTraditionalStatsCache() {
  traditionalCache.clear();
  console.log("Traditional stats cache cleared");
}

export { getTraditionalStats, clearTraditionalStatsCache };
