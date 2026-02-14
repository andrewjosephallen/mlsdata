/* ============================================================
   HOME PAGE — Search, ASCII Logo, Info Panels
   ============================================================ */

function renderHome() {
  const app = document.getElementById("app");

  const isLive = API.isConfigured();

  app.innerHTML = `
    <!-- ASCII Logo -->
    <div class="ascii-logo" aria-hidden="true">
 ____   ___  ____      _    ____  _____   __  __ _     ____    ____    _  _____  _
/ ___| / _ \\|  _ \\    / \\  |  _ \\| ____| |  \\/  | |   / ___|  |  _ \\  / \\|_   _|/ \\
\\___ \\| | | | |_) |  / _ \\ | |_) |  _|   | |\\/| | |   \\___ \\  | | | |/ _ \\ | | / _ \\
 ___) | |_| |  _ <  / ___ \\|  _ <| |___  | |  | | |___ ___) | | |_| / ___ \\| |/ ___ \\
|____/ \\___/|_| \\_\\/_/   \\_\\_| \\_\\_____| |_|  |_|_____|____/  |____/_/   \\_\\_/_/   \\_\\
    </div>

    <p class="text-muted" style="text-align:center; margin-bottom: 2rem; font-size: 0.8rem;">
      > player price tracking // market data_
    </p>

    <!-- Search -->
    <div class="search-container" id="search-container">
      <div class="search-prompt">
        <span class="search-prompt__label">search@mlsdata:~$</span>
        <input
          type="text"
          class="search-prompt__input"
          id="search-input"
          placeholder="${isLive ? "search players (live)..." : "search players..."}"
          autocomplete="off"
          spellcheck="false"
        >
      </div>
      <div class="search-dropdown" id="search-dropdown"></div>
    </div>

    <!-- Info Grid -->
    <div class="info-grid">
      <!-- 24 Hour Market Overview -->
      <div class="terminal-window">
        <div class="terminal-window__header">+--- 24 HOUR MARKET OVERVIEW ---+</div>
        <div class="terminal-window__body" id="market-overview">
          ${isLive
            ? '<p class="text-muted" style="font-size: 0.8rem;">> loading market data...</p>'
            : `<div class="stat-row">
            <span class="stat-row__label">24h volume</span>
            <span class="stat-row__value text-amber">142.8 ETH</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">cards sold</span>
            <span class="stat-row__value">1,847</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">avg price</span>
            <span class="stat-row__value">0.077 ETH</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">unique buyers</span>
            <span class="stat-row__value">612</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">unique sellers</span>
            <span class="stat-row__value">489</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">market trend</span>
            <span class="stat-row__value" style="color: var(--primary);">▲ +3.2%</span>
          </div>`
          }
        </div>
      </div>

      <!-- Top Auctions (24H) -->
      <div class="terminal-window">
        <div class="terminal-window__header">+--- TOP AUCTIONS (24H) ---+</div>
        <div class="terminal-window__body" id="top-auctions">
          ${isLive
            ? '<p class="text-muted" style="font-size: 0.8rem;">> loading top auctions...</p>'
            : '<p class="text-muted" style="font-size: 0.8rem;">> requires live API</p>'
          }
        </div>
      </div>

      <!-- System Status -->
      <div class="terminal-window">
        <div class="terminal-window__header">+--- SYSTEM STATUS ---+</div>
        <div class="terminal-window__body">
          <div class="stat-row">
            <span class="stat-row__label">api</span>
            <span class="stat-row__value" style="color: ${isLive ? "var(--primary)" : "var(--muted)"};">${isLive ? "[CONNECTED]" : "[OFFLINE]"}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">data feed</span>
            <span class="stat-row__value" style="color: ${isLive ? "var(--primary)" : "var(--secondary)"};">${isLive ? "[LIVE]" : "[MOCK]"}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">players indexed</span>
            <span class="stat-row__value" id="player-count">${isLive ? "..." : PLAYERS.length}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">version</span>
            <span class="stat-row__value text-muted">v0.1.0-alpha</span>
          </div>
        </div>
      </div>

      <!-- Quick Access — Most Traded -->
      <div class="terminal-window">
        <div class="terminal-window__header">+--- MOST TRADED (24H) ---+</div>
        <div class="terminal-window__body" id="quick-access">
          ${isLive
            ? '<p class="text-muted" style="font-size: 0.8rem;">> loading most traded...</p>'
            : `<p class="text-muted" style="font-size: 0.8rem; margin-bottom: 0.5rem;">> top searched players:</p>
          ${PLAYERS.slice(0, 6).map((p) => `
            <div style="padding: 0.25rem 0;">
              <a href="#/player/${p.slug}" style="font-size: 0.8rem;">> ${p.name}</a>
              <span class="text-muted" style="font-size: 0.75rem;"> // ${p.club}</span>
            </div>`).join("")}`
          }
        </div>
      </div>

      <!-- Contact -->
      <div class="terminal-window">
        <div class="terminal-window__header">+--- CONTACT ---+</div>
        <div class="terminal-window__body">
          <p class="text-muted" style="font-size: 0.8rem; margin-bottom: 0.75rem;">
            > missing a player? have feedback?<br>
            > reach out to request additions_
          </p>
          <div class="contact-link" style="padding: 0.3rem 0;">
            <a href="https://discordapp.com/users/ajallen12" target="_blank" rel="noopener" style="font-size: 0.8rem;">
              > [DSC] ajallen12
            </a>
          </div>
          <div class="contact-link" style="padding: 0.3rem 0;">
            <a href="https://x.com/SorareRevs" target="_blank" rel="noopener" style="font-size: 0.8rem;">
              > [X.COM] @SorareRevs
            </a>
          </div>
        </div>
      </div>

      <!-- Donate -->
      <div class="terminal-window">
        <div class="terminal-window__header">+--- DONATE ---+</div>
        <div class="terminal-window__body">
          <p class="text-muted" style="font-size: 0.8rem; margin-bottom: 0.75rem;">
            > this site is free for now while running costs are figured out_<br>
            > anything donated goes towards improving the site and experience_
          </p>
          <div class="contact-link" style="padding: 0.3rem 0;">
            <a href="https://buymeacoffee.com/soraremlsdata" target="_blank" rel="noopener" style="font-size: 0.8rem;">
              > [BMC] donate to feed a dev
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  initSearch();

  // If live, fetch real data for all panels
  if (isLive) {
    // Player index (for search + player count)
    API.getPlayerIndex()
      .then((players) => {
        const countEl = document.getElementById("player-count");
        if (countEl) countEl.textContent = players.length;
      })
      .catch((err) => {
        console.error("Failed to load player index:", err);
        const countEl = document.getElementById("player-count");
        if (countEl) countEl.textContent = "ERR";
      });

    // 24h Market Overview
    API.fetchMarketOverview24h()
      .then((data) => {
        const el = document.getElementById("market-overview");
        if (!el) return;
        const trendPct = data.trend_pct != null ? data.trend_pct : 0;
        const trendDir = trendPct >= 0 ? "▲" : "▼";
        const trendColor = trendPct >= 0 ? "var(--primary)" : "var(--error)";
        el.innerHTML = `
          <div class="stat-row">
            <span class="stat-row__label">24h volume</span>
            <span class="stat-row__value text-amber">${data.volume_eth != null ? data.volume_eth.toFixed(2) + ' ETH' : '—'}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">cards sold</span>
            <span class="stat-row__value">${data.cards_sold != null ? data.cards_sold.toLocaleString() : '—'}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">avg price</span>
            <span class="stat-row__value">${data.avg_price_eth != null ? data.avg_price_eth.toFixed(4) + ' ETH' : '—'}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">unique buyers</span>
            <span class="stat-row__value">${data.unique_buyers != null ? data.unique_buyers.toLocaleString() : '—'}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">unique sellers</span>
            <span class="stat-row__value">${data.unique_sellers != null ? data.unique_sellers.toLocaleString() : '—'}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">market trend</span>
            <span class="stat-row__value" style="color: ${trendColor};">${trendDir} ${Math.abs(trendPct).toFixed(1)}%</span>
          </div>
        `;
      })
      .catch((err) => {
        console.error("Failed to load market overview:", err);
        const el = document.getElementById("market-overview");
        if (el) el.innerHTML = '<p class="text-muted" style="font-size: 0.8rem;">> failed to load market data [ERR]</p>';
      });

    // Top Auctions (24H) — 4 quadrants
    API.fetchTopAuctions24h()
      .then((data) => {
        const el = document.getElementById("top-auctions");
        if (!el) return;
        const scarcities = [
          { key: 'limited', label: 'Limited', color: '#ffb000' },
          { key: 'rare', label: 'Rare', color: '#ff3333' },
          { key: 'super_rare', label: 'Super Rare', color: '#3b82f6' },
          { key: 'unique', label: 'Unique', color: '#a855f7' },
        ];
        el.innerHTML = '<div class="auction-quadrants">' + scarcities.map((s) => {
          const sale = data[s.key];
          if (!sale) {
            return `
              <div class="auction-quadrant" style="border-color: ${s.color}30;">
                <div class="auction-quadrant__header" style="color: ${s.color};">${s.label}</div>
                <p class="text-muted" style="font-size: 0.75rem; text-align: center; padding: 1rem 0;">> no auctions</p>
              </div>`;
          }
          const priceEth = sale.price_eth != null ? sale.price_eth.toFixed(4) + ' ETH' : '—';
          const priceUsd = sale.usd_cents != null ? '$' + (sale.usd_cents / 100).toFixed(2) : '';
          const serial = sale.serial_number ? '#' + sale.serial_number + '/' + (sale.supply || '?') : '';
          const name = sale.player_display_name || _slugToDisplayName(sale.player_slug);
          return `
            <div class="auction-quadrant" style="border-color: ${s.color}30;">
              <div class="auction-quadrant__header" style="color: ${s.color};">${s.label}</div>
              <a href="#/player/${sale.player_slug}" class="auction-quadrant__player">${name}</a>
              <div class="auction-quadrant__price" style="color: ${s.color};">${priceEth}</div>
              ${priceUsd ? `<div class="auction-quadrant__usd text-muted">${priceUsd}</div>` : ''}
              <div class="auction-quadrant__meta text-muted">${formatSeasonYear(sale.season_year, sale.team_name)} ${serial}</div>
            </div>`;
        }).join('') + '</div>';
      })
      .catch((err) => {
        console.error("Failed to load top auctions:", err);
        const el = document.getElementById("top-auctions");
        if (el) el.innerHTML = '<p class="text-muted" style="font-size: 0.8rem;">> failed to load auctions [ERR]</p>';
      });

    // Most Traded (24H) — Quick Access
    API.fetchMostTraded24h(8)
      .then((data) => {
        const el = document.getElementById("quick-access");
        if (!el) return;
        const players = data.players || [];
        if (players.length === 0) {
          el.innerHTML = '<p class="text-muted" style="font-size: 0.8rem;">> no trades in past 24h</p>';
          return;
        }
        el.innerHTML = `
          <p class="text-muted" style="font-size: 0.8rem; margin-bottom: 0.5rem;">> most traded in 24h:</p>
          ${players.map((p) => {
            const name = p.player_display_name || _slugToDisplayName(p.player_slug);
            const vol = p.total_volume_eth != null ? p.total_volume_eth.toFixed(4) + ' ETH' : '';
            return `
            <div style="padding: 0.25rem 0; display: flex; justify-content: space-between; align-items: baseline;">
              <div>
                <a href="#/player/${p.player_slug}" style="font-size: 0.8rem;">> ${name}</a>
                <span class="text-muted" style="font-size: 0.75rem;"> // ${p.team_name || '—'}</span>
              </div>
              <div style="text-align: right; white-space: nowrap;">
                <span style="font-size: 0.75rem; color: var(--secondary);">${p.sale_count} sales</span>
                ${vol ? `<span class="text-muted" style="font-size: 0.7rem;"> (${vol})</span>` : ''}
              </div>
            </div>`;
          }).join('')}
        `;
      })
      .catch((err) => {
        console.error("Failed to load most traded:", err);
        const el = document.getElementById("quick-access");
        if (el) el.innerHTML = '<p class="text-muted" style="font-size: 0.8rem;">> failed to load most traded [ERR]</p>';
      });
  }
}

/* --- Search Logic --- */
let searchDebounceTimer = null;

/**
 * Wire up search on any input + dropdown + container combo.
 * @param {HTMLElement} input
 * @param {HTMLElement} dropdown
 * @param {HTMLElement} container
 * @param {object} opts - { autoFocus: bool }
 */
function initSearchOn(input, dropdown, container, opts = {}) {
  let highlightIndex = -1;

  input.addEventListener("input", () => {
    const query = input.value.trim();
    highlightIndex = -1;

    if (API.isConfigured()) {
      clearTimeout(searchDebounceTimer);
      if (!query) {
        dropdown.classList.remove("active");
        return;
      }
      if (API._playerIndex) {
        const results = API._searchFromIndex(query);
        renderDropdown(results, query, true, dropdown);
        return;
      }
      searchDebounceTimer = setTimeout(async () => {
        try {
          const results = await API.searchPlayers(query);
          renderDropdown(results, query, true, dropdown);
        } catch (err) {
          console.error("[SEARCH-UI] Search error:", err);
          renderDropdown(searchPlayers(query), query, false, dropdown);
        }
      }, 250);
    } else {
      const results = searchPlayers(query);
      renderDropdown(results, query, false, dropdown);
    }
  });

  input.addEventListener("keydown", (e) => {
    const items = dropdown.querySelectorAll(".search-dropdown__item");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlightIndex = Math.min(highlightIndex + 1, items.length - 1);
      updateHighlight(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlightIndex = Math.max(highlightIndex - 1, 0);
      updateHighlight(items);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && items[highlightIndex]) {
        items[highlightIndex].click();
      }
    } else if (e.key === "Escape") {
      dropdown.classList.remove("active");
      input.blur();
      highlightIndex = -1;
    }
  });

  input.addEventListener("focus", () => {
    const query = input.value.trim();
    if (query && dropdown.innerHTML.trim()) {
      dropdown.classList.add("active");
    }
  });

  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) {
      dropdown.classList.remove("active");
    }
  });

  if (opts.autoFocus) input.focus();
}

/** Init the homepage search bar (inside #app) */
function initSearch() {
  const input = document.getElementById("search-input");
  const dropdown = document.getElementById("search-dropdown");
  const container = document.getElementById("search-container");
  if (!input) return;
  const isHome = !window.location.hash || window.location.hash === "#/";
  initSearchOn(input, dropdown, container, { autoFocus: isHome });
}

/** Init the persistent top-bar search (in the header) */
function initTopBarSearch() {
  const input = document.getElementById("topbar-search-input");
  const dropdown = document.getElementById("topbar-search-dropdown");
  const container = document.getElementById("topbar-search-container");
  if (!input) return;
  initSearchOn(input, dropdown, container);
}

/**
 * Render search dropdown.
 * @param {Array} results - player objects
 * @param {string} query
 * @param {boolean} isApi - true if results came from API (different field names)
 */
function renderDropdown(results, query, isApi, dropdownEl) {
  const dropdown = dropdownEl || document.getElementById("search-dropdown");

  if (!query) {
    dropdown.classList.remove("active");
    return;
  }

  if (results.length === 0) {
    dropdown.innerHTML = `
      <div class="search-dropdown__empty">
        > no results for "${query}" [ERR 404]
        <div style="margin-top: 0.4rem; font-size: 0.75rem;">
          player missing? <a href="https://x.com/SorareRevs" target="_blank" rel="noopener" class="search-dropdown__request">request via @SorareRevs</a>
          or <a href="https://discordapp.com/users/ajallen12" target="_blank" rel="noopener" class="search-dropdown__request">discord</a>
        </div>
      </div>
    `;
    dropdown.classList.add("active");
    return;
  }

  dropdown.innerHTML = results
    .map((p) => {
      const slug = p.slug;
      const name = p.name;
      const pos = isApi ? p.position || "" : p.position || "";
      const team = isApi ? p.team || "" : p.club || "";
      const meta = [pos, team].filter(Boolean).join(" // ");

      return `
      <div class="search-dropdown__item" data-slug="${slug}">
        <span class="search-dropdown__name">${highlightMatch(name, query)}</span>
        <span class="search-dropdown__meta">${meta}</span>
      </div>
    `;
    })
    .join("");

  dropdown.classList.add("active");

  dropdown.querySelectorAll(".search-dropdown__item").forEach((item) => {
    item.addEventListener("click", () => {
      window.location.hash = "#/player/" + item.dataset.slug;
    });
  });
}

function highlightMatch(text, query) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  const before = text.substring(0, idx);
  const match = text.substring(idx, idx + query.length);
  const after = text.substring(idx + query.length);
  return `${before}<strong style="color:var(--secondary)">${match}</strong>${after}`;
}

function updateHighlight(items) {
  items.forEach((item, i) => {
    item.classList.toggle("highlighted", i === highlightIndex);
  });
}
