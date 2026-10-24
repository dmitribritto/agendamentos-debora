const SUPABASE_URL = "https://azxxweoulvsqvlyfmgtq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_n85S7m9uS_TThMm9zo63jA_fHAgpjLP";

let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient && window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

getSupabase();

const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const authForm = document.getElementById("auth-form");

const emailInput = document.getElementById("email");
const emailLabel = document.getElementById("email-label");
const passwordInput = document.getElementById("password");
const passwordLabel = document.getElementById("password-label");
const forgotLink = document.getElementById("forgot-link");
const confirmContainer = document.getElementById("confirm-password-container");
const confirmPasswordInput = document.getElementById("confirm-password");
const submitBtn = document.getElementById("submit-btn");
const submitText = document.getElementById("submit-text");
const termsCheckbox = document.getElementById("terms-checkbox");

let currentMode = "login";

function setMode(mode) {
  currentMode = mode;

  if (mode === "login") {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");

    emailLabel.textContent = "E-MAIL INSTITUCIONAL";
    emailInput.placeholder = "@professor.cps.sp.gov.br";

    passwordLabel.textContent = "SENHA DO ALUNO / PROFESSOR";
    passwordInput.placeholder = "Senha do aluno/professor";
    forgotLink.style.display = "inline";

    confirmContainer.style.display = "none";
    confirmPasswordInput.removeAttribute("required");

    submitText.textContent = "Entrar";
  } else {
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");

    emailLabel.textContent = "E-MAIL INSTITUCIONAL";
    emailInput.placeholder = "@aluno/professor.cps.sp.gov.br";

    passwordLabel.textContent = "SENHA";
    passwordInput.placeholder = "Mínimo 6 dígitos";
    forgotLink.style.display = "none";

    confirmContainer.style.display = "flex";
    confirmPasswordInput.setAttribute("required", "true");

    submitText.textContent = "Criar Conta";
  }
}

window.setMode = setMode;

tabLogin.addEventListener("click", () => setMode("login"));
tabRegister.addEventListener("click", () => setMode("register"));

document.querySelectorAll(".eye-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const inputId = btn.getAttribute("data-input");
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === "password") {
      input.type = "text";
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      `;
    } else {
      input.type = "password";
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;
    }
  });
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!termsCheckbox.checked) {
    alert("Você precisa concordar com os Termos de Serviço e Políticas de Privacidade.");
    return;
  }

  const client = getSupabase();

  if (currentMode === "register") {
    const confirmPassword = confirmPasswordInput.value;

    if (password.length < 6) {
      alert("A senha deve ter no mínimo 6 dígitos.");
      return;
    }

    if (password !== confirmPassword) {
      alert("As senhas não coincidem. Verifique e tente novamente.");
      return;
    }

    if (!client) {
      alert("Serviço de autenticação indisponível no momento.");
      return;
    }

    submitBtn.disabled = true;
    submitText.textContent = "Cadastrando...";

    try {
      const { data, error } = await client.auth.signUp({
        email: email,
        password: password
      });

      if (error) {
        alert("Erro no cadastro: " + error.message);
      } else {
        alert("Cadastro realizado com sucesso! Verifique seu e-mail para confirmação da conta.");
        authForm.reset();
        setMode("login");
      }
    } catch (err) {
      alert("Ocorreu um erro ao processar o cadastro.");
    } finally {
      submitBtn.disabled = false;
      submitText.textContent = "Criar Conta";
    }
  } else {
    if (!client) {
      alert("Serviço de autenticação indisponível no momento.");
      return;
    }

    submitBtn.disabled = true;
    submitText.textContent = "Entrando...";

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        alert("Erro ao entrar: " + error.message);
      } else {
        window.location.href = "app.html";
      }
    } catch (err) {
      alert("Ocorreu um erro ao processar o login.");
    } finally {
      submitBtn.disabled = false;
      submitText.textContent = "Entrar";
    }
  }
});
