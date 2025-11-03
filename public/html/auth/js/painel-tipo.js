
const tipoModalEl = document.getElementById('tipoModal');
const tipoModal = new bootstrap.Modal(tipoModalEl);
const btnTipo = document.getElementById('dropdownTipo');
const tipoForm = document.getElementById('tipoForm');
const descricaoTipo = document.getElementById('descricaoTipo');

// Novo usuário
btnTipo.addEventListener('click', () => {
  descricaoTipo.value = '';
  tipoModal.show();
});


// salvar registro na api
tipoForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const payload = {
    tipodes: descricaoTipo.value.trim(),
  };

  try {
    const url = `${BASE_URL}/tipo`;

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
    tipoModal.hide();
  } catch (error) {
    if (error.message === '403') {
        tipoModal.hide();
      alertPersonalizado('Sem permissão para criar marcas.', 2000);
    } else {
      alert('Erro ao salvar os dados.');
    }
    console.error(error);
  }
});