     // remove loading + placeholders de todos os wrappers
    function finishAllChartsLoading() {
      document.querySelectorAll('.chart-wrapper.loading').forEach(w => {
        w.classList.remove('loading', 'placeholder', 'placeholder-wave');
      });
    }

    // EXEMPLO provisório: remove após 1.2s (substitua pela chamada após render do Chart.js)
    setTimeout(finishAllChartsLoading, 1200);
 
 // Usa window.API_URL (se definido em /config.js). Caso contrário, usa caminho relativo.
    const API = (path) => (window.API_URL ? window.API_URL + path : path);
    const optAuth = { credentials: "include" }; // envia cookie httpOnly do login

    const $ = (s) => document.querySelector(s);
    const toNum = (v) => Number(v ?? 0) || 0;

// ---- Filtros de data do Dashboard ----
// Retorna os parâmetros de data atuais para o filtro do dashboard
window.dashFiltroParams = { dataInicio: null, dataFim: null };

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function buildDashQS() {
  const p = window.dashFiltroParams;
  const qs = new URLSearchParams();
  if (p.dataInicio) qs.set("dataInicio", p.dataInicio);
  if (p.dataFim) qs.set("dataFim", p.dataFim);
  return qs.toString() ? "?" + qs.toString() : "";
}

function aplicarPresetDash(preset) {
  const today = new Date();
  const inputInicio = document.getElementById("dashDataInicio");
  const inputFim = document.getElementById("dashDataFim");
  let start = null, end = null;

  if (preset === "hoje") {
    start = new Date(today);
    end = new Date(today);
  } else if (preset === "ult7") {
    start = new Date(today); start.setDate(today.getDate() - 6); end = new Date(today);
  } else if (preset === "ult30") {
    start = new Date(today); start.setDate(today.getDate() - 29); end = new Date(today);
  } else if (preset === "mesAtual") {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  } else if (preset === "anoAtual") {
    start = new Date(today.getFullYear(), 0, 1);
    end = new Date(today.getFullYear(), 11, 31);
  } else if (preset === "todos") {
    start = end = null;
  } else if (preset === "personalizado") {
    // keep current values, enable inputs
    if (inputInicio) inputInicio.disabled = false;
    if (inputFim) inputFim.disabled = false;
    return;
  }

  if (inputInicio) { inputInicio.disabled = true; inputInicio.value = start ? toISODate(start) : ""; }
  if (inputFim) { inputFim.disabled = true; inputFim.value = end ? toISODate(end) : ""; }
  window.dashFiltroParams.dataInicio = start ? toISODate(start) : null;
  window.dashFiltroParams.dataFim = end ? toISODate(end) : null;
}

document.addEventListener("DOMContentLoaded", function () {
  const periodoSel = document.getElementById("dashPeriodoSelect");
  const inputInicio = document.getElementById("dashDataInicio");
  const inputFim = document.getElementById("dashDataFim");
  const btnAplicar = document.getElementById("btnAplicarFiltroDash");

  if (periodoSel) {
    periodoSel.addEventListener("change", function () {
      aplicarPresetDash(this.value);
    });
    // init with default
    aplicarPresetDash(periodoSel.value);
  }

  if (btnAplicar) {
    btnAplicar.addEventListener("click", function () {
      const preset = periodoSel ? periodoSel.value : "todos";
      if (preset === "personalizado") {
        window.dashFiltroParams.dataInicio = inputInicio ? inputInicio.value || null : null;
        window.dashFiltroParams.dataFim = inputFim ? inputFim.value || null : null;
      } else {
        aplicarPresetDash(preset);
      }
      // Recarrega todos os gráficos
      if (typeof carregarTopProdutosMes === "function") carregarTopProdutosMes().catch(console.error);
      if (typeof carregarTopMarcasMes === "function") carregarTopMarcasMes().catch(console.error);
      if (typeof carregarFaturamentoAnualVertical === "function") carregarFaturamentoAnualVertical().catch(console.error);
      if (typeof carregarFaturamentoDiarioNitido === "function") carregarFaturamentoDiarioNitido().catch(console.error);

      // Atualiza título dos gráficos
      const periodo = periodoSel ? periodoSel.options[periodoSel.selectedIndex].text : "";
      const tituloP = document.getElementById("tituloTopProdutos");
      const tituloM = document.getElementById("tituloTopMarcas");
      if (tituloP) tituloP.textContent = `Top 10 Produtos — ${periodo}`;
      if (tituloM) tituloM.textContent = `Top 10 Marcas — ${periodo}`;
    });
  }
});
// ---- Fim Filtros Dashboard ----


document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("/me/usuario", {
      method: "GET",
      credentials: "include" // envia o cookie HttpOnly
    });

    if (!response.ok) throw new Error("Falha ao obter usuário");

    const data = await response.json();
    const usuario = data.usunome || "Usuário";

    const h1 = document.querySelector("h1.h4.mb-0");
    if (h1) {
      h1.textContent = `Bem-vindo, ${usuario}`;
    }
  } catch (err) {
    console.error("Erro ao buscar nome do usuário:", err);
  }
   // -- Helpers globais, com proteção para evitar redefinir --
    window.prepareHiDPICanvas ||= function (canvas, cssHeightPx = 360) {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      canvas.style.width = rect.width + "px";
      canvas.style.height = cssHeightPx + "px";
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(cssHeightPx * dpr);
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return ctx;
    };

    window.throttleDash ||= function (fn, wait = 150) {
      let t = 0;
      return (...args) => {
        const now = Date.now();
        if (now - t > wait) { t = now; fn(...args); }
      };
    };

    window.brl ||= function (v) {
      return (isNaN(v) ? 0 : v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    };

    let chartFaturamentoAnual;

    async function carregarFaturamentoAnualVertical() {
      const canvas = document.getElementById("chartFaturamentoAnual");
      const resumo = document.getElementById("resumoFaturamentoAnual");
      if (!canvas) return;

      const resp = await fetch(`${BASE_URL}/v2/pedidos/total/anual${buildDashQS()}`, { credentials: "include" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
      const balcao = Array(12).fill(0);
      const entrega = Array(12).fill(0);

      (data || []).forEach(r => {
        const m = Math.max(1, Math.min(12, parseInt(r.mes, 10))) - 1;
        const canal = String(r.pvcanal || "").trim().toUpperCase();
        const v = parseFloat(r.vl_total_mes) || 0;
        if (canal === "BALCAO" || canal === "BALCÃO") balcao[m] += v;
        else if (canal === "ENTREGA") entrega[m] += v;
      });

      const totalAno = [...balcao, ...entrega].reduce((a, b) => a + b, 0);

      if (chartFaturamentoAnual) chartFaturamentoAnual.destroy();
      const ctx = prepareHiDPICanvas(canvas, 360);

      chartFaturamentoAnual = new Chart(ctx, {
        type: "bar",
        data: {
          labels: MESES,
          datasets: [
            {
              label: "BALCÃO",
              data: balcao,
              backgroundColor: "#1E88E5", // troque cores se quiser
              borderColor: "#1565C0",
              borderWidth: 1,
              borderRadius: 6,
              borderSkipped: false
            },
            {
              label: "ENTREGA",
              data: entrega,
              backgroundColor: "#43A047",
              borderColor: "#2E7D32",
              borderWidth: 1,
              borderRadius: 6,
              borderSkipped: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: v => brl(v) },
              title: { display: true, text: "Venda em (R$)" },
              grid: { drawBorder: false }
            },
            x: { grid: { display: false }, title: { display: true, text: "Meses" } }
          },
          plugins: {
            legend: { position: "top" },
            tooltip: { callbacks: { label: c => `${c.dataset.label}: ${brl(c.parsed.y)}` } }
          },
          categoryPercentage: 0.7,
          barPercentage: 0.85
        }
      });

      if (resumo) resumo.textContent = `Total do ano: ${brl(totalAno)}`;
    }

    // init + resize
    const initAnual = () => carregarFaturamentoAnualVertical().catch(e => {
      console.error("Erro anual:", e);
      const r = document.getElementById("resumoFaturamentoAnual");
      if (r) { r.textContent = "Erro ao carregar faturamento anual."; r.classList.add("text-danger"); }
    });

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAnual);
    else initAnual();

    window.addEventListener("resize", throttleDash(initAnual, 200));

  // Deixa o canvas nítido em monitores HiDPI/Retina
    function prepareHiDPICanvas(canvas, cssHeightPx = 340) {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();

      // define o tamanho CSS (em px lógicos)
      canvas.style.width = rect.width + "px";
      canvas.style.height = cssHeightPx + "px";

      // define o tamanho real do buffer do canvas (em px físicos)
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(cssHeightPx * dpr);

      // escala o contexto para não “estourar” os elementos
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return ctx;
    }

    // Throttle simples para resize
    function throttle(fn, wait = 150) {
      let t = 0;
      return (...args) => {
        const now = Date.now();
        if (now - t > wait) { t = now; fn(...args); }
      };
    }

    let chartFaturamentoDia; // referência para destruir/recriar no resize
    

    async function carregarFaturamentoDiarioNitido() {
      const canvas = document.getElementById("chartFaturamentoDia");
      const resumo = document.getElementById("chartFaturamentoDiaResumo");
      if (!canvas) return;

      // fetch (mesmo do código anterior)
      const resp = await fetch(`${BASE_URL}/v2/pedidos/total/dia${buildDashQS()}`, { credentials: "include" });
      const data = await resp.json();

      const agrupado = {};
      (data || []).forEach(i => {
        const canal = (i.pvcanal || "").trim() || "—";
        const v = parseFloat(i.vl_total_dia) || 0;
        agrupado[canal] = (agrupado[canal] || 0) + v;
      });

      const labels = Object.keys(agrupado);
      const valores = Object.values(agrupado);
      const total = valores.reduce((a, b) => a + b, 0);
      const brl = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

      // destrói chart antigo se existir
      if (chartFaturamentoDia) chartFaturamentoDia.destroy();

      // prepara canvas HiDPI e cria chart
      const ctx = prepareHiDPICanvas(canvas, 340);
      chartFaturamentoDia = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            backgroundColor: ["#3949ab", "#00acc1"],
            borderColor: "#fff",
            borderWidth: 1,
            label: "Venda (R$)",
            data: valores,
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 5,
            borderRadius: 6,
            borderSkipped: false // cantos arredondados
            // sem cores custom pra respeitar seu tema
          }]
        },
        options: {
          indexAxis: 'y',
          scales: { x: { beginAtZero: true } }
        }
      });

      if (resumo) resumo.textContent = `Total do dia: ${brl(total)}`;
    }

    // carrega e re-renderiza com nitidez no resize
    const iniciarFaturamentoDia = () => carregarFaturamentoDiarioNitido();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", iniciarFaturamentoDia);
    } else {
      iniciarFaturamentoDia();
    }
    window.addEventListener("resize", throttle(() => {
      // Recria o gráfico ajustando o buffer do canvas ao novo tamanho
      carregarFaturamentoDiarioNitido();
    }, 200));

    // Expõe as funções de gráfico globalmente para que o botão Aplicar possa chamá-las
    window.carregarFaturamentoAnualVertical = carregarFaturamentoAnualVertical;
    window.carregarFaturamentoDiarioNitido = carregarFaturamentoDiarioNitido;

});

    async function jget(path, fallback = null) {
      try {
        const r = await fetch(API(path), optAuth);
        if (!r.ok) throw new Error(path + " => " + r.status);
        return await r.json();
      } catch (e) {
        console.warn("Falha em", path, e.message);
        return fallback;
      }
    }

    function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

    // Paleta consistente com Bootstrap
    const COLORS = {
      primary:  "#0d6efd",
      purple:   "#6f42c1",
      orange:   "#fd7e14",
      green:    "#198754",
      teal:     "#20c997",
      yellow:   "#ffc107",
      red:      "#dc3545",
      gray600:  "#6c757d",
      gray400:  "#adb5bd"
    };
    const PALETTE = [
      COLORS.primary, COLORS.purple, COLORS.orange, COLORS.green, COLORS.red,
      COLORS.teal, COLORS.yellow, "#0dcaf0", "#6610f2", "#198754"
    ];

    // Chart.js helpers com layout corrigido
    function baseOptions(overrides={}) {
      return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: "easeOutQuart" },
        plugins: {
          legend: { position: "bottom", labels: { usePointStyle: true, pointStyle: "circle" } },
          tooltip: {
            callbacks: {
              label(ctx) {
                const v = ctx.raw ?? 0;
                return ` ${ctx.label}: ${v}`;
              }
            }
          }
        },
        layout: { padding: { top: 8, right: 8, bottom: 8, left: 8 } },
        ...overrides
      };
    }

    function chartDoughnut(ctx, labels, data, colors) {
      return new Chart(ctx, {
        type: "doughnut",
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderWidth: 0,
            hoverOffset: 8
          }]
        },
        options: baseOptions({ cutout: "58%" })
      });
    }

    function chartBar(ctx, labels, data, colors) {
      return new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderRadius: 8,
            borderWidth: 0
          }]
        },
        options: baseOptions({
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, grid: { color: "rgba(108,117,125,.15)" } },
                    x: { grid: { display: false } } }
        })
      });
    }

    async function loadDashboard() {
      // KPIs: pedidos
      const pend = await jget("/pedidos/pendentescountNow", []);
      const conf = await jget("/pedidos/total/confirmadosNow", []);
      const balcao = await jget("/pedidos/balcaoNow", []);
      const entrega = await jget("/pedidos/entregaNow", []);
      const emfalta = await jget("/total/produto/emfalta", []);
      const acabando = await jget("/total/produto/acabando", []);

      const pendentesCount = toNum(pend?.[0]?.count);
      const confirmadosCount = toNum(conf?.[0]?.count);
      const balcaoCount = toNum(balcao?.[0]?.count);
      const entregaCount = toNum(entrega?.[0]?.count);
      const emfaltaCount = toNum(emfalta?.[0]?.count);
      const acabandoCount = toNum(acabando?.[0]?.count);

      setText("kpiEmFalta", emfaltaCount);
      setText("kpiAcabando", acabandoCount);

      setText("kpiPendentes", pendentesCount);
      setText("kpiConfirmados", confirmadosCount);

      // KPIs: clientes e vendedores
      const clientes = await jget("/cli", { total: 0, data: [] });
      const vendedores = await jget("/vendedor/listar", []);
      setText("kpiClientes", toNum(clientes?.total ?? clientes?.length ?? 0));
      setText("kpiVendedores", vendedores?.length ?? 0);

      // KPIs secundários
      const marcas = await jget("/marcas", []);
      setText("kpiMarcas", marcas?.length ?? 0);

      // Estoque (listas)
      const comEstoque = await jget("/proComEstoque", []);
      const semEstoque = await jget("/proSemEstoque", []);

      // ===== Gráficos =====
      // 1) Pedidos (doughnut p/ evitar "pizza esmagada" com valores desbalanceados)
      chartDoughnut(
        document.getElementById("chartPedidos"),
        ["Pendentes", "Confirmados"],
        [pendentesCount, confirmadosCount],
        [COLORS.primary, COLORS.purple]
      );

      // 2) Canais
      chartDoughnut(
        document.getElementById("chartCanais"),
        ["Balcão", "Entrega"],
        [balcaoCount, entregaCount],
        [COLORS.blue || COLORS.primary, COLORS.red]
      );

      // 3) Estoque (barras)
      chartBar(
        document.getElementById("chartEstoque"),
        ["Com estoque", "Sem estoque"],
        [comEstoque.length, semEstoque.length],
        [COLORS.green, COLORS.gray400]
      );

      // 4) Top 5 Marcas com estoque
      const porMarca = {};
      (comEstoque || []).forEach((p) => {
        const m = p.marcasdes || "—";
        porMarca[m] = (porMarca[m] || 0) + 1;
      });
      const top = Object.entries(porMarca).sort((a,b) => b[1]-a[1]).slice(0,5);
      chartBar(
        document.getElementById("chartTopMarcas"),
        top.map(([k]) => k),
        top.map(([,v]) => v),
        top.map((_,i) => PALETTE[i % PALETTE.length])
      );
    }

    document.addEventListener("DOMContentLoaded", loadDashboard);

let chartTopProdutosMes;

    async function carregarTopProdutosMes() {
      const canvas = document.getElementById("chartTopProdutosMes");
      const resumo = document.getElementById("resumoTopProdutosMes");
      if (!canvas) return;

      // 1) Buscar dados
      const resp = await fetch(`${BASE_URL}/v2/top/produtos/mes${buildDashQS()}`, { credentials: "include" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      // 2) Normalizar -> ordenar por qtde desc -> pegar TOP 10
      const rows = (data || [])
        .map(r => ({
          procod: r.procod,
          produto: String(r.produto || "").trim(),
          qtde: Number(r.qtde) || 0
        }))
        .sort((a, b) => b.qtde - a.qtde)
        .slice(0, 10);

      if (rows.length === 0) {
        if (resumo) resumo.textContent = "Sem vendas no mês.";
        return;
      }

      const labels = rows.map(r => r.produto.length > 45 ? r.produto.slice(0, 45) + "…" : r.produto);
      const valores = rows.map(r => r.qtde);
      const totalItens = valores.reduce((a, b) => a + b, 0);

      // 3) (Re)criar gráfico HiDPI
      if (chartTopProdutosMes) chartTopProdutosMes.destroy();
      const ctx = prepareHiDPICanvas(canvas, 420);

      // Paleta sólida alternada
      const cores = valores.map((_, i) => i % 2 === 0 ? "#0d6efd" : "#198754"); // Azul + Verde
      const coresBorder = valores.map((_, i) => i % 2 === 0 ? "#0b5ed7" : "#146c43");

      chartTopProdutosMes = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Qtd. vendida",
            data: valores,
            backgroundColor: cores,
            borderColor: coresBorder,
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                precision: 0, // evita casas decimais
                stepSize: 1
              },
              title: { display: true, text: "Quantidade vendida" },
              grid: { drawBorder: false }
            },
            y: {
              grid: { display: false },
              ticks: { autoSkip: false }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => rows[items[0].dataIndex].produto,
                label: (ctx) => `Qtde: ${ctx.parsed.x}`
              }
            },
            datalabels: {
              anchor: "end",
              align: "right",
              formatter: v => v,
              color: "#212529",
              font: { weight: "bold", size: 11 }
            }
          },
          animation: false,
          categoryPercentage: 0.6,
          barPercentage: 0.8
        },
        plugins: [ChartDataLabels] // precisa do plugin
      });

      if (resumo)
        resumo.textContent = `Top ${rows.length} produtos — Total itens vendidos: ${totalItens}`;
    }


    // init + resize
    const initTopProdutosMes = () => carregarTopProdutosMes().catch(e => {
      console.error("Erro Top Produtos Mês:", e);
      const r = document.getElementById("resumoTopProdutosMes");
      if (r) { r.textContent = "Erro ao carregar Top Produtos."; r.classList.add("text-danger"); }
    });

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initTopProdutosMes);
    else initTopProdutosMes();



  let chartTopMarcasMes;

    async function carregarTopMarcasMes() {
      const canvas = document.getElementById("chartTopMarcasMes");
      const resumo = document.getElementById("resumoTopMarcasMes");
      if (!canvas) return;

      // Fetch
      const resp = await fetch(`${BASE_URL}/v2/top/marcas/mes${buildDashQS()}`, { credentials: "include" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      // Normaliza, ordena desc por valor (R$)
      const rows = (data || [])
        .map(r => ({
          marca: String(r.marcasdes || "").trim(),
          valor: parseFloat(String(r.valor || "0").replace(",", "."))
        }))
        .filter(r => r.valor > 0)
        .sort((a, b) => b.valor - a.valor);

      if (rows.length === 0) {
        if (resumo) resumo.textContent = "Sem faturamento por marca no mês.";
        return;
      }

      // Labels e valores
      const labels = rows.map(r => r.marca.toUpperCase());
      const valores = rows.map(r => r.valor);
      const total = valores.reduce((a, b) => a + b, 0);

      // Cores sólidas por marca (ajuste à vontade)
      const corMarca = (m) => {
        const x = m.toUpperCase();
        if (x.includes("IPHONE") || x.includes("APPLE")) return "#0d6efd"; // azul
        if (x.includes("SAMSUNG")) return "#198754"; // verde
        if (x.includes("MOTOROLA")) return "#ff9800"; // laranja
        if (x.includes("XIAOMI")) return "#e53935"; // vermelho
        if (x.includes("REALME")) return "#6f42c1"; // roxo
        if (x.includes("NOKIA")) return "#00acc1"; // ciano
        if (x.includes("LG")) return "#d63384"; // magenta
        return "#6c757d"; // fallback
      };
      const bg = labels.map(corMarca);
      const border = labels.map(() => "#ffffff");

      // (Re)cria HiDPI
      if (chartTopMarcasMes) chartTopMarcasMes.destroy();
      const ctx = prepareHiDPICanvas(canvas, 360);

      chartTopMarcasMes = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Venda (R$)",
            data: valores,
            backgroundColor: bg,
            borderColor: border,
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: v => brl(v) },
              title: { display: true, text: "Venda (R$)" },
              grid: { drawBorder: false }
            },
            x: {
              grid: { display: false },
              title: { display: true, text: "Marcas" }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${brl(ctx.parsed.y)}`,
                afterLabel: (ctx) => {
                  const v = ctx.parsed.y || 0;
                  const pct = total ? ((v / total) * 100) : 0;
                  return `Participação: ${pct.toFixed(1)}%`;
                }
              }
            }
          },
          categoryPercentage: 0.7,
          barPercentage: 0.85
        }
      });

      if (resumo) {
        const top = rows[0];
        const pctTop = total ? (top.valor / total * 100).toFixed(1) : "0.0";
        resumo.textContent = `Total do mês: ${brl(total)} — Top: ${top.marca} (${brl(top.valor)} • ${pctTop}%)`;
      }
    }

    // init + resize
    const initTopMarcasMes = () => carregarTopMarcasMes().catch(e => {
      console.error("Erro Top Marcas:", e);
      const r = document.getElementById("resumoTopMarcasMes");
      if (r) { r.textContent = "Erro ao carregar Top Marcas."; r.classList.add("text-danger"); }
    });

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initTopMarcasMes);
    else initTopMarcasMes();

    //window.addEventListener("resize", throttleDash(initTopProdutosMes, 200));
  

