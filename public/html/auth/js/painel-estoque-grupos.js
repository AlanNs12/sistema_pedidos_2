/**
 * Controle de Estoque por Grupo de Compatibilidade
 *
 * Esta tela utiliza a mesma lógica de dados do relatório Top Peças para
 * identificar os grupos de compatibilidade com maior volume de vendas e
 * permitir ajuste rápido de estoque e configuração de quantidade ideal.
 */

let currentData = [];
let currentFilters = {
  dataInicio: "",
  dataFim: "",
  marca: "",
};

// Elementos DOM
const dataInicioInput = document.getElementById("dataInicio");
const dataFimInput = document.getElementById("dataFim");
const marcaSelect = document.getElementById("marcaSelect");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnLimpar = document.getElementById("btnLimpar");
const gruposTableBody = document.getElementById("gruposTableBody");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const resultsInfo = document.getElementById("resultsInfo");

// Carrega marcas para o select
async function loadMarcas() {
  try {
    const response = await fetch("/marcas");
    if (!response.ok) throw new Error("Erro ao carregar marcas");
    const marcas = await response.json();

    marcaSelect.innerHTML = '<option value="">Todas</option>';
    marcas.forEach((marca) => {
      const option = document.createElement("option");
      option.value = marca.marcascod;
      option.textContent = marca.marcasdes;
      marcaSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Erro ao carregar marcas:", error);
  }
}

/**
 * Determina o status do estoque de um grupo comparado à quantidade ideal
 * @param {number} estoqueAtual - Estoque atual do grupo
 * @param {number|null} qtdeIdeal - Quantidade ideal configurada
 * @returns {{ label: string, badgeClass: string }}
 */
function calcularStatus(estoqueAtual, qtdeIdeal) {
  if (qtdeIdeal === null || qtdeIdeal === undefined) {
    return { label: "Sem ideal", badgeClass: "badge-sem-ideal" };
  }
  if (Number(estoqueAtual) >= Number(qtdeIdeal)) {
    return { label: "Adequado", badgeClass: "badge-adequado" };
  }
  return { label: "Abaixo do ideal", badgeClass: "badge-abaixo" };
}

// Renderiza os grupos na tabela
function renderTable(data) {
  gruposTableBody.innerHTML = "";

  if (!data || data.length === 0) {
    emptyState.style.display = "block";
    resultsInfo.textContent = "0 grupos";
    return;
  }

  emptyState.style.display = "none";

  data.forEach((row) => {
    const status = calcularStatus(row.estoque_atual, row.qtde_ideal);
    const estoqueAtual = Number(row.estoque_atual) || 0;
    const qtdeIdealVal =
      row.qtde_ideal !== null && row.qtde_ideal !== undefined
        ? Number(row.qtde_ideal)
        : "";

    const tr = document.createElement("tr");
    tr.dataset.groupId = row.id;

    tr.innerHTML = `
      <td><strong>${escapeHtml(row.grupo || "-")}</strong></td>
      <td class="text-center">${row.qtde_vendida != null ? parseInt(row.qtde_vendida, 10).toLocaleString("pt-BR") : "0"}</td>
      <td class="text-center">
        <span class="fw-bold estoque-atual-display">${estoqueAtual.toLocaleString("pt-BR")}</span>
      </td>
      <td class="text-center">
        <div class="d-flex align-items-center justify-content-center gap-1">
          <input
            type="number"
            class="form-control form-control-sm input-ajuste input-ideal"
            value="${qtdeIdealVal}"
            min="0"
            placeholder="—"
            title="Quantidade ideal de estoque para este grupo"
          />
          <button
            class="btn btn-outline-secondary btn-sm btn-salvar-ideal"
            title="Salvar quantidade ideal"
          >
            <i class="bi bi-floppy"></i>
          </button>
        </div>
      </td>
      <td class="text-center">
        <span class="badge ${status.badgeClass} status-badge">${status.label}</span>
      </td>
      <td class="text-center">
        <div class="d-flex align-items-center justify-content-center gap-1">
          <input
            type="number"
            class="form-control form-control-sm input-ajuste input-adicionar"
            value=""
            min="1"
            placeholder="0"
            title="Quantidade a adicionar ao estoque"
          />
          <button
            class="btn btn-success btn-sm btn-adicionar"
            title="Adicionar ao estoque"
          >
            <i class="bi bi-plus-lg"></i>
          </button>
        </div>
      </td>
      <td class="text-center">
        <div class="d-flex align-items-center justify-content-center gap-1">
          <input
            type="number"
            class="form-control form-control-sm input-ajuste input-reduzir"
            value=""
            min="1"
            placeholder="0"
            title="Quantidade a reduzir do estoque"
          />
          <button
            class="btn btn-danger btn-sm btn-reduzir"
            title="Reduzir do estoque"
          >
            <i class="bi bi-dash-lg"></i>
          </button>
        </div>
      </td>
      <td class="text-center">
        <span class="spinner-border spinner-border-sm text-primary row-spinner" role="status" style="display:none"></span>
      </td>
    `;

    // Salvar quantidade ideal
    tr.querySelector(".btn-salvar-ideal").addEventListener("click", () =>
      salvarIdeal(tr, row.id),
    );

    // Adicionar ao estoque
    tr.querySelector(".btn-adicionar").addEventListener("click", () =>
      ajustarEstoque(tr, row.id, "adicionar"),
    );

    // Reduzir do estoque
    tr.querySelector(".btn-reduzir").addEventListener("click", () =>
      ajustarEstoque(tr, row.id, "reduzir"),
    );

    gruposTableBody.appendChild(tr);
  });

  resultsInfo.textContent = `${data.length} grupo${data.length !== 1 ? "s" : ""}`;
}

/**
 * Salva a quantidade ideal de um grupo
 * @param {HTMLElement} tr - Linha da tabela
 * @param {number} groupId - ID do grupo
 */
async function salvarIdeal(tr, groupId) {
  const inputIdeal = tr.querySelector(".input-ideal");
  const spinner = tr.querySelector(".row-spinner");
  const rawVal = inputIdeal.value.trim();
  const qtdeIdeal = rawVal === "" ? null : parseInt(rawVal, 10);

  if (rawVal !== "" && (isNaN(qtdeIdeal) || qtdeIdeal < 0)) {
    alert("Quantidade ideal inválida. Informe um número inteiro maior ou igual a zero.");
    return;
  }

  try {
    spinner.style.display = "inline-block";

    const response = await fetch(`/part-groups/${groupId}/ideal`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qtde_ideal: qtdeIdeal }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Erro ao salvar quantidade ideal");
    }

    const updated = await response.json();

    // Atualiza o status na linha
    const estoqueAtual = Number(
      tr.querySelector(".estoque-atual-display").textContent.replace(/\./g, "").replace(",", "."),
    ) || 0;
    const status = calcularStatus(estoqueAtual, updated.qtde_ideal);
    tr.querySelector(".status-badge").className = `badge ${status.badgeClass} status-badge`;
    tr.querySelector(".status-badge").textContent = status.label;

    // Atualiza no dataset local
    const idx = currentData.findIndex((r) => r.id == groupId);
    if (idx !== -1) currentData[idx].qtde_ideal = updated.qtde_ideal;

    showToast("Quantidade ideal salva com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao salvar quantidade ideal:", error);
    alert(error.message || "Erro ao salvar quantidade ideal");
  } finally {
    spinner.style.display = "none";
  }
}

/**
 * Ajusta o estoque de um grupo (adicionar ou reduzir)
 * @param {HTMLElement} tr - Linha da tabela
 * @param {number} groupId - ID do grupo
 * @param {"adicionar"|"reduzir"} operacao - Tipo de operação
 */
async function ajustarEstoque(tr, groupId, operacao) {
  const inputEl =
    operacao === "adicionar"
      ? tr.querySelector(".input-adicionar")
      : tr.querySelector(".input-reduzir");
  const spinner = tr.querySelector(".row-spinner");

  const rawVal = inputEl.value.trim();
  const qty = parseInt(rawVal, 10);

  if (!rawVal || isNaN(qty) || qty <= 0) {
    alert(`Informe uma quantidade válida para ${operacao === "adicionar" ? "adicionar ao" : "reduzir do"} estoque.`);
    return;
  }

  const delta = operacao === "adicionar" ? qty : -qty;
  const reason =
    operacao === "adicionar" ? "Reposicao_Estoque" : "Reducao_Estoque";

  try {
    spinner.style.display = "inline-block";

    const response = await fetch(`/part-groups/${groupId}/adjust-stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta, reason }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Erro ao ajustar estoque");
    }

    const updated = await response.json();
    const novoEstoque = Number(updated.stock_quantity) || 0;

    // Atualiza o estoque exibido na linha
    tr.querySelector(".estoque-atual-display").textContent =
      novoEstoque.toLocaleString("pt-BR");

    // Atualiza o status
    const qtdeIdealCurrent =
      currentData.find((r) => r.id == groupId)?.qtde_ideal ?? null;
    const status = calcularStatus(novoEstoque, qtdeIdealCurrent);
    tr.querySelector(".status-badge").className = `badge ${status.badgeClass} status-badge`;
    tr.querySelector(".status-badge").textContent = status.label;

    // Atualiza no dataset local
    const idx = currentData.findIndex((r) => r.id == groupId);
    if (idx !== -1) currentData[idx].estoque_atual = novoEstoque;

    // Limpa o input usado
    inputEl.value = "";

    showToast(
      `Estoque ${operacao === "adicionar" ? "adicionado" : "reduzido"} com sucesso! ${updated.message || ""}`,
      "success",
    );
  } catch (error) {
    console.error("Erro ao ajustar estoque:", error);
    alert(error.message || "Erro ao ajustar estoque");
  } finally {
    spinner.style.display = "none";
  }
}

// Busca dados de estoque dos grupos
async function fetchData() {
  try {
    loadingState.style.display = "block";
    emptyState.style.display = "none";
    gruposTableBody.innerHTML = "";

    const params = new URLSearchParams();
    if (currentFilters.dataInicio) params.append("dataInicio", currentFilters.dataInicio);
    if (currentFilters.dataFim) params.append("dataFim", currentFilters.dataFim);
    if (currentFilters.marca) params.append("marca", currentFilters.marca);

    const response = await fetch(`/v2/relatorios/estoque-grupos?${params.toString()}`);
    if (!response.ok) throw new Error("Erro ao buscar dados");

    const data = await response.json();
    currentData = data;

    loadingState.style.display = "none";
    renderTable(data);
  } catch (error) {
    console.error("Erro ao buscar dados:", error);
    loadingState.style.display = "none";
    emptyState.style.display = "block";
    alert("Erro ao carregar dados de estoque dos grupos");
  }
}

// Exibe uma notificação toast simples
function showToast(message, type = "success") {
  const toastContainer = getOrCreateToastContainer();
  const id = `toast-${Date.now()}`;
  const bgClass = type === "success" ? "bg-success" : "bg-danger";

  const toastEl = document.createElement("div");
  toastEl.id = id;
  toastEl.className = `toast align-items-center text-white ${bgClass} border-0`;
  toastEl.setAttribute("role", "alert");
  toastEl.setAttribute("aria-live", "assertive");
  toastEl.setAttribute("aria-atomic", "true");
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${escapeHtml(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
    </div>
  `;

  toastContainer.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
  toast.show();
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

function getOrCreateToastContainer() {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container position-fixed bottom-0 end-0 p-3";
    container.style.zIndex = "1100";
    document.body.appendChild(container);
  }
  return container;
}

// Escapa HTML para evitar XSS
function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

// Event Listeners
btnFiltrar.addEventListener("click", () => {
  currentFilters = {
    dataInicio: dataInicioInput.value,
    dataFim: dataFimInput.value,
    marca: marcaSelect.value,
  };
  fetchData();
});

btnLimpar.addEventListener("click", () => {
  dataInicioInput.value = "";
  dataFimInput.value = "";
  marcaSelect.value = "";
  currentFilters = { dataInicio: "", dataFim: "", marca: "" };
  gruposTableBody.innerHTML = "";
  emptyState.style.display = "none";
  resultsInfo.textContent = "0 grupos";
});

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  loadMarcas();
  fetchData();
});
