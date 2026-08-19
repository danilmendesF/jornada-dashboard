import https from 'https';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL;

export function fetchUrl(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 JornadaBot/2.1'
      }
    }, (res) => {
      if (res.statusCode >= 400) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

export function getPreviousDaySp(refDate = new Date()) {
  // Format current date in America/Sao_Paulo
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const todaySpStr = formatter.format(refDate); // YYYY-MM-DD
  const [year, month, day] = todaySpStr.split('-').map(Number);
  
  // Date in UTC representing midnight SP
  const targetDate = new Date(Date.UTC(year, month - 1, day));
  targetDate.setUTCDate(targetDate.getUTCDate() - 1);
  
  const prevYear = targetDate.getUTCFullYear();
  const prevMonth = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const prevDay = String(targetDate.getUTCDate()).padStart(2, '0');
  
  return `${prevYear}-${prevMonth}-${prevDay}`;
}

export function parseCompletedTournaments(listHtml, targetDateSp) {
  const regex = /<tr\s+data-date="([^"]+)"\s+data-name="([^"]+)"\s+data-organizer="([^"]+)"\s+data-format="([^"]+)"\s+data-players="([^"]+)"\s+data-winner="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g;
  
  const eligible = [];
  let match;
  
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  while ((match = regex.exec(listHtml)) !== null) {
    const [_, dateStr, name, org, fmt, playersStr, winnerCode, rowHtml] = match;
    const players = parseInt(playersStr, 10);
    
    // Strict eligibility filters:
    // 1. players > 150 (strictly greater than 150)
    // 2. format === '4' (Standard)
    if (players > 150 && fmt === '4') {
      const dt = new Date(dateStr);
      const dateSpDay = formatter.format(dt);
      
      if (dateSpDay === targetDateSp) {
        const urlMatch = rowHtml.match(/href="(\/tournament\/[^\/]+\/standings)"/);
        const tourId = urlMatch ? urlMatch[1].split('/')[2] : 'N/A';
        
        eligible.push({
          id: tourId,
          name: name.trim(),
          organizer: org.trim(),
          players,
          dateUtc: dateStr,
          dateSpDay,
          url: `https://play.limitlesstcg.com/tournament/${tourId}/standings`
        });
      }
    }
  }
  
  return eligible;
}

export function parseStandingsWinner(standingsHtml, tourInfo) {
  const winner = {
    tournament: tourInfo.name,
    tournamentId: tourInfo.id,
    tournamentUrl: tourInfo.url,
    players: tourInfo.players,
    player: 'N/A',
    deck: 'Deck não identificado',
    icons: [],
    decklistUrl: null
  };

  const firstRowMatch = standingsHtml.match(/<tr\s+data-placing="1"[^>]*>([\s\S]*?)<\/tr>/);
  if (firstRowMatch) {
    const row = firstRowMatch[1];
    const nameM = firstRowMatch[0].match(/data-name="([^"]+)"/);
    const deckM = row.match(/<a\s+href="[^"]*metagame\/[^"]*"[^>]*>(?:<span\s+data-tooltip="([^"]+)")?/);
    const icons = Array.from(row.matchAll(/src="(https:\/\/r2\.limitlesstcg\.net\/pokemon\/[^"]+)"/g)).map(m => m[1]);
    const decklistM = row.match(/href="(\/tournament\/[^"]+\/decklist)"/);
    
    winner.player = nameM ? nameM[1].trim() : 'N/A';
    winner.deck = (deckM && deckM[1]) ? deckM[1].trim() : 'Deck não identificado';
    winner.icons = icons;
    winner.decklistUrl = decklistM ? `https://play.limitlesstcg.com${decklistM[1]}` : null;
  }
  
  return winner;
}

export function parseTournamentMetagame(metaHtml) {
  const decks = [];
  const deckRows = Array.from(metaHtml.matchAll(/<tr\s+data-share="([^"]*)"[^>]*>([\s\S]*?)<\/tr>/g));
  
  for (const [_, shareAttr, row] of deckRows) {
    const countM = row.match(/<td>(\d+)<\/td>/);
    const nameM = row.match(/<a\s+href="[^"]*metagame\/[^"]*">([^<]+)<\/a>/);
    const icons = Array.from(row.matchAll(/src="(https:\/\/r2\.limitlesstcg\.net\/pokemon\/[^"]+)"/g)).map(m => m[1]);
    
    if (countM && nameM) {
      decks.push({
        name: nameM[1].trim(),
        players: parseInt(countM[1], 10),
        icons
      });
    }
  }
  
  return decks;
}

export function aggregateTournamentData(tournaments, championsList, metagameListByTour, targetDateSp) {
  let totalPlayers = 0;
  const deckMap = {};

  tournaments.forEach((t, idx) => {
    totalPlayers += t.players;
    const tourDecks = metagameListByTour[idx] || [];
    
    tourDecks.forEach(d => {
      if (!deckMap[d.name]) {
        deckMap[d.name] = {
          name: d.name,
          players: 0,
          wins: 0,
          icons: d.icons || []
        };
      }
      deckMap[d.name].players += d.players;
      if (d.icons && d.icons.length > 0 && deckMap[d.name].icons.length === 0) {
        deckMap[d.name].icons = d.icons;
      }
    });
  });

  // Tally wins from champions
  championsList.forEach(c => {
    if (c.deck && c.deck !== 'Deck não identificado') {
      if (deckMap[c.deck]) {
        deckMap[c.deck].wins += 1;
      } else {
        const foundKey = Object.keys(deckMap).find(k => k.toLowerCase() === c.deck.toLowerCase());
        if (foundKey) {
          deckMap[foundKey].wins += 1;
        } else {
          deckMap[c.deck] = {
            name: c.deck,
            players: 0,
            wins: 1,
            icons: c.icons || []
          };
        }
      }
    }
  });

  const sortedDecks = Object.values(deckMap).sort((a, b) => b.players - a.players);
  
  const topDecks = sortedDecks.slice(0, 6).map(d => ({
    name: d.name,
    players: d.players,
    metaShare: totalPlayers > 0 ? Number(((d.players / totalPlayers) * 100).toFixed(1)) : 0,
    wins: d.wins,
    icons: d.icons
  }));

  const top6Players = topDecks.reduce((acc, d) => acc + d.players, 0);
  const otherPlayers = Math.max(0, totalPlayers - top6Players);
  const otherShare = totalPlayers > 0 ? Number(((otherPlayers / totalPlayers) * 100).toFixed(1)) : 0;

  const [y, m, d] = targetDateSp.split('-');
  const displayDate = `${d}/${m}/${y}`;

  return {
    date: targetDateSp,
    displayDate,
    timezone: 'America/Sao_Paulo',
    minPlayersFilter: 150,
    totalTournaments: tournaments.length,
    totalPlayers,
    topDecks,
    other: {
      players: otherPlayers,
      metaShare: otherShare
    },
    champions: championsList,
    tournaments,
    generatedAt: new Date().toISOString()
  };
}

export default async function handler(req, res) {
  // CORS & Security headers for same-origin
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const requestedDate = req.query?.date;
  const targetDateSp = (requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate))
    ? requestedDate
    : getPreviousDaySp();

  const cacheKey = `tournaments-meta:${targetDateSp}`;

  // 1. Try Redis Cache
  let redisClient = null;
  if (REDIS_URL) {
    try {
      redisClient = createClient({ url: REDIS_URL });
      await redisClient.connect();
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.cached = true;
        await redisClient.disconnect();
        return res.status(200).json(parsed);
      }
    } catch (e) {
      console.warn('[Redis Cache Warning]', e.message);
    }
  }

  // 2. Fetch and Aggregate from Limitless
  try {
    const listHtml = await fetchUrl('https://play.limitlesstcg.com/tournaments/completed?game=PTCG');
    const eligibleTournaments = parseCompletedTournaments(listHtml, targetDateSp);

    const championsList = [];
    const metagameList = [];

    // Fetch details sequentially to avoid excessive concurrency
    for (const t of eligibleTournaments) {
      try {
        const standingsHtml = await fetchUrl(`https://play.limitlesstcg.com/tournament/${t.id}/standings`);
        championsList.push(parseStandingsWinner(standingsHtml, t));
      } catch (err) {
        championsList.push({
          tournament: t.name,
          tournamentId: t.id,
          tournamentUrl: t.url,
          players: t.players,
          player: 'N/A',
          deck: 'Deck não identificado',
          icons: [],
          decklistUrl: null
        });
      }

      try {
        const metaHtml = await fetchUrl(`https://play.limitlesstcg.com/tournament/${t.id}/metagame`);
        metagameList.push(parseTournamentMetagame(metaHtml));
      } catch (err) {
        metagameList.push([]);
      }
    }

    const payload = aggregateTournamentData(eligibleTournaments, championsList, metagameList, targetDateSp);
    payload.cached = false;

    // Save to Redis (TTL = 48 hours = 172800 seconds)
    if (redisClient && redisClient.isOpen) {
      try {
        await redisClient.setEx(cacheKey, 172800, JSON.stringify(payload));
      } catch (err) {
        console.warn('[Redis Set Error]', err.message);
      }
    }

    return res.status(200).json(payload);
  } catch (error) {
    console.error('[Tournaments Meta Fetch Error]', error);
    
    // Fallback response without crashing
    const [y, m, d] = targetDateSp.split('-');
    return res.status(200).json({
      date: targetDateSp,
      displayDate: `${d}/${m}/${y}`,
      timezone: 'America/Sao_Paulo',
      minPlayersFilter: 150,
      totalTournaments: 0,
      totalPlayers: 0,
      topDecks: [],
      other: { players: 0, metaShare: 0 },
      champions: [],
      tournaments: [],
      error: 'Não foi possível atualizar os dados do Meta neste momento.',
      generatedAt: new Date().toISOString()
    });
  } finally {
    if (redisClient && redisClient.isOpen) {
      await redisClient.disconnect();
    }
  }
}
