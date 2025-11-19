// espn-player.js
// ESPN per–game player stats from the public summary API

import fetch from "node-fetch";

/**
 * Fetch JSON from a URL with basic error handling.
 */
async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "BoomerBot/1.0 (ESPN MCP Server)"
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ESPN request failed ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Get per-game player stats for a given ESPN event ID.
 *
 * @param {string|number} eventId - ESPN event id (e.g. 401752675)
 * @returns {Promise<object>} structured player stats by team & category
 */
export async function getGamePlayerStats(eventId) {
  if (!eventId) {
    throw new Error("eventId is required");
  }

  // ESPN summary endpoint (college football)
  const url = `https://site.web.api.espn.com/apis/common/v3/sports/football/college-football/summary?event=${eventId}`;

  const data = await fetchJson(url);

  if (!data || !data.boxscore || !data.boxscore.players) {
    throw new Error("No boxscore player data returned from ESPN");
  }

  // data.boxscore.players is an array of team-level player groups
  // Structure we will normalize:
  // [
  //   {
  //     team: { id, name, abbreviation },
  //     statistics: [
  //       {
  //         name: "passing",
  //         labels: [...],
  //         athletes: [
  //           {
  //             athlete: { id, displayName, jersey, position },
  //             stats: ["10-18", "212", "2", "1", ...]
  //           },
  //           ...
  //         ]
  //       },
  //       ...
  //     ]
  //   },
  //   ...
  // ]

  const result = {
    eventId: String(eventId),
    teams: []
  };

  for (const teamBlock of data.boxscore.players) {
    const teamInfo = {
      id: teamBlock.team?.id,
      name: teamBlock.team?.displayName || teamBlock.team?.name,
      abbreviation: teamBlock.team?.abbreviation,
      statistics: {}
    };

    for (const statGroup of teamBlock.statistics || []) {
      const categoryName = statGroup.name || statGroup.displayName || "unknown";
      const labels = statGroup.labels || [];
      const players = [];

      for (const athleteRow of statGroup.athletes || []) {
        const a = athleteRow.athlete || {};
        const statsArray = athleteRow.stats || [];

        const statObject = {};
        labels.forEach((label, idx) => {
          statObject[label] = statsArray[idx] ?? null;
        });

        players.push({
          id: a.id,
          name: a.displayName,
          jersey: a.jersey,
          position: a.position?.abbreviation || a.position?.displayName,
          rawStats: statsArray,
          stats: statObject
        });
      }

      teamInfo.statistics[categoryName] = {
        labels,
        players
      };
    }

    result.teams.push(teamInfo);
  }

  return result;
}
