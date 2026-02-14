/* ============================================================
   MOCK DATA — Players, Clubs, Price History (Sorare MLS Data)
   Shared currency config + formatting utilities
   ============================================================ */

// --- MLS Season Config ---
const MLS_CURRENT_YEAR = new Date().getFullYear();

/**
 * Check if a team name belongs to an MLS club.
 */
function isMLSTeam(teamName) {
  return MLS_TEAM_NAMES.has(teamName);
}

/**
 * Format season year for display.
 * MLS teams: "2026" (single calendar year season)
 * Non-MLS teams: "25/26" (cross-year European season)
 */
function formatSeasonYear(year, teamName) {
  if (!year) return '—';
  if (isMLSTeam(teamName)) return String(year);
  const shortYear = String(year).slice(-2);
  const nextShort = String(year + 1).slice(-2);
  return shortYear + '/' + nextShort;
}

/**
 * Check if a card's season is "in-season".
 * MLS: in-season if seasonYear === current calendar year
 * Non-MLS: in-season if seasonYear === currentYear, OR
 *          seasonYear === currentYear - 1 AND we're before June
 */
function isInSeason(seasonYear, teamName) {
  if (isMLSTeam(teamName)) {
    return seasonYear === MLS_CURRENT_YEAR;
  }
  if (seasonYear === MLS_CURRENT_YEAR) return true;
  if (seasonYear === MLS_CURRENT_YEAR - 1 && new Date().getMonth() < 5) return true;
  return false;
}

// --- MLS Team Filter ---
// Team names as returned by the API (used for filtering search results)
const MLS_TEAM_NAMES = new Set([
  'Atlanta United',
  'Austin FC',
  'CF Montreal',
  'Charlotte FC',
  'Chicago Fire FC',
  'Colorado Rapids',
  'Columbus Crew',
  'DC United',
  'FC Cincinnati',
  'FC Dallas',
  'Houston Dynamo FC',
  'Inter Miami CF',
  'LA Galaxy',
  'Los Angeles FC',
  'Minnesota United',
  'Nashville SC',
  'New England Revolution',
  'New York City FC',
  'New York Red Bulls',
  'Orlando City SC',
  'Philadelphia Union',
  'Portland Timbers',
  'Real Salt Lake',
  'San Diego FC',
  'San Jose Earthquakes',
  'Seattle Sounders FC',
  'Sporting Kansas City',
  'St. Louis City SC',
  'Toronto FC',
  'Vancouver Whitecaps FC'
]);

// Fallback: Sorare team slugs for MLS clubs
const MLS_TEAM_SLUGS = new Set([
  'los-angeles-fc-los-angeles-california',
  'colorado-rapids-denver-colorado',
  'real-salt-lake-salt-lake-city-utah',
  'sporting-kc-kansas-city-kansas',
  'inter-miami',
  'seattle-sounders-renton-washington',
  'cincinnati-cincinnati-ohio',
  'vancouver-whitecaps-vancouver-british-columbia',
  'minnesota-united-minneapolis-saint-paul-minnesota',
  'montreal-impact-montreal-quebec',
  'atlanta-united-atlanta-georgia',
  'chicago-fire-bridgeview-illinois',
  'columbus-crew-columbus-ohio',
  'dc-united-washington-district-of-columbia',
  'toronto-toronto',
  'new-york-rb-secaucus-new-jersey',
  'new-york-city-new-york-new-york',
  'orlando-city-lake-mary-florida',
  'philadelphia-union-chester-pennsylvania',
  'austin-austin-texas',
  'st-louis-city-st-louis-missouri',
  'houston-dynamo-houston-texas',
  'dallas-frisco-texas',
  'new-england-foxborough-massachusetts',
  'nashville-sc',
  'charlotte-fc-charlotte-north-carolina',
  'sj-earthquakes-santa-clara-california',
  'portland-timbers-portland-oregon',
  'la-galaxy-los-angeles-california',
  'san-diego-san-diego'
]);

// --- Currency System ---
// These define display formatting only. Real values come per-row from the API.
// Mock data generates fake values using the MOCK_RATES below.
const CURRENCIES = {
  eth: { key: 'eth', label: 'ETH', symbol: '', suffix: ' ETH', decimals: 4 },
  eur: { key: 'eur', label: 'EUR', symbol: '\u20ac', suffix: '', decimals: 2 },
  usd: { key: 'usd', label: 'USD', symbol: '$', suffix: '', decimals: 2 },
  gbp: { key: 'gbp', label: 'GBP', symbol: '\u00a3', suffix: '', decimals: 2 }
};

// Mock exchange rates (only used for generating fake data)
const MOCK_RATES = { eur: 2650, usd: 2850, gbp: 2250 };

/**
 * Format a numeric price value for a given currency key.
 * Works for both real API data and mock data — just pass the value.
 */
function formatCurrencyValue(value, currencyKey) {
  const c = CURRENCIES[currencyKey] || CURRENCIES.eth;
  if (value == null) return '—';
  return c.symbol + value.toFixed(c.decimals) + c.suffix;
}

/**
 * Get the display price from a sale object for the selected currency.
 * Sale objects have a `prices` map: { eth, eur, usd, gbp }
 */
function getSalePrice(sale, currencyKey) {
  return (sale.prices && sale.prices[currencyKey] != null)
    ? sale.prices[currencyKey]
    : null;
}

/**
 * Format a sale's price in the selected currency.
 */
function formatSalePrice(sale, currencyKey) {
  const val = getSalePrice(sale, currencyKey);
  return formatCurrencyValue(val, currencyKey);
}

// --- Scarcity Config ---
const SCARCITY_COLORS = {
  limited:    { line: '#ffb000', dot: '#ffb000', bg: 'rgba(255,176,0,0.1)', text: '#ffb000' },
  rare:       { line: '#ff3333', dot: '#ff3333', bg: 'rgba(255,51,51,0.1)', text: '#ff5555' },
  super_rare: { line: '#3b82f6', dot: '#3b82f6', bg: 'rgba(59,130,246,0.1)', text: '#60a5fa' },
  unique:     { line: '#a855f7', dot: '#a855f7', bg: 'rgba(168,85,247,0.1)', text: '#c084fc' }
};

const SCARCITY_LABELS = {
  limited:    'Limited',
  rare:       'Rare',
  super_rare: 'Super Rare',
  unique:     'Unique'
};

// ============================================================
// MOCK DATA GENERATION (fallback when API is not configured)
// ============================================================

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

/**
 * Generate mock price history in the same normalized shape as API data.
 * Each sale: { date, prices: { eth, eur, usd, gbp }, buyer, cardSlug, ... }
 */
function generatePriceHistory(basePrice, volatility, count) {
  const sales = [];
  let price = basePrice;
  const buyers = [
    'anon_0x7a3f', 'collector_42', 'whale_eth', 'sorare_degen',
    'card_shark', 'mgr_tactics', 'punt3r', 'diamond_hands',
    'nft_flipper', 'fantasy_pro', 'stack_king', 'green_arrow',
    'footy_fan99', 'meta_gamer', 'block_chief'
  ];

  for (let i = count - 1; i >= 0; i--) {
    const change = (Math.random() - 0.48) * volatility;
    price = Math.max(basePrice * 0.3, price + change);
    const eth = Math.round(price * 10000) / 10000;
    sales.push({
      date: daysAgo(i * 3 + Math.floor(Math.random() * 2)),
      prices: {
        eth: eth,
        eur: Math.round(eth * MOCK_RATES.eur * 100) / 100,
        usd: Math.round(eth * MOCK_RATES.usd * 100) / 100,
        gbp: Math.round(eth * MOCK_RATES.gbp * 100) / 100
      },
      buyer: buyers[Math.floor(Math.random() * buyers.length)],
      seller: 'seller_' + Math.random().toString(36).substring(2, 6),
      cardSlug: 'card-' + Math.random().toString(36).substring(2, 8),
      serialNumber: Math.floor(Math.random() * 1000) + 1,
      txType: Math.random() > 0.5 ? 'auction' : 'instant_buy',
      tokenPriceId: 'mock-' + Math.random().toString(36).substring(2, 10)
    });
  }
  return sales;
}

/**
 * Generate mock SO5 score history (one score per gameweek).
 */
function generateScoreHistory(count, avgScore, variance) {
  const scores = [];
  for (let i = count - 1; i >= 0; i--) {
    const score = Math.round(Math.max(0, Math.min(100,
      avgScore + (Math.random() - 0.5) * variance * 2
    )));
    scores.push({
      date: daysAgo(i * 7 + Math.floor(Math.random() * 3)),
      score,
      gameweek: count - i
    });
  }
  return scores;
}

// ---- Player Database (mock) ----
const PLAYERS = [
  {
    slug: 'kylian-mbappe',
    name: 'Kylian Mbappé',
    club: 'Real Madrid',
    league: 'La Liga',
    position: 'Forward',
    age: 27,
    nationality: 'France',
    prices: {
      limited:    generatePriceHistory(0.025, 0.008, 30),
      rare:       generatePriceHistory(0.15, 0.04, 25),
      super_rare: generatePriceHistory(0.8, 0.2, 20),
      unique:     generatePriceHistory(4.5, 1.0, 12)
    }
  },
  {
    slug: 'erling-haaland',
    name: 'Erling Haaland',
    club: 'Manchester City',
    league: 'Premier League',
    position: 'Forward',
    age: 25,
    nationality: 'Norway',
    prices: {
      limited:    generatePriceHistory(0.03, 0.01, 30),
      rare:       generatePriceHistory(0.18, 0.05, 25),
      super_rare: generatePriceHistory(1.0, 0.25, 20),
      unique:     generatePriceHistory(5.0, 1.2, 12)
    }
  },
  {
    slug: 'jude-bellingham',
    name: 'Jude Bellingham',
    club: 'Real Madrid',
    league: 'La Liga',
    position: 'Midfielder',
    age: 22,
    nationality: 'England',
    prices: {
      limited:    generatePriceHistory(0.02, 0.006, 30),
      rare:       generatePriceHistory(0.12, 0.03, 25),
      super_rare: generatePriceHistory(0.65, 0.15, 20),
      unique:     generatePriceHistory(3.5, 0.8, 12)
    }
  },
  {
    slug: 'vinicius-junior',
    name: 'Vinícius Júnior',
    club: 'Real Madrid',
    league: 'La Liga',
    position: 'Forward',
    age: 25,
    nationality: 'Brazil',
    prices: {
      limited:    generatePriceHistory(0.022, 0.007, 30),
      rare:       generatePriceHistory(0.13, 0.035, 25),
      super_rare: generatePriceHistory(0.7, 0.18, 20),
      unique:     generatePriceHistory(3.8, 0.9, 12)
    }
  },
  {
    slug: 'bukayo-saka',
    name: 'Bukayo Saka',
    club: 'Arsenal',
    league: 'Premier League',
    position: 'Forward',
    age: 24,
    nationality: 'England',
    prices: {
      limited:    generatePriceHistory(0.018, 0.005, 30),
      rare:       generatePriceHistory(0.10, 0.03, 25),
      super_rare: generatePriceHistory(0.55, 0.12, 20),
      unique:     generatePriceHistory(2.8, 0.7, 12)
    }
  },
  {
    slug: 'rodri-hernandez',
    name: 'Rodri',
    club: 'Manchester City',
    league: 'Premier League',
    position: 'Midfielder',
    age: 29,
    nationality: 'Spain',
    prices: {
      limited:    generatePriceHistory(0.015, 0.004, 30),
      rare:       generatePriceHistory(0.08, 0.02, 25),
      super_rare: generatePriceHistory(0.45, 0.10, 20),
      unique:     generatePriceHistory(2.2, 0.5, 12)
    }
  },
  {
    slug: 'lamine-yamal',
    name: 'Lamine Yamal',
    club: 'FC Barcelona',
    league: 'La Liga',
    position: 'Forward',
    age: 18,
    nationality: 'Spain',
    prices: {
      limited:    generatePriceHistory(0.035, 0.012, 30),
      rare:       generatePriceHistory(0.20, 0.06, 25),
      super_rare: generatePriceHistory(1.1, 0.3, 20),
      unique:     generatePriceHistory(6.0, 1.5, 12)
    }
  },
  {
    slug: 'florian-wirtz',
    name: 'Florian Wirtz',
    club: 'Bayer Leverkusen',
    league: 'Bundesliga',
    position: 'Midfielder',
    age: 22,
    nationality: 'Germany',
    prices: {
      limited:    generatePriceHistory(0.02, 0.006, 30),
      rare:       generatePriceHistory(0.11, 0.03, 25),
      super_rare: generatePriceHistory(0.6, 0.14, 20),
      unique:     generatePriceHistory(3.2, 0.7, 12)
    }
  },
  {
    slug: 'phil-foden',
    name: 'Phil Foden',
    club: 'Manchester City',
    league: 'Premier League',
    position: 'Midfielder',
    age: 25,
    nationality: 'England',
    prices: {
      limited:    generatePriceHistory(0.016, 0.005, 30),
      rare:       generatePriceHistory(0.09, 0.025, 25),
      super_rare: generatePriceHistory(0.5, 0.12, 20),
      unique:     generatePriceHistory(2.5, 0.6, 12)
    }
  },
  {
    slug: 'pedri-gonzalez',
    name: 'Pedri',
    club: 'FC Barcelona',
    league: 'La Liga',
    position: 'Midfielder',
    age: 23,
    nationality: 'Spain',
    prices: {
      limited:    generatePriceHistory(0.014, 0.004, 30),
      rare:       generatePriceHistory(0.08, 0.022, 25),
      super_rare: generatePriceHistory(0.42, 0.10, 20),
      unique:     generatePriceHistory(2.0, 0.5, 12)
    }
  },
  {
    slug: 'mohamed-salah',
    name: 'Mohamed Salah',
    club: 'Liverpool',
    league: 'Premier League',
    position: 'Forward',
    age: 33,
    nationality: 'Egypt',
    prices: {
      limited:    generatePriceHistory(0.012, 0.004, 30),
      rare:       generatePriceHistory(0.07, 0.02, 25),
      super_rare: generatePriceHistory(0.38, 0.09, 20),
      unique:     generatePriceHistory(1.8, 0.4, 12)
    }
  },
  {
    slug: 'cole-palmer',
    name: 'Cole Palmer',
    club: 'Chelsea',
    league: 'Premier League',
    position: 'Midfielder',
    age: 23,
    nationality: 'England',
    prices: {
      limited:    generatePriceHistory(0.019, 0.006, 30),
      rare:       generatePriceHistory(0.11, 0.03, 25),
      super_rare: generatePriceHistory(0.58, 0.13, 20),
      unique:     generatePriceHistory(3.0, 0.7, 12)
    }
  },
  {
    slug: 'jamal-musiala',
    name: 'Jamal Musiala',
    club: 'Bayern Munich',
    league: 'Bundesliga',
    position: 'Midfielder',
    age: 22,
    nationality: 'Germany',
    prices: {
      limited:    generatePriceHistory(0.02, 0.006, 30),
      rare:       generatePriceHistory(0.12, 0.03, 25),
      super_rare: generatePriceHistory(0.62, 0.15, 20),
      unique:     generatePriceHistory(3.3, 0.8, 12)
    }
  },
  {
    slug: 'william-saliba',
    name: 'William Saliba',
    club: 'Arsenal',
    league: 'Premier League',
    position: 'Defender',
    age: 24,
    nationality: 'France',
    prices: {
      limited:    generatePriceHistory(0.010, 0.003, 30),
      rare:       generatePriceHistory(0.055, 0.015, 25),
      super_rare: generatePriceHistory(0.30, 0.07, 20),
      unique:     generatePriceHistory(1.4, 0.3, 12)
    }
  },
  {
    slug: 'declan-rice',
    name: 'Declan Rice',
    club: 'Arsenal',
    league: 'Premier League',
    position: 'Midfielder',
    age: 27,
    nationality: 'England',
    prices: {
      limited:    generatePriceHistory(0.012, 0.004, 30),
      rare:       generatePriceHistory(0.065, 0.018, 25),
      super_rare: generatePriceHistory(0.35, 0.08, 20),
      unique:     generatePriceHistory(1.6, 0.4, 12)
    }
  },
  {
    slug: 'alexander-isak',
    name: 'Alexander Isak',
    club: 'Newcastle United',
    league: 'Premier League',
    position: 'Forward',
    age: 26,
    nationality: 'Sweden',
    prices: {
      limited:    generatePriceHistory(0.014, 0.004, 30),
      rare:       generatePriceHistory(0.075, 0.02, 25),
      super_rare: generatePriceHistory(0.40, 0.09, 20),
      unique:     generatePriceHistory(1.9, 0.45, 12)
    }
  },
  {
    slug: 'raphinha-dias',
    name: 'Raphinha',
    club: 'FC Barcelona',
    league: 'La Liga',
    position: 'Forward',
    age: 29,
    nationality: 'Brazil',
    prices: {
      limited:    generatePriceHistory(0.011, 0.003, 30),
      rare:       generatePriceHistory(0.06, 0.016, 25),
      super_rare: generatePriceHistory(0.32, 0.07, 20),
      unique:     generatePriceHistory(1.5, 0.35, 12)
    }
  },
  {
    slug: 'bruno-fernandes',
    name: 'Bruno Fernandes',
    club: 'Manchester United',
    league: 'Premier League',
    position: 'Midfielder',
    age: 31,
    nationality: 'Portugal',
    prices: {
      limited:    generatePriceHistory(0.009, 0.003, 30),
      rare:       generatePriceHistory(0.05, 0.014, 25),
      super_rare: generatePriceHistory(0.28, 0.06, 20),
      unique:     generatePriceHistory(1.3, 0.3, 12)
    }
  },
  {
    slug: 'victor-osimhen',
    name: 'Victor Osimhen',
    club: 'Galatasaray',
    league: 'Super Lig',
    position: 'Forward',
    age: 26,
    nationality: 'Nigeria',
    prices: {
      limited:    generatePriceHistory(0.013, 0.004, 30),
      rare:       generatePriceHistory(0.07, 0.02, 25),
      super_rare: generatePriceHistory(0.38, 0.09, 20),
      unique:     generatePriceHistory(1.7, 0.4, 12)
    }
  },
  {
    slug: 'thibaut-courtois',
    name: 'Thibaut Courtois',
    club: 'Real Madrid',
    league: 'La Liga',
    position: 'Goalkeeper',
    age: 33,
    nationality: 'Belgium',
    prices: {
      limited:    generatePriceHistory(0.008, 0.002, 30),
      rare:       generatePriceHistory(0.04, 0.01, 25),
      super_rare: generatePriceHistory(0.22, 0.05, 20),
      unique:     generatePriceHistory(1.0, 0.25, 12)
    }
  }
];

// --- SO5 Score Params per player [avgScore, variance] ---
// avgScore: typical SO5 average (0-100), variance: spread per gameweek
const SCORE_PARAMS = {
  'kylian-mbappe':    [80, 12],
  'erling-haaland':   [82, 14],
  'jude-bellingham':  [78, 13],
  'vinicius-junior':  [76, 15],
  'bukayo-saka':      [68, 15],
  'rodri-hernandez':  [65, 12],
  'lamine-yamal':     [72, 16],
  'florian-wirtz':    [70, 14],
  'phil-foden':       [67, 15],
  'pedri-gonzalez':   [62, 16],
  'mohamed-salah':    [69, 17],
  'cole-palmer':      [73, 14],
  'jamal-musiala':    [71, 14],
  'william-saliba':   [58, 16],
  'declan-rice':      [63, 14],
  'alexander-isak':   [66, 17],
  'raphinha-dias':    [61, 16],
  'bruno-fernandes':  [57, 18],
  'victor-osimhen':   [64, 19],
  'thibaut-courtois': [55, 18]
};

// Attach score histories to each mock player
PLAYERS.forEach(p => {
  const [avg, variance] = SCORE_PARAMS[p.slug] || [55, 20];
  p.scores = generateScoreHistory(40, avg, variance);
});

// Lookup helpers
function findPlayerBySlug(slug) {
  return PLAYERS.find(p => p.slug === slug) || null;
}

function searchPlayers(query) {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase();
  return PLAYERS.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.club.toLowerCase().includes(q) ||
    p.position.toLowerCase().includes(q)
  ).slice(0, 10);
}

// Recent sales for homepage ticker
function getRecentSales(count) {
  const allSales = [];
  PLAYERS.forEach(p => {
    ['limited', 'rare', 'super_rare', 'unique'].forEach(scarcity => {
      const history = p.prices[scarcity];
      if (history.length > 0) {
        const sale = history[history.length - 1];
        allSales.push({
          playerName: p.name,
          scarcity: SCARCITY_LABELS[scarcity],
          ...sale
        });
      }
    });
  });
  allSales.sort((a, b) => b.date.localeCompare(a.date));
  return allSales.slice(0, count);
}
