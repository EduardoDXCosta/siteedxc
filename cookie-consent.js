/* ===============================================
   EDXC Automação — Cookie Consent (LGPD)
   Banner granular: Aceitar / Recusar / Configurar
   Persistência: localStorage (chave edxc-cookie-consent)
   =============================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'edxc-cookie-consent';
  const CONSENT_VERSION = '1.0';

  const DEFAULT_PREFS = {
    essential: true,
    preferences: false,
    analytics: false,
    marketing: false,
  };

  function loadConsent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.version !== CONSENT_VERSION) return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  function saveConsent(prefs) {
    const data = {
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      prefs: Object.assign({}, DEFAULT_PREFS, prefs, { essential: true }),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    applyConsent(data.prefs);
    hideBanner();
    hideModal();
  }

  function applyConsent(prefs) {
    window.__edxcCookieConsent = prefs;
    document.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: prefs }));
  }

  function buildBanner() {
    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Aviso de cookies');
    document.body.classList.add('cookie-banner-open');
    banner.innerHTML = `
      <div class="cookie-banner-inner">
        <div class="cookie-banner-text">
          <strong>Sua privacidade importa</strong>
          <p>
            Utilizamos cookies essenciais para o funcionamento do site e, com seu consentimento,
            cookies de análise e marketing para melhorar sua experiência. Você pode aceitar todos,
            recusar os não-essenciais ou configurar suas preferências.
            <a href="politica-de-cookies.html">Saiba mais</a>.
          </p>
        </div>
        <div class="cookie-banner-actions">
          <button type="button" class="cookie-btn cookie-btn-secondary" data-action="configure">Configurar</button>
          <button type="button" class="cookie-btn cookie-btn-secondary" data-action="reject">Recusar não-essenciais</button>
          <button type="button" class="cookie-btn cookie-btn-primary" data-action="accept">Aceitar todos</button>
        </div>
      </div>
    `;
    document.body.appendChild(banner);

    banner.querySelector('[data-action="accept"]').addEventListener('click', () => {
      saveConsent({ preferences: true, analytics: true, marketing: true });
    });
    banner.querySelector('[data-action="reject"]').addEventListener('click', () => {
      saveConsent({ preferences: false, analytics: false, marketing: false });
    });
    banner.querySelector('[data-action="configure"]').addEventListener('click', () => {
      showModal(loadConsent()?.prefs || DEFAULT_PREFS);
    });
  }

  function buildModal() {
    const modal = document.createElement('div');
    modal.id = 'cookie-modal';
    modal.className = 'cookie-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'cookie-modal-title');
    modal.hidden = true;
    modal.innerHTML = `
      <div class="cookie-modal-backdrop" data-action="close"></div>
      <div class="cookie-modal-dialog">
        <header class="cookie-modal-header">
          <h2 id="cookie-modal-title">Preferências de Cookies</h2>
          <button type="button" class="cookie-modal-close" aria-label="Fechar" data-action="close">&times;</button>
        </header>
        <div class="cookie-modal-body">
          <p>
            Escolha quais categorias de cookies você autoriza. Cookies essenciais são
            necessários para o funcionamento do site e não podem ser desativados.
          </p>
          <ul class="cookie-categories">
            <li class="cookie-category">
              <label class="cookie-toggle">
                <input type="checkbox" data-category="essential" checked disabled>
                <span class="cookie-toggle-slider"></span>
                <div class="cookie-toggle-label">
                  <strong>Essenciais</strong>
                  <small>Necessários para o funcionamento básico do site (ex.: lembrar seu consentimento). Sempre ativos.</small>
                </div>
              </label>
            </li>
            <li class="cookie-category">
              <label class="cookie-toggle">
                <input type="checkbox" data-category="preferences">
                <span class="cookie-toggle-slider"></span>
                <div class="cookie-toggle-label">
                  <strong>Preferências</strong>
                  <small>Permitem que o site lembre escolhas como idioma ou região.</small>
                </div>
              </label>
            </li>
            <li class="cookie-category">
              <label class="cookie-toggle">
                <input type="checkbox" data-category="analytics">
                <span class="cookie-toggle-slider"></span>
                <div class="cookie-toggle-label">
                  <strong>Análise</strong>
                  <small>Coletam dados anônimos sobre como você usa o site para nos ajudar a melhorá-lo.</small>
                </div>
              </label>
            </li>
            <li class="cookie-category">
              <label class="cookie-toggle">
                <input type="checkbox" data-category="marketing">
                <span class="cookie-toggle-slider"></span>
                <div class="cookie-toggle-label">
                  <strong>Marketing</strong>
                  <small>Usados para mostrar anúncios mais relevantes em outros sites e redes sociais.</small>
                </div>
              </label>
            </li>
          </ul>
        </div>
        <footer class="cookie-modal-footer">
          <button type="button" class="cookie-btn cookie-btn-secondary" data-action="reject-all">Recusar todos</button>
          <button type="button" class="cookie-btn cookie-btn-secondary" data-action="save">Salvar preferências</button>
          <button type="button" class="cookie-btn cookie-btn-primary" data-action="accept-all">Aceitar todos</button>
        </footer>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelectorAll('[data-action="close"]').forEach((el) =>
      el.addEventListener('click', hideModal)
    );
    modal.querySelector('[data-action="accept-all"]').addEventListener('click', () => {
      saveConsent({ preferences: true, analytics: true, marketing: true });
    });
    modal.querySelector('[data-action="reject-all"]').addEventListener('click', () => {
      saveConsent({ preferences: false, analytics: false, marketing: false });
    });
    modal.querySelector('[data-action="save"]').addEventListener('click', () => {
      const prefs = {};
      modal.querySelectorAll('input[data-category]').forEach((input) => {
        prefs[input.dataset.category] = input.checked;
      });
      saveConsent(prefs);
    });
  }

  function showModal(prefs) {
    const modal = document.getElementById('cookie-modal');
    if (!modal) return;
    modal.querySelectorAll('input[data-category]').forEach((input) => {
      const cat = input.dataset.category;
      if (cat === 'essential') return;
      input.checked = !!prefs[cat];
    });
    modal.hidden = false;
    document.body.classList.add('cookie-modal-open');
  }

  function hideModal() {
    const modal = document.getElementById('cookie-modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('cookie-modal-open');
  }

  function hideBanner() {
    const banner = document.getElementById('cookie-banner');
    if (banner) banner.remove();
    document.body.classList.remove('cookie-banner-open');
  }

  function openPreferences() {
    const existing = loadConsent();
    showModal(existing ? existing.prefs : DEFAULT_PREFS);
  }

  function init() {
    buildModal();
    const existing = loadConsent();
    if (existing) {
      applyConsent(existing.prefs);
    } else {
      buildBanner();
    }
    document.querySelectorAll('[data-cookie-preferences]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openPreferences();
      });
    });
  }

  window.edxcCookieConsent = {
    open: openPreferences,
    get: () => loadConsent()?.prefs || null,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
