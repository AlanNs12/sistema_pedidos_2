/**
 * Utilitário de Toast para exibir mensagens de feedback ao usuário
 * Substitui o uso de alert() por uma experiência de usuário mais suave
 */

// Configuração: número máximo de toasts exibidos simultaneamente
const MAX_TOASTS_VISIBLE = 5;

/**
 * Exibe uma notificação toast na tela
 * @param {string} message - A mensagem a ser exibida
 * @param {string} type - O tipo de notificação: 'success', 'error', 'warning', 'info' (padrão: 'info')
 * @param {number} duration - Duração em milissegundos (padrão: 3000ms)
 */
function showToast(message, type = 'info', duration = 3000) {
  // Remove toasts antigos se existirem muitos
  const existingToasts = document.querySelectorAll('.toast-notification');
  if (existingToasts.length >= MAX_TOASTS_VISIBLE) {
    existingToasts[0].remove();
  }

  // Cria o container de toasts se não existir
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    `;
    document.body.appendChild(toastContainer);
  }

  // Define cores baseadas no tipo
  const colors = {
    success: { bg: '#28a745', icon: '✅' },
    error: { bg: '#dc3545', icon: '❌' },
    warning: { bg: '#ffc107', icon: '⚠️', textColor: '#212529' },
    info: { bg: '#17a2b8', icon: 'ℹ️' }
  };

  const colorConfig = colors[type] || colors.info;

  // Cria o elemento toast
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.style.cssText = `
    background-color: ${colorConfig.bg};
    color: ${colorConfig.textColor || '#fff'};
    padding: 14px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    display: flex;
    align-items: flex-start;
    gap: 10px;
    animation: slideInRight 0.3s ease-out;
    word-wrap: break-word;
    max-width: 100%;
  `;

  // Conteúdo do toast
  toast.innerHTML = `
    <span style="font-size: 1.2em; flex-shrink: 0;">${colorConfig.icon}</span>
    <span style="flex: 1; line-height: 1.4;">${escapeHtml(message)}</span>
    <button onclick="this.parentElement.remove()" style="
      background: transparent;
      border: none;
      color: inherit;
      font-size: 1.2em;
      cursor: pointer;
      padding: 0;
      margin-left: 10px;
      opacity: 0.8;
      flex-shrink: 0;
    ">×</button>
  `;

  // Adiciona estilos de animação se não existirem
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Adiciona o toast ao container
  toastContainer.appendChild(toast);

  // Remove automaticamente após o tempo definido
  if (duration > 0) {
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }

  return toast;
}

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {string} text - Texto a ser escapado
 * @returns {string} Texto escapado
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Exporta a função globalmente
window.showToast = showToast;
