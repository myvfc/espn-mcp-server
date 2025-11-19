#!/usr/bin/env node

import http from 'http';
import https from 'https';
import { URL } from 'url';

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
      html: `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" title="${this.escapeHtml(title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`
    };
  }

  static generateVimeoEmbed(videoId, title = "Video") {
    return {
      type: "vimeo",
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      html: `<iframe src="https://player.vimeo.com/video/${videoId}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="${this.escapeHtml(title)}"></iframe>`,
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
      html: `<video width="640" height="360" controls><source src="${this.escapeHtml(url)}" type="${videoType}">Your browser does not support the video tag.</video>`,
      watchUrl: url
    };
  }

  static escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
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
      html: `<a href="${this.escapeHtml(url)}" target="_blank">${this.escapeHtml(title)}</a>`,
      watchUrl: url
    };
  }
}

// ESPN API Handler
class ESPNHandler {
  constructor() {
    this.baseUrl = "https://site.api.espn.com/apis/site/v2/sports";
  }

  async fetch(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
      }).on('error', reject);
    });
  }

  async getSchedule(sport = "football", league = "college-football", teamId = null) {
    try {
      const url = teamId 
        ? `${this.baseUrl}/${sport}/${league}/teams/${teamId}/schedule`
        : `${this.baseUrl}/${sport}/${league}/scoreboard`;
      
      return await this.fetch(url);
    } catch (error) {
      throw new Error(`ESPN API Error: ${error.message}`);
    }
  }

  async getTeamInfo(sport = "football", league = "college-football", teamId) {
    try {
      const url = `${this.baseUrl}/${sport}/${league}/teams/${teamId}`;
      return await this.fetch(url);
    } catch (error) {
      throw new Error(`ESPN API Error: ${error.message}`);
    }
  }

  async getScores(sport = "football", league = "college-football") {
    try {
      const url = `${this.baseUrl}/${sport}/${league}/scoreboard`;
      return await this.fetch(url);
    } catch (error) {
      throw new Error(`ESPN API Error: ${error.message}`);
    }
  }
}

// Video Database Handler
class VideoDatabase {
  constructor() {
    this.videos = [];
  }

  async loadVideos(videos) {
    this.videos = videos.map(video => ({
      ...video,
      embed: VideoEmbedGenerator.generateEmbed(video.url, video.title)
    }));
    console.error(`Loaded ${this.videos.length} videos into database`);
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

  getAllVideos() {
    return this.videos;
  }
}

// Initialize handlers
const espnHandler = new ESPNHandler();
const videoDatabase = new VideoDatabase();

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

// Request handler
async function handleRequest(method, path, params) {
  try {
    switch (path) {
      case '/search_videos': {
        const query = params.query;
        const limit = params.limit || 10;
        const includeEmbed = params.include_embed !== false;
        
        const results = videoDatabase.searchVideos(query, limit);
        const formattedResults = formatVideoResults(results, includeEmbed);

        return {
          success: true,
          data: {
            query,
            count: formattedResults.length,
            videos: formattedResults
          }
        };
      }

      case '/get_recent_videos': {
        const limit = params.limit || 10;
        const includeEmbed = params.include_embed !== false;
        
        const results = videoDatabase.getRecentVideos(limit);
        const formattedResults = formatVideoResults(results, includeEmbed);

        return {
          success: true,
          data: {
            count: formattedResults.length,
            videos: formattedResults
          }
        };
      }

      case '/get_videos_by_category': {
        const category = params.category;
        const limit = params.limit || 10;
        const includeEmbed = params.include_embed !== false;
        
        const results = videoDatabase.getVideosByCategory(category, limit);
        const formattedResults = formatVideoResults(results, includeEmbed);

        return {
          success: true,
          data: {
            category,
            count: formattedResults.length,
            videos: formattedResults
          }
        };
      }

      case '/get_all_videos': {
        const includeEmbed = params.include_embed !== false;
        const results = videoDatabase.getAllVideos();
        const formattedResults = formatVideoResults(results, includeEmbed);

        return {
          success: true,
          data: {
            count: formattedResults.length,
            videos: formattedResults
          }
        };
      }

      case '/get_espn_schedule': {
        const sport = params.sport || "football";
        const league = params.league || "college-football";
        const teamId = params.team_id;
        
        const data = await espnHandler.getSchedule(sport, league, teamId);

        return {
          success: true,
          data
        };
      }

      case '/get_espn_scores': {
        const sport = params.sport || "football";
        const league = params.league || "college-football";
        
        const data = await espnHandler.getScores(sport, league);

        return {
          success: true,
          data
        };
      }

      case '/load_video_database': {
        const videos = params.videos;
        await videoDatabase.loadVideos(videos);

        return {
          success: true,
          data: {
            message: `Loaded ${videos.length} videos into database`,
            videosLoaded: videos.length
          }
        };
      }

      case '/health':
      case '/':
        return {
          success: true,
          data: {
            status: 'running',
            name: 'ESPN Video Server',
            version: '1.0.0',
            videosLoaded: videoDatabase.getAllVideos().length,
            endpoints: [
              '/search_videos',
              '/get_recent_videos',
              '/get_videos_by_category',
              '/get_all_videos',
              '/get_espn_schedule',
              '/get_espn_scores',
              '/load_video_database',
              '/health'
            ]
          }
        };

      default:
        return {
          success: false,
          error: `Unknown endpoint: ${path}`
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Create HTTP server
const PORT = process.env.PORT || 3000;
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (req.method === 'GET') {
    // GET requests with query parameters
    const params = Object.fromEntries(url.searchParams);
    const result = await handleRequest('GET', path, params);
    
    res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result, null, 2));
  } else if (req.method === 'POST') {
    // POST requests with JSON body
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const params = JSON.parse(body);
        const result = await handleRequest('POST', path, params);
        
        res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result, null, 2));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON body' }));
      }
    });
  } else {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
  }
});

server.listen(PORT, () => {
  console.log(`ESPN Video Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  POST /load_video_database - Load videos from JSON`);
  console.log(`  GET  /search_videos?query=... - Search videos`);
  console.log(`  GET  /get_recent_videos?limit=10 - Get recent videos`);
  console.log(`  GET  /get_videos_by_category?category=... - Get by category`);
  console.log(`  GET  /get_all_videos - Get all videos`);
  console.log(`  GET  /get_espn_schedule?team_id=201 - Get ESPN schedule`);
  console.log(`  GET  /get_espn_scores - Get ESPN scores`);
  console.log(`  GET  /health - Server health check`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
