/**
 * XSEN NIL Rules Engine — v3
 * Detects live ESPN game events and writes to nil_event_queue for admin review.
 * Admin approves before anything fires to fans.
 *
 * Environment variables required (set in Railway):
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 */

import { getCurrentGame } from "./espn-api.js";

// ── SCHOOL CONFIG ─────────────────────────────────────────────────────────────

const SCHOOL_CONFIG = {
  sooners: {
    enabled: true,
    espn_team: "oklahoma",
    nil_url: process.env.NIL_URL_SOONERS || "https://xsen.fun",
    cooldown_minutes: 15,
  },
  cowboys: {
    enabled: false,
    espn_team: "oklahoma state",
    nil_url: process.env.NIL_URL_COWBOYS || "https://xsen.fun",
    cooldown_minutes: 15,
  },
  longhorns: {
    enabled: false,
    espn_team: "texas",
    nil_url: process.env.NIL_URL_LONGHORNS || "https://xsen.fun",
    cooldown_minutes: 15,
  },
};

// ── SUGGESTED MESSAGES ────────────────────────────────────────────────────────

function buildMessage(trigger, teamName) {
  const messages = {
    touchdown:   `${teamName} just scored! Support the athletes making these moments happen.`,
    lead_change: `${teamName} just took the lead! Back the team when it matters most.`,
    comeback:    `${teamName} came back from behind. This team never quits — support them.`,
    close_game:  `${teamName} in a battle — within one score in the 4th. Rally behind them.`,
    win:         `${teamName} wins! Celebrate by supporting the athletes who delivered.`,
  };
  return messages[trigger] || `${teamName} moment — support your athletes.`;
}

// ── GAME STATE ────────────────────────────────────────────────────────────────

const gameState  = {};
const lastFiredAt = {};
const firedWin   = {};

function canFire(school, cooldownMinutes) {
  const last = lastFiredAt[school];
  if (!last) return true;
  return (Date.now() - last) / 1000 / 60 >= cooldownMinutes;
}

function recordFire(school) {
  lastFiredAt[school] = Date.now();
}

// ── SUPABASE — write to nil_event_queue (suggested, not yet sent to fans) ─────

export async function fireNilTrigger(school, trigger, message, nilUrl) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[NIL Engine] Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/nil_prompt_queue`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "apikey":        supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer":        "return=minimal",
      },
      body: JSON.stringify({ school, triggered_by: trigger, message, nil_url: nilUrl }),
    });

    if (response.ok) {
      console.log(`[NIL Engine] ✓ Fired ${trigger} for ${school}`);
      recordFire(school);
    } else {
      console.error(`[NIL Engine] Supabase insert failed: ${await response.text()}`);
    }
  } catch (err) {
    console.error(`[NIL Engine] Network error: ${err.message}`);
  }
}

async function suggestNilEvent(school, trigger, message, nilUrl, context) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[NIL Engine] Missing Supabase credentials");
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/nil_event_queue`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "apikey":        supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer":        "return=minimal",
      },
      body: JSON.stringify({
        school,
        trigger,
        message,
        nil_url:    nilUrl,
        context,
        status:     "pending",
        created_at: new Date().toISOString(),
      }),
    });

    if (response.ok) {
      console.log(`[NIL Engine] ✓ Suggested ${trigger} for ${school} — awaiting admin approval`);
      recordFire(school);
    } else {
      console.error(`[NIL Engine] Suggest failed: ${await response.text()}`);
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
      myScore:  parseInt(game.homeTeam?.score?.displayValue || game.homeTeam?.score?.value || 0),
      oppScore: parseInt(game.awayTeam?.score?.displayValue || game.awayTeam?.score?.value || 0),
      myName:   game.homeTeam?.name,
      oppName:  game.awayTeam?.name,
    };
  } else {
    return {
      myScore:  parseInt(game.awayTeam?.score?.displayValue || game.awayTeam?.score?.value || 0),
      oppScore: parseInt(game.homeTeam?.score?.displayValue || game.homeTeam?.score?.value || 0),
      myName:   game.awayTeam?.name,
      oppName:  game.homeTeam?.name,
    };
  }
}

async function checkSchool(school, config) {
  if (!config.enabled) return;

  try {
    const result = await getCurrentGame(config.espn_team, "football");
    if (result.error || !result.game) return;

    const game = result.game;
    if (!game.isLive) return;

    const { myScore, oppScore, myName, oppName } = getTeamScore(game, config.espn_team);
    const prev = gameState[school];

    if (!prev) {
      gameState[school] = { myScore, oppScore, period: game.period };
      console.log(`[NIL Engine] ${school} game detected: ${myScore}-${oppScore}`);
      return;
    }

    if (myScore === prev.myScore && oppScore === prev.oppScore) return;

    const teamName = myName || config.espn_team;
    const cooldown = config.cooldown_minutes;
    const context  = `${teamName} ${myScore} — ${oppName || "Opponent"} ${oppScore} | Q${game.period}`;
    const scoreDiff = myScore - prev.myScore;

    if (scoreDiff >= 6 && scoreDiff <= 8 && canFire(school, cooldown)) {
      await suggestNilEvent(school, "touchdown", buildMessage("touchdown", teamName), config.nil_url, context);

    } else if (prev.myScore < prev.oppScore && myScore > oppScore && canFire(school, cooldown)) {
      await suggestNilEvent(school, "comeback", buildMessage("comeback", teamName), config.nil_url, context);

    } else if (prev.myScore <= prev.oppScore && myScore > oppScore && canFire(school, cooldown)) {
      await suggestNilEvent(school, "lead_change", buildMessage("lead_change", teamName), config.nil_url, context);

    } else if (game.period >= 4 && Math.abs(myScore - oppScore) <= 7 && canFire(school, cooldown * 2)) {
      await suggestNilEvent(school, "close_game", buildMessage("close_game", teamName), config.nil_url, context);
    }

    gameState[school] = { myScore, oppScore, period: game.period };

  } catch (err) {
    console.error(`[NIL Engine] Error checking ${school}: ${err.message}`);
  }
}

async function checkWin(school, config) {
  if (!config.enabled) return;

  try {
    const result = await getCurrentGame(config.espn_team, "football");
    if (result.error || !result.game) return;

    const game    = result.game;
    const isFinal = game.status?.toLowerCase().includes("final");
    if (!isFinal || firedWin[school]) return;

    const { myScore, oppScore, myName, oppName } = getTeamScore(game, config.espn_team);

    if (myScore > oppScore) {
      firedWin[school]   = true;
      const teamName     = myName || config.espn_team;
      const context      = `Final: ${teamName} ${myScore} — ${oppName || "Opponent"} ${oppScore}`;
      await suggestNilEvent(school, "win", buildMessage("win", teamName), config.nil_url, context);
    }
  } catch (err) {
    console.error(`[NIL Engine] Win check error for ${school}: ${err.message}`);
  }
}

function scheduleWinReset() {
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  setTimeout(() => {
    Object.keys(firedWin).forEach(k => delete firedWin[k]);
    Object.keys(gameState).forEach(k => delete gameState[k]);
    console.log("[NIL Engine] State reset at midnight.");
    setInterval(() => {
      Object.keys(firedWin).forEach(k => delete firedWin[k]);
      Object.keys(gameState).forEach(k => delete gameState[k]);
    }, 24 * 60 * 60 * 1000);
  }, midnight - new Date());
}

// ── START ─────────────────────────────────────────────────────────────────────

export function startRulesEngine() {
  console.log("[NIL Engine] Starting XSEN NIL Rules Engine v3...");
  console.log("[NIL Engine] Mode: Suggest-only — admin approves before fan delivery");

  const enabled = Object.entries(SCHOOL_CONFIG)
    .filter(([, c]) => c.enabled).map(([s]) => s);

  console.log(`[NIL Engine] Monitoring: ${enabled.join(", ") || "none"}`);

  setInterval(async () => {
    for (const [school, config] of Object.entries(SCHOOL_CONFIG)) {
      await checkSchool(school, config);
      await checkWin(school, config);
    }
  }, 30000);

  scheduleWinReset();
  console.log("[NIL Engine] Running — polling every 30 seconds.");
}
