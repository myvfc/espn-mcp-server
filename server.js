#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// Video URL parsers and embed generators
class VideoEmbedGenerator {
  static getYouTubeId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  static getVimeoId(url) {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? match[1] : null;
  }

  static generateYouTubeEmbed(videoId, title = "Video") {
    return {
      type: "youtube",
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      html: `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" title="${title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`
    };
  }

  static generateVimeoEmbed(videoId, title = "Video") {
    return {
      type: "vimeo",
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      html: `<iframe src="https://player.vimeo.com/video/${videoId}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="${title}"></iframe>`,
      watchUrl: `https://vimeo.com/${videoId}`
    };
  }

  static generateDirectVideoEmbed(url, title = "Video") {
    const extension = url.split('.').pop().toLowerCase();
    const videoType = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'ogg': 'video/ogg',
      'mov': 'video/mp4'
    }[extension] || 'video/mp4';

    return {
      type: "direct",
      embedUrl: url,
      html: `<video width="640" height="360" controls><source src="${url}" type="${videoType}">Your browser does not support the video tag.</video>`,
      watchUrl: url
    };
  }

  static generateEmbed(url, title = "Video") {
    // Check for YouTube
    const youtubeId = this.getYouTubeId(url);
    if (youtubeId) {
      return this.generateYouTubeEmbed(youtubeId, title);
    }

    // Check for Vimeo
    const vimeoId = this.getVimeoId(url);
    if (vimeoId) {
      return this.generateVimeoEmbed(vimeoId, title);
    }

    // Check for direct video files
    if (/\.(mp4|webm|ogg|mov)$/i.test(url)) {
      return this.generateDirectVideoEmbed(url, title);
    }

    // Fallback: return link only
    return {
      type: "link",
      embedUrl: url,
      html: `<a href="${url}" target="_blank">${title}</a>`,
      watchUrl: url
    };
  }
}

// ESPN API Handler
class ESPNHandler {
  constructor() {
    this.baseUrl = "https://site.api.espn.com/apis/site/v2/sports";
  }

  async getSchedule(sport = "football", league = "college-football", teamId = null) {
    try {
      const url = teamId 
        ? `${this.baseUrl}/${sport}/${league}/teams/${teamId}/schedule`
        : `${this.baseUrl}/${sport}/${league}/scoreboard`;
      
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      throw new Error(`ESPN API Error: ${error.message}`);
    }
  }

  async getTeamInfo(sport = "football", league = "college-football", teamId) {
    try {
      const url = `${this.baseUrl}/${sport}/${league}/teams/${teamId}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      throw new Error(`ESPN API Error: ${error.message}`);
    }
  }

  async getScores(sport = "football", league = "college-football") {
    try {
      const url = `${this.baseUrl}/${sport}/${league}/scoreboard`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      throw new Error(`ESPN API Error: ${error.message}`);
    }
  }
}

// Video Database Handler (for your OU Sooners videos)
class VideoDatabase {
  constructor() {
    this.videos = [];
  }

  // Load videos from your data source (Supabase, CSV, etc.)
  async loadVideos(videos) {
    this.videos = videos.map(video => ({
      ...video,
      embed: VideoEmbedGenerator.generateEmbed(video.url, video.title)
    }));
  }

  searchVideos(query, limit = 10) {
    const searchTerms = query.toLowerCase().split(' ');
    const results = this.videos
      .filter(video => {
        const searchText = `${video.title} ${video.description || ''}`.toLowerCase();
        return searchTerms.some(term => searchText.includes(term));
      })
      .slice(0, limit);

    return results;
  }

  getVideosByCategory(category, limit = 10) {
    return this.videos
      .filter(video => video.category?.toLowerCase() === category.toLowerCase())
      .slice(0, limit);
  }

  getRecentVideos(limit = 10) {
    return this.videos
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
      .slice(0, limit);
  }
}

// Initialize handlers
const espnHandler = new ESPNHandler();
const videoDatabase = new VideoDatabase();

// Create MCP Server
const server = new Server(
  {
    name: "espn-video-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Format video results with embeds
function formatVideoResults(videos, includeEmbed = true) {
  return videos.map(video => {
    const result = {
      title: video.title,
      description: video.description || "No description available",
      url: video.url,
      publishedAt: video.publishedAt,
      category: video.category,
      duration: video.duration,
      views: video.views,
    };

    if (includeEmbed && video.embed) {
      result.embed = {
        type: video.embed.type,
        html: video.embed.html,
        embedUrl: video.embed.embedUrl,
        thumbnailUrl: video.embed.thumbnailUrl,
        watchUrl: video.embed.watchUrl
      };
    }

    return result;
  });
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_videos",
        description: "Search for Oklahoma Sooners videos. Returns videos with embedded players that can be displayed directly in the chat.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (e.g., 'Billy Sims', '2000 Nebraska game', 'highlights')",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default: 10)",
              default: 10,
            },
            include_embed: {
              type: "boolean",
              description: "Include video embed HTML (default: true)",
              default: true,
            }
          },
          required: ["query"],
        },
      },
      {
        name: "get_recent_videos",
        description: "Get the most recent Oklahoma Sooners videos with embedded players.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of recent videos to return (default: 10)",
              default: 10,
            },
            include_embed: {
              type: "boolean",
              description: "Include video embed HTML (default: true)",
              default: true,
            }
          },
        },
      },
      {
        name: "get_videos_by_category",
        description: "Get videos by category (highlights, full games, interviews, etc.) with embedded players.",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Video category (e.g., 'highlights', 'full-games', 'interviews', 'classic-games')",
            },
            limit: {
              type: "number",
              description: "Maximum number of results (default: 10)",
              default: 10,
            },
            include_embed: {
              type: "boolean",
              description: "Include video embed HTML (default: true)",
              default: true,
            }
          },
          required: ["category"],
        },
      },
      {
        name: "get_espn_schedule",
        description: "Get ESPN schedule for Oklahoma Sooners or other college football teams.",
        inputSchema: {
          type: "object",
          properties: {
            sport: {
              type: "string",
              description: "Sport type (default: 'football')",
              default: "football",
            },
            league: {
              type: "string",
              description: "League (default: 'college-football')",
              default: "college-football",
            },
            team_id: {
              type: "string",
              description: "ESPN Team ID (Oklahoma is '201')",
            }
          },
        },
      },
      {
        name: "get_espn_scores",
        description: "Get current scores and game information from ESPN.",
        inputSchema: {
          type: "object",
          properties: {
            sport: {
              type: "string",
              description: "Sport type (default: 'football')",
              default: "football",
            },
            league: {
              type: "string",
              description: "League (default: 'college-football')",
              default: "college-football",
            }
          },
        },
      },
      {
        name: "load_video_database",
        description: "Load videos from a JSON array into the searchable database. Use this to initialize or update the video collection.",
        inputSchema: {
          type: "object",
          properties: {
            videos: {
              type: "array",
              description: "Array of video objects with properties: title, url, description, publishedAt, category, duration, views",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  url: { type: "string" },
                  description: { type: "string" },
                  publishedAt: { type: "string" },
                  category: { type: "string" },
                  duration: { type: "string" },
                  views: { type: "number" }
                },
                required: ["title", "url"]
              }
            }
          },
          required: ["videos"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_videos": {
        const query = args.query;
        const limit = args.limit || 10;
        const includeEmbed = args.include_embed !== false;
        
        const results = videoDatabase.searchVideos(query, limit);
        const formattedResults = formatVideoResults(results, includeEmbed);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                query,
                count: formattedResults.length,
                videos: formattedResults
              }, null, 2),
            },
          ],
        };
      }

      case "get_recent_videos": {
        const limit = args.limit || 10;
        const includeEmbed = args.include_embed !== false;
        
        const results = videoDatabase.getRecentVideos(limit);
        const formattedResults = formatVideoResults(results, includeEmbed);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                count: formattedResults.length,
                videos: formattedResults
              }, null, 2),
            },
          ],
        };
      }

      case "get_videos_by_category": {
        const category = args.category;
        const limit = args.limit || 10;
        const includeEmbed = args.include_embed !== false;
        
        const results = videoDatabase.getVideosByCategory(category, limit);
        const formattedResults = formatVideoResults(results, includeEmbed);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                category,
                count: formattedResults.length,
                videos: formattedResults
              }, null, 2),
            },
          ],
        };
      }

      case "get_espn_schedule": {
        const sport = args.sport || "football";
        const league = args.league || "college-football";
        const teamId = args.team_id;
        
        const data = await espnHandler.getSchedule(sport, league, teamId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_espn_scores": {
        const sport = args.sport || "football";
        const league = args.league || "college-football";
        
        const data = await espnHandler.getScores(sport, league);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "load_video_database": {
        const videos = args.videos;
        await videoDatabase.loadVideos(videos);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: `Loaded ${videos.length} videos into database`,
                videosLoaded: videos.length
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error.message,
            tool: name
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ESPN Video MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
