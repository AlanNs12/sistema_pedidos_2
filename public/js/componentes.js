function createHeaderUser() {
  const header = document.getElementById("header");
  header.innerHTML = `
  <nav class="navbar navbar-expand-lg navbar-light  shadow-sm rounded p-2 m-1">
                <a class="navbar-brand" href="index" id="nomeEmpresa"><img src="/uploads/logo.jpg" width="30"
                        height="30" alt="" /></a>
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
                            <a class="nav-link" href="dash">Acesso</a>
                        </li>
                    </ul>
                </div>
            </nav>
  `;
}
document.addEventListener("DOMContentLoaded", createHeaderUser);


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
