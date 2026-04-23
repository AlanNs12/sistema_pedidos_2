let currentData = [];
let currentFilters = {
  dataInicio: "",
  dataFim: "",
  marca: "",
  groupBy: "peca",
};

// Elementos DOM
const dataInicioInput = document.getElementById("dataInicio");
const dataFimInput = document.getElementById("dataFim");
const marcaSelect = document.getElementById("marcaSelect");
const groupBySelect = document.getElementById("groupBySelect");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnLimpar = document.getElementById("btnLimpar");
const btnExportPDF = document.getElementById("btnExportPDF");
const btnExportXLS = document.getElementById("btnExportXLS");
const tableHeader = document.getElementById("tableHeader");
const tableBody = document.getElementById("tableBody");
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

// Atualiza cabeçalho da tabela baseado no tipo de agrupamento
function updateTableHeader() {
  const groupBy = groupBySelect.value;

  if (groupBy === "grupo") {
    tableHeader.innerHTML = `
          <tr>
            <th>Grupo</th>
            <th class="text-center">Qtde Vendida</th>
            <th>Modelo</th>
            <th>Peça</th>
            <th>Custo</th>
          </tr>
        `;
  } else {
    tableHeader.innerHTML = `
          <tr>
            <th>Peça</th>
            <th class="text-center">Qtde Vendida</th>
            <th>Modelo</th>
            <th>Grupo</th>
            <th>Custo</th>
          </tr>
        `;
  }
}

// Renderiza dados na tabela
function renderTable(data) {
  const groupBy = groupBySelect.value;
  tableBody.innerHTML = "";

  if (!data || data.length === 0) {
    emptyState.style.display = "block";
    resultsInfo.textContent = "0 registros";
    return;
  }

  emptyState.style.display = "none";

  data.forEach((row) => {
    const tr = document.createElement("tr");

    if (groupBy === "grupo") {
      tr.innerHTML = `
        <td>${row.grupo || "-"}</td>
        <td class="text-center">${row.qtde_vendida != null ? parseInt(row.qtde_vendida, 10).toLocaleString("pt-BR") : "0"}</td>
        <td>${row.modelo || "-"}</td>
        <td>${row.peca || "-"}</td>
        <td>${
          row.custo !== null && row.custo !== undefined && row.custo !== ""
            ? Number(row.custo).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })
            : "-"
        }</td>
      `;
    } else {
      tr.innerHTML = `
            <td>${row.peca || "-"}</td>
            <td class="text-center">${row.qtde_vendida != null ? parseInt(row.qtde_vendida, 10) : 0}</td>
            <td>${row.modelo || "-"}</td>
            <td>${row.grupo || "-"}</td>
            <td>${
              row.custo !== null && row.custo !== undefined && row.custo !== ""
                ? Number(row.custo).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })
                : "-"
            }</td>
          `;
    }

    tableBody.appendChild(tr);
  });

  resultsInfo.textContent = `${data.length} registro${data.length !== 1 ? "s" : ""}`;
}

// Busca dados do relatório
async function fetchData() {
  try {
    loadingState.style.display = "block";
    emptyState.style.display = "none";
    tableBody.innerHTML = "";

    const params = new URLSearchParams();
    if (currentFilters.dataInicio)
      params.append("dataInicio", currentFilters.dataInicio);
    if (currentFilters.dataFim)
      params.append("dataFim", currentFilters.dataFim);
    if (currentFilters.marca) params.append("marca", currentFilters.marca);
    params.append("groupBy", currentFilters.groupBy);

    const response = await fetch(
      `/v2/relatorios/top-pecas?${params.toString()}`,
    );
    if (!response.ok) throw new Error("Erro ao buscar dados");

    const data = await response.json();
    currentData = data;

    loadingState.style.display = "none";
    renderTable(data);
  } catch (error) {
    console.error("Erro ao buscar dados:", error);
    loadingState.style.display = "none";
    emptyState.style.display = "block";
    alert("Erro ao carregar dados do relatório");
  }
}

// Exporta relatório
function exportReport(format) {
  const params = new URLSearchParams();
  if (currentFilters.dataInicio)
    params.append("dataInicio", currentFilters.dataInicio);
  if (currentFilters.dataFim) params.append("dataFim", currentFilters.dataFim);
  if (currentFilters.marca) params.append("marca", currentFilters.marca);
  params.append("groupBy", currentFilters.groupBy);

  const url = `/v2/relatorios/top-pecas/${format}?${params.toString()}`;
  window.open(url, "_blank");
}

// Event Listeners
btnFiltrar.addEventListener("click", () => {
  currentFilters = {
    dataInicio: dataInicioInput.value,
    dataFim: dataFimInput.value,
    marca: marcaSelect.value,
    groupBy: groupBySelect.value,
  };
  updateTableHeader();
  fetchData();
});

btnLimpar.addEventListener("click", () => {
  dataInicioInput.value = "";
  dataFimInput.value = "";
  marcaSelect.value = "";
  groupBySelect.value = "peca";
  currentFilters = {
    dataInicio: "",
    dataFim: "",
    marca: "",
    groupBy: "peca",
  };
  updateTableHeader();
  tableBody.innerHTML = "";
  emptyState.style.display = "none";
  resultsInfo.textContent = "0 registros";
});

groupBySelect.addEventListener("change", () => {
  updateTableHeader();
});

btnExportPDF.addEventListener("click", () => {
  exportReport("pdf");
});

btnExportXLS.addEventListener("click", () => {
  exportReport("xls");
});

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  loadMarcas();
  updateTableHeader();
});

// ---- Peças Cadastradas PDF ----
(function () {
  const btnGerarPecasPDF = document.getElementById("btnGerarPecasPDF");
  const pecaPdfMarcaEl = document.getElementById("pecaPdfMarca");
  const pecaPdfModeloEl = document.getElementById("pecaPdfModelo");
  const pecaPdfPecaEl = document.getElementById("pecaPdfPeca");
  const pecasPdfInfo = document.getElementById("pecasPdfInfo");

  // Carrega marcas no select de peças PDF
  async function carregarMarcasPecaPDF() {
    if (!pecaPdfMarcaEl) return;
    try {
      const res = await fetch("/marcas");
      if (!res.ok) return;
      const marcas = await res.json();
      pecaPdfMarcaEl.innerHTML = '<option value="">Todas</option>';
      marcas.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.marcascod;
        opt.textContent = m.marcasdes;
        pecaPdfMarcaEl.appendChild(opt);
      });
    } catch (e) {
      console.warn("Erro ao carregar marcas:", e);
    }
  }

  // Atualiza modelos conforme marca selecionada
  async function carregarModelosPecaPDF(marcaId) {
    if (!pecaPdfModeloEl) return;
    pecaPdfModeloEl.innerHTML = '<option value="">Todos</option>';
    if (!marcaId) return;
    try {
      const res = await fetch(`/modelo/${marcaId}`);
      if (!res.ok) return;
      const modelos = await res.json();
      modelos.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.modcod;
        opt.textContent = m.moddes;
        pecaPdfModeloEl.appendChild(opt);
      });
    } catch (e) {
      console.warn("Erro ao carregar modelos:", e);
    }
  }

  if (pecaPdfMarcaEl) {
    pecaPdfMarcaEl.addEventListener("change", function () {
      carregarModelosPecaPDF(this.value);
    });
  }

  if (btnGerarPecasPDF) {
    btnGerarPecasPDF.addEventListener("click", function () {
      const marca = pecaPdfMarcaEl ? pecaPdfMarcaEl.value : "";
      const modelo = pecaPdfModeloEl ? pecaPdfModeloEl.value : "";
      const peca = pecaPdfPecaEl ? pecaPdfPecaEl.value.trim() : "";

      const qs = new URLSearchParams();
      if (marca) qs.set("marca", marca);
      if (modelo) qs.set("modelo", modelo);
      if (peca) qs.set("peca", peca);

      const url = `/v2/relatorios/pecas-cadastradas/pdf?${qs.toString()}`;
      if (pecasPdfInfo) pecasPdfInfo.textContent = "Gerando PDF...";

      // Abre o PDF em nova aba (o navegador faz download automático)
      window.open(url, "_blank");
      setTimeout(() => {
        if (pecasPdfInfo) pecasPdfInfo.textContent = "PDF gerado. Verifique os downloads do seu navegador.";
      }, 1500);
    });
  }

  document.addEventListener("DOMContentLoaded", carregarMarcasPecaPDF);
})();
