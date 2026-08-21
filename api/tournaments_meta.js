import https from 'https';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL;

export function fetchUrl(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 JornadaBot/2.2'
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
    
    // Strict eligibility filters (SPEC-009 / CHG-007):
    // 1. players > 100 (strictly greater than 100)
    // 2. format === '4' (Standard)
    if (players > 100 && fmt === '4') {
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

export function parseStandingsTop3(standingsHtml, tourInfo) {
  const topPlacements = [];
  const rowRegex = /<tr\s+data-placing="(\d+)"[^>]*>([\s\S]*?)<\/tr>/g;
  let match;

  while ((match = rowRegex.exec(standingsHtml)) !== null) {
    const placing = parseInt(match[1], 10);
    if (placing > 3) continue;

    const row = match[2];
    const nameM = match[0].match(/data-name="([^"]+)"/);
    const deckM = row.match(/<a\s+href="[^"]*metagame\/[^"]*"[^>]*>(?:<span\s+data-tooltip="([^"]+)")?/);
    const icons = Array.from(row.matchAll(/src="(https:\/\/r2\.limitlesstcg\.net\/pokemon\/[^"]+)"/g)).map(m => m[1]);
    const decklistM = row.match(/href="(\/tournament\/[^"]+\/player\/[^"]+\/decklist|\/tournament\/[^"]+\/decklist)"/);

    topPlacements.push({
      placing,
      tournament: tourInfo.name,
      tournamentId: tourInfo.id,
      tournamentUrl: tourInfo.url,
      players: tourInfo.players,
      player: nameM ? nameM[1].trim() : 'N/A',
      deck: (deckM && deckM[1]) ? deckM[1].trim() : 'Deck não identificado',
      icons,
      decklistUrl: decklistM ? `https://play.limitlesstcg.com${decklistM[1]}` : null
    });
  }

  topPlacements.sort((a, b) => a.placing - b.placing);
  return topPlacements.slice(0, 3);
}

export function parseStandingsWinner(standingsHtml, tourInfo) {
  const top3 = parseStandingsTop3(standingsHtml, tourInfo);
  if (top3.length > 0) {
    return top3[0];
  }
  return {
    tournament: tourInfo.name,
    tournamentId: tourInfo.id,
    tournamentUrl: tourInfo.url,
    players: tourInfo.players,
    player: 'N/A',
    deck: 'Deck não identificado',
    icons: [],
    decklistUrl: null
  };
}

export function parseTournamentMetagame(metaHtml) {
  const decks = [];
  const deckRows = Array.from(metaHtml.matchAll(/<tr\s+data-share="([^"]*)"[^>]*>([\s\S]*?)<\/tr>/g));
  
  for (const [_, shareAttr, row] of deckRows) {
    const countM = row.match(/<td>(\d+)<\/td>/);
    const nameM = row.match(/<a\s+href="[^"]*metagame\/[^"]*">([^<]+)<\/a>/);
    const icons = Array.from(row.matchAll(/src="(https:\/\/r2\.limitlesstcg\.net\/pokemon\/[^"]+)"/g)).map(m => m[1]);
    
    // Parse match record e.g. "120-80-15" or <td>120-80-15</td> or data-record
    const recordM = row.match(/<td>(\d+)\s*[-–]\s*(\d+)(?:\s*[-–]\s*(\d+))?<\/td>/) || row.match(/data-record="(\d+)-(\d+)(?:-(\d+))?"/);
    const allPercentages = Array.from(row.matchAll(/<td>(\d+(?:\.\d+)?)\s*%<\/td>/g));

    let wins = 0;
    let losses = 0;
    let ties = 0;
    if (recordM) {
      wins = parseInt(recordM[1], 10);
      losses = parseInt(recordM[2], 10);
      ties = recordM[3] ? parseInt(recordM[3], 10) : 0;
    }
    const totalGames = wins + losses + ties;
    let winRate = 0;
    if (totalGames > 0) {
      winRate = Number(((wins / totalGames) * 100).toFixed(1));
    } else if (allPercentages.length >= 2) {
      winRate = parseFloat(allPercentages[1][1]);
    } else if (allPercentages.length === 1) {
      winRate = parseFloat(allPercentages[0][1]);
    }

    if (countM && nameM) {
      decks.push({
        name: nameM[1].trim(),
        players: parseInt(countM[1], 10),
        icons,
        matchWins: wins,
        matchLosses: losses,
        matchTies: ties,
        totalMatches: totalGames,
        winRate
      });
    }
  }
  
  return decks;
}

export function parseTournamentMatchups(matchupsHtml) {
  const matrix = {};
  if (!matchupsHtml || typeof matchupsHtml !== 'string') return matrix;
  
  const headerMatch = matchupsHtml.match(/<thead>[\s\S]*?<\/thead>/);
  const oppDecks = [];
  if (headerMatch) {
    const headerNames = Array.from(headerMatch[0].matchAll(/<th[^>]*>(?:<a[^>]*>)?([^<]+)(?:<\/a>)?<\/th>/g));
    headerNames.forEach(m => {
      const colName = m[1].trim();
      if (colName && colName !== 'Deck' && colName !== 'Archetype' && colName !== 'Total') {
        oppDecks.push(colName);
      }
    });
  }

  const rowMatches = Array.from(matchupsHtml.matchAll(/<tr[^>]*data-deck="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g));
  for (const [_, deckName, rowHtml] of rowMatches) {
    const dName = deckName.trim();
    if (!matrix[dName]) matrix[dName] = {};
    
    const cellMatches = Array.from(rowHtml.matchAll(/<td[^>]*data-score="([^"]*)"[^>]*>([\s\S]*?)<\/td>/g));
    cellMatches.forEach((cm, cIdx) => {
      const oppName = oppDecks[cIdx];
      if (!oppName) return;
      
      const scoreAttr = cm[1];
      const cellText = cm[2];
      const recM = cellText.match(/(\d+)\s*[-–]\s*(\d+)(?:\s*[-–]\s*(\d+))?/) || scoreAttr.match(/(\d+)-(\d+)(?:-(\d+))?/);
      const wrM = cellText.match(/(\d+(?:\.\d+)?)\s*%/);
      
      let w = 0, l = 0, t = 0;
      if (recM) {
        w = parseInt(recM[1], 10);
        l = parseInt(recM[2], 10);
        t = recM[3] ? parseInt(recM[3], 10) : 0;
      }
      const total = w + l + t;
      let wr = wrM ? parseFloat(wrM[1]) : (total > 0 ? Number(((w / total) * 100).toFixed(1)) : 0);
      
      matrix[dName][oppName] = {
        wins: w,
        losses: l,
        ties: t,
        total,
        winRate: wr
      };
    });
  }
  return matrix;
}

export function aggregateTournamentData(tournaments, championsList, metagameListByTour, targetDateSp, matchupsListByTour = [], top3ListByTour = []) {
  let declaredPlayers = 0;
  const deckMap = {};

  tournaments.forEach((t, idx) => {
    declaredPlayers += t.players;
    const tourDecks = metagameListByTour[idx] || [];
    
    tourDecks.forEach(d => {
      if (!deckMap[d.name]) {
        deckMap[d.name] = {
          name: d.name,
          players: 0,
          wins: 0,
          matchWins: 0,
          matchLosses: 0,
          matchTies: 0,
          totalMatches: 0,
          icons: d.icons || []
        };
      }
      deckMap[d.name].players += d.players;
      deckMap[d.name].matchWins += (d.matchWins || 0);
      deckMap[d.name].matchLosses += (d.matchLosses || 0);
      deckMap[d.name].matchTies += (d.matchTies || 0);
      deckMap[d.name].totalMatches += (d.totalMatches || (d.matchWins || 0) + (d.matchLosses || 0) + (d.matchTies || 0));

      if (d.icons && d.icons.length > 0 && deckMap[d.name].icons.length === 0) {
        deckMap[d.name].icons = d.icons;
      }
    });
  });

  // Tally titles/wins from champions
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
            matchWins: 0,
            matchLosses: 0,
            matchTies: 0,
            totalMatches: 0,
            icons: c.icons || []
          };
        }
      }
    }
  });

  const sortedDecks = Object.values(deckMap).sort((a, b) => b.players - a.players);
  const totalDeckPlayers = sortedDecks.reduce((acc, d) => acc + d.players, 0);
  const totalPlayers = Math.max(declaredPlayers, totalDeckPlayers);

  // Top 15 Decks no Meta Share (SPEC-009 / CHG-007)
  const topDecks = sortedDecks.slice(0, 15).map(d => {
    const totalM = d.totalMatches || (d.matchWins + d.matchLosses + d.matchTies);
    const wr = totalM > 0 ? Number(((d.matchWins / totalM) * 100).toFixed(1)) : 50.0;
    return {
      name: d.name,
      players: d.players,
      metaShare: totalPlayers > 0 ? Number(((d.players / totalPlayers) * 100).toFixed(1)) : 0,
      wins: d.wins,
      matchWins: d.matchWins,
      matchLosses: d.matchLosses,
      matchTies: d.matchTies,
      totalMatches: totalM,
      winRate: wr,
      icons: d.icons
    };
  });

  const otherDecks = sortedDecks.slice(15);
  const otherPlayers = otherDecks.reduce((acc, d) => acc + d.players, 0);
  const otherShare = totalPlayers > 0 ? Number(((otherPlayers / totalPlayers) * 100).toFixed(1)) : 0;

  // Aggregate Matchups Matrix across tournaments
  const aggregatedMatrix = {};
  const topDeckNames = topDecks.map(d => d.name);

  matchupsListByTour.forEach(tourMatrix => {
    if (!tourMatrix) return;
    for (const [deckA, opps] of Object.entries(tourMatrix)) {
      if (!aggregatedMatrix[deckA]) aggregatedMatrix[deckA] = {};
      for (const [deckB, stats] of Object.entries(opps)) {
        if (!aggregatedMatrix[deckA][deckB]) {
          aggregatedMatrix[deckA][deckB] = { wins: 0, losses: 0, ties: 0, total: 0, winRate: 0 };
        }
        aggregatedMatrix[deckA][deckB].wins += stats.wins || 0;
        aggregatedMatrix[deckA][deckB].losses += stats.losses || 0;
        aggregatedMatrix[deckA][deckB].ties += stats.ties || 0;
        aggregatedMatrix[deckA][deckB].total += stats.total || 0;
      }
    }
  });

  // Calculate final winRates in matrix
  for (const [dA, opps] of Object.entries(aggregatedMatrix)) {
    for (const [dB, stats] of Object.entries(opps)) {
      stats.winRate = stats.total > 0 ? Number(((stats.wins / stats.total) * 100).toFixed(1)) : 0;
    }
  }

  // Enrich tournaments with top 3
  const tournamentsEnriched = tournaments.map((t, idx) => {
    const top3 = (top3ListByTour && top3ListByTour[idx]) ? top3ListByTour[idx] : [];
    return {
      ...t,
      top3
    };
  });

  const [y, m, d] = targetDateSp.split('-');
  const displayDate = `${d}/${m}/${y}`;

  return {
    date: targetDateSp,
    displayDate,
    timezone: 'America/Sao_Paulo',
    minPlayersFilter: 100,
    totalTournaments: tournaments.length,
    totalPlayers,
    topDecks,
    other: {
      players: otherPlayers,
      metaShare: otherShare
    },
    matchupMatrix: aggregatedMatrix,
    champions: championsList,
    tournaments: tournamentsEnriched,
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

  const cacheKey = `tournaments-meta-v2:${targetDateSp}`;

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
    const top3List = [];
    const metagameList = [];
    const matchupsList = [];

    // Fetch details sequentially to avoid excessive concurrency
    for (const t of eligibleTournaments) {
      try {
        const standingsHtml = await fetchUrl(`https://play.limitlesstcg.com/tournament/${t.id}/standings`);
        const top3 = parseStandingsTop3(standingsHtml, t);
        top3List.push(top3);
        if (top3.length > 0) {
          championsList.push(top3[0]);
        } else {
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
      } catch (err) {
        top3List.push([]);
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

      try {
        const matchupsHtml = await fetchUrl(`https://play.limitlesstcg.com/tournament/${t.id}/matchups`);
        matchupsList.push(parseTournamentMatchups(matchupsHtml));
      } catch (err) {
        matchupsList.push({});
      }
    }

    const payload = aggregateTournamentData(eligibleTournaments, championsList, metagameList, targetDateSp, matchupsList, top3List);
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
      minPlayersFilter: 100,
      totalTournaments: 0,
      totalPlayers: 0,
      topDecks: [],
      other: { players: 0, metaShare: 0 },
      matchupMatrix: {},
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
