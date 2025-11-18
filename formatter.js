/**
 * RESPONSE FORMATTER
 * Converts ESPN API data into conversational, bot-friendly responses
 */

/**
 * Format game data into conversational response
 */
export function formatGameResponse(game) {
  if (!game) {
    return "I couldn't find any game information right now.";
  }
  
  const { status, homeTeam, awayTeam, venue, broadcast, odds } = game;
  
  // Live game
  if (status.state === 'in') {
    return formatLiveGame(game);
  }
  
  // Completed game
  if (status.state === 'post') {
    return formatCompletedGame(game);
  }
  
  // Upcoming game
  if (status.state === 'pre') {
    return formatUpcomingGame(game);
  }
  
  return "Game status unknown.";
}

/**
 * Format live game
 */
function formatLiveGame(game) {
  const { homeTeam, awayTeam, status } = game;
  
  const homeScore = parseInt(homeTeam.score) || 0;
  const awayScore = parseInt(awayTeam.score) || 0;
  
  const leader = homeScore > awayScore ? homeTeam : awayTeam;
  const trailer = homeScore > awayScore ? awayTeam : homeTeam;
  const leaderScore = Math.max(homeScore, awayScore);
  const trailerScore = Math.min(homeScore, awayScore);
  
  let response = `🔴 LIVE: ${formatTeamName(leader)} is `;
  
  if (leaderScore === trailerScore) {
    response = `🔴 LIVE: ${formatTeamName(homeTeam)} and ${formatTeamName(awayTeam)} are tied ${homeScore}-${awayScore}`;
  } else if (leaderScore - trailerScore > 20) {
    response += `dominating ${formatTeamName(trailer)} ${leaderScore}-${trailerScore}`;
  } else if (leaderScore - trailerScore > 10) {
    response += `leading ${formatTeamName(trailer)} ${leaderScore}-${trailerScore}`;
  } else {
    response += `up ${leaderScore}-${trailerScore} over ${formatTeamName(trailer)}`;
  }
  
  if (status.period && status.clock) {
    response += ` in the ${getOrdinal(status.period)} quarter`;
    if (status.clock !== '0:00') {
      response += `, ${status.clock} remaining`;
    }
  } else if (status.detail) {
    response += ` (${status.detail})`;
  }
  
  response += '!';
  
  return response;
}

/**
 * Format completed game
 */
function formatCompletedGame(game) {
  const { homeTeam, awayTeam, status } = game;
  
  const homeScore = parseInt(homeTeam.score) || 0;
  const awayScore = parseInt(awayTeam.score) || 0;
  
  const winner = homeScore > awayScore ? homeTeam : awayTeam;
  const loser = homeScore > awayScore ? awayTeam : homeTeam;
  const winnerScore = Math.max(homeScore, awayScore);
  const loserScore = Math.min(homeScore, awayScore);
  
  const margin = winnerScore - loserScore;
  
  let response = `✅ FINAL: ${formatTeamName(winner)} `;
  
  if (margin > 30) {
    response += `crushed`;
  } else if (margin > 20) {
    response += `dominated`;
  } else if (margin > 10) {
    response += `defeated`;
  } else if (margin > 3) {
    response += `beat`;
  } else {
    response += `edged`;
  }
  
  response += ` ${formatTeamName(loser)} ${winnerScore}-${loserScore}`;
  
  if (status.detail?.includes('OT') || status.detail?.includes('Overtime')) {
    response += ' in overtime';
  }
  
  response += '!';
  
  // Add venue if home team lost (indicate road win)
  if (loser.name === homeTeam.name && game.venue?.city) {
    response += ` Great road win in ${game.venue.city}!`;
  }
  
  return response;
}

/**
 * Format upcoming game
 */
function formatUpcomingGame(game) {
  const { homeTeam, awayTeam, date, venue, broadcast, odds } = game;
  
  const gameDate = new Date(date);
  const now = new Date();
  const daysUntil = Math.floor((gameDate - now) / (1000 * 60 * 60 * 24));
  
  let response = `📅 UPCOMING: ${formatTeamName(awayTeam)} at ${formatTeamName(homeTeam)}`;
  
  // Date/time
  if (daysUntil === 0) {
    response += ` TODAY at ${gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`;
  } else if (daysUntil === 1) {
    response += ` TOMORROW at ${gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`;
  } else if (daysUntil < 7) {
    response += ` on ${gameDate.toLocaleDateString('en-US', { weekday: 'long' })} at ${gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`;
  } else {
    response += ` on ${gameDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at ${gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`;
  }
  
  // Location
  if (venue?.city && venue?.state) {
    response += ` in ${venue.city}, ${venue.state}`;
  }
  
  // TV broadcast
  if (broadcast) {
    response += ` on ${broadcast}`;
  }
  
  // Rankings and records
  const details = [];
  if (awayTeam.rank && homeTeam.rank) {
    details.push(`#${awayTeam.rank} vs #${homeTeam.rank}`);
  } else if (awayTeam.rank) {
    details.push(`#${awayTeam.rank} ${awayTeam.abbreviation}`);
  } else if (homeTeam.rank) {
    details.push(`#${homeTeam.rank} ${homeTeam.abbreviation}`);
  }
  
  if (awayTeam.record || homeTeam.record) {
    details.push(`Records: ${awayTeam.record || '?'} vs ${homeTeam.record || '?'}`);
  }
  
  if (details.length > 0) {
    response += `. ${details.join(', ')}`;
  }
  
  // Betting odds
  if (odds?.spread) {
    response += ` (Spread: ${odds.spread})`;
  }
  
  return response;
}

/**
 * Format schedule list
 */
export function formatScheduleResponse(schedule, limit = 5) {
  if (!schedule || !schedule.events || schedule.events.length === 0) {
    return `No games found in the schedule.`;
  }
  
  const teamName = schedule.team?.displayName || 'Team';
  let response = `📅 ${teamName} Schedule:\n\n`;
  
  const upcomingGames = schedule.events
    .filter(event => event.status?.type?.state === 'pre')
    .slice(0, limit);
  
  upcomingGames.forEach((event, index) => {
    const game = parseGameForDisplay(event);
    response += `${index + 1}. ${game}\n`;
  });
  
  if (upcomingGames.length === 0) {
    response += 'No upcoming games scheduled.';
  }
  
  return response;
}

/**
 * Format scoreboard (multiple games)
 */
export function formatScoreboardResponse(scoreboard) {
  if (!scoreboard || !scoreboard.events || scoreboard.events.length === 0) {
    return `No games today.`;
  }
  
  let response = `🏈 Today's ${scoreboard.sport} Games:\n\n`;
  
  scoreboard.events.forEach((game, index) => {
    const summary = formatGameResponse(game);
    response += `${index + 1}. ${summary}\n`;
  });
  
  return response;
}

/**
 * Format rankings
 */
export function formatRankingsResponse(rankings, topN = 10) {
  if (!rankings || !rankings.rankings || rankings.rankings.length === 0) {
    return `No rankings available.`;
  }
  
  const apPoll = rankings.rankings.find(r => r.name?.includes('AP') || r.type === 'AP');
  
  if (!apPoll || !apPoll.teams) {
    return `No AP Poll rankings available.`;
  }
  
  let response = `🏆 ${rankings.sport} AP Top ${topN}:\n\n`;
  
  apPoll.teams.slice(0, topN).forEach(team => {
    response += `${team.rank}. ${team.team} (${team.record})`;
    if (team.points) {
      response += ` - ${team.points} pts`;
    }
    response += '\n';
  });
  
  return response;
}

/**
 * Helper: Format team name with rank if applicable
 */
function formatTeamName(team) {
  if (team.rank) {
    return `#${team.rank} ${team.name}`;
  }
  return team.name;
}

/**
 * Helper: Get ordinal suffix (1st, 2nd, 3rd, 4th)
 */
function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Helper: Parse game for display in schedule
 */
function parseGameForDisplay(event) {
  const competition = event.competitions?.[0];
  const homeTeam = competition?.competitors?.find(c => c.homeAway === 'home');
  const awayTeam = competition?.competitors?.find(c => c.homeAway === 'away');
  
  const date = new Date(event.date);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  
  let display = `${awayTeam?.team?.abbreviation} at ${homeTeam?.team?.abbreviation}`;
  display += ` - ${dateStr} at ${timeStr}`;
  
  if (competition?.broadcasts?.[0]?.names?.[0]) {
    display += ` (${competition.broadcasts[0].names[0]})`;
  }
  
  return display;
}
