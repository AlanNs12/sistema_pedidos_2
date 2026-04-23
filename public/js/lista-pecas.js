const params = new URLSearchParams(window.location.search);

const id = params.get("id");
const modelo = params.get("modelo");
const marcascod = params.get("marcascod");

/**
 * Formata um valor numérico para moeda brasileira (BRL)
 * @param {number} valor - Valor a ser formatado
 * @returns {string} Valor formatado (ex: R$ 10,00)
 */
function formatarMoeda(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Busca o nome do modelo pelo id e exibe no elemento com id 'modeloTitulo'
fetch(`${BASE_URL}/mod/${modelo}`)
  .then((res) => res.json())
  .then((modelo) => {
    const nome = Array.isArray(modelo) ? modelo[0]?.moddes : modelo?.moddes;
    document.getElementById("modeloTitulo").textContent =
      nome || "Modelo não encontrado";
  })

  .catch(() => {
    document.getElementById("modeloTitulo").textContent = "";
  });

// Popula o tipo da peça no breadcrumb
fetch(`${BASE_URL}/modtipo/${id}?modelo=${modelo}`)
  .then((res) => res.json())
  .then((modtipo) => {
    const nome = Array.isArray(modtipo)
      ? modtipo[0]?.tipodes
      : modtipo?.tipodes;
    document.getElementById("tipoPeca").textContent =
      nome || "Modelo não encontrado";
  })

  .catch(() => {
    document.getElementById("modeloTitulo").textContent = "";
  });

document.addEventListener("DOMContentLoaded", function () {
  fetch(`${BASE_URL}/pro/${id}?marca=${marcascod}&modelo=${modelo}`)
    .then((res) => res.json())
    .then((dados) => {
      const corpoTabela = document.getElementById("corpoTabela");
      corpoTabela.innerHTML = ""; // Limpa o conteúdo atual da tabela
      //console.log(dados);

      dados.forEach((dado) => {
        const item = document.createElement("div");
        item.className = "cart-item";
        item.dataset.preco = dado.provl;
        const isDisabled = dado.prosemest === "S";
        item.innerHTML = `
            <div class="item-name">${dado.prodes}</div>
            <div class="item-tipo">${dado.tipodes}</div>
            <div class="item-price">${formatarMoeda(dado.provl)} 
              <button class="${
                isDisabled
                  ? "btn btn-danger btn-sm btn-add"
                  : "btn btn-primary btn-add"
              }" ${
          isDisabled
            ? 'disabled title="Em Falta"'
            : `onclick="adicionarAoCarrinho('${dado.procod}')"`
        }>
          ${isDisabled ? "Em Falta" : "Adicionar"}
              </button>
            </div>
          `;

        corpoTabela.appendChild(item);
      });
    })
    .catch((erro) => console.error(erro));
});

document.getElementById("pesquisa").addEventListener("input", function () {
  const pesquisa = this.value.toLowerCase();
  const linhas = document.querySelectorAll("#corpoTabela .cart-item");

  linhas.forEach((linha) => {
    const celula = linha.querySelector(".item-name");
    if (celula) {
      const conteudoCelula = celula.textContent.toLowerCase();
      linha.style.display = conteudoCelula.includes(pesquisa) ? "" : "none";
    }
  });
});

// Busca o nome da marca pelo id usando fetch e exibe no elemento com id 'marcaTitulo'
fetch(`${BASE_URL}/marcas/${marcascod}`)
  .then((res) => res.json())
  .then((marcas) => {
    document.getElementById("marcaTitulo").textContent =
      marcas[0].marcasdes || "Marca não encontrada";
  })
  .catch(() => {
    document.getElementById("marcaTitulo").textContent = "";
  });

// Função para atualizar o ícone do carrinho (exibe badge com quantidade de itens)
function atualizarIconeCarrinho() {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  let badge = document.getElementById("cartBadge");
  const cartIcon =
    document.getElementById("cartIcon") ||
    document.getElementById("openCartModal");
  if (!cartIcon) return;

  if (getComputedStyle(cartIcon).position === "static") {
    cartIcon.style.position = "relative";
  }

  if (!badge) {
    badge = document.createElement("span");
    badge.id = "cartBadge";
    badge.className = "badge badge-danger";
    badge.style.position = "absolute";
    badge.style.left = "0";
    badge.style.bottom = "0";
    badge.style.transform = "translate(-40%, 40%)";
    badge.style.minWidth = "1.1em";
    badge.style.height = "1.1em";
    badge.style.fontSize = "0.75em";
    badge.style.padding = "0.1em 0.3em";
    badge.style.borderRadius = "50%";
    badge.style.display = "none";
    badge.style.alignItems = "center";
    badge.style.justifyContent = "center";
    badge.style.background = "#dc3545";
    badge.style.color = "#fff";
    badge.style.boxSizing = "border-box";
    badge.style.zIndex = 10;
    badge.style.overflow = "hidden";
    badge.style.textAlign = "center";
    cartIcon.appendChild(badge);
  }
  const total = cart.reduce((sum, item) => sum + item.qt, 0);
  badge.textContent = total > 0 ? total : "";
  badge.style.display = total > 0 ? "flex" : "none";
}

// Função para mostrar popup de confirmação
function mostrarPopupAdicionado() {
  // Cria popup simples (pode customizar com Bootstrap Toast/Modal se quiser)
  let popup = document.getElementById("popupAdicionado");
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "popupAdicionado";
    popup.style.position = "fixed";
    popup.style.top = "20px";
    popup.style.right = "20px";
    popup.style.background = "#28a745";
    popup.style.color = "#fff";
    popup.style.padding = "12px 24px";
    popup.style.borderRadius = "6px";
    popup.style.zIndex = 9999;
    popup.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
    popup.style.fontWeight = "bold";
    document.body.appendChild(popup);
  }
  popup.textContent = "Item adicionado ao carrinho!";
  popup.style.display = "block";
  setTimeout(() => {
    popup.style.display = "none";
  }, 1500);
}

document.getElementById("openCartModal").addEventListener("click", function () {
  $("#cartModal").modal("show");

  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const cartItemsDiv = document.getElementById("cartItems");

  if (cart.length === 0) {
    cartItemsDiv.innerHTML = "<p>Nenhum item no carrinho.</p>";
  } else {
    cartItemsDiv.innerHTML =
      '<ul class="list-group">' +
      cart
        .map(
          (item, idx) => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <span>${item.nome} <small class="text-muted">(R$ ${
            item.preco ? Number(item.preco).toFixed(2) : "0.00"
          })</small></span>
          <span>
            <span class="badge badge-primary badge-pill mr-2">${item.qt}</span>
          </span>
          <span>
            <button class="btn btn-danger btn-sm" onclick="removerItemCarrinho(${idx})">&times;</button>
          </span>
        </li>
      `
        )
        .join("") +
      "</ul>";
  }

  const cartModalFooter = document.querySelector("#cartModal .modal-footer");
  if (cartModalFooter) {
    const oldBtn = document.getElementById("goToCartBtn");
    if (oldBtn) oldBtn.remove();

    const goToCartBtn = document.createElement("a");
    goToCartBtn.id = "goToCartBtn";
    goToCartBtn.className = "btn btn-primary ml-2";
    goToCartBtn.href = "carrinho"; // não precisa de param
    goToCartBtn.textContent = "Ir para o carrinho";
    goToCartBtn.style.marginLeft = "8px";

    // Esconde o modal antes de navegar
    goToCartBtn.addEventListener("click", function (e) {
      $("#cartModal").modal("hide");
    });

    cartModalFooter.appendChild(goToCartBtn);
  }
});

window.adicionarAoCarrinho = async function (procod) {
  const qtde = 1;
  const button = event.target;
  const itemDiv = button.closest(".cart-item");

  if (!itemDiv) {
    console.error("Elemento '.cart-item' não encontrado.");
    return;
  }

  const nome = itemDiv.querySelector(".item-name")?.textContent || "Produto";
  const preco = parseFloat(itemDiv.dataset.preco || "0");
  const tipo = itemDiv.querySelector(".item-tipo")?.textContent || "";
  const marca = document.getElementById("marcaTitulo")?.textContent || "";

  try {
    const response = await fetch(`/proCoresDisponiveis/${procod}`);
    const cores = await response.json();

     console.log("Cores disponíveis:", cores);

    if (cores && cores.length > 0 && cores[0].cornome !== "") {
      exibirComboBoxCores(cores, procod, nome, tipo, marca, preco, qtde);
    } else {
      adicionarProdutoAoCarrinho(procod, nome, tipo, marca, preco, qtde);
    }
  } catch (error) {
    console.error("Erro ao buscar cores:", error);
    showToast("Erro ao verificar cores do produto.", "error");
  }
};

/**
 * Exibe um modal para seleção de cor do produto
 * Cria um backdrop (overlay cinza) e um modal customizado para selecionar a cor
 * @param {Array} cores - Lista de cores disponíveis
 * @param {number} procod - Código do produto
 * @param {string} nome - Nome do produto
 * @param {string} tipo - Tipo do produto
 * @param {string} marca - Marca do produto
 * @param {number} preco - Preço do produto
 * @param {number} qtde - Quantidade a adicionar
 */
function exibirComboBoxCores(cores, procod, nome, tipo, marca, preco, qtde) {
  // Cria o backdrop (overlay cinza de fundo)
  const backdrop = document.createElement("div");
  backdrop.id = "modal-cor-backdrop";
  backdrop.style.position = "fixed";
  backdrop.style.top = "0";
  backdrop.style.left = "0";
  backdrop.style.width = "100%";
  backdrop.style.height = "100%";
  backdrop.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
  backdrop.style.zIndex = "9998";

  // Cria o modal
  const modal = document.createElement("div");
  modal.id = "modal-cor-selecao";
  modal.style.position = "fixed";
  modal.style.top = "50%";
  modal.style.left = "50%";
  modal.style.transform = "translate(-50%, -50%)";
  modal.style.background = "white";
  modal.style.padding = "20px";
  modal.style.borderRadius = "8px";
  modal.style.boxShadow = "0 2px 10px rgba(0,0,0,0.3)";
  modal.style.zIndex = "9999";

  // Monta HTML do modal com indicação de cores sem estoque
  modal.innerHTML = `
    <style>
      #modal-cor-container {
        max-width: 300px;
        font-family: sans-serif;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      #modal-cor-container p {
        font-size: 16px;
        margin: 0;
        font-weight: 600;
        text-align: center;
      }
      #modal-cor-container select {
        width: 100%;
        padding: 8px;
        font-size: 14px;
        border-radius: 6px;
        border: 1px solid #ccc;
      }
      #modal-cor-botoes {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      #modal-cor-botoes button {
        padding: 6px 12px;
        font-size: 14px;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      #btn-confirmar-cor {
        background-color: #28a745;
        color: white;
      }
      #btn-confirmar-cor:hover {
        background-color: #218838;
      }
      #btn-cancelar-cor {
        background-color: #dc3545;
        color: white;
      }
      #btn-cancelar-cor:hover {
        background-color: #c82333;
      }
      #select-cor option[disabled] {
        color: #888;
        background: #f5f5f5;
        font-style: italic;
      }
    </style>

    <div id="modal-cor-container">
      <p>Escolha a cor do produto:</p>
      <select id="select-cor">
  ${cores
    .map((cor) => {
      const idCor = cor.corcod;

      console.log("Cor id:",  idCor);
      const semEstoque = cor.procorsemest === "S";
      const label = `${cor.cornome}${semEstoque ? " (Sem estoque)" : ""}`;

      return `
        <option value="${idCor}" data-nome="${cor.cornome}"
          ${semEstoque ? 'disabled data-semest="S"' : ""}>
          ${label}
        </option>
      `;
    })
    .join("")}
</select>
      <div id="modal-cor-botoes">
        <button id="btn-cancelar-cor">Cancelar</button>
        <button id="btn-confirmar-cor">Confirmar</button>
      </div>
    </div>
    <script>
      (function(){
        const select = document.getElementById('select-cor');
        const confirmBtn = document.getElementById('btn-confirmar-cor');
        // Se todas as opções estiverem sem estoque, desabilita confirmar
        if ([...select.options].every(o => o.disabled)) {
          confirmBtn.disabled = true;
          confirmBtn.textContent = 'Indisponível';
          confirmBtn.style.backgroundColor = '#999';
          confirmBtn.style.cursor = 'not-allowed';
        } else {
          // Seleciona automaticamente a primeira opção disponível
          const firstAvailable = [...select.options].find(o => !o.disabled);
          if (firstAvailable) firstAvailable.selected = true;
        }
      })();
    </script>
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);

  /**
   * Função para fechar o modal e remover o backdrop
   * Garante que o overlay cinza seja removido corretamente
   */
  function fecharModalCores() {
    if (modal && modal.parentNode) {
      modal.remove();
    }
    if (backdrop && backdrop.parentNode) {
      backdrop.remove();
    }
  }

  // Fecha o modal ao clicar no backdrop (overlay cinza)
  backdrop.addEventListener("click", function () {
    fecharModalCores();
  });

  // Handler do botão Confirmar - usa addEventListener para consistência
  const btnConfirmar = document.getElementById("btn-confirmar-cor");
  btnConfirmar.addEventListener("click", function () {
    const corSelecionada =
      document.getElementById("select-cor").options[
        document.getElementById("select-cor").selectedIndex
      ].text;
    const idComCor = `${procod}-${corSelecionada}`;
    const nomeComCor = `${nome} (${corSelecionada})`;
    const idCorSelecionada = Number(document.getElementById("select-cor").value) || null;

    adicionarProdutoAoCarrinho(
      idComCor,
      nomeComCor,
      tipo,
      marca,
      preco,
      qtde,
      corSelecionada,
      idCorSelecionada
    );

    fecharModalCores();
  });

  // Handler do botão Cancelar - usa addEventListener para consistência
  const btnCancelar = document.getElementById("btn-cancelar-cor");
  btnCancelar.addEventListener("click", function () {
    fecharModalCores();
  });
}

/**
 * Adiciona um produto ao carrinho do localStorage
 * @param {string} id - Identificador único do produto (pode incluir cor)
 * @param {string} nome - Nome do produto
 * @param {string} tipo - Tipo do produto
 * @param {string} marca - Marca do produto
 * @param {number} preco - Preço do produto
 * @param {number} qtde - Quantidade a adicionar
 * @param {string} corSelecionada - Cor selecionada (opcional)
 * @param {string} idCorSelecionada - ID da cor selecionada (opcional)
 */

function adicionarProdutoAoCarrinho(
  id,
  nome,
  tipo,
  marca,
  preco,
  qtde,
  corSelecionada,
  idCorSelecionada
) {
  let cart = JSON.parse(localStorage.getItem("cart") || "[]");

  const idx = cart.findIndex((item) => item.id === id);
  if (idx > -1) {
    cart[idx].qt += qtde;
  } else {
    cart.push({ id, nome, tipo, marca, preco, qt: qtde, corSelecionada,idCorSelecionada });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  atualizarIconeCarrinho();
  mostrarPopupAdicionado();
}

document.addEventListener("DOMContentLoaded", atualizarIconeCarrinho);

// Função global para remover item do carrinho
window.removerItemCarrinho = function (idx) {
  let cart = JSON.parse(localStorage.getItem("cart") || "[]");
  cart.splice(idx, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  atualizarIconeCarrinho();
  // Reabrir/atualizar modal
  document.getElementById("openCartModal").click();
};

window.addEventListener("pageshow", function (event) {
  atualizarIconeCarrinho();
});
