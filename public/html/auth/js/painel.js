const params = new URLSearchParams(window.location.search);
const erroMsg = params.get("erroMSG");
if (erroMsg === "acesso-negado") {
  alertPersonalizado("Acesso negado. Contate o administrador.", 3000);
}
if (erroMsg === "modulo-nao-habilitado") {
  alertPersonalizado("Módulo não habilitado para empresa.", 3000);
}
const novaURL = window.location.origin; + window.location.pathname;
window.history.replaceState({}, document.title, novaURL+ '/painel');

const id = params.get("id");
let marcascod = null;
let marcacodModelo = null;
let tipo = null;
let modelo = null;

function formatarMoeda(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
document.addEventListener("DOMContentLoaded", () => {
  const holder = document.getElementById("painelMarca");
  if (!holder) return;

  // Função para carregar marcas
  function carregarMarcasPainel() {
    fetch(`${BASE_URL}/marcas/`)
      .then((res) => res.json())
      .then((dados) => {
        holder.innerHTML = ""; // zera antes
        let html = '<option value="">Selecione uma marca</option>';
        dados.forEach((marca) => {
          html += `<option value="${marca.marcascod}"${id == marca.marcascod ? " selected" : ""
            }>${marca.marcasdes}</option>`;
        });
        holder.innerHTML = html;
      })
      .catch(console.error);
  }

  // Carrega inicialmente
  carregarMarcasPainel();

  // Carrega novamente ao focar (atualiza dados)
  holder.addEventListener("focus", (e) => {
    carregarMarcasPainel();
  });

  holder.addEventListener("change", (e) => {
    marcacodModelo = e.target.value;
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const holder = document.getElementById("selectPainelMarca");
  if (!holder) return;

  // Carrega marcas apenas uma vez ao carregar a página
  fetch(`${BASE_URL}/marcas/`)
    .then((res) => res.json())
    .then((dados) => {
      holder.innerHTML = '<option value="">Selecione a Marca</option>';
      dados.forEach((marca) => {
        holder.innerHTML += `<option value="${marca.marcascod}">${marca.marcasdes}</option>`;
      });
    })
    .catch(console.error);
  holder.addEventListener("focus", () => {
    fetch(`${BASE_URL}/marcas/`)
      .then((res) => res.json())
      .then((dados) => {
        holder.innerHTML = '<option value="">Selecione a Marca</option>';
        dados.forEach((marca) => {
          holder.innerHTML += `<option value="${marca.marcascod}">${marca.marcasdes}</option>`;
        });
      })
      .catch(console.error);
  });
  holder.addEventListener("change", (e) => {
    marcascod = e.target.value;
    // Só faz o fetch dos modelos ao selecionar uma marca
    fetch(`${BASE_URL}/modelo/${marcascod}`)
      .then((res) => res.json())
      .then((modelos) => {
        const modeloHolder = document.getElementById("selectPainelModelo");
        if (!modeloHolder) return;
        modeloHolder.innerHTML = '<option value="">Selecione o Modelo</option>';
        modelos.forEach((modeloItem) => {
          modeloHolder.innerHTML += `<option value="${modeloItem.modcod}">${modeloItem.moddes}</option>`;
        });

        modeloHolder.addEventListener("change", (e) => {
          modelo = e.target.value;
        });
      })
      .catch(console.error);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  function carregarTiposPainel() {
    fetch(`${BASE_URL}/tipos/`)
      .then((res) => res.json())
      .then((dados) => {
        const holder = document.getElementById("selectPainelTipo");
        if (!holder) return;
        let html = '<option value="">Selecione o tipo</option>';
        dados.forEach((tipo) => {
          html += `<option value="${tipo.tipocod}"${id == tipo.tipocod ? " selected" : ""
            }>${tipo.tipodes}</option>`;
        });
        holder.innerHTML = html;
      })
      .catch(console.error);
  }

  carregarTiposPainel();

  const holder = document.getElementById("selectPainelTipo");
  if (holder) {
    holder.addEventListener("focus", () => {
      carregarTiposPainel();
    });
    holder.addEventListener("change", (e) => {
      tipo = e.target.value;
    });
  }
});
// listar cor no painel/criar produto
// document.addEventListener("DOMContentLoaded", () => {
//   function carregarCoresPainel() {
//     fetch(`${BASE_URL}/procores/`)
//       .then((res) => res.json())
//       .then((dados) => {
//         const holder = document.getElementById("selectPainelCor");
//         if (!holder) return;
//         holder.innerHTML = ""; // zera antes

//         let html = "<label>Selecione a(s) cor(es):</label><br>";
//         dados.forEach((cor) => {
//           html += `
//             <div class="form-check">
//               <input class="form-check-input" type="checkbox" name="procor" value="${cor.corcod}" id="cor_${cor.corcod}">
//               <label class="form-check-label" for="cor_${cor.corcod}">${cor.cornome}</label>
//             </div>
//           `;
//         });
//         holder.innerHTML = html;
//       })
//       .catch(console.error);
//   }

//   // Carrega inicialmente
//   carregarCoresPainel();

//   // Carrega novamente ao abrir o dropdown
//   const dropdownBtn = document.getElementById("dropdownPeca");
//   if (dropdownBtn) {
//     dropdownBtn.addEventListener("click", carregarCoresPainel);
//   }
// });

// //Função para criar marca
// document
//   .getElementById("cadastrarPainelMarca")
//   .addEventListener("submit", function (e) {
//     e.preventDefault();

//     const form = e.target;
//     const formData = new FormData(form);
//     const data = Object.fromEntries(formData.entries());

//     fetch(`${BASE_URL}/marcas`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(data),
//     })
//       .then(async (res) => {
//         if (res.status === 403) {
//           throw new Error("403");
//         }
//         return res.json();
//       })
//       .then(() => {
//         const msg = document.createElement("div");
//         msg.textContent = "Marca cadastrada com sucesso!";
//         msg.style.position = "fixed";
//         msg.style.top = "20px";
//         msg.style.left = "50%";
//         msg.style.transform = "translateX(-50%)";
//         msg.style.background = "#28a745";
//         msg.style.color = "#fff";
//         msg.style.padding = "12px 24px";
//         msg.style.borderRadius = "6px";
//         msg.style.zIndex = "10000";
//         msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
//         document.body.appendChild(msg);
//         setTimeout(() => {
//           msg.remove();
//         }, 2000);
//         form.reset();
//       })
//       .catch((erro) => {
//         if (erro.message === "403") {
//           alertPersonalizado("Sem permissão para criar marcas.",2000);
//         } else {
//           alert("Erro ao salvar os dados.");
//         }
//         console.error(erro);
//       });
//   });

// //função para criar modelo
// document
//   .getElementById("cadastrarPainelModelo")
//   .addEventListener("submit", function (e) {
//     e.preventDefault();

//     const form = e.target;
//     const formData = new FormData(form);
//     const data = Object.fromEntries(formData.entries());

//     data.modmarcascod = marcacodModelo;

//     fetch(`${BASE_URL}/modelo`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(data),
//     })
//       .then(async (res) => {
//         if (res.status === 403) {
//           throw new Error("403");
//         }
//         return res.json();
//       })
//       .then(() => {
//         const msg = document.createElement("div");
//         msg.textContent = "Modelo cadastrado com sucesso!";
//         msg.style.position = "fixed";
//         msg.style.top = "20px";
//         msg.style.left = "50%";
//         msg.style.transform = "translateX(-50%)";
//         msg.style.background = "#28a745";
//         msg.style.color = "#fff";
//         msg.style.padding = "12px 24px";
//         msg.style.borderRadius = "6px";
//         msg.style.zIndex = "10000";
//         msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
//         document.body.appendChild(msg);
//         setTimeout(() => {
//           msg.remove();
//         }, 2000);
//         form.reset();
//       })
//       .catch((erro) => {
//         if (erro.message === "403") {
//           alertPersonalizado("Sem permissão para criar Modelo.",2000);
//         } else {
//           alert("Erro ao salvar os dados.");
//         }
//         console.error(erro);
//       });
//   });

//função para criar tipo
// document
//   .getElementById("cadastrarPainelTipo")
//   .addEventListener("submit", function (e) {
//     e.preventDefault();

//     const form = e.target;
//     const formData = new FormData(form);
//     const data = Object.fromEntries(formData.entries());

//     fetch(`${BASE_URL}/tipo`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(data),
//     })
//       .then(async (res) => {
//         if (res.status === 403) {
//           throw new Error("403");
//         }
//         return res.json();
//       })
//       .then(() => {
//         const msg = document.createElement("div");
//         msg.textContent = "Tipo cadastrado com sucesso!";
//         msg.style.position = "fixed";
//         msg.style.top = "20px";
//         msg.style.left = "50%";
//         msg.style.transform = "translateX(-50%)";
//         msg.style.background = "#28a745";
//         msg.style.color = "#fff";
//         msg.style.padding = "12px 24px";
//         msg.style.borderRadius = "6px";
//         msg.style.zIndex = "10000";
//         msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
//         document.body.appendChild(msg);
//         setTimeout(() => {
//           msg.remove();
//         }, 2000);
//         form.reset();
//       })
//       .catch((erro) => {
//         if (erro.message === "403") {
//           alertPersonalizado("Sem permissão para criar Tipo de Peças.",2000);
//         } else {
//           alert("Erro ao salvar os dados.");
//         }
//         console.error(erro);
//       });
//   });

//função para criar cor
// document
//   .getElementById("cadastrarPainelCor")
//   .addEventListener("submit", function (e) {
//     e.preventDefault();

//     const form = e.target;
//     const formData = new FormData(form);
//     const data = Object.fromEntries(formData.entries());

//     fetch(`${BASE_URL}/cores`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(data),
//     })
//       .then(async (res) => {
//         if (res.status === 403) {
//           throw new Error("403");
//         }
//         return res.json();
//       })
//       .then(() => {
//         const msg = document.createElement("div");
//         msg.textContent = "cor cadastrado com sucesso!";
//         msg.style.position = "fixed";
//         msg.style.top = "20px";
//         msg.style.left = "50%";
//         msg.style.transform = "translateX(-50%)";
//         msg.style.background = "#28a745";
//         msg.style.color = "#fff";
//         msg.style.padding = "12px 24px";
//         msg.style.borderRadius = "6px";
//         msg.style.zIndex = "10000";
//         msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
//         document.body.appendChild(msg);
//         setTimeout(() => {
//           msg.remove();
//         }, 2000);
//         form.reset();
//       })
//       .catch((erro) => {
//         if (erro.message === "403") {
//           alertPersonalizado("Sem permissão para criar Cor.",2000);
//         } else {
//           alert("Erro ao salvar os dados.");
//         }
//         console.error(erro);
//       });
//   });

//função para criar PRODUTO
// document
//   .getElementById("cadastrarPainelPeca")
//   .addEventListener("submit", async function (e) {
//     e.preventDefault();

//     const form = e.target;
//     const formData = new FormData(form);
//     const data = Object.fromEntries(formData.entries());

//     data.promarcascod = marcascod;
//     data.promodcod = modelo;
//     data.protipocod = tipo;

//     // Pega todos os checkboxes marcados de cor
//     const corCheckboxes = document.querySelectorAll(
//       '#selectPainelCor input[type="checkbox"]:checked'
//     );
//     const corIds = Array.from(corCheckboxes).map((cb) => cb.value);
//     try {
//       // Cria o produto
//       const res = await fetch(`${BASE_URL}/pro`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(data),
//       });
//       if (res.status === 403) {
//         throw new Error("403");
//       }
//       const resposta = await res.json();
//       let procod =
//         resposta.procod || (Array.isArray(resposta) && resposta[0]?.procod);
//       if (!procod) {
//         throw new Error("Resposta inválida ao criar produto");
//       } else {
//         const msg = document.createElement("div");
//         msg.textContent = "Produto cadastrado com sucesso!";
//         msg.style.position = "fixed";
//         msg.style.top = "20px";
//         msg.style.left = "50%";
//         msg.style.transform = "translateX(-50%)";
//         msg.style.background = "#28a745";
//         msg.style.color = "#fff";
//         msg.style.padding = "12px 24px";
//         msg.style.borderRadius = "6px";
//         msg.style.zIndex = "10000";
//         msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
//         document.body.appendChild(msg);
//         setTimeout(() => {
//           msg.remove();
//         }, 2000);
//       }

//       // Grava as cores disponíveis se houver cores marcadas e procod válido
//       if (procod && corIds.length > 0) {
//         // Para cada cor marcada, faz um POST individual
//         for (const corcod of corIds) {
//           await fetch(
//             `${BASE_URL}/proCoresDisponiveis/${procod}?corescod=${corcod}`,
//             {
//               method: "POST",
//               headers: { "Content-Type": "application/json" },
//             }
//           );
//         }
//       }
//       //console.log(resposta);
//       form.reset();
//     } catch (erro) {
//       if (erro.message === "403") {
//           alertPersonalizado("Sem permissão para criar produtos.",2000);
//         } else {
//           alert("Erro ao criar produto.");
//         }
//         console.error(erro);
//     }
//   });

const inputPesquisa = document.getElementById("pesquisa");
const tabelaArea = document.getElementById("tabelaArea");
const cardsArea = document.getElementById("cardsArea");
const corpoTabela = document.getElementById("corpoTabela");

inputPesquisa.addEventListener("input", function () {
  const pesquisa = this.value.trim().toLowerCase();

  if (!pesquisa) {
    tabelaArea.style.display = "none"; // esconde tabela
    cardsArea.style.display = "block"; // mostra cards
    corpoTabela.innerHTML = ""; // limpa tabela
    return;
  }

  fetch(`${BASE_URL}/pros/`)
    .then((res) => res.json())
    .then((produtos) => {
      const filtrados = produtos.filter(
        (produto) =>
          produto.prodes && produto.prodes.toLowerCase().includes(pesquisa)
      );

      if (filtrados.length === 0) {
        tabelaArea.style.display = "none"; // esconde tabela se nada encontrado
        cardsArea.style.display = "block"; // mostra cards
        corpoTabela.innerHTML = "";
        return;
      }

      corpoTabela.innerHTML = "";
      filtrados.forEach((produto) => {
        const tr = document.createElement("tr");
        tr.dataset.preco = produto.provl;
        tr.id = `produto-${produto.procod}`; // <- aqui
        tr.innerHTML = `
          <td>${produto.prodes}</td>
          <td>${formatarMoeda(produto.provl)}</td>
          <td>
            <button class="btn btn-primary btn-sm" onclick="editarProduto('${produto.procod
          }')">
              <i class="fa fa-edit"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="excluirProduto('${produto.procod
          }')">
              <i class="fa fa-trash"></i>
            </button>
          </td>
        `;
        corpoTabela.appendChild(tr);
      });

      tabelaArea.style.display = "block"; // mostra tabela
      cardsArea.style.display = "none"; // esconde cards
    })
    .catch((error) => {
      console.error("Erro no fetch:", error);
      tabelaArea.style.display = "none";
      cardsArea.style.display = "block";
      corpoTabela.innerHTML = "";
    });
});

function editarProduto(codigo) {
  Promise.all([
    fetch(`${BASE_URL}/pro/painel/${codigo}`).then((r) => r.json()),
    fetch(`${BASE_URL}/procores`).then((r) => r.json()),
    fetch(`${BASE_URL}/proCoresDisponiveis/${codigo}`).then((r) => r.json()),
  ])
    .then(([produto, coresDisponiveis, coresProduto]) => {
      // Cria o popup
      let popup = document.createElement("div");
      popup.id = "popupEditarProduto";
      popup.style.position = "fixed";
      popup.style.top = "0";
      popup.style.left = "0";
      popup.style.width = "100vw";
      popup.style.height = "100vh";
      popup.style.background = "rgba(0,0,0,0.5)";
      popup.style.display = "flex";
      popup.style.alignItems = "center";
      popup.style.justifyContent = "center";
      popup.style.zIndex = "9999";

      // Preenche os campos com os dados carregados do produto
      popup.innerHTML = `
        <div style="
            background:#fff;
            padding:24px;
            border-radius:8px;
            min-width:300px;
            max-width:90vw;
            max-height:90vh;   /* limite de altura */
            overflow-y:auto;   /* cria scroll se passar do limite */
        ">
          <h5>Editar Produto</h5>
          <form id="formEditarProduto">
            <div class="mb-3">
              <label for="editarDescricao" class="form-label">Descrição</label>
              <input type="text" class="form-control" id="editarDescricao" name="prodes" 
                value="${produto[0].prodes || ""}" required>
            </div>
            <div class="mb-3">
              <label for="editarValor" class="form-label">Valor</label>
              <input type="number" step="0.01" class="form-control" id="editarValor" name="provl" 
                value="${Number(produto[0].provl).toFixed(2) || ""}" required>
            </div>
            <div class="mb-3" id="editarProdutoCores">
              <label>Selecione a(s) cor(es):</label><br>
              ${coresDisponiveis
          .map(
            (c) => `
              <div class="form-check">
                <input class="form-check-input" type="checkbox" name="procor" value="${c.corcod
              }"
                  id="editar_cor_${c.corcod}" 
                  ${coresProduto.some((cp) => cp.corcod == c.corcod)
                ? "checked"
                : ""
              }>
                <label class="form-check-label" for="editar_cor_${c.corcod}">${c.cornome
              }</label>
              </div>`
          )
          .join("")}
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;">
              <button type="button" class="btn btn-secondary" id="cancelarEditarProduto">Cancelar</button>
              <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(popup);

      document.getElementById("cancelarEditarProduto").onclick = function () {
        document.body.removeChild(popup);
      };

      document.getElementById("formEditarProduto").onsubmit = async function (
        e
      ) {
        e.preventDefault();
        const prodes = document.getElementById("editarDescricao").value.trim();
        const provl = document.getElementById("editarValor").value;
        const corCheckboxes = popup.querySelectorAll(
          '#editarProdutoCores input[type="checkbox"]'
        );
        const selecionadas = Array.from(corCheckboxes)
          .filter((cb) => cb.checked)
          .map((cb) => cb.value);
        const anteriores = coresProduto
          .filter((c) => c.corcod != null)
          .map((c) => String(c.corcod));

        try {
          const res = await fetch(`${BASE_URL}/pro/${codigo}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prodes, provl }),
          });
          if (res.status === 403) {
            throw new Error("403");
          }

          // adiciona novas cores
          for (const cor of selecionadas) {
            if (!anteriores.includes(cor)) {
              await fetch(
                `${BASE_URL}/proCoresDisponiveis/${codigo}?corescod=${cor}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                }
              );
            }
          }
          // remove cores desmarcadas
          for (const cor of anteriores) {
            if (!selecionadas.includes(cor)) {
              await fetch(
                `${BASE_URL}/proCoresDisponiveis/${codigo}?corescod=${cor}`,
                { method: "DELETE" }
              );
            }
          }

          const msg = document.createElement("div");
          msg.textContent = "Produto atualizado com sucesso!";
          msg.style.position = "fixed";
          msg.style.top = "20px";
          msg.style.left = "50%";
          msg.style.transform = "translateX(-50%)";
          msg.style.background = "#28a745";
          msg.style.color = "#fff";
          msg.style.padding = "12px 24px";
          msg.style.borderRadius = "6px";
          msg.style.zIndex = "10000";
          msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
          document.body.appendChild(msg);
          setTimeout(() => {
            msg.remove();
          }, 2000);
          document.body.removeChild(popup);
          carregarProPesquisa();
        } catch (erro) {
          if (erro.message === "403") {
            document.body.removeChild(popup);
            alertPersonalizado("Sem permissão para editar produtos.",2000);
          } else {
            document.body.removeChild(popup);
            alertPersonalizado("Erro ao atualizar o produto.",2000);
          }
        }
      };

      const inputValor = document.getElementById("editarValor");

      inputValor.addEventListener("input", function (e) {
        let value = e.target.value.replace(/\D/g, "");
        value = (parseInt(value, 10) / 100).toFixed(2);
        e.target.value = value.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      });
    })
    .catch((erro) => {
      alert("Erro ao buscar os dados do produto.");
      console.error(erro);
    });
}

function carregarProPesquisa() {
  fetch(`${BASE_URL}/pros/`)
    .then((res) => res.json())
    .then((produtos) => {
      const filtrados = produtos.filter(
        (produto) =>
          produto.prodes && produto.prodes.toLowerCase().includes(pesquisa)
      );
      corpoTabela.innerHTML = "";
      filtrados.forEach((produto) => {
        const tr = document.createElement("tr");
        tr.dataset.preco = produto.provl;
        tr.id = `produto-${produto.procod}`; // <- aqui
        tr.innerHTML = `
          <td>${produto.prodes}</td>
          <td>${formatarMoeda(produto.provl)}</td>
          <td>
            <button class="btn btn-primary btn-sm" onclick="editarProduto('${produto.procod
          }')">
              <i class="fa fa-edit"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="excluirProduto('${produto.procod
          }')">
              <i class="fa fa-trash"></i>
            </button>
          </td>
        `;
        corpoTabela.appendChild(tr);
      });
    });
}

async function excluirProduto(id) {
  // Cria o popup de confirmação customizado
  let popup = document.createElement("div");
  popup.id = "popupExcluirProduto";
  popup.style.position = "fixed";
  popup.style.top = "0";
  popup.style.left = "0";
  popup.style.width = "100vw";
  popup.style.height = "100vh";
  popup.style.background = "rgba(0,0,0,0.5)";
  popup.style.display = "flex";
  popup.style.alignItems = "center";
  popup.style.justifyContent = "center";
  popup.style.zIndex = "9999";

  popup.innerHTML = `
    <div style="background:#fff;padding:24px;border-radius:8px;min-width:300px;max-width:90vw;">
      <h5>Excluir Tipo</h5>
      <p>Tem certeza que deseja excluir este Produto?</p>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button type="button" class="btn btn-secondary" id="cancelarExcluirPro">Cancelar</button>
        <button type="button" class="btn btn-danger" id="confirmarExcluirPro">Excluir</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  document.getElementById("cancelarExcluirPro").onclick = function () {
    document.body.removeChild(popup);
  };

  document.getElementById("confirmarExcluirPro").onclick = async function () {
    try {
      await fetch(`${BASE_URL}/pro/${id}`, { method: "DELETE" });

      // Remove a linha da tabela diretamente pelo ID
      const linha = document.getElementById(`produto-${id}`);
      if (linha) linha.remove();

      // Mostra mensagem de sucesso como popup temporário
      const msg = document.createElement("div");
      msg.textContent = "Produto excluído com sucesso!";
      msg.style.position = "fixed";
      msg.style.top = "20px";
      msg.style.left = "50%";
      msg.style.transform = "translateX(-50%)";
      msg.style.background = "#dc3545";
      msg.style.color = "#fff";
      msg.style.padding = "12px 24px";
      msg.style.borderRadius = "6px";
      msg.style.zIndex = "10000";
      msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
      document.body.appendChild(msg);
      setTimeout(() => {
        msg.remove();
      }, 2000);

      document.body.removeChild(popup);
    } catch (e) {
      alert("Erro ao excluir produto");
      document.body.removeChild(popup);
    }
  };
}

// Impede que o dropdown feche ao clicar em qualquer elemento dentro dele
document.querySelectorAll(".dropdown-menu").forEach(function (menu) {
  menu.addEventListener("click", function (e) {
    e.stopPropagation();
  });
});

// Carrega os totais de marcas, modelos, tipos e peças
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const [marcas, modelos, tipos, pecas] = await Promise.all([
      fetch(`${BASE_URL}/marcas`).then((r) => r.json()),
      fetch(`${BASE_URL}/modelos`).then((r) => r.json()),
      fetch(`${BASE_URL}/tipos`).then((r) => r.json()),
      fetch(`${BASE_URL}/pros`).then((r) => r.json()),
    ]);

    document.getElementById("totalMarcas").textContent = marcas.length;
    document.getElementById("totalModelos").textContent = modelos.length;
    document.getElementById("totalTipos").textContent = tipos.length;
    document.getElementById("totalPecas").textContent = pecas.length;
  } catch (err) {
    console.error("Erro ao carregar totais", err);
  }
});

const AREAS_GESTAO = [
  "areaMarcas",
  "areaModelos",
  "areaTipos",
  "areaCores",
  "tabelaArea",
];

function mostrarArea(id, loadFn) {
  AREAS_GESTAO.forEach((areaId) => {
    const el = document.getElementById(areaId);
    if (el && areaId !== id) {
      el.style.display = "none";
    }
  });

  const alvo = document.getElementById(id);
  if (!alvo) return;

  if (alvo.style.display === "none" || !alvo.style.display) {
    if (typeof loadFn === "function") loadFn();
    alvo.style.display = "block";
  } else {
    alvo.style.display = "none";
  }
}

// ------- GESTÃO MARCAS ---------
function toggleMarcas() {
  mostrarArea("areaMarcas", () => {
    carregarMarcas();

    // Aguarda o DOM atualizar para aplicar o scroll
    setTimeout(() => {
      const area = document.getElementById("areaMarcas");
      if (area) {
        area.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50); // tempo suficiente para garantir que o display foi aplicado
  });
}

function carregarMarcas() {
  fetch(`${BASE_URL}/marcas`)
    .then((r) => r.json())
    .then((dados) => {
      const tbody = document.getElementById("listaMarcas");
      tbody.innerHTML = "";
      dados.forEach((m) => {
        const tr = document.createElement("tr");
        tr.setAttribute("data-marca-id", m.marcascod);
        tr.innerHTML = `
          <td class="marca-des">${m.marcasdes}</td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="editarMarca(${m.marcascod
          }, '${m.marcasdes.replace(
            /'/g,
            "\\'"
          )}')"><i class='fa fa-edit'></i></button>
            <button class="btn btn-sm btn-danger" onclick="excluirMarca(${m.marcascod
          })"><i class='fa fa-trash'></i></button>
          </td>`;
        tbody.appendChild(tr);
      });
    })
    .catch(console.error);
}

function editarMarca(id, nome) {
  // Cria o popup
  let popup = document.createElement("div");
  popup.id = "popupEditarMarca";
  popup.style.position = "fixed";
  popup.style.top = "0";
  popup.style.left = "0";
  popup.style.width = "100vw";
  popup.style.height = "100vh";
  popup.style.background = "rgba(0,0,0,0.5)";
  popup.style.display = "flex";
  popup.style.alignItems = "center";
  popup.style.justifyContent = "center";
  popup.style.zIndex = "9999";

  popup.innerHTML = `
    <div style="background:#fff;padding:24px;border-radius:8px;min-width:300px;max-width:90vw;">
      <h5>Editar Marca</h5>
      <form id="formEditarMarca">
        <div class="mb-3">
          <label for="editarMarcaDescricao" class="form-label">Descrição</label>
          <input type="text" class="form-control" id="editarMarcaDescricao" name="marcasdes" value="${nome || ""
    }" required>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button type="button" class="btn btn-secondary" id="cancelarEditarMarca">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(popup);

  document.getElementById("cancelarEditarMarca").onclick = function () {
    document.body.removeChild(popup);
  };

  document.getElementById("formEditarMarca").onsubmit = function (e) {
    e.preventDefault();
    const marcasdes = document
      .getElementById("editarMarcaDescricao")
      .value.trim();
    fetch(`${BASE_URL}/marcas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marcasdes }),
    })
    .then((res) => {
        if (res.status === 403) {
          throw new Error("403");
        }
        return res;
      })
      .then((r) => r.json())
      .then(() => {
        // Mostra mensagem de sucesso como popup temporário
        const msg = document.createElement("div");
        msg.textContent = "Marca atualizada com sucesso!";
        msg.style.position = "fixed";
        msg.style.top = "20px";
        msg.style.left = "50%";
        msg.style.transform = "translateX(-50%)";
        msg.style.background = "#28a745";
        msg.style.color = "#fff";
        msg.style.padding = "12px 24px";
        msg.style.borderRadius = "6px";
        msg.style.zIndex = "10000";
        msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
        document.body.appendChild(msg);
        setTimeout(() => {
          msg.remove();
        }, 2000);
        document.body.removeChild(popup);
        carregarMarcas();
      })
      .catch((erro) => {
        if (erro.message === "403") {
          alertPersonalizado("Sem permissão para editar marcas. Contate o administrador.",2000);
        } else {
          alert("Erro ao atualizar a marca.");
        }
        console.error(erro);
        document.body.removeChild(popup);
      })
  };
}

async function excluirMarca(id) {
  // Verifica se existem modelos vinculados à marca
  let modelosVinculados = [];
  try {
    const res = await fetch(`${BASE_URL}/modelo/${id}`);
    if (res.ok) {
      modelosVinculados = await res.json();
    }
  } catch (e) {
    alert("Erro ao verificar modelos vinculados.");
    return;
  }

  // Cria o popup de confirmação customizado
  let popup = document.createElement("div");
  popup.id = "popupExcluirMarca";
  popup.style.position = "fixed";
  popup.style.top = "0";
  popup.style.left = "0";
  popup.style.width = "100vw";
  popup.style.height = "100vh";
  popup.style.background = "rgba(0,0,0,0.5)";
  popup.style.display = "flex";
  popup.style.alignItems = "center";
  popup.style.justifyContent = "center";
  popup.style.zIndex = "9999";

  let mensagem = `<h5>Excluir Marca</h5>`;
  if (modelosVinculados.length > 0) {
    mensagem += `
      <p>Existem <b>${modelosVinculados.length}</b> modelo(s) vinculados a esta marca.<br>
      Excluir a marca irá excluir todos os modelos vinculados.<br>
      Tem certeza que deseja continuar?</p>
    `;
  } else {
    mensagem += `<p>Tem certeza que deseja excluir esta marca?</p>`;
  }

  popup.innerHTML = `
    <div style="background:#fff;padding:24px;border-radius:8px;min-width:300px;max-width:90vw;">
      ${mensagem}
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button type="button" class="btn btn-secondary" id="cancelarExcluirMarca">Cancelar</button>
        <button type="button" class="btn btn-danger" id="confirmarExcluirMarca">Excluir</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  document.getElementById("cancelarExcluirMarca").onclick = function () {
    document.body.removeChild(popup);
  };

  document.getElementById("confirmarExcluirMarca").onclick = async function () {
    try {
      const res = await fetch(`${BASE_URL}/marcas/status/${id}`, { method: "PUT" });
      if (res.status === 403) {
        throw new Error("403");
      }
      // Mostra mensagem de sucesso como popup temporário
      const msg = document.createElement("div");
      msg.textContent = "Marca excluída com sucesso!";
      msg.style.position = "fixed";
      msg.style.top = "20px";
      msg.style.left = "50%";
      msg.style.transform = "translateX(-50%)";
      msg.style.background = "#dc3545";
      msg.style.color = "#fff";
      msg.style.padding = "12px 24px";
      msg.style.borderRadius = "6px";
      msg.style.zIndex = "10000";
      msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
      document.body.appendChild(msg);
      setTimeout(() => {
        msg.remove();
      }, 2000);
      document.body.removeChild(popup);
      carregarMarcas();
    } catch (error) {
      if (error.message === "403") {
        alertPersonalizado("Sem permissão para excluir marcas. Contate o administrador.",2000);
      } else {
        alert("Erro ao excluir a marca.");
      } console.error("Erro ao excluir marca:", error);
    } 
  };
}

// ------- GESTÃO MODELOS ---------
function toggleModelos() {
  mostrarArea("areaModelos", () => {
    carregarModelos();

    // Aguarda o DOM atualizar para aplicar o scroll
    setTimeout(() => {
      const area = document.getElementById("areaModelos");
      if (area) {
        area.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50); // tempo suficiente para garantir que o display foi aplicado
  });
}

function carregarModelos() {
  fetch(`${BASE_URL}/modelos`)
    .then((r) => r.json())
    .then((dados) => {
      const tbody = document.getElementById("listaModelos");
      tbody.innerHTML = "";
      dados.forEach((m) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${m.moddes}</td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="editarModelo(${m.modcod
          }, '${m.moddes.replace(/'/g, "'")}', ${m.modmarcascod
          })"><i class='fa fa-edit'></i></button>
            <button class="btn btn-sm btn-danger" onclick="excluirModelo(${m.modcod
          })"><i class='fa fa-trash'></i></button>
          </td>`;
        tbody.appendChild(tr);
      });
    })
    .catch(console.error);
}

function editarModelo(id, nome, marca) {
  // Cria o popup
  let popup = document.createElement("div");
  popup.id = "popupEditarModelo";
  popup.style.position = "fixed";
  popup.style.top = "0";
  popup.style.left = "0";
  popup.style.width = "100vw";
  popup.style.height = "100vh";
  popup.style.background = "rgba(0,0,0,0.5)";
  popup.style.display = "flex";
  popup.style.alignItems = "center";
  popup.style.justifyContent = "center";
  popup.style.zIndex = "9999";

  popup.innerHTML = `
    <div style="background:#fff;padding:24px;border-radius:8px;min-width:300px;max-width:90vw;">
      <h5>Editar Modelo</h5>
      <form id="formEditarModelo">
        <div class="mb-3">
          <label for="editarModeloDescricao" class="form-label">Descrição</label>
          <input type="text" class="form-control" id="editarModeloDescricao" name="moddes" value="${nome || ""
    }" required>
        </div>
        <div class="mb-3">
          <label for="editarModeloMarca" class="form-label">Marca</label>
          <select class="form-control" id="editarModeloMarca" name="modmarcascod" required>
            <option value="">Carregando marcas...</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button type="button" class="btn btn-secondary" id="cancelarEditarModelo">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(popup);

  // Carrega as marcas no select
  fetch(`${BASE_URL}/marcas`)
    .then((r) => r.json())
    .then((marcas) => {
      const select = document.getElementById("editarModeloMarca");
      select.innerHTML = '<option value="">Selecione uma marca</option>';
      marcas.forEach((m) => {
        select.innerHTML += `<option value="${m.marcascod}"${m.marcascod == marca ? " selected" : ""
          }>${m.marcasdes}</option>`;
      });
    });

  document.getElementById("cancelarEditarModelo").onclick = function () {
    document.body.removeChild(popup);
  };

  document.getElementById("formEditarModelo").onsubmit = function (e) {
    e.preventDefault();
    const moddes = document
      .getElementById("editarModeloDescricao")
      .value.trim();
    const modmarcascod = document.getElementById("editarModeloMarca").value;
    fetch(`${BASE_URL}/modelo/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moddes, modmarcascod }),
    })
     .then(async (res) => {
        if (res.status === 403) {
          throw new Error("403");
        }
        return res.json();
      })
      .then(() => {
        // Mostra mensagem de sucesso como popup temporário
        const msg = document.createElement("div");
        msg.textContent = "Modelo atualizado com sucesso!";
        msg.style.position = "fixed";
        msg.style.top = "20px";
        msg.style.left = "50%";
        msg.style.transform = "translateX(-50%)";
        msg.style.background = "#28a745";
        msg.style.color = "#fff";
        msg.style.padding = "12px 24px";
        msg.style.borderRadius = "6px";
        msg.style.zIndex = "10000";
        msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
        document.body.appendChild(msg);
        setTimeout(() => {
          msg.remove();
        }, 2000);
        document.body.removeChild(popup);
        carregarModelos();
      })
      .catch((error) => {
        if (error.message === "403") {
          alertPersonalizado("Sem permissão para editar modelos. Contate o administrador.",2000);
        } else {
          alert("Erro ao atualizar modelo");
        }
        document.body.removeChild(popup);
      });
  };
}

async function excluirModelo(id) {
  // Cria o popup de confirmação customizado
  let popup = document.createElement("div");
  popup.id = "popupExcluirModelo";
  popup.style.position = "fixed";
  popup.style.top = "0";
  popup.style.left = "0";
  popup.style.width = "100vw";
  popup.style.height = "100vh";
  popup.style.background = "rgba(0,0,0,0.5)";
  popup.style.display = "flex";
  popup.style.alignItems = "center";
  popup.style.justifyContent = "center";
  popup.style.zIndex = "9999";

  popup.innerHTML = `
    <div style="background:#fff;padding:24px;border-radius:8px;min-width:300px;max-width:90vw;">
      <h5>Excluir Modelo</h5>
      <p>Tem certeza que deseja excluir este modelo?</p>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button type="button" class="btn btn-secondary" id="cancelarExcluirModelo">Cancelar</button>
        <button type="button" class="btn btn-danger" id="confirmarExcluirModelo">Excluir</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  document.getElementById("cancelarExcluirModelo").onclick = function () {
    document.body.removeChild(popup);
  };

  document.getElementById("confirmarExcluirModelo").onclick =
    async function () {
      try {
        const res =  await fetch(`${BASE_URL}/modelo/${id}`, { method: "DELETE" });
        if (res.status === 403) {
          throw new Error("403");
        }
        if (res.status === 409) {
          throw new Error("409");
        }
        // Mostra mensagem de sucesso como popup temporário
        const msg = document.createElement("div");
        msg.textContent = "Modelo excluído com sucesso!";
        msg.style.position = "fixed";
        msg.style.top = "20px";
        msg.style.left = "50%";
        msg.style.transform = "translateX(-50%)";
        msg.style.background = "#dc3545";
        msg.style.color = "#fff";
        msg.style.padding = "12px 24px";
        msg.style.borderRadius = "6px";
        msg.style.zIndex = "10000";
        msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
        document.body.appendChild(msg);
        setTimeout(() => {
          msg.remove();
        }, 2000);
        document.body.removeChild(popup);
        carregarModelos();
      } catch (e) {
        if (e.message === "403") {
          alertPersonalizado("Sem permissão para excluir modelos. Contate o administrador.",2000);
        } else if (e.message === "409") {
          alertPersonalizado("Não é possível excluir este modelo pois existem produtos vinculados a ele.",3000);
        } else {
          alert("Erro ao excluir modelo");
        }
        document.body.removeChild(popup);
      }
    };
}

// ------- GESTÃO TIPOS ---------
function toggleTipos() {
  mostrarArea("areaTipos", () => {
    carregarTipos();

    // Aguarda o DOM atualizar para aplicar o scroll
    setTimeout(() => {
      const area = document.getElementById("areaTipos");
      if (area) {
        area.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50); // tempo suficiente para garantir que o display foi aplicado
  });
}

function carregarTipos() {
  fetch(`${BASE_URL}/tipos`)
    .then((r) => r.json())
    .then((dados) => {
      const tbody = document.getElementById("listaTipos");
      tbody.innerHTML = "";
      dados.forEach((t) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${t.tipodes}</td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="editarTipo(${t.tipocod
          }, '${t.tipodes.replace(
            /'/g,
            "'"
          )}')"><i class='fa fa-edit'></i></button>
            <button class="btn btn-sm btn-danger" onclick="excluirTipo(${t.tipocod
          })"><i class='fa fa-trash'></i></button>
          </td>`;
        tbody.appendChild(tr);
      });
    })
    .catch(console.error);
}

function editarTipo(id, nome) {
  // Cria o popup
  let popup = document.createElement("div");
  popup.id = "popupEditarTipo";
  popup.style.position = "fixed";
  popup.style.top = "0";
  popup.style.left = "0";
  popup.style.width = "100vw";
  popup.style.height = "100vh";
  popup.style.background = "rgba(0,0,0,0.5)";
  popup.style.display = "flex";
  popup.style.alignItems = "center";
  popup.style.justifyContent = "center";
  popup.style.zIndex = "9999";

  popup.innerHTML = `
    <div style="background:#fff;padding:24px;border-radius:8px;min-width:300px;max-width:90vw;">
      <h5>Editar Tipo</h5>
      <form id="formEditarTipo">
        <div class="mb-3">
          <label for="editarTipoDescricao" class="form-label">Descrição</label>
          <input type="text" class="form-control" id="editarTipoDescricao" name="tipodes" value="${nome || ""
    }" required>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button type="button" class="btn btn-secondary" id="cancelarEditarTipo">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(popup);

  document.getElementById("cancelarEditarTipo").onclick = function () {
    document.body.removeChild(popup);
  };

  document.getElementById("formEditarTipo").onsubmit = function (e) {
    e.preventDefault();
    const tipodes = document.getElementById("editarTipoDescricao").value.trim();
    fetch(`${BASE_URL}/tipo/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipodes }),
    })
      .then((r) => {
        if (r.status === 403) {
          throw new Error("403");
        }
        return r;
      })
      .then((r) => r.json())
      .then(() => {
        // Mostra mensagem de sucesso como popup temporário
        const msg = document.createElement("div");
        msg.textContent = "Tipo atualizado com sucesso!";
        msg.style.position = "fixed";
        msg.style.top = "20px";
        msg.style.left = "50%";
        msg.style.transform = "translateX(-50%)";
        msg.style.background = "#28a745";
        msg.style.color = "#fff";
        msg.style.padding = "12px 24px";
        msg.style.borderRadius = "6px";
        msg.style.zIndex = "10000";
        msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
        document.body.appendChild(msg);
        setTimeout(() => {
          msg.remove();
        }, 2000);
        document.body.removeChild(popup);
        carregarTipos();
      })
      .catch((error) => {
        if (error.message === "403") {
          alertPersonalizado("Sem permissão para editar tipos.",2000);
        } else {
          alert("Erro ao atualizar tipo");
        }
      });
  };
}

async function excluirTipo(id) {
  // Cria o popup de confirmação customizado
  let popup = document.createElement("div");
  popup.id = "popupExcluirTipo";
  popup.style.position = "fixed";
  popup.style.top = "0";
  popup.style.left = "0";
  popup.style.width = "100vw";
  popup.style.height = "100vh";
  popup.style.background = "rgba(0,0,0,0.5)";
  popup.style.display = "flex";
  popup.style.alignItems = "center";
  popup.style.justifyContent = "center";
  popup.style.zIndex = "9999";

  popup.innerHTML = `
    <div style="background:#fff;padding:24px;border-radius:8px;min-width:300px;max-width:90vw;">
      <h5>Excluir Tipo</h5>
      <p>Tem certeza que deseja excluir este tipo?</p>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button type="button" class="btn btn-secondary" id="cancelarExcluirTipo">Cancelar</button>
        <button type="button" class="btn btn-danger" id="confirmarExcluirTipo">Excluir</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  document.getElementById("cancelarExcluirTipo").onclick = function () {
    document.body.removeChild(popup);
  };

  document.getElementById("confirmarExcluirTipo").onclick = 
    async function () {
      try {
        const res = await fetch(`${BASE_URL}/tipo/${id}`, { method: "DELETE" });  
        if (res.status === 403) {
          throw new Error("403");
        }
        if (res.status === 409) {
          throw new Error("409");
        }
        // Mostra mensagem de sucesso como popup temporário
        const msg = document.createElement("div");
        msg.textContent = "Tipo excluído com sucesso!";
        msg.style.position = "fixed";
        msg.style.top = "20px";
        msg.style.left = "50%";
        msg.style.transform = "translateX(-50%)";
        msg.style.background = "#dc3545";
        msg.style.color = "#fff";
        msg.style.padding = "12px 24px";
        msg.style.borderRadius = "6px";
        msg.style.zIndex = "10000";
        msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
        document.body.appendChild(msg);
        setTimeout(() => {
          msg.remove();
        }, 2000);
        document.body.removeChild(popup);
        carregarTipos();
      } catch (error) {
        if (error.message === "403") {
          alertPersonalizado("Sem permissão para excluir este tipo. Contate o administrador.",2000);
        }
        else if (error.message === "409") {
          alertPersonalizado("Não é possível excluir este tipo pois existem produtos vinculados a ele.",3000);
        }

        else {
          alert("Erro ao excluir tipo");
        }
        document.body.removeChild(popup);
      }
    
  
  };

}

// ------- GESTÃO CORES ---------
function toggleCores() {
  mostrarArea("areaCores", () => {
    carregarCores();

    setTimeout(() => {
      const area = document.getElementById("areaCores");
      if (area) {
        area.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  });
}

function carregarCores() {
  fetch(`${BASE_URL}/cores`)
    .then((r) => r.json())
    .then((dados) => {
      const tbody = document.getElementById("listaCores");
      tbody.innerHTML = "";
      dados.forEach((c) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${c.cornome}</td>
          <td>
            <button class="btn btn-sm btn-primary" 
            data-cod="${c.corcod}" 
            data-nome="${c.cornome.replace(/"/g, "&quot;")}" 
            onclick="editarCor(this.dataset.cod, this.dataset.nome)"><i class='fa fa-edit'></i></button>
            <button class="btn btn-sm btn-danger" onclick="excluirCor(${c.corcod
          })"><i class='fa fa-trash'></i></button>
          </td>`;
        tbody.appendChild(tr);
      });
    })
    .catch(console.error);
}

function editarCor(id, nome) {
  let popup = document.createElement("div");
  popup.id = "popupEditarCor";
  popup.style.position = "fixed";
  popup.style.top = "0";
  popup.style.left = "0";
  popup.style.width = "100vw";
  popup.style.height = "100vh";
  popup.style.background = "rgba(0,0,0,0.5)";
  popup.style.display = "flex";
  popup.style.alignItems = "center";
  popup.style.justifyContent = "center";
  popup.style.zIndex = "9999";

  popup.innerHTML = `
    <div style="background:#fff;padding:24px;border-radius:8px;min-width:300px;max-width:90vw;">
      <h5>Editar Cor</h5>
      <form id="formEditarCor">
        <div class="mb-3">
          <label for="editarCorDescricao" class="form-label">Descrição</label>
          <input type="text" class="form-control" id="editarCorDescricao" name="cornome" value="${(
      nome || ""
    ).replace(/"/g, "&quot;")}"
          }" required>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button type="button" class="btn btn-secondary" id="cancelarEditarCor">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>
    </div>`;

  document.body.appendChild(popup);

  document.getElementById("cancelarEditarCor").onclick = function () {
    document.body.removeChild(popup);
  };

  document.getElementById("formEditarCor").onsubmit = function (e) {
    e.preventDefault();
    const cornome = document.getElementById("editarCorDescricao").value.trim();
    fetch(`${BASE_URL}/cores/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cornome }),
    })
      .then(async (res) => {
        if (res.status === 403) {
          throw new Error("403");
        }
        return res.json();
      })
      .then(() => {
        const msg = document.createElement("div");
        msg.textContent = "Cor atualizada com sucesso!";
        msg.style.position = "fixed";
        msg.style.top = "20px";
        msg.style.left = "50%";
        msg.style.transform = "translateX(-50%)";
        msg.style.background = "#28a745";
        msg.style.color = "#fff";
        msg.style.padding = "12px 24px";
        msg.style.borderRadius = "6px";
        msg.style.zIndex = "10000";
        msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
        document.body.appendChild(msg);
        setTimeout(() => {
          msg.remove();
        }, 2000);
        document.body.removeChild(popup);
        carregarCores();
      })
      .catch((error) => {
        if (error.message === "403") {
          alertPersonalizado("Sem permissão para editar esta cor. Contate o administrador.",2000);
        } else if (error.message === "200") {
          alert("OK");
        }
        else {
          alert("Erro ao atualizar cor");
        }
        document.body.removeChild(popup);
      });
  };
}

async function excluirCor(id) {
  let popup = document.createElement("div");
  popup.id = "popupExcluirCor";
  popup.style.position = "fixed";
  popup.style.top = "0";
  popup.style.left = "0";
  popup.style.width = "100vw";
  popup.style.height = "100vh";
  popup.style.background = "rgba(0,0,0,0.5)";
  popup.style.display = "flex";
  popup.style.alignItems = "center";
  popup.style.justifyContent = "center";
  popup.style.zIndex = "9999";

  popup.innerHTML = `
    <div style="background:#fff;padding:24px;border-radius:8px;min-width:300px;max-width:90vw;">
      <h5>Excluir Cor</h5>
      <p>Tem certeza que deseja excluir esta cor?</p>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button type="button" class="btn btn-secondary" id="cancelarExcluirCor">Cancelar</button>
        <button type="button" class="btn btn-danger" id="confirmarExcluirCor">Excluir</button>
      </div>
    </div>`;

  document.body.appendChild(popup);

  document.getElementById("cancelarExcluirCor").onclick = function () {
    document.body.removeChild(popup);
  };

  document.getElementById("confirmarExcluirCor").onclick = async function () {
    try {
      const res = await fetch(`${BASE_URL}/cores/${id}`, { method: "DELETE" });
      if (res.status === 403) {
        throw new Error("403");
      }
      const msg = document.createElement("div");
      msg.textContent = "Cor excluída com sucesso!";
      msg.style.position = "fixed";
      msg.style.top = "20px";
      msg.style.left = "50%";
      msg.style.transform = "translateX(-50%)";
      msg.style.background = "#dc3545";
      msg.style.color = "#fff";
      msg.style.padding = "12px 24px";
      msg.style.borderRadius = "6px";
      msg.style.zIndex = "10000";
      msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
      document.body.appendChild(msg);
      setTimeout(() => {
        msg.remove();
      }, 2000);
      document.body.removeChild(popup);
      carregarCores();
    } catch (error) {
      if (error.message === "403") {
        alertPersonalizado("Sem permissão para excluir esta cor. Contate o administrador.",2000);
      } else {
        alert("Erro ao excluir cor");
      } document.body.removeChild(popup);
    }
  };
}

// ------- GESTÃO PEÇAS ---------
function togglePecas() {
  mostrarArea("tabelaArea", () => {
    carregarPecas();

    // Aguarda o DOM atualizar para aplicar o scroll
    setTimeout(() => {
      const area = document.getElementById("tabelaArea");
      if (area) {
        area.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50); // tempo suficiente para garantir que o display foi aplicado
  });
}

function carregarPecas() {
  fetch(`${BASE_URL}/pros`)
    .then((r) => r.json())
    .then((dados) => {
      const tbody = document.getElementById("corpoTabela");
      tbody.innerHTML = "";
      dados.forEach((t) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${t.prodes}</td>
          <td>${formatarMoeda(t.provl)}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-sm btn-primary btn-editar-peca" data-id="${t.procod
          }" data-nome="${t.prodes.replace(/"/g, "&quot;")}" data-valor="${t.provl
          }">
                <i class='fa fa-edit'></i>
              </button>
              <button class="btn btn-sm btn-danger btn-excluir-peca" data-id="${t.procod
          }">
                <i class='fa fa-trash'></i>
              </button>
            </div>
          </td>`;
        tbody.appendChild(tr);
      });
    })
    .catch(console.error);
}

// Delegação de eventos para os botões de editar/excluir peças
document.getElementById("corpoTabela").addEventListener("click", function (e) {
  if (e.target.closest(".btn-editar-peca")) {
    const btn = e.target.closest(".btn-editar-peca");
    // Usa a mesma lógica de edição de produto com suporte a cores
    editarProduto(btn.getAttribute("data-id"));
  }
  if (e.target.closest(".btn-excluir-peca")) {
    const btn = e.target.closest(".btn-excluir-peca");
    excluirPro(btn.getAttribute("data-id"));
  }
});

async function excluirPro(id) {
  // Cria o popup de confirmação customizado
  let popup = document.createElement("div");
  popup.id = "popupExcluirPeca";
  popup.style.position = "fixed";
  popup.style.top = "0";
  popup.style.left = "0";
  popup.style.width = "100vw";
  popup.style.height = "100vh";
  popup.style.background = "rgba(0,0,0,0.5)";
  popup.style.display = "flex";
  popup.style.alignItems = "center";
  popup.style.justifyContent = "center";
  popup.style.zIndex = "9999";

  popup.innerHTML = `
    <div style="background:#fff;padding:24px;border-radius:8px;min-width:300px;max-width:90vw;">
      <h5>Excluir Peça</h5>
      <p>Tem certeza que deseja excluir esta peça?</p>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button type="button" class="btn btn-secondary" id="cancelarExcluirPeca">Cancelar</button>
        <button type="button" class="btn btn-danger" id="confirmarExcluirPeca">Excluir</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  document.getElementById("cancelarExcluirPeca").onclick = function () {
    document.body.removeChild(popup);
  };

  document.getElementById("confirmarExcluirPeca").onclick = async function () {
    try {
      const res =  await fetch(`${BASE_URL}/pro/${id}`, { method: "DELETE" });
       
      if (res.status === 200) {
        
      // Mostra mensagem de sucesso como popup temporário
      const msg = document.createElement("div");
      msg.textContent = "Peça excluída com sucesso!";
      msg.style.position = "fixed";
      msg.style.top = "20px";
      msg.style.left = "50%";
      msg.style.transform = "translateX(-50%)";
      msg.style.background = "#dc3545";
      msg.style.color = "#fff";
      msg.style.padding = "12px 24px";
      msg.style.borderRadius = "6px";
      msg.style.zIndex = "10000";
      msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
      document.body.appendChild(msg);
      setTimeout(() => {
        msg.remove();
      }, 2000);
      document.body.removeChild(popup);
      carregarPecas();
    } else if (res.status === 403) {
      document.body.removeChild(popup);
        throw new Error("403");
      }
    } catch (erro) {
      if (erro.message === "403") {
          alertPersonalizado("Sem permissão para excluir produtos.",2000);
        } else {
          alert("Erro ao criar produto.");
        }
        console.error(erro);
    }
  };
}

// (Removido o let duplicado, mantendo apenas a atribuição e uso de marcasCache)
document.addEventListener("DOMContentLoaded", () => {
  fetch(`${BASE_URL}/marcas/`)
    .then((res) => res.json())
    .then((dados) => {
      marcasCache = dados; // guarda em cache

      // Preenche o select do cadastro
      const selectCadastro = document.getElementById("painelMarca");
      if (selectCadastro) {
        selectCadastro.innerHTML =
          '<option value="">Selecione a Marca</option>';
        dados.forEach((m) => {
          const opt = document.createElement("option");
          opt.value = m.marcascod;
          opt.textContent = m.marcasdes;
          selectCadastro.appendChild(opt);
        });
      }
    })
    .catch(console.error);
});

// ==========================
// 1️⃣ Helpers: Overlay e Popup
// ==========================
function criarOverlay() {
  const overlay = document.createElement("div");
  overlay.classList.add("overlay");
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.5)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = 9999;
  return overlay;
}

function criarPopup(titulo) {
  const popup = document.createElement("div");
  popup.classList.add("popup");
  popup.style.background = "#fff";
  popup.style.padding = "20px";
  popup.style.borderRadius = "8px";
  popup.style.maxHeight = "80vh";
  popup.style.overflowY = "auto";
  popup.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
  popup.style.margin = "1rem";

  popup.innerHTML = `
    <h4>${titulo}</h4>
  `;

  popup.fecharHTML = `
    <div style="text-align:right; margin-top:10px;">
      <button class="btn btn-secondary" onclick="fecharPopup(this)">Fechar</button>
    </div>
  `;
  return popup;
}

function fecharPopup(btn) {
  // remove o popup
  const popup = btn.closest(".popup");
  if (popup) popup.remove();

  // remove o overlay
  const overlay = document.querySelector(".overlay");
  if (overlay) overlay.remove();
}

let marcasCache = [];
let modelosCache = [];
let tiposCache = [];
document.addEventListener("DOMContentLoaded", () => {
  const holder = document.getElementById("selectPainelMarca");

  if (!holder) return;

  fetch(`${BASE_URL}/marcas/`)
    .then((res) => res.json())
    .then((dados) => {
      marcasCache = dados;

      // Preenche select do cadastro
      if (holder) {
        holder.innerHTML = '<option value="">Selecione a Marca</option>';
        dados.forEach((marca) => {
          holder.innerHTML += `<option value="${marca.marcascod}">${marca.marcasdes}</option>`;
        });
      }
    })
    .catch(console.error);

  holder.addEventListener("focus", () => {
    fetch(`${BASE_URL}/marcas/`)
      .then((res) => res.json())
      .then((dados) => {
        holder.innerHTML = '<option value="">Selecione a Marca</option>';
        dados.forEach((marca) => {
          holder.innerHTML += `<option value="${marca.marcascod}">${marca.marcasdes}</option>`;
        });
      })
      .catch(console.error);
  });

  holder.addEventListener("change", (e) => {
    marcascod = e.target.value;
    // Só faz o fetch dos modelos ao selecionar uma marca
    fetch(`${BASE_URL}/modelo/${marcascod}`)
      .then((res) => res.json())
      .then((dados) => {
        modelosCache = dados;

        const selectCadastro = document.getElementById("selectPainelModelo");
        if (selectCadastro) {
          selectCadastro.innerHTML =
            '<option value="">Selecione o Modelo</option>';
          dados.forEach((m) => {
            const opt = document.createElement("option");
            opt.value = m.modcod;
            opt.textContent = m.moddes;
            selectCadastro.appendChild(opt);
          });
        }
        selectCadastro.addEventListener("change", (e) => {
          modelo = e.target.value;
        });
      })
      .catch(console.error);
  });
});

//tipo peça
document.addEventListener("DOMContentLoaded", () => {
  fetch(`${BASE_URL}/tipos/`)
    .then((res) => res.json())
    .then((dados) => {
      tiposCache = dados;

      // Preenche select do cadastro
      const selectCadastro = document.getElementById("painelTipo");
      if (selectCadastro) {
        selectCadastro.innerHTML = '<option value="">Selecione o Tipo</option>';
        dados.forEach((m) => {
          const opt = document.createElement("option");
          opt.value = m.tipocod;
          opt.textContent = m.tipodes;
          selectCadastro.appendChild(opt);
        });
      }
    })
    .catch(console.error);
});

function toggleOrdemMarca() {
  const overlay = criarOverlay();
  const popup = criarPopup("Gerenciar Ordem das Marcas");

  // Select de marcas + botão buscar
  let selectHtml = `<button id="btnBuscarMarcaOrdem" class="btn btn-primary btn-block mt-2">Buscar</button>
                 <div id="listaOrdemHolder" class="mt-3"></div>`;

  popup.innerHTML = popup.innerHTML + selectHtml + popup.fecharHTML;
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // Evento buscar modelos
  popup.querySelector("#btnBuscarMarcaOrdem").addEventListener("click", () => {
    fetch(`${BASE_URL}/marcas`)
      .then((r) => r.json())
      .then((marcas) => {
        const holder = popup.querySelector("#listaOrdemHolder");
        holder.innerHTML = `
            <ul id="sortable" class="list-group">
              ${marcas
            .map(
              (m) =>
                `<li class="list-group-item" data-id="${m.marcascod}"><span class="handle">☰ </span>${m.marcasdes}
                    </li>`
            )
            .join("")}
            </ul>
            <button id="salvarOrdem" class="btn btn-success btn-block mt-3">Salvar Ordem</button>
          `;

        // Ativa drag & drop com SortableJS (funciona no celular)
        Sortable.create(holder.querySelector("#sortable"), {
          handle: ".handle",
          animation: 150,
          fallbackOnBody: true, // usa fallback que permite scroll no mobile
          swapThreshold: 0.65, // melhora a troca entre itens
          scroll: true, // ativa auto-scroll
          scrollSensitivity: 60, // velocidade do scroll quando chega perto da borda
          scrollSpeed: 10, // intensidade do scroll
        });

        // Salvar ordem
        popup.querySelector("#salvarOrdem").addEventListener("click", () => {
          const ordem = [...holder.querySelectorAll("li")].map((li) => ({
            id: li.dataset.id,
            descricao: li.textContent,
          }));

          fetch(`${BASE_URL}/marcas/ordem`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ordem }),
          })
            .then((r) => r.json())
            .then(() => {
              const msg = document.createElement("div");
              msg.textContent = "Ordem Atualizada com sucesso!";
              msg.style.position = "fixed";
              msg.style.top = "20px";
              msg.style.left = "50%";
              msg.style.transform = "translateX(-50%)";
              msg.style.background = "#28a745";
              msg.style.color = "#fff";
              msg.style.padding = "12px 24px";
              msg.style.borderRadius = "6px";
              msg.style.zIndex = "10000";
              msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
              document.body.appendChild(msg);
              setTimeout(() => {
                msg.remove();
              }, 2000);
            })
            .catch(console.error);
        });
      });
  });
}
// ==========================
// 4️⃣ Toggle Ordem: Popup completo
// ==========================
function toggleOrdemModelo() {
  if (!marcasCache.length) return alert("Nenhuma marca carregada ainda!");

  const overlay = criarOverlay();
  const popup = criarPopup("Gerenciar Ordem dos Modelos");

  // Select de marcas + botão buscar
  let selectHtml = `<select id="marcaSelectOrdem" class="form-control">
                      <option value="">Selecione a marca</option>`;
  marcasCache.forEach((m) => {
    selectHtml += `<option value="${m.marcascod}">${m.marcasdes}</option>`;
  });
  selectHtml += `</select>
                 <button id="btnBuscarModelosOrdem" class="btn btn-primary btn-block mt-2">Buscar</button>
                 <div id="listaOrdemHolder" class="mt-3"></div>`;

  popup.innerHTML = popup.innerHTML + selectHtml + popup.fecharHTML;
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // Evento buscar modelos
  popup
    .querySelector("#btnBuscarModelosOrdem")
    .addEventListener("click", () => {
      const marcaId = popup.querySelector("#marcaSelectOrdem").value;
      if (!marcaId) return alert("Selecione uma marca!");

      fetch(`${BASE_URL}/modelo/${marcaId}`)
        .then((r) => r.json())
        .then((modelos) => {
          const modelosFiltrados = modelos.filter(
            (m) => m.modmarcascod == marcaId
          );

          const holder = popup.querySelector("#listaOrdemHolder");
          holder.innerHTML = `
            <ul id="sortable" class="list-group">
              ${modelosFiltrados
              .map(
                (m) =>
                  `<li class="list-group-item" data-id="${m.modcod}"><span class="handle">☰ </span>${m.moddes}
                    </li>`
              )
              .join("")}
            </ul>
            <button id="salvarOrdem" class="btn btn-success btn-block mt-3">Salvar Ordem</button>
          `;

          // Ativa drag & drop com SortableJS (funciona no celular)
          Sortable.create(holder.querySelector("#sortable"), {
            handle: ".handle",
            animation: 150,
            fallbackOnBody: true, // usa fallback que permite scroll no mobile
            swapThreshold: 0.65, // melhora a troca entre itens
            scroll: true, // ativa auto-scroll
            scrollSensitivity: 60, // velocidade do scroll quando chega perto da borda
            scrollSpeed: 10, // intensidade do scroll
          });

          // Salvar ordem
          popup.querySelector("#salvarOrdem").addEventListener("click", () => {
            const ordem = [...holder.querySelectorAll("li")].map((li) => ({
              id: li.dataset.id,
              descricao: li.textContent,
            }));

            fetch(`${BASE_URL}/modelo/ordem`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ordem }),
            })
              .then((r) => r.json())
              .then(() => {
                const msg = document.createElement("div");
                msg.textContent = "Ordem Atualizada com sucesso!";
                msg.style.position = "fixed";
                msg.style.top = "20px";
                msg.style.left = "50%";
                msg.style.transform = "translateX(-50%)";
                msg.style.background = "#28a745";
                msg.style.color = "#fff";
                msg.style.padding = "12px 24px";
                msg.style.borderRadius = "6px";
                msg.style.zIndex = "10000";
                msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
                document.body.appendChild(msg);
                setTimeout(() => {
                  msg.remove();
                }, 2000);
              })
              .catch(console.error);
          });
        });
    });
}

//********************************************* */
function criarPopupPeca(titulo) {
  const popup = document.createElement("div");
  popup.classList.add("popup");
  popup.style.background = "#fff";
  popup.style.padding = "20px";
  popup.style.borderRadius = "8px";
  popup.style.maxHeight = "80vh";
  popup.style.overflowY = "auto";
  popup.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
  popup.style.margin = "1rem";

  popup.innerHTML = `
    <h4>${titulo}</h4>
  `;

  popup.fecharHTML = `
    <div style="text-align:right; margin-top:10px;">
      <button class="btn btn-secondary" onclick="fecharPopup(this)">Fechar</button>
    </div>
  `;
  return popup;
}

// ==========================
// 4️⃣ Toggle Ordem: Popup completo
// ==========================
function toggleOrdemPeca() {
  if (!marcasCache.length) return alert("Nenhuma marca carregada ainda!");
  //if (!modelosCache.length) return alert("Nenhum modelo carregado ainda!");
  if (!tiposCache.length) return alert("Nenhum tipo carregado ainda!");

  const overlay = criarOverlay();
  const popup = criarPopup("Gerenciar Ordem Tipos");

  // Select de marcas + botão buscar
  let selectHtml = `<select id="marcaSelectOrdem" class="form-control mb-2">
                      <option value="">Selecione a marca</option>`;
  marcasCache.forEach((m) => {
    selectHtml += `<option value="${m.marcascod}">${m.marcasdes}</option>`;
  });
  selectHtml += `</select>`;

  selectHtml += `<select id="modelosSelectOrdem" class="form-control mb-2">
                      <option value="">Selecione o modelo</option>`;
  selectHtml += `</select>`;

  selectHtml += `<select id="tiposSelectOrdem" class="form-control mb-2">
                      <option value="">Selecione o Tipo</option>`;
  tiposCache.forEach((m) => {
    selectHtml += `<option value="${m.tipocod}">${m.tipodes}</option>`;
  });

  selectHtml += `</select>
                 <button id="btnBuscarPecasOrdem" class="btn btn-primary btn-block mt-2">Buscar</button>
                 <div id="listaOrdemHolder" class="mt-3"></div>`;

  popup.innerHTML = popup.innerHTML + selectHtml + popup.fecharHTML;
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  const marcaSelect = popup.querySelector("#marcaSelectOrdem");
  const modelosSelect = popup.querySelector("#modelosSelectOrdem");
  const tiposSelect = popup.querySelector("#tiposSelectOrdem");

  if (!marcaSelect || !modelosSelect || !tiposSelect) return;

  marcaSelect.addEventListener("change", (e) => {
    const marcaId = e.target.value;
    if (!marcaId) {
      modelosSelect.innerHTML = '<option value="">Selecione o modelo</option>';
      return;
    }

    fetch(`${BASE_URL}/modelo/${marcaId}`)
      .then((res) => res.json())
      .then((dados) => {
        modelosCache = dados;
        modelosSelect.innerHTML =
          '<option value="">Selecione o modelo</option>';
        dados.forEach((m) => {
          const opt = document.createElement("option");
          opt.value = m.modcod;
          opt.textContent = m.moddes;
          modelosSelect.appendChild(opt);
        });
      })
      .catch(console.error);
  });

  // Ao mudar o modelo, carrega os tipos correspondentes
  modelosSelect.addEventListener("change", async (e) => {
    const modeloId = e.target.value;
    if (!modeloId) {
      tiposSelect.innerHTML = '<option value="">Selecione o Tipo</option>';
      return;
    }

    try {
      const resTipos = await fetch(`${BASE_URL}/tipo/${modeloId}`);
      tiposCache = await resTipos.json();
      tiposSelect.innerHTML = '<option value="">Selecione o Tipo</option>';
      tiposCache.forEach((t) => {
        tiposSelect.innerHTML += `<option value="${t.tipocod}">${t.tipodes}</option>`;
      });
    } catch (err) {
      console.error("Erro ao buscar tipos:", err);
    }
  });

  // Evento buscar modelos
  popup.querySelector("#btnBuscarPecasOrdem").addEventListener("click", () => {
    const marcaId = popup.querySelector("#marcaSelectOrdem").value;
    const modeloId = popup.querySelector("#modelosSelectOrdem").value;
    const tipoId = popup.querySelector("#tiposSelectOrdem").value;
    if (!marcaId) return alert("Selecione uma marca!");
    if (!modeloId) return alert("Selecione um modelo!");
    if (!tipoId) return alert("Selecione um tipo!");

    fetch(`${BASE_URL}/pro/${tipoId}?marca=${marcaId}&modelo=${modeloId}`)
      .then((r) => r.json())
      .then((produtos) => {
        const holder = popup.querySelector("#listaOrdemHolder");
        holder.innerHTML = `
            <ul id="sortable" class="list-group">
            ${produtos
            .map(
              (p) =>
                `<li class="list-group-item" data-id="${p.procod}">
                     <span class="handle">☰ </span>${p.prodes}
                   </li>`
            )
            .join("")}
            </ul>
            <button id="salvarOrdem" class="btn btn-success btn-block mt-3">Salvar Ordem</button>
          `;

        // Ativa drag & drop com SortableJS (funciona no celular)
        Sortable.create(holder.querySelector("#sortable"), {
          handle: ".handle",
          animation: 150,
          fallbackOnBody: true, // usa fallback que permite scroll no mobile
          swapThreshold: 0.65, // melhora a troca entre itens
          scroll: true, // ativa auto-scroll
          scrollSensitivity: 60, // velocidade do scroll quando chega perto da borda
          scrollSpeed: 10, // intensidade do scroll
        });

        // Salvar ordem
        popup.querySelector("#salvarOrdem").addEventListener("click", () => {
          const ordem = [...holder.querySelectorAll("li")].map((li) => ({
            id: li.dataset.id,
            descricao: li.textContent,
          }));

          fetch(`${BASE_URL}/pro/ordem`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ordem }),
          })
            .then((r) => r.json())
            .then(() => {
              const msg = document.createElement("div");
              msg.textContent = "Ordem Atualizada com sucesso!";
              msg.style.position = "fixed";
              msg.style.top = "20px";
              msg.style.left = "50%";
              msg.style.transform = "translateX(-50%)";
              msg.style.background = "#28a745";
              msg.style.color = "#fff";
              msg.style.padding = "12px 24px";
              msg.style.borderRadius = "6px";
              msg.style.zIndex = "10000";
              msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
              document.body.appendChild(msg);
              setTimeout(() => {
                msg.remove();
              }, 2000);
            })
            .catch(console.error);
        });
      });
  });
}

function toggleOrdemTipoPeca() {
  const overlay = criarOverlay();
  const popup = criarPopup("Gerenciar Ordem dos Tipos");

  // Select de marcas + botão buscar
  let selectHtml = `<select id="marcaSelectOrdem" class="form-control mb-2">
                      <option value="">Selecione a marca</option>`;
  marcasCache.forEach((m) => {
    selectHtml += `<option value="${m.marcascod}">${m.marcasdes}</option>`;
  });
  selectHtml += `</select>`;

  selectHtml += `<select id="modelosSelectOrdem" class="form-control mb-2">
                      <option value="">Selecione o modelo</option>`;
  selectHtml += `</select>`;

  selectHtml += `</select>
                 <button id="btnBuscarTipoPecasOrdem" class="btn btn-primary btn-block mt-2">Buscar</button>
                 <div id="listaOrdemHolder" class="mt-3"></div>`;

  popup.innerHTML = popup.innerHTML + selectHtml + popup.fecharHTML;
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  const marcaSelect = popup.querySelector("#marcaSelectOrdem");
  const modelosSelect = popup.querySelector("#modelosSelectOrdem");

  if (!marcaSelect || !modelosSelect) return;

  marcaSelect.addEventListener("change", (e) => {
    const marcaId = e.target.value;
    if (!marcaId) {
      modelosSelect.innerHTML = '<option value="">Selecione o modelo</option>';
      return;
    }

    fetch(`${BASE_URL}/modelo/${marcaId}`)
      .then((res) => res.json())
      .then((dados) => {
        modelosCache = dados;
        modelosSelect.innerHTML =
          '<option value="">Selecione o modelo</option>';
        dados.forEach((m) => {
          const opt = document.createElement("option");
          opt.value = m.modcod;
          opt.textContent = m.moddes;
          modelosSelect.appendChild(opt);
        });
      })
      .catch(console.error);
  });

  // Evento buscar modelos
  popup
    .querySelector("#btnBuscarTipoPecasOrdem")
    .addEventListener("click", () => {
      const marcaId = popup.querySelector("#marcaSelectOrdem").value;
      const modeloId = popup.querySelector("#modelosSelectOrdem").value;
      if (!marcaId) return alert("Selecione uma marca!");
      if (!modeloId) return alert("Selecione um modelo!");

      fetch(`${BASE_URL}/tipo/${modeloId}?marca=${marcaId}`)
        .then((r) => r.json())
        .then((tipos) => {
          const holder = popup.querySelector("#listaOrdemHolder");
          holder.innerHTML = `
            <ul id="sortable" class="list-group">
            ${tipos
              .map(
                (p) =>
                  `<li class="list-group-item" data-id="${p.tipocod}">
                     <span class="handle">☰ </span>${p.tipodes}
                   </li>`
              )
              .join("")}
            </ul>
            <button id="salvarOrdem" class="btn btn-success btn-block mt-3">Salvar Ordem</button>
          `;

          // Ativa drag & drop com SortableJS (funciona no celular)
          Sortable.create(holder.querySelector("#sortable"), {
            handle: ".handle",
            animation: 150,
            fallbackOnBody: true, // usa fallback que permite scroll no mobile
            swapThreshold: 0.65, // melhora a troca entre itens
            scroll: true, // ativa auto-scroll
            scrollSensitivity: 60, // velocidade do scroll quando chega perto da borda
            scrollSpeed: 10, // intensidade do scroll
          });

          // Salvar ordem
          popup.querySelector("#salvarOrdem").addEventListener("click", () => {
            const ordem = [...holder.querySelectorAll("li")].map((li) => ({
              id: li.dataset.id,
              descricao: li.textContent,
            }));

            fetch(`${BASE_URL}/tipo/ordem`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ordem }),
            })
              .then((r) => r.json())
              .then(() => {
                const msg = document.createElement("div");
                msg.textContent = "Ordem Atualizada com sucesso!";
                msg.style.position = "fixed";
                msg.style.top = "20px";
                msg.style.left = "50%";
                msg.style.transform = "translateX(-50%)";
                msg.style.background = "#28a745";
                msg.style.color = "#fff";
                msg.style.padding = "12px 24px";
                msg.style.borderRadius = "6px";
                msg.style.zIndex = "10000";
                msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
                document.body.appendChild(msg);
                setTimeout(() => {
                  msg.remove();
                }, 2000);
              })
              .catch(console.error);
          });
        });
    });
}

//********************************************* */

//função para gerar mensagem de cobrança
async function dadosPagamento() {
  try {
    const response = await fetch(`${BASE_URL}/emp/pagamento`); // sua rota no backend
    if (!response.ok) throw new Error("Erro ao buscar dados de pagamento");
    const data = await response.json();
    return data; // true ou false
  } catch (err) {
    console.error(err);
    return false; // assume não pago se der erro
  }
}

async function processCharges() {
  try {
    const hoje = new Date();
    const dados = await dadosPagamento();

    if (dados.empdtpag || !dados.empdtvenc) return;

    const vencimento = new Date(dados.empdtvenc);

    const diffDias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

    // mostra aviso se estiver até 5 dias antes do vencimento
    if (diffDias >= 0 && diffDias <= 5) {
      const div = document.createElement("div");
      div.textContent =
        diffDias === 0
          ? "Sua mensalidade vence HOJE! Realize o pagamento."
          : `Sua mensalidade vence em ${diffDias} dias, não esqueça de pagar.`;

      div.style.position = "fixed";
      div.style.top = "20px";
      div.style.left = "50%";
      div.style.transform = "translateX(-50%)";
      div.style.background = diffDias === 0 ? "#f32206ff" : "#ffbb27ff";
      div.style.color = "#fff";
      div.style.padding = "12px 24px";
      div.style.borderRadius = "6px";
      div.style.zIndex = "10000";
      div.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
      document.body.appendChild(div);

      setTimeout(() => div.remove(), 6000);
    }
  } catch (err) {
    console.error(err);
  }
}
processCharges();
// checa 1x por dia
setInterval(() => {
  processCharges();
}, 24 * 60 * 60 * 1000);



// alertPersonalizado personalizado Tom FORMAL

function alertPersonalizado(message, time) {
  let alertPersonalizado = document.getElementById("alertPersonalizado");

  if (!alertPersonalizado) {
    alertPersonalizado = document.createElement("div");
    alertPersonalizado.id = "alertPersonalizado";
    alertPersonalizado.style = `
        position: fixed;
        width: 350px;
        top: 8%;
        left: 50%;
        transform: translateX(-50%);
        background-color: #333;
        color: #fff;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s;
      `;
    document.body.appendChild(alertPersonalizado);
  }

  alertPersonalizado.textContent = message;
  alertPersonalizado.style.opacity = "1";

  setTimeout(() => {
    alertPersonalizado.style.opacity = "0";
    alertPersonalizado.remove();
  }, time);
}
