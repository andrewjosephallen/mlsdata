/* ============================================================
   APP — Router & Initialization
   ============================================================ */

(function() {
  'use strict';

  // --- Router ---
  function route() {
    const hash = window.location.hash || '#/';
    const app = document.getElementById('app');

    // Clean up previous chart if navigating away
    if (typeof playerChart !== 'undefined' && playerChart) {
      playerChart.destroy();
      playerChart = null;
    }

    if (hash.startsWith('#/player/')) {
      const slug = hash.replace('#/player/', '');
      renderPlayer(decodeURIComponent(slug));
    } else {
      renderHome();
    }

    // Clear top-bar search on navigation
    const topInput = document.getElementById('topbar-search-input');
    const topDropdown = document.getElementById('topbar-search-dropdown');
    if (topInput) topInput.value = '';
    if (topDropdown) topDropdown.classList.remove('active');

    // Scroll to top on navigation
    window.scrollTo(0, 0);
  }

  // Listen for hash changes
  window.addEventListener('hashchange', route);

  // Initial route on page load
  window.addEventListener('DOMContentLoaded', () => {
    route();

    // Wire up persistent top-bar search
    initTopBarSearch();

    // Eagerly preload the MLS player index for instant search
    if (API.isConfigured()) {
      API.getPlayerIndex().catch(() => {});
    }

    // Boot sequence in console
    console.log('%c SORARE MLS DATA v0.1.0 ', 'background: #33ff00; color: #0a0a0a; font-family: monospace; font-weight: bold;');
    console.log('%c system online // data feed active', 'color: #1f521f; font-family: monospace;');
  });
})();
