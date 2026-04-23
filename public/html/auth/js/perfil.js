document.addEventListener("DOMContentLoaded", async () => {
  try {
    const resp = await fetch(`${BASE_URL}/auth/listarlogin`, {
      credentials: "include",
    });
    if (resp.ok) {
      const user = await resp.json();
      document.getElementById("nome").value = user.usunome || "";
      document.getElementById("email").value = user.usuemail || "";
      document.getElementById("formPerfil").dataset.userId = user.usucod;
    }
  } catch (err) {
    console.error("Erro ao carregar dados do usuário", err);
  }
});

document.getElementById("formPerfil").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = e.target.dataset.userId;
  const usunome = document.getElementById("nome").value;
  const usuemail = document.getElementById("email").value;
  const ususenha = document.getElementById("senha").value;
  const confirmSenha = document.getElementById("confirmarSenha").value;

  if (ususenha !== confirmSenha) {
    alert("As senhas não coincidem.");
    return;
  }
  try {
    const response = await fetch(`${BASE_URL}/auth/atualizarCadastro/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usunome, usuemail, ususenha }),
      credentials: "include",
    });
    const data = await response.json();
    if (response.ok) {
      alert("Dados atualizados com sucesso!");
      document.getElementById("senha").value = "";
      document.getElementById("confirmarSenha").value = "";
      window.location.href = `${BASE_URL}/painel`;
    } else {
      alert(data.error || data.mensagem || "Erro ao atualizar dados");
    }
  } catch (err) {
    console.error("Erro ao atualizar dados", err);
    alert("Erro ao atualizar dados");
  }
});
