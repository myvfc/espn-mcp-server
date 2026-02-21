/**
 * XSEN NIL Rules Engine
 * Add this file to your espn-mcp-server on Railway.
 * Import and call startRulesEngine() from your index.js
 *
 * Watches live ESPN scores and fires NIL prompts to Supabase
 * when trigger conditions are met.
 *
 * Environment variables required (set in Railway):
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 */

import { getCurrentGame } from "./espn-api.js";

// ── SCHOOL CONFIG ─────────────────────────────────────────────────────────────
// Set enabled: true when a school has an active NIL partner.
// Flip to false to disable without touching any other code.

const SCHOOL_CONFIG = {
  sooners: {
    enabled: true,
    espn_team: "oklahoma",
    nil_url: process.env.NIL_URL_SOONERS || "https://xsen.fun",
    cooldown_minutes: 15,
  },
  cowboys: {
    enabled: false, // flip to true when OSU NIL partner signed
    espn_team: "oklahoma state",
    nil_url: process.env.NIL_URL_COWBOYS || "",
    cooldown_minutes: 15,
  },
  longhorns: {
    enabled: false, // flip to true when Texas NIL partner signed
    espn_team: "texas",
    nil_url: process.env.NIL_URL_LONGHORNS || "",
    cooldown_minutes: 15,
  },
};

// ── TRIGGER MESSAGES ──────────────────────────────────────────────────────────

function buildMessage(trigger, teamName) {
  const messages = {
    touchdown: `${teamName} just scored! Support the athletes making these moments happen.`,
    lead_change: `${teamName} just took the lead! Back the team when it matters most.`,
    comeback: `${teamName} came back from behind. This team never quits — support them.`,
    close_game: `${teamName} in a battle — within one score in the 4th. Rally behind them.`,
    win: `${teamName} wins! Celebrate by supporting the athletes who delivered.`,
    demo: `⚡ DEMO: This is how a live NIL moment looks during a game. Support your athletes!`,
  };
  return messages[trigger] || `${teamName} moment — support your athletes.`;
}

// ── GAME STATE TRACKER ────────────────────────────────────────────────────────
// Tracks previous score per school to detect changes

const gameState = {};
const lastFiredAt = {};

function canFire(school, cooldownMinutes) {
  const last = lastFiredAt[school];
  if (!last) return true;
  const elapsed = (Date.now() - last) / 1000 / 60;
  return elapsed >= cooldownMinutes;
}

function recordFire(school) {
  lastFiredAt[school] = Date.now();
}

// ── SUPABASE INSERT ───────────────────────────────────────────────────────────

export async function fireNilTrigger(school, trigger, message, nilUrl) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[NIL Engine] Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    return;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/nil_prompt_queue`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          school: school,
          triggered_by: trigger,
          message: message,
          nil_url: nilUrl,
        }),
      }
    );

    if (response.ok) {
      console.log(`[NIL Engine] ✓ Fired ${trigger} for ${school}`);
      recordFire(school);
    } else {
      const err = await response.text();
      console.error(`[NIL Engine] Supabase insert failed: ${err}`);
    }
  } catch (err) {
    console.error(`[NIL Engine] Network error: ${err.message}`);
  }
}

// ── SCORE ANALYSIS ────────────────────────────────────────────────────────────

function getTeamScore(game, espnTeam) {
  const name = espnTeam.toLowerCase();
  const home = game.homeTeam?.name?.toLowerCase() || "";
  const away = game.awayTeam?.name?.toLowerCase() || "";

  if (home.includes(name) || name.includes(home.split(" ").pop())) {
    return {
      myScore: parseInt(game.homeTeam?.score?.displayValue || game.homeTeam?.score?.value || 0),
      oppScore: parseInt(game.awayTeam?.score?.displayValue || game.awayTeam?.score?.value || 0),
      myName: game.homeTeam?.name,
    };
  } else {
    return {
      myScore: parseInt(game.awayTeam?.score?.displayValue || game.awayTeam?.score?.value || 0),
      oppScore: parseInt(game.homeTeam?.score?.displayValue || game.homeTeam?.score?.value || 0),
      myName: game.awayTeam?.name,
    };
  }
}

async function checkSchool(school, config) {
  if (!config.enabled) return;

  try {
    const result = await getCurrentGame(config.espn_team, "football");

    if (result.error || !result.game) return;

    const game = result.game;

    // Only process live games
    if (!game.isLive) return;

    const { myScore, oppScore, myName } = getTeamScore(game, config.espn_team);
    const prev = gameState[school];

    // First time seeing this game — just store state, don't fire
    if (!prev) {
      gameState[school] = { myScore, oppScore, period: game.period };
      console.log(`[NIL Engine] ${school} game detected: ${myScore}-${oppScore}`);
      return;
    }

    // Skip if score unchanged
    if (myScore === prev.myScore && oppScore === prev.oppScore) return;

    const teamName = myName || config.espn_team;
    const cooldown = config.cooldown_minutes;

    // ── TRIGGER DETECTION ──

    // Touchdown — our score increased by 6, 7, or 8
    const scoreDiff = myScore - prev.myScore;
    if (scoreDiff >= 6 && scoreDiff <= 8 && canFire(school, cooldown)) {
      await fireNilTrigger(school, "touchdown", buildMessage("touchdown", teamName), config.nil_url);

    // Comeback — we were trailing, now leading
    } else if (prev.myScore < prev.oppScore && myScore > oppScore && canFire(school, cooldown)) {
      await fireNilTrigger(school, "comeback", buildMessage("comeback", teamName), config.nil_url);

    // Lead change — we just took the lead (but not a comeback from behind by 2+ scores)
    } else if (prev.myScore <= prev.oppScore && myScore > oppScore && canFire(school, cooldown)) {
      await fireNilTrigger(school, "lead_change", buildMessage("lead_change", teamName), config.nil_url);

    // Close game — within 7 in 4th quarter
    } else if (
      game.period >= 4 &&
      Math.abs(myScore - oppScore) <= 7 &&
      canFire(school, cooldown * 2)
    ) {
      await fireNilTrigger(school, "close_game", buildMessage("close_game", teamName), config.nil_url);
    }

    // Update state
    gameState[school] = { myScore, oppScore, period: game.period };

  } catch (err) {
    console.error(`[NIL Engine] Error checking ${school}: ${err.message}`);
  }
}

// ── WIN DETECTION ─────────────────────────────────────────────────────────────

const firedWin = {};

async function checkWin(school, config) {
  if (!config.enabled) return;

  try {
    const result = await getCurrentGame(config.espn_team, "football");
    if (result.error || !result.game) return;

    const game = result.game;
    const isFinal = game.status?.toLowerCase().includes("final");

    if (!isFinal || firedWin[school]) return;

    const { myScore, oppScore, myName } = getTeamScore(game, config.espn_team);

    if (myScore > oppScore) {
      firedWin[school] = true;
      const teamName = myName || config.espn_team;
      await fireNilTrigger(school, "win", buildMessage("win", teamName), config.nil_url);
    }

  } catch (err) {
    console.error(`[NIL Engine] Win check error for ${school}: ${err.message}`);
  }
}

// Reset win flags daily at midnight
function scheduleWinReset() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight - now;

  setTimeout(() => {
    Object.keys(firedWin).forEach(k => delete firedWin[k]);
    Object.keys(gameState).forEach(k => delete gameState[k]);
    console.log("[NIL Engine] Win flags and game state reset at midnight.");
    setInterval(() => {
      Object.keys(firedWin).forEach(k => delete firedWin[k]);
      Object.keys(gameState).forEach(k => delete gameState[k]);
    }, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
}

// ── START ─────────────────────────────────────────────────────────────────────

export function startRulesEngine() {
  console.log("[NIL Engine] Starting XSEN NIL Rules Engine...");

  const enabledSchools = Object.entries(SCHOOL_CONFIG)
    .filter(([, c]) => c.enabled)
    .map(([s]) => s);

  console.log(`[NIL Engine] Monitoring: ${enabledSchools.join(", ") || "none (all disabled)"}`);

  // Poll every 30 seconds
  setInterval(async () => {
    for (const [school, config] of Object.entries(SCHOOL_CONFIG)) {
      await checkSchool(school, config);
      await checkWin(school, config);
    }
  }, 30000);

  scheduleWinReset();
  console.log("[NIL Engine] Running — polling every 30 seconds.");
}

