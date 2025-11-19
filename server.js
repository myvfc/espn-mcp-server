/**
 * ESPN MCP SERVER
 * Multi-source sports data API combining ESPN, CFBD, and NCAA
 * JSON-RPC 2.0 compliant MCP endpoint
 * Created by Kevin - The Botosphere
 */

import express from 'express';
import cors from 'cors';
import { 
  getCurrentGame, 
  getTeamSchedule, 
  getScoreboard, 
  getRankings,
  clearCache as clearESPNCache
} from './espn-api.js';
import {
  getRecruiting,
  getTeamTalent,
  getAdvancedStats,
  getBettingLines,
  getSPRatings,
  getTeamRecords,
  clearCFBDCache
} from './cfbd-api.js';
import {
  getNCAAScoreboad,
  getNCAAankings,
  clearNCAACache
} from './ncaa-api.js';
import {
  formatGameResponse,
  formatScheduleResponse,
  formatScoreboardResponse,
  formatRankingsResponse
} from './formatter.js';

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
 * ROOT ENDPOINT
 */
app.get('/', (req, res) => {
  res.json({
    name: 'ESPN MCP Server',
    version: '2.0.2',
    description: 'Multi-source college sports data API with video support',
    sources: ['ESPN', 'CFBD', 'NCAA'],
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

/**
 * HEALTH CHECK
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * MCP ENDPOINT - JSON-RPC 2.0
 */
app.post('/mcp', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = process.env.MCP_API_KEY || 'default-key-change-me';
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Missing authorization' },
        id: req.body?.id || null
      });
    }
    
    const token = authHeader.substring(7);
    if (token !== apiKey) {
      return res.json({
        jsonrpc: '2.0',
        error: { code: -32002, message: 'Invalid API key' },
        id: req.body?.id || null
      });
    }
    
    const { jsonrpc, method, params = {}, id } = req.body;
    
    if (method && method.startsWith('notifications/')) {
      console.log('Ignoring notification:', method);
      return res.status(200).end();
    }
    
    if (jsonrpc !== '2.0') {
      return res.json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request' },
        id: id || null
      });
    }
    
    if (!method) {
      return res.json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Method required' },
        id: id || null
      });
    }
    
    console.log(`JSON-RPC: ${method}`, params);
    
    // INITIALIZE
    if (method === 'initialize') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'espn-mcp-server',
            version: '2.0.2',
            description: 'College sports data API with video support'
          },
          capabilities: { tools: {} }
        }
      });
    }
    
    /**
     *  TOOLS/LIST — with NEW VIDEO TOOL
     */
    if (method === 'tools/list' || method === 'listTools') {
      return res.json({
        jsonrpc: '2.0',
        result: {
          tools: [
            {
              name: 'get_score',
              description: 'Get current or recent game score',
              inputSchema: {
                type: 'object',
                properties: {
                  team: { type: 'string', default: 'oklahoma' },
                  sport: { type: 'string', default: 'football' }
                }
              }
            },
            {
              name: 'get_schedule',
              description: 'Get team schedule',
              inputSchema: {
                type: 'object',
                properties: {
                  team: { type: 'string', default: 'oklahoma' },
                  sport: { type: 'string', default: 'football' },
                  limit: { type: 'number', default: 5 }
                }
              }
            },
            {
              name: 'get_scoreboard',
              description: 'Get today\'s games',
              inputSchema: {
                type: 'object',
                properties: {
                  sport: { type: 'string', default: 'football' }
                }
              }
            },
            {
              name: 'get_rankings',
              description: 'Get AP Top 25 rankings',
              inputSchema: {
                type: 'object',
                properties: {
                  sport: { type: 'string', default: 'football' }
                }
              }
            },
            {
              name: 'get_recruiting',
              description: 'Get recruiting rankings',
              inputSchema: {
                type: 'object',
                properties: {
                  team: { type: 'string', default: 'oklahoma' },
                  year: { type: 'number' }
                }
              }
            },
            {
              name: 'get_talent',
              description: 'Get team talent rating',
              inputSchema: {
                type: 'object',
                properties: {
                  team: { type: 'string', default: 'oklahoma' },
                  year: { type: 'number' }
                }
              }
            },
            {
              name

