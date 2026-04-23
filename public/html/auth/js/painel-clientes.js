// clientes.js — versão +pleno/jr

// Base da API
//const BASE_URL = window.API_BASE || window.BASE_URL || "";

// Elementos principais
const cliModalEl = document.getElementById("cliModal");
const cliModal = new bootstrap.Modal(cliModalEl);
const btnNew = document.getElementById("btnNew");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const searchInput = document.getElementById("searchInput");
const tbody = document.getElementById("cliTbody");
const resultsInfo = document.getElementById("resultsInfo");
const emptyState = document.getElementById("emptyState");

// Form e botões do modal
const cliForm = document.getElementById("cliForm");
const btnInativar = document.getElementById("btnInativar");
const btnExcluir = document.getElementById("btnExcluir");

// Campos do formulário
const f_parcod = document.getElementById("parcod");
const f_pardes = document.getElementById("pardes");
const f_parfan = document.getElementById("parfan");
const f_parcnpjcpf = document.getElementById("parcnpjcpf");
const f_parierg = document.getElementById("parierg");
const f_paremail = document.getElementById("paremail");
const f_parfone = document.getElementById("parfone");
const f_parcep = document.getElementById("parcep");
const f_parrua = document.getElementById("parrua");
const f_parbai = document.getElementById("parbai");
const f_parmuncod = document.getElementById("parmuncod");
const f_parmuncodcod = document.getElementById("parmuncodcod");
const f_clibloq = document.getElementById("clibloq");
const f_clilim = document.getElementById("clilim");
const f_parsit = document.getElementById("parsit");
const listaMunicipios = document.getElementById("listaMunicipios");
let municipios = [];

// Estado simples
let page = 1;
let pageSize = 20;
let total = 0;
let q = "";

// Helpers simples
function onlyDigits(s) {
    return (s || "").replace(/\D/g, "");
}
function fmtMoney(v) {
    const n = Number(v || 0);
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDoc(d) {
    const s = onlyDigits(d || "");
    if (!s) return "";
    if (s.length === 11) return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    if (s.length === 14) return s.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    return s;
}
function fmtPhone(v) {
    const s = onlyDigits(v);
    if (s.length === 10) return s.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    if (s.length === 11) return s.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    return v || "";
}
function showToast(texto, ok = true) {
    const msg = document.createElement("div");
    msg.textContent = texto;
    msg.style.position = "fixed";
    msg.style.top = "20px";
    msg.style.left = "50%";
    msg.style.transform = "translateX(-50%)";
    msg.style.background = ok ? "#28a745" : "#dc3545";
    msg.style.color = "#fff";
    msg.style.padding = "12px 24px";
    msg.style.borderRadius = "6px";
    msg.style.zIndex = "10000";
    msg.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 2000);
}

// Carregar lista
async function carregarClientes() {
    const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        q
    }).toString();

    try {
        const url = `${BASE_URL}/cli?${params}`;
        const resp = await fetch(url, { method: "GET" });
        const data = await resp.json();

        if (!resp.ok) throw new Error(data?.error || `Erro ${resp.status}`);

        total = data.total || 0;
        renderTabela(data.data || []);
        resultsInfo.textContent = `${total} cliente(s)`;
        emptyState.style.display = (data.data || []).length ? "none" : "block";
    } catch (err) {
        console.error(err);
        alert("Falha ao carregar clientes.");
    }
}

// Carregar Municipios



async function carregarMunicipios() {
    try {
        const resp = await fetch(`${BASE_URL}/municipios`);
        const data = await resp.json();

        if (!Array.isArray(data)) {
            console.warn("Formato inesperado da rota /municipios:", data);
            return;
        }

        municipios = data;
        listaMunicipios.innerHTML = "";

        data.forEach((m) => {
            const opt = document.createElement("option");
            opt.value = `${m.mundes} - ${m.munufsigla}`;
            opt.dataset.id = m.muncod;
            listaMunicipios.appendChild(opt);
        });
    } catch (err) {
        console.error("Erro ao carregar municípios:", err);
    }
}

// Renderizar tabela
function renderTabela(lista) {
    tbody.innerHTML = "";
    lista.forEach((r) => {
        const tr = document.createElement("tr");
        tr.className = "row-item";
        tr.dataset.id = r.parcod;

        const cidadeUF = [r.mundes, r.ufsigla].filter(Boolean).join("/");

        tr.innerHTML = `
      <td>${r.parcod}</td>
      <td>${r.pardes || ""}</td>
      <td>${r.parfan || ""}</td>
      <td>${fmtDoc(r.parcnpjcpf)}</td>
      <td>${cidadeUF}</td>
      <td>${fmtPhone(r.parfone)}</td>
      <td>${r.paremail || ""}</td>
      <td>${r.clibloq ? "S" : "N"}</td>
      <td>${fmtMoney(r.clilim)}</td>
      <td>${r.parsit === "I" ? "Inativo" : "Ativo"}</td>
    `;

        tr.addEventListener("click", () => abrirEdicao(r.parcod));
        tbody.appendChild(tr);
    });
}

// Abrir modal em modo novo
function abrirNovo() {
    cliForm.reset();
    f_parcod.value = "";
    f_clibloq.checked = false;
    f_clilim.value = 0;
    f_parsit.value = "";
    btnInativar.disabled = true;
    btnExcluir.disabled = true;
    cliModal.show();
}

// Carregar dados e abrir edição
async function abrirEdicao(id) {
    cliForm.reset();
    btnInativar.disabled = false;
    btnExcluir.disabled = false;

    try {
        const url = `${BASE_URL}/cli/${id}`;
        const resp = await fetch(url, { method: "GET" });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || `Erro ${resp.status}`);

        f_parcod.value = data.parcod || "";
        f_pardes.value = data.pardes || "";
        f_parfan.value = data.parfan || "";
        f_parcnpjcpf.value = onlyDigits(data.parcnpjcpf || "");
        f_parierg.value = data.parierg || "";
        f_paremail.value = data.paremail || "";
        f_parfone.value = data.parfone || "";
        f_parcep.value = data.parcep || "";
        f_parrua.value = data.parrua || "";
        f_parbai.value = data.parbai || "";
        f_parmuncod.value = data.mundes || "";
        f_clibloq.checked = !!data.clibloq;
        f_clilim.value = data.clilim ?? 0;
        f_parsit.value = data.parsit || "";
        cliModal.show();
    } catch (err) {
        console.error(err);
        alert("Falha ao carregar cliente.");
    }
}

// Salvar (create/update)
cliForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    
    

    // determinar código do município a partir do campo de texto ou do campo oculto com código
    const muniText = (f_parmuncod.value || "").trim();
    let parmuncod = 0;

    // se há um campo específico com o código, usar primeiro
    if (f_parmuncodcod && onlyDigits(f_parmuncodcod.value)) {
        parmuncod = Number(f_parmuncodcod.value);
    } else if (muniText) {
        // tentar casar com a lista de municípios carregada
        const match = municipios.find((m) => {
            const label = `${m.mundes} - ${m.munufsigla}`.trim();
            return label.toLowerCase() === muniText.toLowerCase()
                || (m.mundes || "").toLowerCase() === muniText.toLowerCase();
        });
        if (match) parmuncod = Number(match.muncod || 0);
    }

    const payload = {
        pardes: (f_pardes.value || "").trim(),
        parfan: (f_parfan.value || "").trim() || null,
        parcnpjcpf: onlyDigits(f_parcnpjcpf.value),
        parierg: (f_parierg.value || "").trim() || null,
        paremail: (f_paremail.value || "").trim() || null,
        parfone: (f_parfone.value || "").trim() || null,
        parcep: (f_parcep.value || "").trim() || null,
        parrua: (f_parrua.value || "").trim() || null,
        parbai: (f_parbai.value || "").trim() || null,
        parmuncod: parmuncod,
        clibloq: !!f_clibloq.checked,
        clilim: Number(f_clilim.value || 0),
        parsit: f_parsit.value || undefined
    };

    const isNew = !f_parcod.value;
    const url = isNew ? `${BASE_URL}/cli` : `${BASE_URL}/cli/${f_parcod.value}`;
    const method = isNew ? "POST" : "PUT";

    // feedback no botão
    const btnSubmit = cliForm.querySelector('button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerText = "Salvando...";
    }

    try {
        const resp = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            if (resp.status === 403) {
                cliModal.hide();
                if (typeof alertPersonalizado === "function") {
                    alertPersonalizado("Sem permissão para salvar clientes.", 2000);
                } else {
                    alert("Sem permissão.");
                }
                return;
            }
            throw new Error(data?.error || `Erro ${resp.status}`);
        }

        showToast(isNew ? "Cliente cadastrado!" : "Cliente atualizado!", true);
        cliModal.hide();
        carregarClientes();
    } catch (err) {
        console.error(err);
        alert("Erro ao salvar: " + (err.message || "desconhecido"));
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerText = "Salvar";
        }
    }
});

// Inativar
btnInativar.addEventListener("click", async () => {
    const id = f_parcod.value;
    if (!id) return;
    if (!confirm("Inativar este cliente?")) return;

    try {
        const resp = await fetch(`${BASE_URL}/cli/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ parsit: "I" })
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data?.error || `Erro ${resp.status}`);

        showToast("Cliente inativado.", true);
        cliModal.hide();
        carregarClientes();
    } catch (err) {
        console.error(err);
        alert("Falha ao inativar.");
    }
});

// Excluir (soft) — SHIFT+clique faz hard delete
btnExcluir.addEventListener("click", async (ev) => {
    const id = f_parcod.value;
    if (!id) return;

    const hard = ev.shiftKey; // segurar SHIFT para apagar de vez
    const msg = hard
        ? "Excluir DEFINITIVAMENTE este cliente? (Remove PAR e CLI)"
        : "Remover cliente? (soft delete/inativação de vínculo, se aplicável)";

    if (!confirm(msg)) return;

    try {
        const url = hard ? `${BASE_URL}/cli/${id}?hard=1` : `${BASE_URL}/cli/${id}`;
        const resp = await fetch(url, { method: "DELETE" });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data?.error || `Erro ${resp.status}`);

        showToast(hard ? "Cliente excluído (hard)." : "Cliente removido.", true);
        cliModal.hide();
        carregarClientes();
    } catch (err) {
        console.error(err);
        alert("Falha ao excluir: " + (err.message || ""));
    }

});

// Novo cliente
btnNew.addEventListener("click", () => {
    abrirNovo();
});

// Paginação
btnNext.addEventListener("click", () => {
    const pages = Math.ceil(total / pageSize);
    if (page < pages) {
        page++;
        carregarClientes();
    }
});
btnPrev.addEventListener("click", () => {
    if (page > 1) {
        page--;
        carregarClientes();
    }
});

// Busca simples (sem debounce pra ficar direto)
searchInput.addEventListener("input", (e) => {
    q = (e.target.value || "").trim();
    page = 1;
    carregarClientes();
});

// Pequenas máscaras ao sair do campo
f_parcnpjcpf.addEventListener("blur", (e) => {
    e.target.value = onlyDigits(e.target.value);
});
f_parfone.addEventListener("blur", (e) => {
    e.target.value = fmtPhone(e.target.value);
});


// Inicialização
document.addEventListener("DOMContentLoaded", () => {
    carregarClientes();
    carregarMunicipios();
});

