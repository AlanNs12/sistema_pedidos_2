function formatarMoeda(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Carrega os totais de marcas, modelos, tipos e peças
// função para atualizar os cards de totais (pode ser chamada após confirmar/cancelar)
async function atualizarTotaisPedidos() {
  try {
    const [pedidos, pvBalcao, pvEntrega, pvConfirmados] = await Promise.all([
      fetch(`${BASE_URL}/pedidos/pendentes`).then((r) => r.json()),
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
});

// pedidos pedentes
document.addEventListener("DOMContentLoaded", function () {
  fetch(`${BASE_URL}/v2/pedidos/listar`)
    .then((res) => res.json())
    .then((dados) => {
      const corpoTabela = document.getElementById("corpoTabela");
      corpoTabela.innerHTML = ""; // limpa o conteúdo atual da tabela

      dados.forEach((dado) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="text-center">${dado.pvcod}</td>
          <td class="text-center">${formatarMoeda(dado.pvvl)}</td>
          <td class="text-center">
            <div class="d-flex justify-content-center align-items-center gap-2">
              <button type="button" class="btn btn-primary btn-sm" onclick="abriDetalhePedido(${dado.pvcod
          })">
                <i class="bi bi-search"></i>
              </button>
            </div>          
          </td>
        `;
        corpoTabela.appendChild(tr);
      });
    })
    .catch((erro) => console.error("Erro ao carregar pedidos:", erro));
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
            <h5 class="modal-title">Detalhes do Pedido</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div class="modal-body">
            <div id="pedidoDetalheConteudo">Carregando...</div>
          </div>
          <div class="modal-footer">
            <button type="button" id="btnCancelarPedidoModal" class="btn btn-danger">Cancelar Pedido</button>
            ${status !== "confirmados"
        ? '<button type="button" id="btnConfirmarPedidoModal" class="btn btn-success">Confirmar Pedido</button>'
        : ""
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
          const qtd = it.pviqtde ?? 0;
          const preco = it.pvivl ?? 0;
          const subtotal = it.pvivl * it.pviqtde ?? 0;
          const procod = it.pviprocod || 0;
          const pv = it.pvcod || pvcod;
          return `<tr>
              <td class="text-center" data-procod="${procod}">${i + 1}</td>
              <td>${descricao}</td>
              <td style="padding: 0.2rem;">
                <input type="number" class="form-control form-control-sm text-end qtd-input" 
                      data-procod="${procod}"
                      value="${Math.floor(qtd)}" 
                      min="0"
                      style="width: 100%; height: auto; border-radius: 0.25rem; padding: 0.25rem;">
              </td>
              <td class="text-end">${formatarMoeda(preco)}</td>
              <td class="text-end">${formatarMoeda(subtotal)}</td>
              <td class="text-center">
                <button type="button" class="btn btn-danger btn-sm" onclick="cancelarItem
                  (${procod}, ${pv})">
                  <i class="bi bi-trash"></i>
                </button>
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
            ${pedido.pvobs
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

    // remove handlers anteriores para evitar múltiplas chamadas
    if (btnConfirm) {
      btnConfirm.replaceWith(btnConfirm.cloneNode(true));
    }
    if (btnCancel) {
      btnCancel.replaceWith(btnCancel.cloneNode(true));
    }

    const newBtnConfirm = modalEl.querySelector("#btnConfirmarPedidoModal");
    const newBtnCancel = modalEl.querySelector("#btnCancelarPedidoModal");

    if (newBtnConfirm) {
      newBtnConfirm.addEventListener("click", async () => {

        try {

          // // pega todas as linhas de itens
          const linhas = modalEl.querySelectorAll("tbody tr");
          const itens = [];
          console.log("Linhas de itens:", linhas);
          linhas.forEach((tr) => {
            const cellProcod = tr.querySelector("[data-procod]");
            const inputQtd = tr.querySelector(".qtd-input");


            // garante que ambos existam
            if (cellProcod && inputQtd) {
              const procod = Number(cellProcod.dataset.procod);
              const qtd = Number(inputQtd.value);
              itens.push({ procod, qtd });
            }
          });

          // confirma cada item do pedido
          for (const item of itens) {
            await confirmarItensPedido(pvcod, item.qtd, item.procod);
          }

          // fecha o modal ao fim
          const m = bootstrap.Modal.getInstance(modalEl);
          m.hide();
          await confirmarPedido(pvcod);
          
        } catch (err) {
          console.error("Erro ao confirmar via modal:", err);
          alert("Erro ao confirmar pedido.");
        }
        finally {
          window.location.reload();

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
    const response = await fetch(
      `${BASE_URL}/v2/pedidos/cancelar/${pvcod}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pvcod: pvcod }),
      }
    );
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
    });
  } catch (error) {
    console.error("Erro ao confirmar o pedido:", error);
    alert("Erro ao confirmar o pedido.");
  }
}

async function confirmarItensPedido(pvcod, pviqtde, procod) {
  try {
    const response = await fetch(
      `${BASE_URL}/pedidos/itens/confirmar/${pvcod}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pviqtde: pviqtde, procod: procod }),
      }
    );
    if (response.ok) {
      console.log("Item confirmado com sucesso!  procod:", procod);
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
              <button type="button" class="btn btn-primary btn-sm" onclick="abriDetalhePedido(${dado.pvcod
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

// pedidos confirmados
document.addEventListener("DOMContentLoaded", function () {
  fetch(`${BASE_URL}/pedidos/confirmados`)
    .then((res) => res.json())
    .then((dados) => {
      const corpoTabelaConfirmados = document.getElementById(
        "corpoTabelaConfirmados"
      );
      corpoTabelaConfirmados.innerHTML = ""; // limpa o conteúdo atual da tabela

      dados.forEach((dado) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="text-center" style="color: green;">${dado.pvcod}</td>
          <td class="text-right" style="color: green;">${formatarMoeda(
          dado.pvvl
        )}</td>
          <td class="text-center">
            <div class="d-flex justify-content-center align-items-center gap-2">
              <button type="button" class="btn btn-primary btn-sm" onclick="abriDetalhePedido(${dado.pvcod
          }, 'confirmados')">
                <i class="bi bi-search"></i>
              </button>
            </div>          
          </td>
        `;
        corpoTabelaConfirmados.appendChild(tr);
        atualizarTotaisPedidos();
      });
    })
    .catch((erro) => console.error("Erro ao carregar pedidos:", erro));
});

(function () {
  // sobrescreve confirmarPedido para adicionar atualização da lista de confirmados
  const originalConfirmar = window.confirmarPedido;
  if (typeof originalConfirmar !== "function") return;

  async function atualizarConfirmados() {
    try {
      const res = await fetch(`${BASE_URL}/pedidos/confirmados`);
      const dados = await res.json();
      const corpoTabelaConfirmados = document.getElementById(
        "corpoTabelaConfirmados"
      );
      if (!corpoTabelaConfirmados) return;
      corpoTabelaConfirmados.innerHTML = "";
      dados.forEach((dado) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="text-center" style="color: green;">${dado.pvcod}</td>
          <td class="text-right" style="color: green;">${formatarMoeda(
            dado.pvvl
          )}</td>
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
        corpoTabelaConfirmados.appendChild(tr);
      });
    } catch (err) {
      console.error("Erro ao atualizar pedidos confirmados:", err);
    }
  }

  window.confirmarPedido = async function (pvcod, pviqtde, procod) {
    // chama a implementação original (mantendo comportamento atual)
    try {
      await originalConfirmar(pvcod, pviqtde, procod);
    } catch (err) {
      // original já faz tratamento/alertas; apenas logamos o erro aqui também
      console.error("Erro na confirmação original:", err);
    }
    // sempre tenta atualizar a lista de confirmados após a tentativa de confirmação
    await atualizarConfirmados();
    atualizarTotaisPedidos();
  };
})();
