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

function saveSessionProfile(email) {
  if (!email) return;
  const namePart = email.split("@")[0].replace(/\./g, " ");
  const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
  const role = email.toLowerCase().includes("aluno") ? "Aluno CPS" : "Docente CPS";
  try {
    localStorage.setItem("etec_usuario_perfil", JSON.stringify({
      name: formattedName,
      role: role,
      email: email
    }));
  } catch (e) {
    console.warn("Não foi possível salvar perfil local:", e);
  }
}

function formatAuthError(error) {
  const msg = error?.message || "";
  if (msg.includes("email rate limit exceeded")) {
    return (
      "⚠️ Limite de envio de e-mails atingido no Supabase (máx. 3 por hora no plano gratuito).\n\n" +
      "👉 COMO RESOLVER ISSO AGORA NO SUPABASE (Recomendado):\n" +
      "1. Abra o painel: https://supabase.com/dashboard/project/azxxweoulvsqvlyfmgtq\n" +
      "2. Vá em Authentication > Providers > Email\n" +
      "3. Desmarque a opção 'Confirm email' (ou 'Enable email confirmations') e clique em Save.\n\n" +
      "Ao fazer isso, os cadastros passam a entrar direto sem depender de envio de e-mails!"
    );
  }
  if (msg.includes("Invalid login credentials")) {
    return "E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.";
  }
  if (msg.includes("Email not confirmed")) {
    return (
      "⚠️ E-mail ainda não confirmado!\n\n" +
      "1. Verifique sua caixa de entrada e pasta de Spam no Gmail.\n" +
      "2. Ou libere o usuário diretamente no painel do Supabase:\n" +
      "   Vá em Authentication > Users > três pontinhos (...) > 'Confirm user'."
    );
  }
  if (msg.includes("User already registered")) {
    return "Este e-mail já está cadastrado no sistema! Alterne para a aba 'Entrar' para fazer login com sua senha.";
  }
  if (msg.includes("Password should be")) {
    return "A senha deve conter no mínimo 6 caracteres.";
  }
  return "Erro: " + msg;
}

// Verificar sessão ativa ou retorno do link de confirmação no e-mail
async function initSessionCheck() {
  const client = getSupabase();
  if (!client) return;

  // Escutar evento de autenticação (ex: clique no link de confirmação do Gmail com token na URL)
  client.auth.onAuthStateChange((event, session) => {
    if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
      if (session.user?.email) {
        saveSessionProfile(session.user.email);
      }
      window.location.href = "app.html";
    }
  });

  // Se já houver sessão ativa salva no navegador
  try {
    const { data: { session } } = await client.auth.getSession();
    if (session) {
      if (session.user?.email) {
        saveSessionProfile(session.user.email);
      }
      window.location.href = "app.html";
    }
  } catch (err) {
    console.warn("Erro ao verificar sessão ativa:", err);
  }
}

initSessionCheck();

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

// Redefinição de senha
if (forgotLink) {
  forgotLink.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim() || prompt("Digite o e-mail cadastrado para redefinir a senha:");
    if (!email) return;

    const client = getSupabase();
    if (!client) {
      alert("Serviço de autenticação indisponível no momento.");
      return;
    }

    try {
      const { error } = await client.auth.resetPasswordForEmail(email);
      if (error) {
        alert(formatAuthError(error));
      } else {
        alert("E-mail de redefinição enviado com sucesso para: " + email);
      }
    } catch (err) {
      alert("Erro ao solicitar redefinição: " + err.message);
    }
  });
}

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
  if (!client) {
    alert("Serviço de autenticação indisponível no momento.");
    return;
  }

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

    submitBtn.disabled = true;
    submitText.textContent = "Cadastrando...";

    try {
      const redirectUrl = window.location.origin + window.location.pathname.replace(/index\.html$/, "") + "app.html";
      const { data, error } = await client.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        alert(formatAuthError(error));
      } else if (data && data.session) {
        // Se a confirmação de e-mail estiver desativada no Supabase, a sessão é iniciada imediatamente
        saveSessionProfile(email);
        alert("Conta criada com sucesso! Entrando no sistema...");
        window.location.href = "app.html";
      } else {
        alert(
          "Conta criada com sucesso!\n\n" +
          "Um e-mail de confirmação foi enviado para " + email + ".\n" +
          "Clique no link do e-mail para ativar sua conta e entrar no sistema.\n\n" +
          "💡 Dica: Para entrar instantaneamente sem precisar confirmar e-mail, desative a opção 'Confirm email' no painel do Supabase."
        );
        authForm.reset();
        setMode("login");
      }
    } catch (err) {
      alert("Ocorreu um erro ao processar o cadastro: " + err.message);
    } finally {
      submitBtn.disabled = false;
      submitText.textContent = "Criar Conta";
    }
  } else {
    submitBtn.disabled = true;
    submitText.textContent = "Entrando...";

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        alert(formatAuthError(error));
      } else {
        if (data?.user?.email) {
          saveSessionProfile(data.user.email);
        }
        window.location.href = "app.html";
      }
    } catch (err) {
      alert("Ocorreu um erro ao processar o login: " + err.message);
    } finally {
      submitBtn.disabled = false;
      submitText.textContent = "Entrar";
    }
  }
});
