
const modeloModalEl = document.getElementById('modeloModal');
const modeloModal = new bootstrap.Modal(modeloModalEl);
const btnModelo = document.getElementById('dropdownModelo');
const modeloForm = document.getElementById('modeloForm');
const modmarcascod = document.getElementById('popupMarcaModalModelo');


// Novo usuário
btnModelo.addEventListener('click', () => {
  async function fetchMarcas() {
    try {
      const response = await fetch(`${BASE_URL}/marcas`);
      if (!response.ok) {
        throw new Error('Erro ao buscar marcas');
      }
      const marcas = await response.json();
      modmarcascod.innerHTML = '<option value="">Selecione</option>';
      marcas.forEach(marca => {
        const option = document.createElement('option');
        option.value = marca.marcascod;
        option.textContent = marca.marcasdes;
        modmarcascod.appendChild(option);
      });
    } catch (error) {
      console.error('Erro ao carregar marcas:', error);
    }
  } 
  fetchMarcas();
  descricaoModelo.value = '';
  btnExcluir.style.display = 'none';
  modeloModal.show();
  //função para preencher o select de marcas no modal modelo
  

});


// salvar registro na api
modeloForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const payload = {
    moddes: descricaoModelo.value.trim(),
    modmarcascod: modmarcascod.value,
  };

  try {
    const url = `${BASE_URL}/modelo`;

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
        msg.style.boxShadow = "0 2px 8px rgba(36, 11, 11, 0.2)";
        document.body.appendChild(msg);
        setTimeout(() => {
          msg.remove();
        }, 2000);
        
      }   
    modeloModal.hide();
  } catch (error) {
    if (error.message === '403') {
        modeloModal.hide();
      alertPersonalizado('Sem permissão para criar marcas.', 2000);
    } else {
      alert('Erro ao salvar os dados.');
    }
    console.error(error);
  }
});



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