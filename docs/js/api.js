/* ============================================================
   API CLIENT — Fetches from the Sorare backend
   ============================================================ */

const API = {
  /**
   * Check if the API is configured (config.js has real values).
   */
  isConfigured() {
    return !!(CONFIG && CONFIG.API_URL != null);
  },

  /**
   * Generic fetch wrapper with auth header.
   */
  async _fetch(path) {
    const url = `${CONFIG.API_URL}${path}`;
    console.log("[API] _fetch:", url);
    const res = await fetch(url);
    console.log("[API] response status:", res.status, res.statusText);
    if (!res.ok) {
      throw new Error(`API ${res.status}: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * GET /api/sorare/token_prices
   *
   * @param {string} playerSlug
   * @param {string} rarity - limited|rare|super_rare|unique
   * @param {object} opts - { from, to, txType, limit, offset }
   * @returns {Promise<{count, rows}>}
   */
  async fetchTokenPrices(playerSlug, rarity, opts = {}) {
    const params = new URLSearchParams();
    if (playerSlug) params.set("player_slug", playerSlug);
    if (rarity) params.set("rarity", rarity);
    if (opts.from) params.set("from", opts.from);
    if (opts.to) params.set("to", opts.to);
    if (opts.txType) params.set("tx_type", opts.txType);
    if (opts.cursor) params.set("cursor", opts.cursor);
    params.set("limit", String(opts.limit || 500));

    return this._fetch(`/api/sorare/token_prices?${params.toString()}`);
  },

  /**
   * Normalize a raw API row into the shape our UI expects.
   * Each sale has prices in all currencies directly from the DB.
   */
  normalizeSale(row) {
    const weiNum = row.wei ? BigInt(row.wei) : 0n;
    // ETH = wei / 1e18  (use Number for chart-friendly floats)
    const eth = Number(weiNum) / 1e18;

    return {
      date: row.occurred_at ? row.occurred_at.split("T")[0] : "",
      occurredAt: row.occurred_at,
      prices: {
        eth: eth,
        eur: row.eur_cents != null ? row.eur_cents / 100 : null,
        usd: row.usd_cents != null ? row.usd_cents / 100 : null,
        gbp: row.gbp_cents != null ? row.gbp_cents / 100 : null,
      },
      buyer: row.buyer_slug || "—",
      buyerDisplayName: row.buyer_display_name || row.buyer_slug || null,
      seller: row.seller_slug || "—",
      sellerDisplayName: row.seller_display_name || row.seller_slug || null,
      cardSlug: row.card_slug,
      cardAssetId: row.card_asset_id,
      serialNumber: row.serial_number,
      supply: row.supply,
      seasonYear: row.season_year,
      txType: row.tx_type,
      dealType: row.deal_type,
      rarity: row.rarity_typed,
      playerSlug: row.player_slug,
      playerName: row.player_display_name,
      teamName: row.team_name,
      pictureUrl: row.picture_url,
      tokenPriceId: row.token_price_id,
    };
  },

  /**
   * Fetch + normalize ALL price history for a player + rarity.
   * Paginates through the API until all rows are fetched.
   * Returns sales sorted chronologically (oldest first).
   */
  async getPlayerPriceHistory(playerSlug, rarity, opts = {}) {
    const limit = opts.limit || 500;
    let allRows = [];
    let cursor = null;
    let hasMore = true;

    // filter out rows

    while (hasMore) {
      const fetchOpts = { ...opts, limit };
      if (cursor) fetchOpts.cursor = cursor;
      const data = await this.fetchTokenPrices(playerSlug, rarity, fetchOpts);
      allRows = allRows.concat(data.rows);
      hasMore = data.has_more;
      cursor = data.next_cursor;
      console.log(
        `[API] paginate: fetched ${allRows.length} rows so far (has_more=${hasMore})`,
      );
    }

    const sales = allRows
      .map((r) => this.normalizeSale(r))
      .filter((s) => s.prices.eth > 0)
      .reverse();
    return sales;
  },

  // --- Homepage dashboard endpoints ---

  async fetchMarketOverview24h() {
    return this._fetch("/api/sorare/market_overview_24h");
  },

  async fetchTopAuctions24h() {
    return this._fetch("/api/sorare/top_auctions_24h");
  },

  async fetchMostTraded24h(limit = 8) {
    return this._fetch(`/api/sorare/most_traded_24h?limit=${limit}`);
  },

  // --- Player detail ---

  async fetchPlayer(slug) {
    return this._fetch(`/api/sorare/player/${encodeURIComponent(slug)}`);
  },

  // --- Player search & index ---
  _playerIndex: null,
  _playerIndexPromise: null,

  /**
   * Search players — uses preloaded local index for instant results.
   * Falls back to API if index isn't ready yet.
   */
  async searchPlayers(query) {
    if (!query || query.length < 1) return [];

    // If index is loaded, search locally (instant)
    if (this._playerIndex) {
      return this._searchFromIndex(query);
    }

    // Index still loading — fall back to API call
    try {
      const url = `/api/sorare/players?q=${encodeURIComponent(query)}`;
      const data = await this._fetch(url);
      return (data.players || data)
        .map((row) => ({
          slug: row.player_slug || row.slug,
          name: row.player_display_name || row.name || "",
          team: row.team_name || row.team || "",
          position: Array.isArray(row.positions)
            ? row.positions.join("/")
            : row.positions || row.position || "",
          pictureUrl: row.picture_url || row.pictureUrl || null,
        }))
        .filter((p) => MLS_TEAM_NAMES.has(p.team))
        .slice(0, 10);
    } catch (err) {
      console.warn("[SEARCH] API search failed:", err.message);
      return [];
    }
  },

  /**
   * Client-side search over the preloaded player index. Instant.
   */
  _searchFromIndex(query) {
    const index = this._playerIndex || [];
    const q = query.toLowerCase();
    return index
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.team.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q),
      )
      .slice(0, 10);
  },

  /**
   * Get the player index (preloaded from static JSON).
   * Used for instant search and homepage quick-access panel.
   */
  async getPlayerIndex() {
    if (this._playerIndex) return this._playerIndex;
    if (this._playerIndexPromise) return this._playerIndexPromise;

    this._playerIndexPromise = this._buildPlayerIndex();
    this._playerIndex = await this._playerIndexPromise;
    this._playerIndexPromise = null;
    return this._playerIndex;
  },

  async _buildPlayerIndex() {
    // When API is configured, load live player pool from backend (paginated)
    if (this.isConfigured()) {
      const players = [];
      let cursor = null;
      let hasMore = true;
      while (hasMore) {
        const params = new URLSearchParams({ limit: "2000" });
        if (cursor) params.set("cursor", cursor);
        const data = await this._fetch(`/api/sorare/player_pool?${params}`);
        for (const r of data.rows) {
          players.push({
            slug: r.player_slug,
            name: r.player_display_name || _slugToDisplayName(r.player_slug),
            team: r.meta?.team_name || r.meta?.team || "",
            position: Array.isArray(r.meta?.position)
              ? r.meta.position.join("/")
              : r.meta?.position || "",
            pictureUrl: r.meta?.picture_url || null,
          });
        }
        hasMore = data.has_more;
        cursor = data.next_cursor;
      }
      console.log(`[SEARCH] Player pool loaded: ${players.length} players`);
      return players;
    }

    // Fallback: load pre-built static index (one request, ~50KB)
    const res = await fetch("/data/players.json");
    if (!res.ok) throw new Error(`Failed to load player index: ${res.status}`);
    const raw = await res.json();
    const players = raw.map((p) => ({
      slug: p.slug,
      name: p.name || _slugToDisplayName(p.slug),
      team: p.team,
      position: Array.isArray(p.position)
        ? p.position.join("/")
        : p.position || "",
      pictureUrl: p.pictureUrl || null,
    }));
    console.log(`[SEARCH] Player index loaded: ${players.length} MLS players`);
    return players;
  },
};

/**
 * Convert a player slug to a display name when player_display_name is absent.
 * e.g. "john-doe" → "John Doe", "el-hadji-diouf" → "El Hadji Diouf"
 */
function _slugToDisplayName(slug) {
  return (slug || "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
