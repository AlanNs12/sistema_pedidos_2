
const userModalEl = document.getElementById('userModal');
const userModal = new bootstrap.Modal(userModalEl);
const btnMarca = document.getElementById('dropdownMarca');
const btnExcluir = document.getElementById('btnDelete');
const marcaForm = document.getElementById('marcaForm');
const descricaoMarca = document.getElementById('descricaoMarca');

// Novo usuário
btnMarca.addEventListener('click', () => {
  descricaoMarca.value = '';
  btnExcluir.style.display = 'none';
  userModal.show();
});


// salvar registro na api
marcaForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const payload = {
    marcasdes: descricaoMarca.value.trim(),
  };

  try {
    const url = `${BASE_URL}/marcas`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (response.status === 403) {
      throw new Error('403');
    }
    else if (response.ok) {
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
    if (error.message === '403') {
        userModal.hide();
      alertPersonalizado('Sem permissão para criar marcas.', 2000);
    } else {
      alert('Erro ao salvar os dados.');
    }
    console.error(error);
  }
});