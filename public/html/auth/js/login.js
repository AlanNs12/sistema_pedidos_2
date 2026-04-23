const SECRET = "jppecas-remember";

async function getCryptoKey() {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(SECRET),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(text) {
  const key = await getCryptoKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const cipher = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  const result = new Uint8Array(iv.byteLength + cipher.byteLength);
  result.set(iv);
  result.set(new Uint8Array(cipher), iv.byteLength);
  return btoa(String.fromCharCode(...result));
}

async function decrypt(cipherText) {
  try {
    const data = Uint8Array.from(atob(cipherText), (c) => c.charCodeAt(0));
    const iv = data.slice(0, 12);
    const cipher = data.slice(12);
    const key = await getCryptoKey();
    const plain = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      cipher
    );
    return new TextDecoder().decode(plain);
  } catch (_) {
    return "";
  }
}

// Preenche os campos caso as credenciais estejam salvas
window.addEventListener("DOMContentLoaded", async () => {
  if (localStorage.getItem("rememberLogin") === "true") {
    const savedEmail = localStorage.getItem("savedEmail");
    const savedPassword = localStorage.getItem("savedPassword");
    if (savedEmail && savedPassword) {
      const decryptedPass = await decrypt(savedPassword);
      document.getElementById("email").value = savedEmail;
      document.getElementById("password").value = decryptedPass;
      document.getElementById("remember").checked = true;
    }
  }
});

document.getElementById("formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const usuemail = document.getElementById("email").value;
  const ususenha = document.getElementById("password").value;
  const remember = document.getElementById("remember").checked;

  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ usuemail, ususenha }),
    });

    const data = await response.json();

    if (response.ok) {
      if (remember) {
        const encrypted = await encrypt(ususenha);
        localStorage.setItem("rememberLogin", "true");
        localStorage.setItem("savedEmail", usuemail);
        localStorage.setItem("savedPassword", encrypted);
      } else {
        localStorage.removeItem("rememberLogin");
        localStorage.removeItem("savedEmail");
        localStorage.removeItem("savedPassword");
      }
      window.location.href = `${BASE_URL}/dash`;
    } else {
      if (response.status === 403) {
        alertPersonalizado(
          data.mensagem || "Usuário inativo. Contate o administrador.",
          3000
        );
        return;
      }
      alertPersonalizado(data.mensagem || "Email ou senha incorretos!", 2000);
    }
  } catch (error) {
    console.error("Erro na requisição:", error);
    alertPersonalizado("Erro ao tentar fazer login", 2000);
  }
});

// alertPersonalizado personalizado Tom FORMAL

function alertPersonalizado(message, time) {
  let alertPersonalizado = document.getElementById("alertPersonalizado");

  if (!alertPersonalizado) {
    alertPersonalizado = document.createElement("div");
    alertPersonalizado.id = "alertPersonalizado";
    alertPersonalizado.style = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #333;
        color: #fff;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s;
      `;
    document.body.appendChild(alertPersonalizado);
  }

  alertPersonalizado.textContent = message;
  alertPersonalizado.style.opacity = "1";

  setTimeout(() => {
    alertPersonalizado.style.opacity = "0";
    alertPersonalizado.remove();
  }, time);
}
