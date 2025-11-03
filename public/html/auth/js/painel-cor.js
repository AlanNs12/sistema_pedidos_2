
const corModalEl = document.getElementById('corModal');
const corModal = new bootstrap.Modal(corModalEl);
const btnCor = document.getElementById('dropdownCor');
const corForm = document.getElementById('corForm');
const descricaoCor = document.getElementById('descricaoCor');

// Novo usuário
btnCor.addEventListener('click', () => {
  descricaoCor.value = '';
  corModal.show();
});


// salvar registro na api
corForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const payload = {
    cornome: descricaoCor.value.trim(),
  };

  try {
    const url = `${BASE_URL}/cores`;

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
        msg.textContent = "Cor cadastrada com sucesso!";
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
    corModal.hide();
  } catch (error) {
    if (error.message === '403') {
        corModal.hide();
      alertPersonalizado('Sem permissão para criar Cor.', 2000);
    } else {
      alert('Erro ao salvar os dados.');
    }
    console.error(error);
  }
});