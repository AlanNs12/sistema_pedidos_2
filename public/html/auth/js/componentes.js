function createHeader() {
  const header = document.getElementById("header-admin");
  header.innerHTML = `
  <nav class="navbar navbar-expand-lg navbar-light bg-light shadow-sm bg-white rounded p-2 m-1">
        <a class="navbar-brand" href="index" id="nomeEmpresa"><img src="/uploads/logo.jpg" width="30" height="30"
            alt="" /></a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
          aria-controls="navbarNav" aria-expanded="false" aria-label="Alterna navegação">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav">
            <li class="nav-item active">
              <a class="nav-link" href="index">Inicio</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="dash">Dashboard</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="painel">Produtos</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="part">Grupos</a>
            </li>
            <li class="nav-item" id="clientes">
              <a class="nav-link" href="clientes">Clientes</a>
            </li>
            <li class="nav-item" id="pedidos">
              <a class="nav-link" href="pedidos">Pedidos</a>
            </li>
            <li class="nav-item" id="estoque">
              <a class="nav-link" href="estoque">Estoque</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="estoque-grupos">Estoque Grupos</a>
            </li>
            <li class="nav-item" id="users">
              <a class="nav-link" href="users">Usuários</a>
            </li>
            <li class="nav-item" id="backup">
              <a class="nav-link" href="backup">Backup</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="relatorios">Relatórios</a>
            </li>
            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown"
                aria-haspopup="true" aria-expanded="false">
                <i class="bi bi-person-fill"></i> Conta
              </a>
              <div class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
                <a class="dropdown-item" href="perfil">Perfil</a>
                <a class="dropdown-item" href="configuracoes" id="configuracoes">Configurações</a>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item" id="buttonSair">Sair</button>
              </div>
            </li>
          </ul>
        </div>
      </nav>  
  `;

  const btnSair = document.getElementById("buttonSair");
  if (btnSair) {
    btnSair.addEventListener("click", (event) => {
      event.preventDefault();

      localStorage.removeItem("usuarioLogado");

      fetch("/auth/sair", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }).finally(() => {
        window.location.href = "/index";
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", createHeader);

function createFooter() {
  const footer = document.getElementById("footer");
  footer.className = "border-top py-4 bg-white shadow";
  footer.innerHTML = `
      <div class="container m-auto d-flex flex-column flex-md-row flex-wrap align-items-center justify-content-center justify-content-md-between gap-2">
                <div class="small text-muted text-center text-md-start">© <span id="y"></span> Sistema Pedidos via Whatsapp — <a href="#">MTTR
                        Tecnologia que transforma seu negócio.</a></div>
                <div class="d-flex gap-3 small justify-content-center">
                    <span class="badge rounded-pill text-bg-primary text-white">
                        <a href="https://wa.me/5561981697924?text=Ol%C3%A1!%20Tenho%20interesse%20para%20marcar%20uma%20reuni%C3%A3o%20para%20entender%20mais%20sobre%20as%20solu%C3%A7%C3%B5es%20que%20voc%C3%AAs%20oferecem!%20"
                            target="_blank" class="text-white text-decoration-none">Contato</a>
                    </span>
                </div>
            </div>
  `;
}
document.addEventListener("DOMContentLoaded", createFooter);

// Hide "Estoque do Grupo" card in the part groups details view
document.addEventListener("DOMContentLoaded", function () {
  // Only run on pages with the group details section
  const detalhesGrupo = document.getElementById("detalhesGrupo");
  if (!detalhesGrupo) return;

  // Find the card subtitle containing "Estoque do Grupo" and hide its parent column
  const subtitles = detalhesGrupo.querySelectorAll(".card-subtitle");
  subtitles.forEach(function (subtitle) {
    if (subtitle.textContent.trim() === "Estoque do Grupo") {
      const parentCol = subtitle.closest(".col-md-4");
      if (parentCol) {
        parentCol.style.display = "none";
      }
    }
  });
});
