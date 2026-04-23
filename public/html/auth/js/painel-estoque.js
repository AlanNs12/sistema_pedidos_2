const marcasEstoque = document.getElementById("filtroMarcaSelect");
const modelosEstoque = document.getElementById("filtroModeloSelect");
const btnAplicarEstoque = document.getElementById("btnAplicarFiltroEstoque");
const btnLimparEstoque = document.getElementById("btnLimparFiltroEstoque");
const estoqueSelect = document.getElementById("filtroEstoqueSelect");
const inputPesquisa = document.getElementById("pesquisa");

// Toast helper (leve, sem dependências)
function showToast(message, type = "success") {
  let container = document.getElementById("app-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "app-toast-container";
    Object.assign(container.style, {
      position: "fixed",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      zIndex: "2147483647",
      pointerEvents: "none",
    });
    document.body.appendChild(container);
  }

  // Garante posição no topo-direito
  container.style.top = "16px";
  container.style.right = "16px";
  container.style.bottom = "";
  container.style.left = "";

  const toast = document.createElement("div");
  const bg =
    type === "success" ? "#198754" : type === "error" ? "#dc3545" : "#0d6efd";
  Object.assign(toast.style, {
    background: bg,
    color: "white",
    padding: "10px 14px",
    borderRadius: "8px",
    boxShadow: "0 6px 20px rgba(0,0,0,.15)",
    fontSize: "14px",
    pointerEvents: "auto",
    opacity: "0",
    transform: "translateY(-6px)",
    transition: "opacity .2s ease, transform .2s ease",
  });
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px)";
    setTimeout(() => toast.remove(), 200);
  }, 2500);
}

if (inputPesquisa) {
  inputPesquisa.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const termo = inputPesquisa.value;
      buscarEstoquePorPesquisa(termo);
    }
  });
}

/**
 * Busca todos os produtos em /v2/pros/ e filtra localmente pelo termo.
 * A busca só faz o fetch quando chamada (por exemplo, ao pressionar Enter).
 */
async function buscarEstoquePorPesquisa(termo) {
  const tabelaEstoque = document.getElementById("tabela-estoque");

  if (!termo || !termo.trim()) {
    // Se não há termo, não faz fetch — pode manter a tabela atual ou limpar
    tabelaEstoque.innerHTML = `
      <tr><td colspan="7" class="text-center">Digite um termo e pressione Enter para buscar.</td></tr>
    `;
    return;
  }

  const q = termo.trim().toLowerCase();

  tabelaEstoque.innerHTML = `
    <tr><td colspan="7" class="text-center">Buscando...</td></tr>
  `;

  try {
    const res = await fetch(`${BASE_URL}/v2/pros/`, { credentials: "include" });
    if (!res.ok) throw new Error("Erro ao buscar produtos");

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      tabelaEstoque.innerHTML = `
        <tr><td colspan="7" class="text-center">Nenhum produto encontrado</td></tr>
      `;
      return;
    }

    // Filtra localmente por vários campos (case-insensitive)
    const filtrados = data.filter((item) => {
      const fields = [
        item.procod,
        item.prodes,
        item.marcasdes,
        item.moddes,
        item.tipodes,
        item.cordes,
      ];
      return fields.some((f) =>
        String(f || "")
          .toLowerCase()
          .includes(q)
      );
    });

    if (!filtrados || filtrados.length === 0) {
      tabelaEstoque.innerHTML = `
        <tr><td colspan="7" class="text-center">Nenhum produto encontrado</td></tr>
      `;
      return;
    }

    // Reutiliza renderização semelhante à listagem principal
    const renderSearchRows = (tbody, dados) => {
      tbody.innerHTML = "";
      dados.forEach((dado) => {
        const tr = document.createElement("tr");
        tr.className = "align-middle";
        tr.style.transition = "background .25s";

        const qtClass =
          dado.qtde === 0
            ? "badge rounded-pill bg-danger-subtle text-danger fw-semibold shadow-sm"
            : dado.qtde < 10
            ? "badge rounded-pill bg-warning-subtle text-warning fw-semibold shadow-sm"
            : "badge rounded-pill bg-success-subtle text-success fw-semibold shadow-sm";

        tr.innerHTML = `
          <td>
            <div class="d-flex flex-column">
              <span class="fw-semibold">${dado.prodes}</span>
              <span class="text-secondary small">${dado.tipodes || ""}</span>
            </div>
          </td>
          <td>
            <span class="badge rounded-pill bg-primary-subtle text-primary fw-medium border border-primary-subtle px-3">
              ${dado.marcasdes || ""}
            </span>
          </td>
          <td>
            <span class="badge rounded-pill bg-secondary-subtle text-secondary fw-medium border border-secondary-subtle px-3">
              ${dado.moddes || ""}
            </span>
          </td>
          <td>
            <span class="badge rounded-pill bg-info-subtle text-info fw-medium border border-info-subtle px-3">
              ${dado.tipodes || ""}
            </span>
          </td>
          <td>
            <span class="badge rounded-pill bg-dark-subtle text-dark fw-medium border px-3">
              ${dado.cordes || "Sem Cor"}
            </span>
          </td>
          <td>
            <div class="input-group input-group-sm" style="max-width:160px;">
              <input type="number" min="0" class="form-control border-end" placeholder="Qtd">
              <button class="btn btn-success btn-add-estoque px-3" type="button" title="Adicionar" style="display:flex;align-items:center;gap:.35rem;">
                <i class="fa-regular fa-square-plus"></i><span class="small">Add</span>
              </button>
            </div>
          </td>
          <td class="text-center">
            <span class="${qtClass} px-3">${dado.qtde ?? 0}</span>
          </td>
        `;

        const btn = tr.querySelector(".btn-add-estoque");
        btn.addEventListener("click", () => {
          const qtd = tr.querySelector("input").value;
          if (qtd === "" || Number(qtd) < 0) return;
          adicionarEstoque(
            dado.procod,
            Number(qtd),
            dado.procorcorescod ?? null
          );
        });

        tbody.appendChild(tr);
      });
    };

    renderSearchRows(tabelaEstoque, filtrados);
  } catch (err) {
    console.error(err);
    tabelaEstoque.innerHTML = `
      <tr><td colspan="7" class="text-center text-danger">
        Erro ao buscar produtos
      </td></tr>
    `;
  }
}

async function adicionarEstoque(procod, quantidade, cor = null) {
  try {
    const clickedEl = document.activeElement || null;
    const tr = clickedEl?.closest?.("tr") || null;
    const inputQtd = tr?.querySelector?.('input[type="number"]') || null;
    const badgeQtd = tr?.querySelector?.("td.text-center .badge") || null;

    const response = await fetch(`${BASE_URL}/pro/estoque/${procod}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ quantidade, cor }),
    });

    if (!response.ok) {
      showToast("Erro ao atualizar o estoque.", "error");
      return;
    }

    // Tenta obter quantidade atualizada da API (se houver)
    let newQtde = null;
    const ct = response.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        const data = await response.json();
        if (typeof data?.qtde === "number") newQtde = data.qtde;
      } catch {}
    }

    // Atualiza visual localmente (fallback se API não retornar nova qtde)
    if (badgeQtd) {
      const current = parseInt(badgeQtd.textContent, 10) || 0;
      const finalQtde = newQtde ?? current + Number(quantidade);
      badgeQtd.textContent = finalQtde;

      // Ajusta classes conforme faixas
      const classes = [
        "bg-danger-subtle",
        "text-danger",
        "bg-warning-subtle",
        "text-warning",
        "bg-success-subtle",
        "text-success",
      ];
      classes.forEach((c) => badgeQtd.classList.remove(c));
      if (finalQtde === 0) {
        badgeQtd.classList.add(
          "bg-danger-subtle",
          "text-danger",
          "fw-semibold",
          "shadow-sm"
        );
      } else if (finalQtde < 10) {
        badgeQtd.classList.add(
          "bg-warning-subtle",
          "text-warning",
          "fw-semibold",
          "shadow-sm"
        );
      } else {
        badgeQtd.classList.add(
          "bg-success-subtle",
          "text-success",
          "fw-semibold",
          "shadow-sm"
        );
      }
    }

    if (inputQtd) inputQtd.value = "";

    showToast("Estoque atualizado com sucesso!", "success");

    // Reaplica filtros para refletir remoção/entrada em listas (ex.: sem estoque)
    if (typeof btnAplicarEstoque !== "undefined" && btnAplicarEstoque) {
      btnAplicarEstoque.click();
    }
  } catch (error) {
    console.error("Erro ao atualizar o estoque:", error);
    showToast("Erro ao atualizar o estoque.", "error");
  }
}

(function () {
  async function buscarMarcasEstoque() {
    try {
      const res = await fetch(`${BASE_URL}/marcas/`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao buscar marcas: " + res.status);
      const data = await res.json();
      marcasEstoque.innerHTML = '<option value="todas">Todas</option>'; // limpa e adiciona opção 'todas'
      data.forEach((marca) => {
        const option = document.createElement("option");
        option.value = marca.marcascod;
        option.textContent = marca.marcasdes;
        marcasEstoque.appendChild(option);
      });
    } catch (err) {
      console.error(err);
      marcasEstoque.innerHTML =
        '<option value="todas">Erro ao carregar marcas</option>';
    }
  }

  async function buscarTodosModelos() {
    try {
      const res = await fetch(`${BASE_URL}/modelos/`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao buscar modelos: " + res.status);
      const data = await res.json();
      modelosEstoque.innerHTML = '<option value="todos">Todos</option>'; // limpa e adiciona opção 'todos'
      data.forEach((modelo) => {
        const option = document.createElement("option");
        option.value = modelo.modcod;
        option.textContent = modelo.moddes;
        modelosEstoque.appendChild(option);
      });
    } catch (err) {
      console.error(err);
      modelosEstoque.innerHTML =
        '<option value="todos">Erro ao carregar modelos</option>';
    }
  }

  async function buscarModelosEstoque(marcaCod = null) {
    try {
      // Verifica se é "todas" ou null/undefined
      if (!marcaCod || marcaCod === "todas") {
        await buscarTodosModelos();
        return;
      }

      // Se chegou aqui, é um código de marca válido
      let url = `${BASE_URL}/modelo/${marcaCod}`;

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar modelos: " + res.status);

      const data = await res.json();
      modelosEstoque.innerHTML = '<option value="todos">Todos</option>';
      data.forEach((modelo) => {
        const option = document.createElement("option");
        option.value = modelo.modcod;
        option.textContent = modelo.moddes;
        modelosEstoque.appendChild(option);
      });
    } catch (err) {
      console.error(err);
      modelosEstoque.innerHTML =
        '<option value="todos">Erro ao carregar modelos</option>';
    }
  }

  // Adiciona listener para quando a marca for alterada
  marcasEstoque.addEventListener("change", function () {
    buscarModelosEstoque(this.value);
  });

  // Chama as funções para popular os selects ao carregar a página
  buscarMarcasEstoque();
  document.getElementById("tituloEstoque").innerText = "Peças";

  // função que faz fetch (adapte a URL / parâmetros conforme sua API)
  async function fetchBuscarEstoque(params = {}) {
    const tabelaEstoque = document.getElementById("tabela-estoque");
    const { marca, modelo, estoque } = params;
    const marcaParam =
      marca && marca !== "todas" ? encodeURIComponent(marca) : "todas";
    const modeloParam =
      modelo && modelo !== "todos" ? encodeURIComponent(modelo) : "todos";

    const temFiltro =
      (marca && marca !== "todas") || (modelo && modelo !== "todos");

    let url;
    let isSemEstoque = false;
    if (estoque === "0") {
      url = temFiltro
        ? `${BASE_URL}/v2/proComEstoque/${marcaParam}/${modeloParam}`
        : `${BASE_URL}/v2/proComEstoque`;
      document.getElementById("tituloEstoque").innerText = "Peças em estoque";
    } else if (estoque === "1") {
      isSemEstoque = true;
      url = temFiltro
        ? `${BASE_URL}/v2/proSemEstoque/${marcaParam}/${modeloParam}`
        : `${BASE_URL}/v2/proSemEstoque`;
      document.getElementById("tituloEstoque").innerText =
        "Peças fora de estoque";
    } else if (estoque === "3") {
      isSemEstoque = true;
      url = temFiltro
        ? `${BASE_URL}/v2/proEstoqueAcabando/${marcaParam}/${modeloParam}`
        : `${BASE_URL}/v2/proEstoqueAcabando`;
      document.getElementById("tituloEstoque").innerText = "Ultimas peças";
    } else if (estoque === "4") {
      isSemEstoque = true;
      url = temFiltro
        ? `${BASE_URL}/v2/proEstoqueEmFalta/${marcaParam}/${modeloParam}`
        : `${BASE_URL}/v2/proEstoqueEmFalta`;
      document.getElementById("tituloEstoque").innerText = "Em Falta";
    } else {
      tabelaEstoque.innerHTML =
        '<tr><td colspan="7" class="text-center">Selecione um filtro de estoque.</td></tr>';
      return;
    }

    const renderTabela = (tbody, dados) => {
      tbody.innerHTML = "";
      if (!dados || dados.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="7" class="text-center">Nenhum produto encontrado.</td></tr>';
        return;
      }
      dados.forEach((dado) => {
        const tr = document.createElement("tr");
        tr.className = "align-middle";
        if (isSemEstoque) tr.style.background = "var(--bs-warning-bg-subtle)";
        tr.style.transition = "background .25s";
        tr.addEventListener("mouseenter", () => {
          tr.style.background = "linear-gradient(90deg,#f8f9fa,#eef1f4)";
        });
        tr.addEventListener("mouseleave", () => {
          tr.style.background = isSemEstoque
            ? "var(--bs-warning-bg-subtle)"
            : "";
        });

        const qtClass =
          dado.qtde === 0
            ? "badge rounded-pill bg-danger-subtle text-danger fw-semibold shadow-sm"
            : dado.qtde < 10
            ? "badge rounded-pill bg-warning-subtle text-warning fw-semibold shadow-sm"
            : "badge rounded-pill bg-success-subtle text-success fw-semibold shadow-sm";

        tr.innerHTML = `
          <td>
        <div class="d-flex flex-column">
          <span class="fw-semibold">${dado.prodes}</span>
          <span class="text-secondary small">${dado.tipodes}</span>
        </div>
          </td>
          <td>
        <span class="badge rounded-pill bg-primary-subtle text-primary fw-medium border border-primary-subtle px-3">${
          dado.marcasdes
        }</span>
          </td>
          <td>
        <span class="badge rounded-pill bg-secondary-subtle text-secondary fw-medium border border-secondary-subtle px-3">${
          dado.moddes
        }</span>
          </td>
          <td>
        <span class="badge rounded-pill bg-info-subtle text-info fw-medium border border-info-subtle px-3">${
          dado.tipodes
        }</span>
          </td>
          <td>
        <span class="badge rounded-pill bg-dark-subtle text-dark fw-medium border px-3">${
          dado.cordes || "Sem Cor"
        }</span>
          </td>
          <td>
        <div class="input-group input-group-sm" style="max-width:160px;">
          <input type="number" min="0" class="form-control border-end" placeholder="Qtd">
          <button class="btn btn-success btn-add-estoque px-3" type="button" title="Adicionar" style="display:flex;align-items:center;gap:.35rem;">
            <i class="fa-regular fa-square-plus"></i><span class="small">Add</span>
          </button>
        </div>
          </td>
          <td class="text-center">
        <span class="${qtClass} px-3">${dado.qtde}</span>
          </td>
        `;

        const btn = tr.querySelector(".btn-add-estoque");
        btn.addEventListener("click", () => {
          const qtd = tr.querySelector("input").value;
          if (qtd === "" || Number(qtd) < 0) return;
          adicionarEstoque(
            dado.procod,
            Number(qtd),
            dado.procorcorescod ?? null
          );
        });

        tbody.appendChild(tr);
      });
    };

    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar estoque.");

      const dados = await res.json();
      renderTabela(tabelaEstoque, dados);
    } catch (err) {
      console.error(err);
      tabelaEstoque.innerHTML =
        '<tr><td colspan="7" class="text-center">Erro ao carregar.</td></tr>';
    }
  }

  btnAplicarEstoque.addEventListener("click", function () {
    const estoqueSelect = document.getElementById("filtroEstoqueSelect");
    fetchBuscarEstoque({
      marca: marcasEstoque.value,
      modelo: modelosEstoque.value,
      estoque: estoqueSelect.value,
    });
  });

  btnLimparEstoque.addEventListener("click", async function () {
    marcasEstoque.value = "todas";
    await buscarTodosModelos(); // repopula modelos sem filtro
    modelosEstoque.value = "todos";
    const estoqueSelect = document.getElementById("filtroEstoqueSelect");
    estoqueSelect.value = ""; // Reseta o filtro de estoque
    const tabelaEstoque = document.getElementById("tabela-estoque");
    tabelaEstoque.innerHTML = "";
    document.getElementById("tituloEstoque").innerText = "Peças";
  });
})();
