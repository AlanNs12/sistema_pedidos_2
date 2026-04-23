document.addEventListener('DOMContentLoaded', function() {
    function formatPhoneNumber(number) {
        number = number.replace(/\D/g, '');
        // Adiciona o código do país se não estiver presente
        if (number.length === 11 && !number.startsWith('55')) {
            number = '55' + number;
        }
        if (number.length === 13 && number.startsWith('55')) {
            return `+${number.slice(0,2)}(${number.slice(2,4)})${number.slice(4,9)}-${number.slice(9,13)}`;
        }
        return number;
    }

    function applyMaskOnInput(input) {
        input.addEventListener('input', function(e) {
            const cursorPos = input.selectionStart;
            const raw = input.value.replace(/\D/g, '');
            let masked = formatPhoneNumber(raw);
            input.value = masked;
            // Ajusta o cursor para o final
            input.setSelectionRange(input.value.length, input.value.length);
        });
    }

    if (typeof BASE_URL === 'undefined') {
        console.error('BASE_URL não está definida.');
        return;
    }
    fetch(`${BASE_URL}/emp`)
        .then((response) => response.json())
        .then((data) => {
            const whatsappNumber1 = data.empwhatsapp1 || '';
            const whatsappNumber2 = data.empwhatsapp2 || '';
            const razaoSocial = data.emprazao || '';

            const formattedWhats1 = formatPhoneNumber(whatsappNumber1);
            const formattedWhats2 = formatPhoneNumber(whatsappNumber2);

            const whats1Elem = document.getElementById('whats1');
            const whats2Elem = document.getElementById('whats2');
            const razaoSocialElem = document.getElementById('razaoSocial');
            if (razaoSocialElem) razaoSocialElem.value = razaoSocial || '';
            if (whats1Elem) whats1Elem.value = formattedWhats1;
            if (whats2Elem) whats2Elem.value = formattedWhats2;

            // Aplica a máscara nos inputs
            if (whats1Elem) applyMaskOnInput(whats1Elem);
            if (whats2Elem) applyMaskOnInput(whats2Elem);
        })
        .catch((error) => {
            console.error('Erro ao buscar os números do WhatsApp:', error);
        });
});

document.getElementById('saveWhats').addEventListener('click', function(event) {
    event.preventDefault();
    const whats1 = document.getElementById('whats1').value;
    const whats2 = document.getElementById('whats2').value;
    const emprazao = document.getElementById('razaoSocial').value;

    if (!whats1.match(/^\+\d{2}\(\d{2}\)\d{5}-\d{4}$/) || !whats2.match(/^\+\d{2}\(\d{2}\)\d{5}-\d{4}$/)) {
        showToast('Por favor, insira números de WhatsApp válidos.', 'warning');
        return;
    }

    const whats1Digits = whats1.replace(/\D/g, '');
    const whats2Digits = whats2.replace(/\D/g, '');

    fetch(`${BASE_URL}/emp`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            empwhatsapp1: whats1Digits,
            empwhatsapp2: whats2Digits,
            emprazao: emprazao
        })
    })
    .then(response => response.json())
    .then(data => {
        showToast('Dados atualizados com sucesso!', 'success');
        window.location.reload();
    })
    .catch(error => {
        showToast('Erro ao atualizar os números de WhatsApp. Por favor, tente novamente.', 'error');
    });
});
