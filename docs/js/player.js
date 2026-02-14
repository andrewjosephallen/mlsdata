/* ============================================================
   PLAYER PAGE — Price Chart, Scarcity Tabs, Sales Table
   Fetches from API when configured, falls back to mock data.
   ============================================================ */

let playerChart = null;
let scoreChart = null;
let currentTab = "overview";
let currentScarcity = "limited";
let currentCurrency = "eth";
let currentTimeRange = "3m";
let currentTxType = "all";
let currentCollection = "all";
let currentSlug = null;
let currentZoomRange = null; // { min: ms, max: ms } when drag-zoomed
let _dragAbort = null; // AbortController for drag-zoom listeners

// Time range definitions
const TIME_RANGES = {
  "2w": { label: "2W", days: 14, desc: "2 weeks" },
  "3m": { label: "3M", days: 90, desc: "3 months" },
  "6m": { label: "6M", days: 180, desc: "6 months" },
  "12m": { label: "12M", days: 365, desc: "12 months" },
  all: { label: "ALL", days: null, desc: "all data" },
};

// Default supply per scarcity (used when sale.supply is not available)
const SCARCITY_SUPPLY = {
  limited: 1000,
  rare: 100,
  super_rare: 10,
  unique: 1,
};

// Transaction type definitions
const TX_TYPES = {
  all: { label: "ALL" },
  auction: { label: "AUCTION" },
  secondary: { label: "SECONDARY" },
  instant_buy: { label: "INSTANT BUY" },
};

// Collection type definitions
const COLLECTION_TYPES = {
  all: { label: "ALL" },
  in_season: { label: "IN-SEASON" },
  classic: { label: "CLASSIC" },
};

// Cache: { "slug:rarity": [all sales] } — fetched once, filtered client-side by time range
const priceCache = {};

// Loading animation state
let loadingInterval = null;

function trunc(str, max) {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

function getFromDate(rangeKey) {
  const range = TIME_RANGES[rangeKey];
  if (!range || !range.days) return null;
  const d = new Date();
  d.setDate(d.getDate() - range.days);
  return d.toISOString().split("T")[0];
}

function showLoading(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Add wrapper class for positioning
  container.closest(".chart-wrapper")?.classList.add("is-loading");

  let progress = 0;
  const frames = ["|", "/", "-", "\\"];
  let frameIdx = 0;

  const overlay = document.createElement("div");
  overlay.className = "loading-overlay";
  overlay.id = containerId + "-loading";
  overlay.innerHTML = `
    <div class="loading-terminal">
      <div class="loading-terminal__text">> fetching price data<span class="loading-terminal__cursor">&nbsp;</span></div>
      <div class="loading-terminal__bar" id="${containerId}-bar">[....................] 0%</div>
    </div>
  `;

  const wrapper = container.closest(".chart-wrapper");
  if (wrapper) {
    wrapper.appendChild(overlay);
  }

  clearInterval(loadingInterval);
  loadingInterval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 15, 92);
    frameIdx = (frameIdx + 1) % frames.length;
    const filled = Math.round(progress / 5);
    const empty = 20 - filled;
    const bar = document.getElementById(containerId + "-bar");
    if (bar) {
      bar.innerHTML = `[<span class="filled">${"#".repeat(filled)}</span>${".".repeat(empty)}] ${Math.round(progress)}% ${frames[frameIdx]}`;
    }
  }, 120);
}

function hideLoading(containerId) {
  clearInterval(loadingInterval);
  loadingInterval = null;
  const overlay = document.getElementById(containerId + "-loading");
  if (overlay) {
    // Flash to 100% before removing
    const bar = document.getElementById(containerId + "-bar");
    if (bar) {
      bar.innerHTML =
        '[<span class="filled">####################</span>] 100% done';
    }
    setTimeout(() => overlay.remove(), 200);
  }
}

function renderPlayer(slug) {
  const app = document.getElementById("app");
  const player = findPlayerBySlug(slug);

  currentSlug = slug;
  currentTab = "overview";
  currentScarcity = "limited";
  currentCurrency = "eth";
  currentTimeRange = "3m";
  currentTxType = "all";
  currentCollection = "all";
  currentZoomRange = null;

  const isLive = API.isConfigured();

  // Immediate data: mock player or player index fallback
  const indexPlayer = API._playerIndex?.find(p => p.slug === slug);
  const displayName = player ? player.name
    : indexPlayer ? indexPlayer.name
    : _slugToDisplayName(slug);

  app.innerHTML = `
    <!-- Back Nav -->
    <div class="player-header">
      <a href="#/" class="player-header__back">&lt; cd ..</a>
      <div class="player-header__info">
        <div class="player-header__photo" id="player-photo"></div>
        <div>
          <h1 class="player-header__name" id="player-name">${displayName}</h1>
          <div class="player-header__meta" id="player-meta">
            ${isLive ? '> loading player info...' : _buildMetaLine(player, null)}
            ${isLive ? '<span style="color:var(--primary);"> [LIVE]</span>' : '<span class="text-muted"> [MOCK]</span>'}
          </div>
        </div>
      </div>
    </div>

    <!-- Tab Nav -->
    <div class="player-tabs">
      <button class="player-tab-btn active" data-tab="overview">&gt; OVERVIEW</button>
      <button class="player-tab-btn" data-tab="prices">&gt; PRICES</button>
    </div>

    <!-- Tab: Overview -->
    <div id="overview-tab" class="tab-pane">
      <div class="terminal-window" style="margin-bottom: 1.5rem;">
        <div class="terminal-window__header">+--- PERFORMANCE ---+</div>
        <div class="terminal-window__body">
          <div class="score-l-grid" id="score-badges"></div>
        </div>
      </div>
      <div class="terminal-window">
        <div class="terminal-window__header">+--- SCORE HISTORY ---+</div>
        <div class="chart-wrapper">
          <div class="chart-container">
            <canvas id="score-chart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Prices (rendered lazily on first switch) -->
    <div id="prices-tab" class="tab-pane" style="display:none"></div>
  `;

  // Hydrate header: use player index immediately, then fetch full details
  if (isLive) {
    // Immediate: populate from player index if available
    if (indexPlayer) {
      _hydratePlayerHeader(indexPlayer.name, {
        position: indexPlayer.position,
        team: indexPlayer.team,
        pictureUrl: indexPlayer.pictureUrl,
      });
    }
    // Async: fetch full player profile for age, country, flags, etc.
    API.fetchPlayer(slug)
      .then(data => {
        const posStr = Array.isArray(data.position)
          ? data.position.join('/') : (data.position || '');
        _hydratePlayerHeader(data.player_display_name, {
          position: posStr,
          team: data.team_name,
          teamPictureUrl: data.team_picture_url,
          age: data.age,
          country: data.country,
          countryFlagUrl: data.country_flag_url,
          pictureUrl: data.picture_url,
        });
        // Update the name in case it's different from index
        const nameEl = document.getElementById('player-name');
        if (nameEl) nameEl.textContent = data.player_display_name || displayName;
      })
      .catch(err => {
        console.warn('[PLAYER] fetchPlayer failed:', err.message);
        // Index fallback is already rendered, so just log
      });
  }

  initTabs(slug, player);
  renderOverviewContent(player);
}

/**
 * Build the meta line string from a mock player object.
 */
function _buildMetaLine(player, _extra) {
  if (!player) return '—';
  const posArr = Array.isArray(player.position) ? player.position : [player.position];
  const posStr = posArr.filter(Boolean).join('/') || '—';
  const teamStr = player.club || player.team || '—';
  const extras = [
    player.league,
    player.nationality,
    player.age ? `age ${player.age}` : null,
  ].filter(Boolean).join(' // ');
  return posStr + ' // ' + teamStr + (extras ? ' // ' + extras : '');
}

/**
 * Hydrate the player header DOM with profile data.
 */
function _hydratePlayerHeader(name, data) {
  const metaEl = document.getElementById('player-meta');
  const photoEl = document.getElementById('player-photo');
  const isLive = API.isConfigured();

  if (metaEl) {
    const parts = [];
    if (data.position) parts.push(data.position);
    if (data.team) {
      const teamHtml = data.teamPictureUrl
        ? `<img src="${data.teamPictureUrl}" class="player-header__team-logo" alt=""> ${data.team}`
        : data.team;
      parts.push(teamHtml);
    }
    if (data.country) {
      const countryHtml = data.countryFlagUrl
        ? `<img src="${data.countryFlagUrl}" class="player-header__flag" alt=""> ${data.country}`
        : data.country;
      parts.push(countryHtml);
    }
    if (data.age) parts.push(`age ${data.age}`);
    const liveTag = isLive
      ? '<span style="color:var(--primary);"> [LIVE]</span>'
      : '<span class="text-muted"> [MOCK]</span>';
    metaEl.innerHTML = (parts.join(' // ') || '—') + ' ' + liveTag;
  }

  if (photoEl && data.pictureUrl) {
    photoEl.innerHTML = `<img src="${data.pictureUrl}" alt="${name}" class="player-header__img">`;
  }
}

function initTabs(slug, player) {
  let pricesInitialized = false;
  const nav = document.querySelector(".player-tabs");
  nav.addEventListener("click", (e) => {
    const btn = e.target.closest(".player-tab-btn");
    if (!btn) return;
    const tab = btn.dataset.tab;
    if (tab === currentTab) return;

    currentTab = tab;
    nav
      .querySelectorAll(".player-tab-btn")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.tab === currentTab),
      );
    document
      .querySelectorAll(".tab-pane")
      .forEach((p) => (p.style.display = "none"));
    document.getElementById(currentTab + "-tab").style.display = "";

    if (currentTab === "prices" && !pricesInitialized) {
      pricesInitialized = true;
      renderPricesTab(slug, player);
    }
  });
}

function renderPricesTab(slug, player) {
  const tab = document.getElementById("prices-tab");
  const currencyKeys = Object.keys(CURRENCIES);
  const timeRangeKeys = Object.keys(TIME_RANGES);

  tab.innerHTML = `
    <!-- Player Stats Summary -->
    <div class="terminal-window" style="margin-bottom: 1.5rem;">
      <div class="terminal-window__header">+--- CARD OVERVIEW ---+</div>
      <div class="terminal-window__body" id="player-stats"></div>
    </div>

    <!-- Filters -->
    <div class="controls-row">
      <div class="filter-row">
        <div class="filter-group" id="scarcity-tabs">
          <button class="filter-btn active" data-scarcity="limited">L</button>
          <button class="filter-btn" data-scarcity="rare">R</button>
          <button class="filter-btn" data-scarcity="super_rare">SR</button>
          <button class="filter-btn" data-scarcity="unique">U</button>
        </div>
        <div class="filter-divider"></div>
        <div class="filter-group" id="currency-toggle">
          ${currencyKeys
            .map(
              (k) => `
            <button class="filter-btn${k === currentCurrency ? " active" : ""}" data-currency="${k}">
              ${CURRENCIES[k].label}
            </button>
          `,
            )
            .join("")}
        </div>
        <div class="filter-divider"></div>
        <div class="filter-group" id="time-range-toggle">
          ${timeRangeKeys
            .map(
              (k) => `
            <button class="filter-btn${k === currentTimeRange ? " active" : ""}" data-range="${k}">
              ${TIME_RANGES[k].label}
            </button>
          `,
            )
            .join("")}
          <button class="filter-btn filter-btn--reset" data-reset-range title="reset to 3M + clear zoom">↺</button>
        </div>
        <div class="filter-divider"></div>
        <div class="filter-group" id="tx-type-toggle">
          ${Object.entries(TX_TYPES)
            .map(
              ([k, v]) => `
            <button class="filter-btn${k === currentTxType ? " active" : ""}" data-txtype="${k}">
              ${v.label}
            </button>
          `,
            )
            .join("")}
        </div>
        <div class="filter-divider"></div>
        <div class="filter-group" id="collection-toggle">
          ${Object.entries(COLLECTION_TYPES)
            .map(
              ([k, v]) => `
            <button class="filter-btn${k === currentCollection ? " active" : ""}" data-collection="${k}">
              ${v.label}
            </button>
          `,
            )
            .join("")}
        </div>
      </div>
    </div>

    <!-- Price Chart -->
    <div class="terminal-window">
      <div class="terminal-window__header" id="chart-header">+--- PRICE HISTORY: LIMITED ---+</div>
      <div class="chart-wrapper">
        <div class="chart-container">
          <canvas id="price-chart"></canvas>
        </div>
      </div>
    </div>

    <!-- Sales Table -->
    <div class="terminal-window">
      <div class="terminal-window__header" id="table-header">+--- SALE LOG ---+</div>
      <div class="terminal-window__body" style="padding: 0; overflow-x: auto;">
        <table class="sales-table">
          <thead>
            <tr>
              <th>DATE</th>
              <th id="price-col-header">PRICE (ETH)</th>
              <th>BUYER</th>
              <th>SELLER</th>
              <th>SERIAL</th>
              <th>SEASON</th>
              <th>TYPE</th>
            </tr>
          </thead>
          <tbody id="sales-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  initScarcityTabs(slug, player);
  initCurrencyToggle(slug, player);
  initTimeRangeToggle(slug, player);
  initTxTypeToggle(slug, player);
  initCollectionToggle(slug, player);

  loadAndRender(
    slug,
    player,
    currentScarcity,
    currentCurrency,
    currentTimeRange,
  );
}

// --- Overview Tab: Score Content ---

function calcAvgScore(scores, n) {
  if (!scores || scores.length === 0) return null;
  const recent = scores.slice(-n);
  const avg = recent.reduce((s, x) => s + x.score, 0) / recent.length;
  return Math.round(avg * 10) / 10;
}

function scoreClass(score) {
  if (score === null || score === undefined) return "terrible";
  if (score >= 75) return "elite";
  if (score >= 60) return "good";
  if (score >= 45) return "decent";
  if (score >= 30) return "average";
  if (score >= 15) return "poor";
  return "terrible";
}

function scorePointColor(score) {
  if (score >= 75) return "#00a749";
  if (score >= 60) return "#24c792";
  if (score >= 45) return "#b0c623";
  if (score >= 30) return "#f0ce1d";
  if (score >= 15) return "#f09b1b";
  return "#dc1a0f";
}

function renderOverviewContent(player) {
  const scores = player?.scores || [];
  const l5 = calcAvgScore(scores, 5);
  const l15 = calcAvgScore(scores, 15);
  const l40 = calcAvgScore(scores, 40);

  const badgesEl = document.getElementById("score-badges");
  if (badgesEl) {
    badgesEl.innerHTML = [
      { label: "L5", value: l5 },
      { label: "L15", value: l15 },
      { label: "L40", value: l40 },
    ]
      .map(({ label, value }) => {
        const cls = scoreClass(value);
        const display = value !== null ? value.toFixed(1) : "—";
        return `
        <div class="score-badge score-badge--${cls}">
          <span class="score-badge__label">${label}</span>
          <span class="score-badge__value">${display}</span>
        </div>
      `;
      })
      .join("");
  }

  renderScoreChart(scores);
}

function renderScoreChart(scores) {
  const ctx = document.getElementById("score-chart");
  if (!ctx) return;

  if (scoreChart) {
    scoreChart.destroy();
    scoreChart = null;
  }

  if (!scores || scores.length === 0) return;

  const chartData = scores.map((s) => ({ x: s.date, y: s.score }));
  const pointColors = scores.map((s) => scorePointColor(s.score));

  // Inline plugin: draw score value above each dot
  const scoreLabelPlugin = {
    id: "scoreLabels",
    afterDatasetsDraw(chart) {
      const ctx2 = chart.ctx;
      const meta = chart.getDatasetMeta(0);
      meta.data.forEach((point, i) => {
        const s = scores[i];
        ctx2.save();
        ctx2.font = "bold 9px 'JetBrains Mono', monospace";
        ctx2.fillStyle = scorePointColor(s.score);
        ctx2.textAlign = "center";
        ctx2.textBaseline = "bottom";
        ctx2.fillText(Math.round(s.score), point.x, point.y - 6);
        ctx2.restore();
      });
    },
  };

  scoreChart = new Chart(ctx, {
    type: "line",
    plugins: [scoreLabelPlugin],
    data: {
      datasets: [
        {
          label: "SO5 Score",
          data: chartData,
          showLine: false,
          fill: false,
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          pointRadius: 3.0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#ffffff",
          pointHoverBorderColor: pointColors,
          pointHoverBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: "#0a0a0a",
          borderColor: "rgba(51, 255, 0, 0.5)",
          borderWidth: 1,
          titleFont: { family: "'JetBrains Mono', monospace", size: 12 },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
          titleColor: "#33ff00",
          bodyColor: "#33ff00",
          padding: 10,
          displayColors: false,
          callbacks: {
            title: (items) => {
              const s = scores[items[0].dataIndex];
              return "> date: " + s.date;
            },
            label: (item) => {
              const s = scores[item.dataIndex];
              return "  score: " + s.score;
            },
          },
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            tooltipFormat: "yyyy-MM-dd",
            displayFormats: {
              week: "MMM d",
              month: "MMM yyyy",
              quarter: "MMM yyyy",
            },
          },
          grid: { color: "rgba(31, 82, 31, 0.3)", drawBorder: false },
          ticks: {
            color: "#1f521f",
            font: { family: "'JetBrains Mono', monospace", size: 10 },
            maxRotation: 0,
            maxTicksLimit: 8,
          },
        },
        y: {
          min: 0,
          max: 100,
          grid: { color: "rgba(31, 82, 31, 0.3)", drawBorder: false },
          ticks: {
            color: "#1f521f",
            font: { family: "'JetBrains Mono', monospace", size: 10 },
            stepSize: 25,
          },
        },
      },
    },
  });
}

function initScarcityTabs(slug, player) {
  const tabs = document.getElementById("scarcity-tabs");
  tabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;

    currentScarcity = btn.dataset.scarcity;
    tabs
      .querySelectorAll(".filter-btn")
      .forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");

    loadAndRender(
      slug,
      player,
      currentScarcity,
      currentCurrency,
      currentTimeRange,
    );
  });
}

function initCurrencyToggle(slug, player) {
  const toggle = document.getElementById("currency-toggle");
  toggle.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;

    currentCurrency = btn.dataset.currency;
    toggle
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // Currency change doesn't need a re-fetch — just re-render with cached data
    const cacheKey = slug + ":" + currentScarcity;
    const allSales = priceCache[cacheKey];
    if (allSales) {
      renderPlayerView(
        filterSales(
          allSales,
          currentTimeRange,
          currentTxType,
          currentCollection,
        ),
        currentScarcity,
        currentCurrency,
      );
    }
  });
}

function initTimeRangeToggle(slug, player) {
  const toggle = document.getElementById("time-range-toggle");
  toggle.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;

    // RESET button: clear zoom + reset to 3M
    if ("resetRange" in btn.dataset) {
      currentZoomRange = null;
      updateResetGlow();
      currentTimeRange = "3m";
      toggle.querySelectorAll("[data-range]").forEach((b) => {
        b.classList.toggle("active", b.dataset.range === "3m");
      });
      const cacheKey = slug + ":" + currentScarcity;
      const allSales = priceCache[cacheKey];
      if (allSales) {
        renderPlayerView(
          filterSales(allSales, "3m", currentTxType, currentCollection),
          currentScarcity,
          currentCurrency,
        );
      }
      return;
    }

    currentTimeRange = btn.dataset.range;
    currentZoomRange = null; // clear zoom when changing time range
    updateResetGlow();
    toggle
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const cacheKey = slug + ":" + currentScarcity;
    const allSales = priceCache[cacheKey];
    if (allSales) {
      renderPlayerView(
        filterSales(
          allSales,
          currentTimeRange,
          currentTxType,
          currentCollection,
        ),
        currentScarcity,
        currentCurrency,
      );
    }
  });
}

function initTxTypeToggle(slug, player) {
  const toggle = document.getElementById("tx-type-toggle");
  toggle.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;

    currentTxType = btn.dataset.txtype;
    toggle
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const cacheKey = slug + ":" + currentScarcity;
    const allSales = priceCache[cacheKey];
    if (allSales) {
      renderPlayerView(
        filterSales(
          allSales,
          currentTimeRange,
          currentTxType,
          currentCollection,
        ),
        currentScarcity,
        currentCurrency,
      );
    }
  });
}

function initCollectionToggle(slug, player) {
  const toggle = document.getElementById("collection-toggle");
  toggle.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;

    currentCollection = btn.dataset.collection;
    toggle
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const cacheKey = slug + ":" + currentScarcity;
    const allSales = priceCache[cacheKey];
    if (allSales) {
      renderPlayerView(
        filterSales(
          allSales,
          currentTimeRange,
          currentTxType,
          currentCollection,
        ),
        currentScarcity,
        currentCurrency,
      );
    }
  });
}

/**
 * Filter a sales array by the selected time range (client-side).
 */
function filterByTimeRange(sales, timeRange) {
  const fromDate = getFromDate(timeRange);
  if (!fromDate) return sales; // 'all' — no filtering
  return sales.filter((s) => s.date >= fromDate);
}

/**
 * Combined filter: time range + transaction type + collection.
 */
function filterSales(sales, timeRange, txType, collection) {
  let filtered = filterByTimeRange(sales, timeRange);
  if (txType && txType !== "all") {
    filtered = filtered.filter((s) => s.txType === txType);
  }
  if (collection && collection !== "all") {
    if (collection === "in_season") {
      filtered = filtered.filter((s) => isInSeason(s.seasonYear, s.teamName));
    } else {
      filtered = filtered.filter((s) => !isInSeason(s.seasonYear, s.teamName));
    }
  }
  return filtered;
}

/**
 * Load sales data (from API or mock) then render.
 * Fetches ALL data once per slug+scarcity, then filters client-side by time range.
 */
async function loadAndRender(slug, player, scarcity, currency, timeRange) {
  const cacheKey = slug + ":" + scarcity;

  // If we already have all data for this slug+scarcity, just filter and render
  if (priceCache[cacheKey]) {
    renderPlayerView(
      filterSales(
        priceCache[cacheKey],
        timeRange,
        currentTxType,
        currentCollection,
      ),
      scarcity,
      currency,
    );
    return;
  }

  // Show loading animation
  showLoading("price-chart");
  document.getElementById("player-stats").innerHTML =
    '<p class="text-muted" style="font-size:0.8rem;">> loading price data...</p>';

  let sales = [];

  if (API.isConfigured()) {
    try {
      sales = await API.getPlayerPriceHistory(slug, scarcity, { limit: 500 });
    } catch (err) {
      console.error("API fetch failed, falling back to mock:", err);
      document.getElementById("player-stats").innerHTML =
        `<p class="text-error" style="font-size:0.8rem;">> api error: ${err.message} [falling back to mock]</p>`;
    }
  }

  // Fallback to mock data if API returned nothing or isn't configured
  if (sales.length === 0 && player && player.prices[scarcity]) {
    sales = player.prices[scarcity];
  }

  hideLoading("price-chart");
  priceCache[cacheKey] = sales;
  renderPlayerView(
    filterSales(sales, timeRange, currentTxType, currentCollection),
    scarcity,
    currency,
  );
}

function renderPlayerView(sales, scarcity, currency) {
  const label = SCARCITY_LABELS[scarcity];
  const colors = SCARCITY_COLORS[scarcity];
  const curr = CURRENCIES[currency] || CURRENCIES.eth;
  const rangeDesc = TIME_RANGES[currentTimeRange].desc;

  document.getElementById("chart-header").textContent =
    `+--- PRICE HISTORY: ${label.toUpperCase()} (${curr.label}) // ${rangeDesc.toUpperCase()} ---+`;
  document.getElementById("price-col-header").textContent =
    `PRICE (${curr.label})`;

  renderPlayerStats(sales, currency, colors);
  renderPriceChart(sales, colors, label, currency);
  renderSalesTable(sales, currency, scarcity, colors);
}

function renderPlayerStats(sales, currency, colors) {
  const statsEl = document.getElementById("player-stats");
  if (sales.length === 0) {
    statsEl.innerHTML =
      '<p class="text-muted" style="font-size:0.8rem;">> no sales data available</p>';
    return;
  }

  const values = sales
    .map((s) => getSalePrice(s, currency))
    .filter((v) => v != null);
  if (values.length === 0) {
    statsEl.innerHTML =
      '<p class="text-muted" style="font-size:0.8rem;">> no price data for this currency</p>';
    return;
  }

  const latest = values[values.length - 1];
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  const first = values[0];
  const trendPct =
    first !== 0 ? (((latest - first) / first) * 100).toFixed(1) : "0.0";
  const trendDir = trendPct >= 0 ? "▲" : "▼";
  const trendColor = trendPct >= 0 ? "var(--primary)" : "var(--error)";

  statsEl.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem;">
      <div class="stat-row">
        <span class="stat-row__label">last sale</span>
        <span class="stat-row__value" style="color: ${colors.text};">${formatCurrencyValue(latest, currency)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-row__label">highest</span>
        <span class="stat-row__value" style="color: ${colors.text};">${formatCurrencyValue(highest, currency)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-row__label">lowest</span>
        <span class="stat-row__value" style="color: ${colors.text};">${formatCurrencyValue(lowest, currency)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-row__label">average</span>
        <span class="stat-row__value" style="color: ${colors.text};">${formatCurrencyValue(avg, currency)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-row__label">total sales</span>
        <span class="stat-row__value">${sales.length}</span>
      </div>
      <div class="stat-row">
        <span class="stat-row__label">trend</span>
        <span class="stat-row__value" style="color: ${trendColor};">${trendDir} ${Math.abs(trendPct)}%</span>
      </div>
    </div>
  `;
}

function renderPriceChart(sales, colors, _label, currency) {
  const ctx = document.getElementById("price-chart");

  if (playerChart) {
    playerChart.destroy();
    playerChart = null;
  }

  if (sales.length === 0) return;

  // All data for the area fill (invisible line, visible fill)
  const allData = sales.map((s) => ({
    x: s.occurredAt || s.date,
    y: getSalePrice(s, currency) ?? 0,
  }));

  // Fixed-order tx type definitions (always show all three in legend)
  const txDefs = [
    {
      key: "auction",
      label: "Auction",
      style: "triangle",
      shade: colors.line,
      borderShade: colors.line,
    },
    {
      key: "secondary",
      label: "Secondary",
      style: "circle",
      shade: colors.dot,
      borderShade: colors.dot,
    },
    {
      key: "instant_buy",
      label: "Instant Buy",
      style: "circle",
      shade: "transparent",
      borderShade: colors.line,
    },
  ];

  // Group sales by tx type
  const txGroups = { auction: [], secondary: [], instant_buy: [] };
  sales.forEach((s, i) => {
    const type = s.txType || "secondary";
    const group = txGroups[type] || txGroups.secondary;
    group.push({ ...allData[i], _saleIdx: i });
  });

  const pointDatasets = txDefs.map((def) => ({
    label: def.label,
    data: txGroups[def.key],
    showLine: false,
    fill: false,
    pointStyle: def.style,
    pointBackgroundColor: def.shade,
    pointBorderColor: def.borderShade,
    pointBorderWidth: def.shade === "transparent" ? 2 : 1,
    pointRadius: 4,
    pointHoverRadius: 6,
    pointHoverBackgroundColor: "#ffffff",
    pointHoverBorderColor: def.borderShade,
    pointHoverBorderWidth: 2,
  }));

  // Area fill dataset (drawn first, behind dots)
  const fillDataset = {
    label: "_fill",
    data: allData,
    borderColor: "transparent",
    backgroundColor: colors.bg,
    pointRadius: 0,
    pointHitRadius: 0,
    showLine: true,
    fill: true,
    tension: 0.3,
    borderWidth: 0,
  };

  playerChart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [fillDataset, ...pointDatasets],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: true, mode: "nearest" },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: "#1f521f",
            font: { family: "'JetBrains Mono', monospace", size: 10 },
            usePointStyle: true,
            pointStyleWidth: 8,
            boxHeight: 6,
            filter: (item) => item.text !== "_fill",
          },
        },
        tooltip: {
          enabled: true,
          backgroundColor: "#0a0a0a",
          borderColor: colors.line,
          borderWidth: 1,
          titleFont: { family: "'JetBrains Mono', monospace", size: 12 },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
          titleColor: colors.line,
          bodyColor: "#33ff00",
          padding: 10,
          displayColors: false,
          filter: (item) => item.dataset.label !== "_fill",
          callbacks: {
            title: function (items) {
              const pt = items[0].raw;
              const sale = pt._saleIdx != null ? sales[pt._saleIdx] : null;
              if (!sale) return "";
              return "> price: " + formatSalePrice(sale, currency);
            },
            label: function (item) {
              const pt = item.raw;
              const sale = pt._saleIdx != null ? sales[pt._saleIdx] : null;
              if (!sale) return "";
              const supply =
                sale.supply || SCARCITY_SUPPLY[currentScarcity] || "?";
              const serial = sale.serialNumber
                ? sale.serialNumber + "/" + supply
                : "—";
              const season = formatSeasonYear(sale.seasonYear, sale.teamName);
              const card =
                serial !== "—" ? season + " (" + serial + ")" : season;
              const lines = ["  date: " + sale.date, "  card: " + card];
              if (sale.txType) lines.push("  type: " + sale.txType);
              lines.push(
                "  buyer: " + (sale.buyerDisplayName || sale.buyer || "—"),
              );
              return lines;
            },
          },
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            tooltipFormat: "yyyy-MM-dd",
            displayFormats: {
              day: "MMM d",
              week: "MMM d",
              month: "MMM yyyy",
              quarter: "MMM yyyy",
              year: "yyyy",
            },
          },
          min: currentZoomRange?.min,
          max: currentZoomRange?.max,
          grid: { color: "rgba(31, 82, 31, 0.3)", drawBorder: false },
          ticks: {
            color: "#1f521f",
            font: { family: "'JetBrains Mono', monospace", size: 10 },
            maxRotation: 0,
            maxTicksLimit: 8,
          },
        },
        y: {
          grid: { color: "rgba(31, 82, 31, 0.3)", drawBorder: false },
          ticks: {
            color: "#1f521f",
            font: { family: "'JetBrains Mono', monospace", size: 10 },
            callback: function (value) {
              return formatCurrencyValue(value, currency);
            },
          },
          beginAtZero: false,
        },
      },
    },
  });

  setupDragZoom(ctx);
}

function updateResetGlow() {
  const btn = document.querySelector(".filter-btn--reset");
  if (btn) btn.classList.toggle("zoom-active", !!currentZoomRange);
}

function setupDragZoom(canvas) {
  // Clean up previous listeners
  if (_dragAbort) _dragAbort.abort();
  _dragAbort = new AbortController();
  const { signal } = _dragAbort;

  const container = canvas.parentElement; // .chart-container
  let selEl = container.querySelector(".chart-zoom-selection");
  if (!selEl) {
    selEl = document.createElement("div");
    selEl.className = "chart-zoom-selection";
    container.appendChild(selEl);
  }
  selEl.style.display = "none";

  let dragging = false;
  let startX = 0;

  canvas.addEventListener(
    "mousedown",
    (e) => {
      if (!playerChart) return;
      dragging = true;
      startX = e.offsetX;
      selEl.style.left = startX + "px";
      selEl.style.width = "0";
      selEl.style.display = "block";
      e.preventDefault();
    },
    { signal },
  );

  window.addEventListener(
    "mousemove",
    (e) => {
      if (!dragging || !playerChart) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const left = Math.min(startX, x);
      const width = Math.abs(x - startX);
      selEl.style.left = left + "px";
      selEl.style.width = width + "px";
    },
    { signal },
  );

  window.addEventListener(
    "mouseup",
    (e) => {
      if (!dragging) return;
      dragging = false;
      selEl.style.display = "none";
      if (!playerChart) return;

      const rect = canvas.getBoundingClientRect();
      const endX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const minPx = Math.min(startX, endX);
      const maxPx = Math.max(startX, endX);
      if (maxPx - minPx < 10) return; // ignore tiny drags

      const minTs = playerChart.scales.x.getValueForPixel(minPx);
      const maxTs = playerChart.scales.x.getValueForPixel(maxPx);
      if (minTs == null || maxTs == null) return;

      currentZoomRange = { min: minTs, max: maxTs };
      updateResetGlow();
      playerChart.options.scales.x.min = minTs;
      playerChart.options.scales.x.max = maxTs;
      playerChart.update("none");
    },
    { signal },
  );
}

function renderSalesTable(sales, currency, scarcity, colors) {
  const tbody = document.getElementById("sales-tbody");
  const supply = SCARCITY_SUPPLY[scarcity] || "?";

  if (sales.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-muted" style="text-align:center; padding: 1rem;">
          > no sales recorded
        </td>
      </tr>
    `;
    return;
  }

  const reversed = [...sales].reverse();

  tbody.innerHTML = reversed
    .map((sale) => {
      const totalSupply = sale.supply != null ? sale.supply : supply;
      const serial =
        sale.serialNumber != null
          ? `#${sale.serialNumber}/${totalSupply}`
          : "—";
      const season = formatSeasonYear(sale.seasonYear, sale.teamName);

      return `
    <tr>
      <td>${sale.date}</td>
      <td style="color: ${colors.text};">${formatSalePrice(sale, currency)}</td>
      <td>${trunc(sale.buyerDisplayName || sale.buyer || "—", 25)}</td>
      <td>${trunc(sale.sellerDisplayName || (sale.txType === "auction" || sale.txType === "instant_buy" ? "Sorare" : sale.seller || "—"), 25)}</td>
      <td class="text-muted">${serial}</td>
      <td class="text-muted">${season}</td>
      <td class="text-muted">${sale.txType || "—"}</td>
    </tr>
  `;
    })
    .join("");
}
