// stats.js
import axios from "axios";

async function getTraditionalStats(team, year) {
  const base = "https://api.collegefootballdata.com";

  const headers = {
    Authorization: `Bearer ${process.env.CFBD_API_KEY}`,
  };

  try {
    // ---- 1. SEASON TEAM STATS ----
    const seasonRes = await axios.get(`${base}/stats/season`, {
      params: { year, team },
      headers
    });
    const seasonStats = seasonRes.data || [];

    // ---- 2. TEAM GAME-BY-GAME STATS ----
    const teamGamesRes = await axios.get(`${base}/games/teams`, {
      params: { year, team },
      headers
    });
    const teamGameStats = teamGamesRes.data || [];

    // ---- 3. PLAYER GAME-BY-GAME STATS ----
    const playerGamesRes = await axios.get(`${base}/games/players`, {
      params: { year, team },
      headers
    });
    const playerGameStats = playerGamesRes.data || [];

    // ---- 4. AGGREGATE PLAYER SEASON TOTALS ----
    const seasonPlayerTotals = {};

    for (const game of playerGameStats) {
      if (!game.teams) continue;

      for (const t of game.teams) {
        if (t.school !== team) continue;

        for (const player of t.players) {
          const name = player.name;
          if (!seasonPlayerTotals[name]) {
            seasonPlayerTotals[name] = { name, categories: {} };
          }

          for (const stat of player.stats) {
            const category = stat.category || player.statCategory;
            const statName = stat.stat;
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
      season_player_totals: seasonPlayerTotals
    };

  } catch (err) {
    console.error("CFBD Traditional Stats Error:", err.response?.data || err);
    throw new Error("Failed to fetch traditional stats");
  }
}

export { getTraditionalStats };

