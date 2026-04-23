const params = new URLSearchParams(window.location.search);

const id = params.get("id");
const marcascod = params.get("marcascod");
const modeloscod = params.get("modeloscod");

//Busca o nome do modelo pelo id usando fetch e exibe no elemento com id 'modeloTitulo'
fetch(`${BASE_URL}/mod/${id}`)
  .then((res) => res.json())
  .then((modelo) => {
    const nome = Array.isArray(modelo) ? modelo[0]?.moddes : modelo?.moddes;
    document.getElementById("modeloTitulo").textContent =
      nome || "Modelo não encontrado";
  })

  .catch(() => {
    document.getElementById("modeloTitulo").textContent = "";
  });

//popular table com os dados do modelo
document.addEventListener("DOMContentLoaded", function () {
  fetch(`${BASE_URL}/tipo/${id}`)
    .then((res) => res.json())
    .then((dados) => {
      const corpoTabela = document.getElementById("corpoTabela");
      corpoTabela.innerHTML = ""; // Limpa o conteúdo atual da tabela

      dados.forEach((dado) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
                      <td style="white-space: pre-line;">${dado.tipodes}</td>
                      <td class="text-center">
                        <a href="lista-pecas?id=${dado.tipocod}&marcascod=${dado.promarcascod}&modelo=${dado.promodcod}">
                          <button class="btn btn-primary btn-add">
                      Selecionar <i class="bi bi-arrow-right-short"></i>
                          </button>
                        </a>
                      </td>
        `;
        corpoTabela.appendChild(tr);
      });
    })
    .catch((erro) => console.error(erro));
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

// Modifique a função adicionarAoCarrinho para salvar o preço no carrinho
window.adicionarAoCarrinho = function (procod) {
  const input = document.getElementById(`qtde_peca_${procod}`);
  const qtde = input ? parseInt(input.value, 10) || 1 : 1;

  // Busca os dados da linha correspondente
  const tr = input.closest("tr");
  const nome = tr.querySelector("td").textContent;
  const preco = parseFloat(tr.dataset.preco || 0);

  // Recupera o carrinho do localStorage
  let cart = JSON.parse(localStorage.getItem("cart") || "[]");

  // Verifica se o item já existe no carrinho
  const idx = cart.findIndex((item) => item.id === procod);
  if (idx > -1) {
    cart[idx].qt += qtde;
  } else {
    cart.push({ id: procod, nome, qt: qtde, preco });
  }

  // Salva o carrinho atualizado
  localStorage.setItem("cart", JSON.stringify(cart));

  // Atualiza ícone do carrinho
  atualizarIconeCarrinho();

  // Mostra popup de confirmação
  mostrarPopupAdicionado();
};

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
