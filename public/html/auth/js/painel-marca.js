const userModalEl = document.getElementById("userModal");
const userModal = new bootstrap.Modal(userModalEl);
const btnMarca = document.getElementById("dropdownMarca");
const btnExcluir = document.getElementById("btnDelete");
const marcaForm = document.getElementById("marcaForm");
const descricaoMarca = document.getElementById("descricaoMarca");

// Novo usuário
btnMarca.addEventListener("click", () => {
  descricaoMarca.value = "";
  btnExcluir.style.display = "none";
  userModal.show();
});

// salvar registro na api
marcaForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const payload = {
    marcasdes: descricaoMarca.value.trim(),
  };

  try {
    const url = `${BASE_URL}/marcas`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.status === 403) {
      throw new Error("403");
    } else if (response.ok) {
      const msg = document.createElement("div");
      msg.textContent = "Marca cadastrada com sucesso!";
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
    }
    userModal.hide();
  } catch (error) {
    if (error.message === "403") {
      userModal.hide();
      alertPersonalizado("Sem permissão para criar marcas.", 2000);
    } else {
      alert("Erro ao salvar os dados.");
    }
    console.error(error);
  }
});

// Imagem Marca
document.addEventListener("DOMContentLoaded", () => {
  const marcaForm = document.getElementById("marcaForm");
  if (!marcaForm) return console.warn("marcaForm não encontrado");

  marcaForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // evita envio padrão para controlar e debugar
    console.log("[marcaForm] submit interceptado");

    const btn = marcaForm.querySelector('button[type="submit"]');
    btn && (btn.disabled = true);
    btn && (btn.innerText = "Salvando...");

    try {
      const fd = new FormData(marcaForm);

      // DEBUG: listar entries do FormData no console
      for (const pair of fd.entries()) {
        console.log("FormData:", pair[0], pair[1]);
      }

      const resp = await fetch(marcaForm.action || "/save-marca", {
        method: (marcaForm.method || "POST").toUpperCase(),
        body: fd,
        credentials: "include" // importante se auth via cookie/session
      });

      // Se o servidor fizer redirect para /painel com 302 e você quiser seguir,
      // fetch seguirá automaticamente (mode same-origin) e retornará final response.
      // Mas muitas vezes convém o servidor retornar JSON em vez de redirect para SPA.
      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await resp.json();
        console.log("Resposta JSON:", data);
        if (data.ok) {
          // fechar modal e recarregar ou atualizar UI
          const modalEl = document.getElementById("userModal");
          try {
            const bsModal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            bsModal.hide();
          } catch(e) {}
          location.reload();
        } else {
          throw new Error(data.error || "Erro desconhecido do servidor");
        }
      } else {
        // se veio HTML/redirect, loga o texto (útil para debug)
        const text = await resp.text();
        console.log("Resposta não-JSON:", resp.status, text);
        // se servidor retornou 302 -> você pode forçar um reload
        if (resp.redirected) {
          window.location = resp.url;
        } else {
          alert("Resposta inesperada do servidor. Veja console.");
        }
      }
    } catch (err) {
      console.error("Erro ao enviar marca:", err);
      alert("Falha ao enviar: " + err.message);
    } finally {
      btn && (btn.disabled = false);
      btn && (btn.innerText = "Salvar Dados");
    }
  });
});
