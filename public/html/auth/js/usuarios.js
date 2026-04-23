const params = new URLSearchParams(window.location.search);

const id = params.get("id");
const marcascod = params.get("marcascod");

const usersData = [
  //popular table com os dados do modelo
  { id: 0, nome: " ", email: " ", senha: " ", adm: "S", sta: "A" },
];

// Estado
let users = [...usersData]; // clone para manipulação local
let filtered = [...users];
// Carrega dados reais da API e atualiza users/usersData
// --- Função central para recarregar usuários da API e atualizar UI ---
async function refreshUsers({ keepSearch = true } = {}) {
  try {
    const res = await fetch(`${BASE_URL}/usuario/listar`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const dados = await res.json();
    const list = Array.isArray(dados) ? dados : [];

    // atualiza arrays usados pelo resto do script
    usersData.length = 0;
    usersData.push(...list);
    users = [...usersData];

    // preserva termo de busca atual (ou limpa) e re-renderiza
    const termo = keepSearch && searchInput ? searchInput.value : "";
    doSearch(termo);
  } catch (err) {
    console.error("Failed to refresh users:", err);
    alert("Erro ao recarregar usuários. Veja console para mais detalhes.");
  }
}

// Substitui seu IIFE loadUsers original — usa refreshUsers para inicializar
(async function init() {
  await refreshUsers();
})();

// Elementos
const tbody = document.getElementById("usersTbody");
const searchInput = document.getElementById("searchInput");
const resultsInfo = document.getElementById("resultsInfo");
const emptyState = document.getElementById("emptyState");

const userModalEl = document.getElementById("userModal");
const userModal = new bootstrap.Modal(userModalEl);
const userForm = document.getElementById("userForm");
const usuId = document.getElementById("usuId");
const usuNome = document.getElementById("usuNome");
const usuEmail = document.getElementById("usuEmail");
const usuSenha = document.getElementById("usuSenha");
const usuAdm = document.getElementById("usuAdm");
const usuSta = document.getElementById("usuSta");
const usuRca = document.getElementById("usuRca");
const usuPv = document.getElementById("usuPv");
const usuEst = document.getElementById("usuEst");
const togglePwd = document.getElementById("togglePwd");
const btnDelete = document.getElementById("btnDelete");
const btnNew = document.getElementById("btnNew");
const btnRefresh = document.getElementById("btnRefresh");

// Render da tabela
function renderTable(list) {
  tbody.innerHTML = "";
  if (!list.length) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
    for (const u of list) {
      const tr = document.createElement("tr");
      tr.dataset.usucod = u.usucod;
      tr.innerHTML = `
            
            <!--<td>${escapeHtml(u.usunome)}</td>-->
            <td>${u.usucod}</td>
            <td>${escapeHtml(u.usuemail)}</td>
            <td>${
              u.usuadm === "S"
                ? '<span class="badge bg-success">Sim</span>'
                : '<span class="badge bg-secondary">Não</span>'
            }</td>
            <td>${
              u.ususta === "A"
                ? '<span class="badge bg-success">Ativo</span>'
                : u.ususta === "I"
                ? '<span class="badge bg-warning text-dark">Inativo</span>'
                : '<span class="badge bg-danger">Excluído</span>'
            }</td>
          `;
      tr.addEventListener("click", () => openUserModal(u.usucod));
      tbody.appendChild(tr);
    }
  }
  resultsInfo.textContent = `${list.length} usuário(s)`;
}

// Busca simples (nome, email, id)
function doSearch(term) {
  const q = term.trim().toLowerCase();
  if (!q) {
    filtered = [...users];
  } else {
    filtered = users.filter(
      (u) =>
        String(u.usucod).includes(q) ||
        u.usunome.toLowerCase().includes(q) ||
        u.usuemail.toLowerCase().includes(q)
    );
  }
  renderTable(filtered);
}

// Abrir modal preenchido
function openUserModal(usucod) {
  const u = users.find((x) => x.usucod == usucod);
  if (!u) return;
  //console.log(u.usuemail.length);
  if (u.usuemail.length >= 3) {
    usuId.value = u.usucod;
    usuNome.value = u.usunome;
    usuEmail.value = u.usuemail;
    usuEmail.disabled = true;
    usuSenha.value = "";
    usuSenha.type = "password";
    usuAdm.checked = u.usuadm === "S";
    usuPv.checked = u.usupv === "S";
    usuEst.checked = u.usuest === "S";
    usuSta.checked = u.ususta === "A" ? true : u.ususta === "I" ? false : false;
    usuRca.checked = u.usurca === "S";
    userModal.show();
  }
}

// salvar registro na api
userForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const id = usuId.value;
  const email = usuEmail.value.trim();
  const payload = {
    usunome: usuNome.value.trim(),
    usuemail: usuEmail.value.trim(),
    ususenha: usuSenha.value,
    usuadm: usuAdm.checked ? "S" : "N",
    usupv: usuPv.checked ? "S" : "N",
    usuest: usuEst.checked ? "S" : "N",
    ususta: usuSta.checked ? "A" : "I",
    usurca: usuRca.checked ? "S" : "N",
  };

  try {
    // Define URL based on whether we're creating or updating
    const url = id
      ? `${BASE_URL}/usuario/atualizar/${email}`
      : `${BASE_URL}/usuario/novo/`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // tenta extrair mensagem da API se houver
      let msg = `Erro ao salvar usuário (HTTP ${response.status})`;
      try {
        const errObj = await response.json();
        if (errObj && errObj.mensagem) msg = errObj.mensagem;
      } catch (e) {
        /**/
      }
      throw new Error(msg);
    }

    // Se a API retornar o objeto criado/atualizado, ok; mas para garantir consistência,
    // recarregamos a lista inteira da API (mantendo o termo de busca atual).
    await refreshUsers({ keepSearch: true });
    userModal.hide();
  } catch (error) {
    console.error("Failed to save user to API:", error);
    alert(error.message || "Erro ao salvar usuário. Veja console.");
  }
});

// Excluir usuário via API
btnDelete.addEventListener("click", async () => {
  const id = usuId.value;
  if (!id) return;
  if (!confirm("Deseja realmente excluir este usuário?")) return;

  try {
    const response = await fetch(`${BASE_URL}/usuario/excluir/${id}`, {
      method: "POST",
    });
    if (!response.ok) {
      let msg = `Erro ao excluir usuário (HTTP ${response.status})`;
      try {
        const errObj = await response.json();
        if (errObj && errObj.mensagem) msg = errObj.mensagem;
      } catch (e) {
        /**/
      }
      throw new Error(msg);
    }

    // Recarrega lista da API para garantir consistência
    await refreshUsers({ keepSearch: true });
    userModal.hide();
  } catch (error) {
    console.error("Failed to delete user:", error);
    alert(error.message || "Erro ao excluir usuário");
  }
});

// Novo usuário
btnNew.addEventListener("click", () => {
  usuEmail.disabled = false;
  usuId.value = "";
  usuNome.value = "";
  usuEmail.value = "";
  usuSenha.value = "";
  usuSenha.type = "password";
  usuAdm.checked = false;
  usuPv.checked = false;
  usuEst.checked = false;
  usuSta.checked = true;
  usuRca.checked = false;
  userModal.show();
});

// Toggle mostrar senha
togglePwd.addEventListener("click", () => {
  usuSenha.type = usuSenha.type === "password" ? "text" : "password";
  togglePwd.innerHTML =
    usuSenha.type === "password"
      ? '<i class="fa-solid fa-eye"></i>'
      : '<i class="fa-solid fa-eye-slash"></i>';
});

// Escape para evitar XSS em campos renderizados
function escapeHtml(txt = "") {
  return txt
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Eventos de busca com debounce simples
let searchTimer = null;
searchInput.addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => doSearch(e.target.value), 180);
});

// inicializa
doSearch("");
