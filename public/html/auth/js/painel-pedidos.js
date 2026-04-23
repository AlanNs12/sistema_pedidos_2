// Inicio filtro
// filtro de data: formata Date para yyyy-mm-dd
function toInputDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const select = document.getElementById("filtroPeriodoSelect");
const inputInicio = document.getElementById("filtroDataInicio");
const inputFim = document.getElementById("filtroDataFim");
const btnAplicar = document.getElementById("btnAplicarFiltroPeriodo");
const btnLimpar = document.getElementById("btnLimparFiltroPeriodo");
const tabelaConfirmados = document.getElementById("corpoTabelaConfirmados"); // onde preencher
const tabelaPendentes = document.getElementById("corpoTabela");

function setRange(startDate, endDate) {
  inputInicio.value = startDate ? toInputDate(startDate) : "";
  inputFim.value = endDate ? toInputDate(endDate) : "";
}

function enableDateInputs(enable) {
  inputInicio.disabled = !enable;
  inputFim.disabled = !enable;
}

function applyPreset(preset) {
  const today = new Date();
  let start = null;
  let end = null;

  if (preset === "hoje") {
    start = new Date(today);
    end = new Date(today);
  } else if (preset === "ult7") {
    // últimos 7 dias: de (hoje -6) até hoje -> 7 dias inclusive
    start = new Date(today);
    start.setDate(today.getDate() - 6);
    end = new Date(today);
  } else if (preset === "ult30") {
    start = new Date(today);
    start.setDate(today.getDate() - 29);
    end = new Date(today);
  } else if (preset === "todos") {
    start = null;
    end = null;
  } else if (preset === "personalizado") {
    // não altera valores, apenas habilita edição
  }

  setRange(start, end);
  enableDateInputs(preset === "personalizado");
}

// on change do select
select.addEventListener("change", function () {
  applyPreset(this.value);
});

// limpar botão
btnLimpar.addEventListener("click", function () {
  select.value = "todos";
  applyPreset("todos");
  // opcional: limpar tabela
  tabelaConfirmados.innerHTML = "";
  tabelaPendentes.innerHTML = "";
});

// Fim filtro

function formatarMoeda(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

//buscar usuario logado
async function buscarUsuario() {
  try {
    const response = await fetch(`${BASE_URL}/usuario/viuversao`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    if (response.ok) {
      const data = await response.json();
      return data.usucod;
    } else {
      console.error("Erro ao buscar usuário:", response.statusText);
      return null;
    }
  } catch (error) {
    console.error("Erro na requisição:", error);
    return null;
  }
}

// Carrega os totais de marcas, modelos, tipos e peças
// função para atualizar os cards de totais (pode ser chamada após confirmar/cancelar)
async function atualizarTotaisPedidos() {
  try {
    const [pedidos, pvBalcao, pvEntrega, pvConfirmados] = await Promise.all([
      fetch(`${BASE_URL}/pedidos/pendentescount`).then((r) => r.json()),
      fetch(`${BASE_URL}/pedidos/balcao`).then((r) => r.json()),
      fetch(`${BASE_URL}/pedidos/entrega`).then((r) => r.json()),
      fetch(`${BASE_URL}/pedidos/total/confirmados`).then((r) => r.json()),
    ]);

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText("totalPedPendentes", pedidos?.[0]?.count ?? 0);
    setText("totalPedBalcao", pvBalcao?.[0]?.count ?? 0);
    setText("totalPedEntrega", pvEntrega?.[0]?.count ?? 0);
    setText("totalPedConfirmados", pvConfirmados?.[0]?.count ?? 0);
  } catch (err) {
    console.error("Erro ao carregar totais", err);
  }
}

// expõe a função para uso externo (ex: chamar após confirmar/cancelar)
window.atualizarTotaisPedidos = atualizarTotaisPedidos;

// chama uma vez ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
  atualizarTotaisPedidos();
  //console.log(localStorage.getItem("usucod"));
});

async function abriDetalhePedido(pvcod, status = "pendentes") {
  try {
    // tenta buscar detalhes do pedido (ajuste endpoint se necessário)
    const res = await fetch(`${BASE_URL}/pedido/detalhe/${pvcod}`);
    const data = await res.json();
    const pedido = data.pedido || data || {};

    // cria modal se não existir
    let modalEl = document.getElementById("pedidoDetalheModal");

    if (!modalEl) {
      modalEl = document.createElement("div");
      modalEl.id = "pedidoDetalheModal";
      modalEl.className = "modal fade";
      modalEl.tabIndex = -1;
      document.body.appendChild(modalEl);
    }

    // Atualiza o conteúdo do modal dinamicamente
    modalEl.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Detalhes do Pedido #${pvcod}${status === "confirmados" ? ' <span class="badge bg-success ms-2">Aprovado</span>' : ''}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div class="modal-body">
            <div id="pedidoDetalheConteudo">Carregando...</div>
          </div>
          <div class="modal-footer">
            <button type="button" id="btnCancelarPedidoModal" class="btn btn-danger">Cancelar Pedido</button>
            ${
              status !== "confirmados"
                ? '<button type="button" id="btnConfirmarPedidoModal" class="btn btn-success w-25">Confirmar Pedido</button>'
                : '<button type="button" id="btnEditarPedidoModal" class="btn btn-warning"><i class="bi bi-pencil-square me-1"></i>Editar Pedido</button>'
            }
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
          </div>
        </div>
      </div>
    `;

    // Aqui você pode inicializar o Bootstrap Modal
    const bootstrapModal = new bootstrap.Modal(modalEl);
    bootstrapModal.show();

    const linhasItens = pedido.length
      ? pedido
          .map((it, i) => {
            const descricao = it.prodes || "";
            const cornome = it.pviprocorid ? ` (${it.cornome})` : "";
            const qtd = it.pviqtde ?? 0;
            const preco = it.pvivl ?? 0;
            const subtotal = it.pvivl * it.pviqtde ?? 0;
            const procod = it.pviprocod || 0;
            const pviprocorid = it.pviprocorid || "";
            const pv = it.pvcod || pvcod;
            // For confirmed orders: inputs are disabled by default (enabled when "Editar" is clicked)
            const inputDisabled = status === "confirmados" ? "disabled" : "";
            return `<tr>
              <td class="text-center" data-procod="${procod}" data-pviprocorid="${pviprocorid}">${i + 1}</td>
              <td>${descricao}${cornome}</td>
              <td style="padding: 0.2rem;">
                <input type="number" class="form-control form-control-sm text-end qtd-input" 
                      data-procod="${procod}"
                      data-pviprocorid="${pviprocorid}"
                      value="${Math.floor(qtd)}" 
                      min="0"
                      ${inputDisabled}
                      style="width: 100%; height: auto; border-radius: 0.25rem; padding: 0.25rem;">
              </td>
              <td class="text-end">${formatarMoeda(preco)}</td>
              <td class="text-end">${formatarMoeda(subtotal)}</td>
              <td class="text-center">

              </td>
            </tr>`;
          })
          .join("")
      : `<tr><td colspan="6" class="text-center">Nenhum item encontrado</td></tr>`;

    const totalPedido = pedido.reduce(
      (acc, item) => acc + (item.pvivl * item.pviqtde ?? 0),
      0
    );

    const conteudoHtml = `
      <div class="table-responsive">
        <table class="table table-sm">
          <thead>
            <tr>
              <th class="text-center">#</th>
              <th>Item</th>
              <th class="text-end">Qtd</th>
              <th class="text-end">Unit.</th>
              <th class="text-end">Subtotal</th>
              <th class="text-center"></th>
            </tr>
          </thead>
          <tbody>
            ${linhasItens}
          </tbody>
          <tfoot>
            <tr>
              <th colspan="4" class="text-end">Total</th>
              <th class="text-end">${formatarMoeda(totalPedido)}</th>
            </tr>
            ${
              pedido.pvobs
                ? `<tr><td colspan="5"><strong>Obs:</strong> ${pedido.pvobs}</td></tr>`
                : ""
            }
          </tfoot>
        </table>
      </div>
    `;

    const conteudoEl = modalEl.querySelector("#pedidoDetalheConteudo");
    if (conteudoEl) conteudoEl.innerHTML = conteudoHtml;

    // configura botões (remove listeners antigos)
    const btnConfirm = modalEl.querySelector("#btnConfirmarPedidoModal");
    const btnCancel = modalEl.querySelector("#btnCancelarPedidoModal");
    const btnEditar = modalEl.querySelector("#btnEditarPedidoModal");

    // remove handlers anteriores para evitar múltiplas chamadas
    if (btnConfirm) {
      btnConfirm.replaceWith(btnConfirm.cloneNode(true));
    }
    if (btnCancel) {
      btnCancel.replaceWith(btnCancel.cloneNode(true));
    }
    if (btnEditar) {
      btnEditar.replaceWith(btnEditar.cloneNode(true));
    }

    const newBtnConfirm = modalEl.querySelector("#btnConfirmarPedidoModal");
    const newBtnCancel = modalEl.querySelector("#btnCancelarPedidoModal");
    const newBtnEditar = modalEl.querySelector("#btnEditarPedidoModal");

    if (newBtnConfirm) {
      newBtnConfirm.addEventListener("click", async () => {
        try {
          // Pega todas as linhas de itens
          const linhas = modalEl.querySelectorAll("tbody tr");
          const itens = [];
          linhas.forEach((tr) => {
            const cellProcod = tr.querySelector("[data-procod]");
            const inputQtd = tr.querySelector(".qtd-input");

            // garante que ambos existam
            if (cellProcod && inputQtd) {
              const procod = Number(cellProcod.dataset.procod);
              const qtd = Number(inputQtd.value);
              const pviprocorid = inputQtd.dataset.pviprocorid || null;
              itens.push({ procod, qtd, pviprocorid });
            }
          });

          // Fluxo de confirmação do pedido:
          // 1. Confirma cada item do pedido (atualiza quantidades)
          for (const item of itens) {
            await confirmarItensPedido(pvcod, item.qtd, item.procod, item.pviprocorid);
          }

          // 2. Confirma o pedido - a saída de estoque é processada automaticamente
          // pelo trigger de banco de dados (public.atualizar_saldo)
          await confirmarPedido(pvcod);

          // 4. Fecha o modal ao fim
          const m = bootstrap.Modal.getInstance(modalEl);
          m.hide();
        } catch (err) {
          console.error("Erro ao confirmar via modal:", err);
          alert("Erro ao confirmar pedido.");
        } finally {
          window.location.reload();
        }
      });
    }

    // Botão Editar Pedido Aprovado: habilita/desabilita edição dos inputs de quantidade
    if (newBtnEditar) {
      let modoEdicao = false;
      newBtnEditar.addEventListener("click", async () => {
        if (!modoEdicao) {
          // Entra no modo de edição: habilita os inputs de quantidade
          modoEdicao = true;
          newBtnEditar.innerHTML = '<i class="bi bi-check-lg me-1"></i>Salvar Edição';
          newBtnEditar.classList.remove("btn-warning");
          newBtnEditar.classList.add("btn-success");
          modalEl.querySelectorAll(".qtd-input").forEach((input) => {
            input.disabled = false;
            input.classList.add("border-warning");
          });
        } else {
          // Salva as alterações
          const linhas = modalEl.querySelectorAll("tbody tr");
          const itens = [];
          linhas.forEach((tr) => {
            const cellProcod = tr.querySelector("[data-procod]");
            const inputQtd = tr.querySelector(".qtd-input");
            if (cellProcod && inputQtd) {
              const rawCor = inputQtd.dataset.pviprocorid;
              const pviprocorid = (rawCor === "" || rawCor === undefined || rawCor === "null" || rawCor === "0")
                ? null
                : Number(rawCor) || null;
              itens.push({ procod: Number(cellProcod.dataset.procod), pviqtde: Number(inputQtd.value), pviprocorid });
            }
          });

          try {
            newBtnEditar.disabled = true;
            newBtnEditar.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Salvando...';

            const resp = await fetch(`${BASE_URL}/pedidos/confirmados/${pvcod}/itens`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ itens }),
            });

            if (!resp.ok) {
              const err = await resp.json().catch(() => ({}));
              throw new Error(err.error || "Erro ao salvar edição");
            }

            alert("Pedido editado com sucesso!");
            const m = bootstrap?.Modal?.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            m.hide();
            window.location.reload();
          } catch (err) {
            console.error("Erro ao salvar edição:", err);
            alert(err.message || "Erro ao salvar edição do pedido.");
            newBtnEditar.disabled = false;
            newBtnEditar.innerHTML = '<i class="bi bi-check-lg me-1"></i>Salvar Edição';
          }
        }
      });
    }

    if (newBtnCancel) {
      newBtnCancel.addEventListener("click", async () => {
        if (!confirm("Tem certeza que deseja cancelar este pedido?")) return;
        try {
          await cancelarPv(pvcod);
          const m =
            bootstrap?.Modal?.getInstance(modalEl) ||
            new bootstrap.Modal(modalEl);
          m.hide();
        } catch (err) {
          console.error("Erro ao cancelar via modal:", err);
          alert("Erro ao cancelar pedido.");
        }
      });
    }

    // mostra o modal (requer Bootstrap 5)
    if (window.bootstrap && window.bootstrap.Modal) {
      const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
      modalInstance.show();
    } else {
      // fallback simples se Bootstrap não estiver disponível
      modalEl.classList.add("show");
      modalEl.style.display = "block";
      modalEl.removeAttribute("aria-hidden");
    }
  } catch (err) {
    console.error("Erro ao abrir detalhe do pedido:", err);
    alert("Não foi possível carregar os detalhes do pedido.");
  }
}

// cancelar item
async function cancelarItem(procod, pvcod) {
  try {
    const response = await fetch(
      `${BASE_URL}/pedidos/itens/cancelar/${pvcod}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ procod: procod }),
      }
    );
    if (response.ok) {
      alert("Item cancelado com sucesso!");
      location.reload();
      // Atualize a interface do usuário conforme necessário
    } else {
      alert("Erro ao cancelar o item.");
    }
  } catch (error) {
    console.error("Erro ao cancelar o item:", error);
    alert("Erro ao cancelar o item.");
  }
}

// cancelar Pedido
async function cancelarPv(pvcod) {
  try {
    const response = await fetch(`${BASE_URL}/v2/pedidos/cancelar/${pvcod}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pvcod: pvcod }),
    });
    if (response.ok) {
      alert("Pedido cancelado com sucesso!");
      location.reload();
      // Atualize a interface do usuário conforme necessário
    } else {
      alert("Erro ao cancelar o Pedido.");
    }
  } catch (error) {
    console.error("Erro ao cancelar o Pedido:", error);
    alert("Erro ao cancelar o Pedido.");
  }
}

// confirmação de pedidos
async function confirmarPedido(pvcod) {
  try {
    const response = await fetch(`${BASE_URL}/pedidos/confirmar/${pvcod}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pvrcacod: await buscarUsuario(),
      }),
    });
  } catch (error) {
    console.error("Erro ao confirmar o pedido:", error);
    alert("Erro ao confirmar o pedido.");
  }
}

async function confirmarItensPedido(pvcod, pviqtde, procod, pviprocorid) {
  try {
    const response = await fetch(
      `${BASE_URL}/pedidos/itens/confirmar/${pvcod}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pviqtde: pviqtde, procod: procod, pviprocorid }),
      }
    );
    if (response.ok) {
      //console.log("Item confirmado com sucesso!  procod:", procod);
      // alert("Pedido confirmado com sucesso!");
      // Atualize a interface do usuário conforme necessário
    } else {
      // alert("Erro ao confirmar o pedido.");
    }
  } catch (error) {
    console.error("Erro ao confirmar itens do pedido pedido:", error);
    alert("Erro ao confirmar itens do pedido pedido.");
  }
}

async function cancelarPedido(pvcod) {
  try {
    const response = await fetch(`${BASE_URL}/pedidos/cancelar/${pvcod}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.ok) {
      // Recarrega a tabela de pedidos sem recarregar a página
      const res = await fetch(`${BASE_URL}/pedidos/listar`);
      const dados = await res.json();
      const corpoTabela = document.getElementById("corpoTabela");
      corpoTabela.innerHTML = ""; // limpa o conteúdo atual da tabela

      dados.forEach((dado) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="text-center">${dado.pvcod}</td>
          <td class="text-center">${formatarMoeda(dado.pvvl)}</td>
          <td class="text-center">
            <div class="d-flex justify-content-center align-items-center gap-2">
              <button type="button" class="btn btn-primary btn-sm" onclick="abriDetalhePedido(${
                dado.pvcod
              }, 'confirmados')">
                <i class="bi bi-search"></i>
              </button>
            </div>          
          </td>
        `;
        corpoTabela.appendChild(tr);
        atualizarTotaisPedidos();
      });

      // alert("Pedido cancelado com sucesso!");
      // Atualize a interface do usuário conforme necessário
    } else {
      // alert("Erro ao cancelar o pedido.");
    }
  } catch (error) {
    console.error("Erro ao cancelar o pedido:", error);
    alert("Erro ao cancelar o pedido.");
  }
}

//inicio tabela
// PEDIDOS FINALIZADOS
(function () {
  // função que faz fetch (adapte a URL / parâmetros conforme sua API)
  async function fetchPedidosFinalizados(params = {}) {
    // Exemplo: endpoint que aceita dataInicio e dataFim no formato YYYY-MM-DD
    const qs = new URLSearchParams();
    if (params.dataInicio) qs.set("dataInicio", params.dataInicio);
    if (params.dataFim) qs.set("dataFim", params.dataFim);

    // Ajuste a URL para o seu endpoint real:
    const url = `${BASE_URL}/pedidos/confirmados?` + qs.toString();

    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar pedidos: " + res.status);
      const data = await res.json();

      // Preencher tabela - adapte conforme o formato de 'data' da sua API
      tabelaConfirmados.innerHTML = ""; // limpa
      if (Array.isArray(data) && data.length) {
        data.forEach((dado) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
          <td class="text-center" style="color: green;">${dado.pvcod}</td>
          <td class="text-center" style="color: green;">${dado.pvcanal}</td>
          <td class="text-center" style="color: green;">${
            dado.usunome || "Sem Vendedor"
          }</td>
          <td class="text-right" style="color: green;">${formatarMoeda(
            dado.pvvl
          )}</td>
          <td class="text-center">
            <div class="d-flex justify-content-center align-items-center gap-2">
              <button type="button" class="button-color-4" onclick="abriDetalhePedido(${
                dado.pvcod
              }, 'confirmados')">
                <i class="fa-solid fa-eye"></i>
              </button>
            </div>          
          </td>
        `;
          tabelaConfirmados.appendChild(tr);
        });
      } else {
        tabelaConfirmados.innerHTML =
          '<tr><td colspan="5">Nenhum pedido encontrado para o período selecionado.</td></tr>';
      }
    } catch (err) {
      console.error(err);
      tabelaConfirmados.innerHTML = `<tr><td colspan="5">Erro ao carregar pedidos.</td></tr>`;
    }
  }

  // PEDIDOS PENDENTES

  // função que faz fetch (adapte a URL / parâmetros conforme sua API)
  async function fetchPedidosPendentes(params = {}) {
    // Exemplo: endpoint que aceita dataInicio e dataFim no formato YYYY-MM-DD
    const qs = new URLSearchParams();
    if (params.dataInicio) qs.set("dataInicio", params.dataInicio);
    if (params.dataFim) qs.set("dataFim", params.dataFim);

    // Ajuste a URL para o seu endpoint real:
    const url = `${BASE_URL}/pedidos/pendentes?` + qs.toString();

    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar pedidos: " + res.status);
      const data = await res.json();

      // Preencher tabela - adapte conforme o formato de 'data' da sua API
      tabelaPendentes.innerHTML = ""; // limpa
      if (Array.isArray(data) && data.length) {
        data.forEach((dado) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
          <td class="text-center">${dado.pvcod}</td>
          <td class="text-center">${dado.pvcanal}</td>
          <td class="text-center">${dado.usunome || "Sem Vendedor"}</td>
          <td class="text-center">${formatarMoeda(dado.pvvl)}</td>
          <td class="text-center">
            <div class="d-flex justify-content-center align-items-center gap-2">
              <button type="button" class="button-color-3" onclick="abriDetalhePedido(${
                dado.pvcod
              })">
                <i class="fa-solid fa-wrench"></i>
              </button>
            </div>          
          </td>
        `;
          tabelaPendentes.appendChild(tr);
        });
      } else {
        tabelaPendentes.innerHTML =
          '<tr><td colspan="5">Nenhum pedido encontrado para o período selecionado.</td></tr>';
      }
    } catch (err) {
      console.error(err);
      tabelaPendentes.innerHTML = `<tr><td colspan="5">Erro ao carregar pedidos.</td></tr>`;
    }
  }
  //Fim tabela
  // Aplicar botão: monta params e chama fetch
  btnAplicar.addEventListener("click", function () {
    const inicio = inputInicio.value || null;
    const fim = inputFim.value || null;

    // Se select é 'todos' e não tem datas, chamar sem filtros
    if (select.value === "todos" && !inicio && !fim) {
      fetchPedidosFinalizados();
      fetchPedidosPendentes();
      return;
    }

    // Se uma das datas estiver preenchida sem a outra, você pode decidir:
    // - forçar que ambas existam, ou
    // - completar fim = inicio, etc. Aqui vamos permitir inicio ou fim individual.
    fetchPedidosFinalizados({ dataInicio: inicio, dataFim: fim });
    fetchPedidosPendentes({ dataInicio: inicio, dataFim: fim });
  });

  // inicializa com últimos 7 dias (opcional). Se preferir começar com 'todos', troque para 'todos'
  select.value = "hoje";
  applyPreset("hoje");
  // e já carrega os pedidos dos últimos 7 dias automaticamente:
  btnAplicar.click();
})();
