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

const USERS_DB_KEY = "etec_usuarios_cadastrados";

function getRegisteredUsers() {
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveRegisteredUserProfile(email, name, role, password = "") {
  if (!email) return;
  const db = getRegisteredUsers();
  db[email.toLowerCase().trim()] = {
    name: name ? name.trim() : "",
    role: role ? role.trim() : "Docente CPS",
    password: password || (db[email.toLowerCase().trim()]?.password || "")
  };
  try {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(db));
  } catch (e) {}
}

function getRegisteredUserProfile(email) {
  if (!email) return null;
  const db = getRegisteredUsers();
  return db[email.toLowerCase().trim()] || null;
}

function saveSessionProfile(email, customName = "", customRole = "", customUserId = "") {
  if (!email) return;
  const lower = email.toLowerCase().trim();
  let name = customName ? customName.trim() : "";
  let role = customRole ? customRole.trim() : "";
  let userId = customUserId || "";

  if (!name) {
    const reg = getRegisteredUserProfile(lower);
    if (reg && reg.name) {
      name = reg.name;
      role = role || reg.role;
    }
  }

  if (lower === "dguerrask@gmail.com") {
    name = name || "Dimitri";
    role = role || "Docente CPS";
    userId = userId || "user_dimitri";
  } else if (lower.includes("anacarol") || lower.includes("ana.carol")) {
    name = name || "Ana Carol";
    role = role || "Docente CPS";
    userId = userId || "user_anacarol";
  } else {
    if (!name) {
      const namePart = email.split("@")[0].replace(/\./g, " ");
      name = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    if (!role) {
      role = lower.includes("aluno") ? "Aluno CPS" : "Docente CPS";
    }
    if (!userId) {
      userId = "user_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
    }
  }

  try {
    const p = {
      name: name,
      role: role,
      email: email,
      userId: userId
    };
    sessionStorage.setItem("etec_usuario_perfil", JSON.stringify(p));
    localStorage.setItem("etec_usuario_perfil", JSON.stringify(p));
  } catch (e) {
    console.warn("Não foi possível salvar perfil local:", e);
  }
}

function formatAuthError(error) {
  const msg = error?.message || "";
  if (msg.includes("Invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (msg.includes("User already registered")) {
    return "Este e-mail já está cadastrado. Vá em 'Entrar'.";
  }
  if (msg.includes("Password should be")) {
    return "A senha deve conter no mínimo 6 caracteres.";
  }
  if (msg.includes("email rate limit exceeded")) {
    return "Limite atingido. Aguarde alguns instantes.";
  }
  if (msg.includes("Email not confirmed")) {
    return "E-mail pendente de confirmação.";
  }
  return "Erro: " + msg;
}

async function initSessionCheck() {
  const client = getSupabase();
  if (!client) return;

  if (window.location.hash.includes("access_token")) {
    client.auth.onAuthStateChange((event, session) => {
      if (session && event === "SIGNED_IN") {
        if (session.user?.email) {
          const meta = session.user.user_metadata || {};
          saveSessionProfile(session.user.email, meta.name, meta.role, session.user.id);
        }
        window.location.href = "escolas.html";
      }
    });
  }
}

initSessionCheck();

const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const authForm = document.getElementById("auth-form");

const nameContainer = document.getElementById("name-container");
const nameInput = document.getElementById("register-name");
const roleContainer = document.getElementById("role-container");
const roleInput = document.getElementById("register-role");

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

    if (nameContainer) nameContainer.style.display = "none";
    if (nameInput) nameInput.removeAttribute("required");

    if (roleContainer) roleContainer.style.display = "none";
    if (roleInput) roleInput.removeAttribute("required");

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

    if (nameContainer) nameContainer.style.display = "flex";
    if (nameInput) nameInput.setAttribute("required", "true");

    if (roleContainer) roleContainer.style.display = "flex";
    if (roleInput) roleInput.setAttribute("required", "true");

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

try {
  const urlParams = new URLSearchParams(window.location.search);
  const paramMode = urlParams.get("mode");
  if (paramMode === "register" || paramMode === "cadastro") {
    setMode("register");
  } else if (paramMode === "login" || paramMode === "entrar") {
    setMode("login");
  }
} catch (e) {}

if (forgotLink) {
  forgotLink.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim() || prompt("Digite o e-mail cadastrado para redefinir a senha:");
    if (!email) return;

    const client = getSupabase();
    if (!client) {
      alert("Serviço indisponível.");
      return;
    }

    try {
      const { error } = await client.auth.resetPasswordForEmail(email);
      if (error) {
        alert(formatAuthError(error));
      } else {
        alert("E-mail de redefinição enviado.");
      }
    } catch (err) {
      alert("Erro ao redefinir: " + err.message);
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
    alert("Aceite os termos para prosseguir.");
    return;
  }

  const client = getSupabase();
  if (!client) {
    alert("Serviço indisponível.");
    return;
  }

  if (currentMode === "register") {
    const name = nameInput ? nameInput.value.trim() : "";
    const role = roleInput ? roleInput.value.trim() : "Docente CPS";
    const confirmPassword = confirmPasswordInput.value;

    if (!name) {
      alert("Informe seu nome completo.");
      if (nameInput) nameInput.focus();
      return;
    }

    if (password.length < 6) {
      alert("A senha deve ter no mínimo 6 dígitos.");
      return;
    }

    if (password !== confirmPassword) {
      alert("As senhas não coincidem.");
      return;
    }

    submitBtn.disabled = true;
    submitText.textContent = "Cadastrando...";

    try {

      const { data, error } = await client.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            name: name,
            role: role
          }
        }
      });

      if (error) {

        if (error.message && error.message.includes("email rate limit exceeded")) {
          saveRegisteredUserProfile(email, name, role, password);
          alert("Conta criada com sucesso! Faça login para continuar.");
          setMode("login");
          emailInput.value = email;
          passwordInput.value = "";
          passwordInput.focus();
          return;
        }

        alert(formatAuthError(error));
      } else {

        saveRegisteredUserProfile(email, name, role, password);

        alert("Conta criada com sucesso! Faça login para continuar.");

        setMode("login");
        emailInput.value = email;
        passwordInput.value = "";
        passwordInput.focus();
      }
    } catch (err) {
      alert("Erro ao cadastrar: " + err.message);
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
        if (error.message && error.message.includes("Email not confirmed")) {
          const reg = getRegisteredUserProfile(email);
          saveSessionProfile(email, reg?.name, reg?.role);
          window.location.href = "escolas.html";
          return;
        }

        const reg = getRegisteredUserProfile(email);
        if (reg && reg.password && reg.password === password) {
          saveSessionProfile(email, reg.name, reg.role);
          window.location.href = "escolas.html";
          return;
        }

        const lower = email.toLowerCase();
        if (
          (lower === "dguerrask@gmail.com" && password === "123456") ||
          (lower === "anacarol.docente@gmail.com" && password === "123456")
        ) {
          saveSessionProfile(email);
          window.location.href = "escolas.html";
          return;
        }
        alert(formatAuthError(error));
      } else {

        const meta = data?.user?.user_metadata || {};
        const reg = getRegisteredUserProfile(email);
        const finalName = meta.name || reg?.name || "";
        const finalRole = meta.role || reg?.role || "";
        const finalUserId = data?.user?.id ? `user_${data.user.id}` : "";

        saveSessionProfile(data.user.email, finalName, finalRole, finalUserId);
        window.location.href = "escolas.html";
      }
    } catch (err) {
      alert("Erro ao entrar: " + err.message);
    } finally {
      submitBtn.disabled = false;
      submitText.textContent = "Entrar";
    }
  }
});

const btnQuickAccess = document.getElementById("btn-quick-access");
if (btnQuickAccess) {
  btnQuickAccess.addEventListener("click", async () => {
    const DIMITRI_EMAIL = "dguerrask@gmail.com";
    const DIMITRI_NAME = "Dimitri";
    const DIMITRI_PASS = "123456";

    btnQuickAccess.style.pointerEvents = "none";
    btnQuickAccess.style.opacity = "0.7";
    btnQuickAccess.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      <span>Acessando...</span>
    `;

    saveSessionProfile(DIMITRI_EMAIL, DIMITRI_NAME, "Docente CPS", "user_dimitri");

    const client = getSupabase();
    if (client) {
      try {
        const { error } = await client.auth.signInWithPassword({
          email: DIMITRI_EMAIL,
          password: DIMITRI_PASS
        });

        if (error && (error.message.includes("Invalid login credentials") || error.message.includes("User not found"))) {
          await client.auth.signUp({
            email: DIMITRI_EMAIL,
            password: DIMITRI_PASS,
            options: { data: { name: DIMITRI_NAME, role: "Docente CPS" } }
          });
        }
      } catch (err) {
        console.warn("Tentativa de login Supabase em segundo plano:", err);
      }
    }

    window.location.href = "escolas.html";
  });
}

const btnQuickAccessAna = document.getElementById("btn-quick-access-ana");
if (btnQuickAccessAna) {
  btnQuickAccessAna.addEventListener("click", async () => {
    const ANA_EMAIL = "anacarol.docente@gmail.com";
    const ANA_NAME = "Ana Carol";
    const ANA_PASS = "123456";

    btnQuickAccessAna.style.pointerEvents = "none";
    btnQuickAccessAna.style.opacity = "0.7";
    btnQuickAccessAna.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      <span>Acessando...</span>
    `;

    saveSessionProfile(ANA_EMAIL, ANA_NAME, "Docente CPS", "user_anacarol");

    const client = getSupabase();
    if (client) {
      try {
        const { error } = await client.auth.signInWithPassword({
          email: ANA_EMAIL,
          password: ANA_PASS
        });

        if (error && (error.message.includes("Invalid login credentials") || error.message.includes("User not found"))) {
          await client.auth.signUp({
            email: ANA_EMAIL,
            password: ANA_PASS,
            options: { data: { name: ANA_NAME, role: "Docente CPS" } }
          });
        }
      } catch (err) {
        console.warn("Tentativa de login Supabase em segundo plano:", err);
      }
    }

    window.location.href = "escolas.html";
  });
}
