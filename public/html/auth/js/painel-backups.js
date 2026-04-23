
    const state = {
      data: [],
      sortKey: 'nome',
      sortDir: 1,
      path: '' // caminho relativo dentro de /backups
    };

    const fmtKB = v => {
      const n = Number(v);
      return Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : v;
    };

    // ---------- helpers de path/breadcrumb ----------
    function getParentPath(p) {
      if (!p) return '';
      const parts = p.split('/').filter(Boolean);
      parts.pop();
      return parts.join('/');
    }

    function renderBreadcrumb() {
      const host = 'Backups';
      const wrap = document.querySelector('.wrap');
      const crumbs = document.getElementById('crumbs') || document.createElement('div');
      crumbs.id = 'crumbs';
      crumbs.className = 'muted';
      const parts = state.path.split('/').filter(Boolean);

       //let html = `<strong>${host}</strong>`;
       let acc = [];
       parts.forEach((seg, i) => {
         acc.push(seg);
         const p = acc.join('/');
       });

      
      if (!wrap.nextElementSibling || wrap.nextElementSibling.id !== 'crumbs') {
        wrap.insertAdjacentElement('afterend', crumbs);
      }

      // eventos do breadcrumb
      crumbs.querySelectorAll('a.crumb').forEach(a => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          state.path = a.dataset.path;
          load();
        });
      });
    }

    // ---------- carregamento ----------
    async function load() {
      const status = document.getElementById('status');
      status.textContent = 'Carregando...';

      // endpoint muda conforme o path atual
      const endpoint = state.path
        ? `/backups/folder/${encodeURIComponent(state.path)}`
        : '/backups';

      try {
        const r = await fetch(endpoint, { credentials: 'same-origin' });
        if (!r.ok) throw new Error('Falha ao carregar lista');
        const json = await r.json();
        state.data = Array.isArray(json.backups) ? json.backups : [];

        const qntArq = state.data.filter(i => i.tipo !== 'pasta').length;
        const qntPastas = state.data.filter(i => i.tipo === 'pasta').length;
        status.textContent = `${qntPastas} pasta(s), ${qntArq} arquivo(s)`;

        renderBreadcrumb();
        render();
      } catch (e) {
        status.textContent = 'Erro ao carregar.';
        console.error(e);
      }
    }

    // ---------- render tabela ----------
    function render() {
      const q = document.getElementById('q').value.trim().toLowerCase();
      const ext = document.getElementById('ext').value;
      let rows = state.data.slice();

      // filtro
      rows = rows.filter(it => {
        const nomeOK = !q || it.nome.toLowerCase().includes(q);
        if (!nomeOK) return false;

        // filtro de extensão só faz sentido para arquivos
        if (ext && it.tipo !== 'arquivo') return false;
        if (ext && !it.nome.toLowerCase().endsWith(ext.toLowerCase())) return false;

        return true;
      });

      // ordenação
      const key = state.sortKey;
      const dir = state.sortDir;
      rows.sort((a, b) => {
        const va = key === 'tamanhoKB'
          ? (a.tipo === 'pasta' ? -1 : Number(a[key]))
          : String(a[key]).toLowerCase();

        const vb = key === 'tamanhoKB'
          ? (b.tipo === 'pasta' ? -1 : Number(b[key]))
          : String(b[key]).toLowerCase();

        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return 0;
      });

      // monta tabela
      const tb = document.querySelector('#tbl tbody');
      tb.innerHTML = '';

      // linha de "voltar" quando dentro de subpasta
      if (state.path) {
        const trUp = document.createElement('tr');
        trUp.innerHTML = `
        <td colspan="3">
          <a href="#" id="btnUp" class="btn">⬅ Voltar</a>
          <span class="muted ms-2">${state.path}</span>
        </td>`;
        tb.appendChild(trUp);
        trUp.querySelector('#btnUp').addEventListener('click', (e) => {
          e.preventDefault();
          state.path = getParentPath(state.path);
          load();
        });
      }

      for (const it of rows) {
        const isFolder = it.tipo === 'pasta';
        const tr = document.createElement('tr');

        // nome clicável para pastas
        const nomeHTML = isFolder
          ? `<a href="#" class="lnk-folder" data-name="${it.nome}">📁 ${it.nome}</a>`
          : it.nome;

        // ações: Abrir (pasta) ou Download (arquivo)
        const acaoHTML = isFolder
          ? `<a href="#" class="btn btn-open" data-name="${it.nome}">Abrir</a>`
          : `<a class="btn" href="${it.url}" download>Download</a>`;

        tr.innerHTML = `
        <td>${nomeHTML}</td>
        <td class="right">${isFolder ? '-' : fmtKB(it.tamanhoKB)}</td>
        <td>${acaoHTML}</td>
      `;
        tb.appendChild(tr);
      }

      // bind de cliques para entrar em pasta
      document.querySelectorAll('.btn-open, .lnk-folder').forEach(el => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          const folder = e.currentTarget.dataset.name;
          state.path = state.path ? `${state.path}/${folder}` : folder;
          load();
        });
      });
    }

    // eventos
    document.getElementById('q').addEventListener('input', render);
    document.getElementById('ext').addEventListener('change', render);
    for (const th of document.querySelectorAll('th[data-k]')) {
      th.addEventListener('click', () => {
        const k = th.dataset.k;
        state.sortKey === k ? state.sortDir *= -1 : (state.sortKey = k, state.sortDir = 1);
        render();
      });
    }

    load();