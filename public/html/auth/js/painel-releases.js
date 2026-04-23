document.addEventListener("DOMContentLoaded", async () => {
  const alertEl = document.getElementById("releaseID");
  const closeBtn = document.getElementById("releaseIDClose");
  const br = document.getElementById("br");

  try {
    const response = await fetch("/usuario/viuversao", {
      method: "GET",
      credentials: "include" // envia o cookie HttpOnly
    });

    if (!response.ok) throw new Error("Falha ao obter usuário");

    const data = await response.json();
    const viuversao = data.usuviuversao || "N";
    const usucod = data.usucod;
    

    if (!alertEl) return;

    if (viuversao === "S" && localStorage.getItem("releaseIDClose") === "true") {
      alertEl.style.display = "none";
      return;
    }

    //alertEl.style.display = "none";
    setTimeout(() => {
      br.style.display = "block";
      alertEl.style.display = "block";
      alertEl.classList.add("slide-down");
    }, 1500);

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
      br.style.display = "none";
        try {
          fetch(`${BASE_URL}/usuario/viuversao/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            credentials: "include", // envia o cookie HttpOnly
            body: JSON.stringify({ viuversao: "S",usucod: usucod })
          });
        } catch (err) {
          console.error("Erro ao atualizar viuversao:", err);
        }
        alertEl.style.display = "none";
        localStorage.setItem("releaseIDClose", "true");
      });
    }

  } catch (err) {
    console.error("Erro ao buscar nome do usuário:", err);
  }
});

(function () {
  const OWNER = 'CaioRodrigoCEVDEV';
  const REPO = 'sistema_pedidos';

  // Sem cache de releases
  const FAV_KEY = 'gh_releases_favs_v2';

  const openBtn = document.getElementById('openReleasesBtn');
  const releasesModalEl = document.getElementById('releasesModal');
  const releasesModal = releasesModalEl ? new bootstrap.Modal(releasesModalEl) : null;
  const listEl = document.getElementById('releasesList');
  const msgEl = document.getElementById('releasesMsg');
  const filterInput = document.getElementById('filterInput');
  const sortSelect = document.getElementById('sortSelect');
  const cacheInfo = document.getElementById('cacheInfo'); // mostra "agora"
  const refreshBtn = document.getElementById('refreshBtn');

  let releasesData = [];

  if (!listEl || !msgEl) {
    console.warn('Releases: elementos essenciais não encontrados, abortando inicialização.');
    return;
  }

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      if (releasesModal) releasesModal.show();
      setTimeout(() => filterInput && filterInput.focus(), 300);
      loadAndRender(); // sempre bate na API
    });
  }

  if (filterInput) filterInput.addEventListener('input', renderFromMemory);
  if (sortSelect) sortSelect.addEventListener('change', renderFromMemory);
  if (refreshBtn) refreshBtn.addEventListener('click', () => loadAndRender(true));

  function getFavs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; }
  }
  function setFavs(favs) { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); }

  function toggleFav(id, release) {
    const favs = getFavs();
    const exists = favs.find(f => f.id === id);
    if (exists) setFavs(favs.filter(f => f.id !== id));
    else {
      favs.push({ id, tag_name: release.tag_name, name: release.name, ts: Date.now() });
      setFavs(favs);
    }
    renderFromMemory();
  }

  function updateInfoNow() {
    if (cacheInfo) cacheInfo.innerText = 'agora';
  }

  // --- FETCH sempre sem cache e compatível com o JSON real ---
  async function fetchReleasesFromAPI() {
    const url = '/api/releases?t=' + Date.now();
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    // força o parse mesmo que o content-type esteja errado
    const text = await res.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      console.error('[releases] JSON inválido recebido:', text.slice(0, 300));
      throw new Error('Resposta da API não é JSON válido.');
    }

    const releases = Array.isArray(payload.releases)
      ? payload.releases
      : Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

    if (!releases.length) throw new Error('Nenhuma release encontrada.');

    return releases;
  }


  // --- carrega e renderiza sempre direto da API ---
  async function loadAndRender() {
    msgEl.innerText = 'Carregando...';
    listEl.innerHTML = '';

    try {
      const data = await fetchReleasesFromAPI();
      // Filtrar apenas as 2 releases mais recentes (assumindo que a API retorna em ordem decrescente)
      const latestReleases = data.slice(0, 2);
      releasesData = latestReleases.map(r => ({
        id: r.id ?? 0,
        tag_name: r.tag_name || '',
        name: r.name || '',
        body: r.body || '',
        published_at: r.published_at || '',
      }));

      updateInfoNow();
      renderList(releasesData);
      msgEl.innerText = '';
    } catch (err) {
      console.error('[releases] erro ao carregar releases', err);
      msgEl.innerHTML = `<div class="text-danger small">Erro: ${escapeHtml(err.message)}</div>`;
      listEl.innerHTML = `<div class="empty-state">
        <i class="bi bi-exclamation-circle" style="font-size:28px"></i>
        <div class="mt-2">Não foi possível carregar releases.</div>
      </div>`;
    }
  }

  function renderFromMemory() {
    if (!Array.isArray(releasesData)) return;
    renderList(releasesData);
  }

  // ---------- Renderer DOM-safe (sem innerHTML para conteúdo de API) ----------
  function renderList(releases) {
    updateInfoNow();

    if (!Array.isArray(releases) || releases.length === 0) {
      listEl.replaceChildren();
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'Nenhuma release encontrada.';
      listEl.appendChild(empty);
      return;
    }

    const q = (filterInput && filterInput.value) ? filterInput.value.trim().toLowerCase() : '';
    let list = releases.filter(r => {
      if (!q) return true;
      return ((r.name || '') + ' ' + (r.tag_name || '') + ' ' + (r.body || '')).toLowerCase().includes(q);
    });

    if (sortSelect && sortSelect.value === 'date_asc') {
      list.sort((a, b) => new Date(a.published_at) - new Date(b.published_at));
    } else {
      list.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    }

    const favs = getFavs();
    listEl.replaceChildren();

    for (const r of list) {
      const isFav = !!favs.find(f => f.id === r.id);
      const publishedStr = r.published_at ? new Date(r.published_at).toLocaleString() : '—';
      const fullBody = r.body || '';
      const isLong = fullBody.length > 420;
      const shortBody = isLong ? fullBody.slice(0, 420) : fullBody;

      const card = document.createElement('div');
      card.className = 'release-card';

      const meta = document.createElement('div');
      // meta.className = 'release-meta';

      // const ver = document.createElement('div');
      // ver.className = 'version-badge';
      // ver.textContent = r.tag_name || r.name || '';
      // meta.appendChild(ver);

      // const dsmall = document.createElement('div');
      // dsmall.className = 'date-small';
      // dsmall.textContent = new Date(r.published_at || Date.now()).toLocaleDateString();
      // meta.appendChild(dsmall);

      const authorWrap = document.createElement('div');
      authorWrap.className = 'mt-2';
      const avatar = document.createElement('div');
      avatar.className = 'author-avatar';
      avatar.textContent = 'O';
      // const brand = document.createElement('div');
      // brand.className = 'small text-muted mt-1';
      // brand.textContent = 'OrderUp';
      // authorWrap.append(avatar, brand);
      meta.appendChild(authorWrap);

      const body = document.createElement('div');
      body.className = 'release-body';

      const titleWrap = document.createElement('div');
      titleWrap.className = 'release-title';
      const titleInner = document.createElement('div');
      const h5 = document.createElement('h5');
      h5.textContent = r.name || '';
      const sub = document.createElement('div');
      sub.className = 'release-sub';
      sub.appendChild(document.createTextNode((r.tag_name || '') + ' • '));
      const span = document.createElement('span');
      span.className = 'text-muted';
      span.textContent = publishedStr;
      sub.appendChild(span);
      titleInner.append(h5, sub);
      titleWrap.appendChild(titleInner);

      const desc = document.createElement('div');
      desc.className = 'release-desc';
      desc.dataset.id = String(r.id || '');
      insertMultiline(desc, shortBody);

      const footer = document.createElement('div');
      footer.className = 'd-flex justify-content-between align-items-center mt-2';
      const left = document.createElement('div');

      if (isLong) {
        const a = document.createElement('a');
        a.href = '#';
        a.className = 'readmore small';
        a.dataset.id = String(r.id || '');
        a.textContent = 'Ver mais';
        a.addEventListener('click', ev => {
          ev.preventDefault();
          const expanded = desc.classList.toggle('expanded');
          a.textContent = expanded ? 'Ver menos' : 'Ver mais';
          desc.replaceChildren();
          if (expanded) {
            insertMultiline(desc, fullBody || '(sem descrição)');
          } else {
            insertMultiline(desc, shortBody);
            if (fullBody.length > 420) desc.appendChild(document.createTextNode('…'));
          }
        });
        left.appendChild(a);
      }

      footer.appendChild(left);
      body.append(titleWrap, desc, footer);
      card.append(meta, body);
      listEl.appendChild(card);
    }

    function insertMultiline(container, text) {
      const lines = String(text || '').replaceAll('\\n', '\n').split(/\r?\n/);
      lines.forEach((ln, i) => {
        container.appendChild(document.createTextNode(ln));
        if (i < lines.length - 1) container.appendChild(document.createElement('br'));
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }

  updateInfoNow();
})();
