const SUPABASE_URL = "https://azxxweoulvsqvlyfmgtq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_n85S7m9uS_TThMm9zo63jA_fHAgpjLP";
let supabaseClient = null;
function getSupabase() {
  if (!supabaseClient && window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}
const SCHOOL_STORAGE_KEY = "etec_escola_ativa";
const USER_SCHOOLS_KEY = "etec_usuario_escolas";
const USER_PROFILE_KEY = "etec_usuario_perfil";
const DEFAULT_SCHOOL_CATALOG = [
  {
    id: "furlan",
    name: "ETEC Antônio Furlan",
    code: "ETEC-AF2026-8392",
    aliases: ["ETEC-AF2026-8392", "ETEC-AB12CD", "AF2026-8392"],
    city: "Barueri - SP",
    description: "Sistema de agendamento de espaços"
  }
];
function getSchoolBuildingSVG() {
  return `
    <svg viewBox="0 0 80 70" fill="none" xmlns="http://www.w3.org/2000/svg" class="school-building-svg">
      <line x1="40" y1="2" x2="40" y2="18" stroke="#15131c" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M40 3L54 7L40 12Z" fill="#f43f5e" stroke="#15131c" stroke-width="2" stroke-linejoin="round"/>
      <polygon points="40,16 64,30 16,30" fill="#f43f5e" stroke="#15131c" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="22" y="30" width="36" height="34" rx="2" fill="#e0e7ff" stroke="#15131c" stroke-width="2.5"/>
      <rect x="6" y="34" width="16" height="30" rx="2" fill="#3b82f6" stroke="#15131c" stroke-width="2.5"/>
      <rect x="10" y="42" width="8" height="12" rx="1.5" fill="#fef08a" stroke="#15131c" stroke-width="2"/>
      <line x1="14" y1="42" x2="14" y2="54" stroke="#15131c" stroke-width="1.5"/>
      <rect x="58" y="34" width="16" height="30" rx="2" fill="#3b82f6" stroke="#15131c" stroke-width="2.5"/>
      <rect x="62" y="42" width="8" height="12" rx="1.5" fill="#fef08a" stroke="#15131c" stroke-width="2"/>
      <line x1="66" y1="42" x2="66" y2="54" stroke="#15131c" stroke-width="1.5"/>
      <circle cx="40" cy="38" r="5" fill="#ffffff" stroke="#15131c" stroke-width="2"/>
      <line x1="40" y1="35.5" x2="40" y2="38" stroke="#15131c" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="40" y1="38" x2="42.5" y2="38" stroke="#15131c" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M34 64V51C34 47.7 36.7 45 40 45C43.3 45 46 47.7 46 51V64H34Z" fill="#fb7185" stroke="#15131c" stroke-width="2.2"/>
    </svg>
  `;
}
function getUser() {
  try {
    const raw = sessionStorage.getItem(USER_PROFILE_KEY) || localStorage.getItem(USER_PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { name: "Docente", role: "Docente CPS", email: "" };
}
function getUserSchools() {
  const user = getUser();
  const isQuickAccess = user && (
    user.userId === "user_dimitri" ||
    user.userId === "user_anacarol" ||
    user.email === "dguerrask@gmail.com" ||
    user.email === "anacarol.docente@gmail.com" ||
    user.isQuickAccess === true
  );
  const userKey = user && user.userId ? `etec_escolas_${user.userId}` : USER_SCHOOLS_KEY;
  try {
    const raw = localStorage.getItem(userKey);
    if (raw) {
      let list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list = list.filter((s) => s.id === "furlan");
        localStorage.setItem(userKey, JSON.stringify(list));
        if (list.length > 0) return list;
      }
    }
  } catch (e) {}
  if (isQuickAccess) {
    const defaultList = [DEFAULT_SCHOOL_CATALOG[0]];
    try {
      localStorage.setItem(userKey, JSON.stringify(defaultList));
      localStorage.setItem(USER_SCHOOLS_KEY, JSON.stringify(defaultList));
    } catch (e) {}
    return defaultList;
  }
  return [];
}
function saveUserSchools(list) {
  const user = getUser();
  const userKey = user && user.userId ? `etec_escolas_${user.userId}` : USER_SCHOOLS_KEY;
  try {
    localStorage.setItem(userKey, JSON.stringify(list));
    localStorage.setItem(USER_SCHOOLS_KEY, JSON.stringify(list));
  } catch (e) {}
}
function selectSchoolAndEnter(school) {
  if (!school || !school.id) return;
  try {
    sessionStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify(school));
    localStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify(school));
  } catch (e) {}
  window.location.href = "app.html";
}
function renderUserSchools() {
  const container = document.getElementById("user-schools-container");
  if (!container) return;
  const schools = getUserSchools();
  container.innerHTML = "";
  if (schools.length === 0) {
    container.innerHTML = `
      <div class="no-schools-box">
        <p><strong>Nenhuma escola vinculada no momento.</strong></p>
        <p style="font-size: 12px; color: #433f4e; margin-top: 5px;">
          Digite o código de acesso fornecido pela sua instituição no campo abaixo para liberar o sistema.
        </p>
      </div>
    `;
    return;
  }
  schools.forEach((school) => {
    const row = document.createElement("div");
    row.className = "school-item-row";
    row.innerHTML = `
      <div class="school-item-left">
        <div class="school-icon-wrapper">
          ${getSchoolBuildingSVG()}
        </div>
        <div class="school-info-col">
          <span class="school-name">${school.name}</span>
          <span class="school-desc">${school.description || "Sistema de agendamento de espaços"}</span>
        </div>
      </div>
      <button type="button" class="btn-enter-school" data-school-id="${school.id}">
        <span>Entrar na escola</span>
        <span>→</span>
      </button>
    `;
    const enterBtn = row.querySelector(".btn-enter-school");
    enterBtn.addEventListener("click", () => {
      enterBtn.disabled = true;
      enterBtn.innerHTML = `<span>Entrando...</span>`;
      selectSchoolAndEnter(school);
    });
    container.appendChild(row);
  });
}
async function findAndJoinSchoolByCode(rawCode) {
  if (!rawCode || !rawCode.trim()) {
    alert("Digite o código da escola.");
    return;
  }
  const cleanCode = rawCode.trim().toUpperCase();
  let found = null;
  const client = getSupabase();
  if (client) {
    try {
      const { data } = await client.from("escolas").select("*");
      if (Array.isArray(data) && data.length > 0) {
        const match = data.find((s) => s.code && s.code.toUpperCase() === cleanCode);
        if (match) {
          found = {
            id: match.id,
            name: match.name,
            code: match.code,
            city: match.city || "Barueri - SP",
            description: match.description || "Sistema de agendamento de espaços"
          };
        }
      }
    } catch (e) {}
  }
  if (!found) {
    const furlan = DEFAULT_SCHOOL_CATALOG[0];
    const isMatch = furlan.code.toUpperCase() === cleanCode || 
                    (furlan.aliases && furlan.aliases.some((a) => a.toUpperCase() === cleanCode));
    if (isMatch) found = furlan;
  }
  if (!found) {
    alert("Código de escola inválido.");
    return;
  }
  saveUserSchools([found]);
  renderUserSchools();
  selectSchoolAndEnter(found);
}
(function purgeLegacySchools() {
  try {
    const raw = localStorage.getItem(USER_SCHOOLS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((s) => s.id === "furlan");
        localStorage.setItem(USER_SCHOOLS_KEY, JSON.stringify(filtered));
      }
    }
    const active = localStorage.getItem(SCHOOL_STORAGE_KEY);
    if (active) {
      const parsed = JSON.parse(active);
      if (parsed && parsed.id !== "furlan") {
        localStorage.removeItem(SCHOOL_STORAGE_KEY);
        sessionStorage.removeItem(SCHOOL_STORAGE_KEY);
      }
    }
  } catch (e) {}
})();
document.addEventListener("DOMContentLoaded", () => {
  const user = getUser();
  const userNameEl = document.getElementById("top-user-name");
  if (userNameEl && user.name) {
    userNameEl.textContent = user.name;
  }
  renderUserSchools();
  const searchForm = document.getElementById("search-school-form");
  const codeInput = document.getElementById("school-code-input");
  if (searchForm && codeInput) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const code = codeInput.value;
      findAndJoinSchoolByCode(code);
    });
  }
  const inviteBtn = document.getElementById("btn-invite-access");
  const inviteModal = document.getElementById("invite-modal");
  const cancelInviteBtn = document.getElementById("btn-cancel-invite");
  const confirmInviteBtn = document.getElementById("btn-confirm-invite");
  const inviteCodeInput = document.getElementById("invite-code-input");
  if (inviteBtn && inviteModal) {
    inviteBtn.addEventListener("click", () => {
      inviteModal.classList.add("active");
      if (inviteCodeInput) {
        inviteCodeInput.value = "";
        inviteCodeInput.focus();
      }
    });
    if (cancelInviteBtn) {
      cancelInviteBtn.addEventListener("click", () => {
        inviteModal.classList.remove("active");
      });
    }
    if (confirmInviteBtn && inviteCodeInput) {
      confirmInviteBtn.addEventListener("click", () => {
        let code = inviteCodeInput.value.trim();
        if (code.includes("/")) {
          const parts = code.split("/");
          code = parts[parts.length - 1];
        }
        if (code) {
          inviteModal.classList.remove("active");
          findAndJoinSchoolByCode(code);
        } else {
          alert("Cole o código ou link de convite.");
        }
      });
    }
    inviteModal.addEventListener("click", (e) => {
      if (e.target === inviteModal) {
        inviteModal.classList.remove("active");
      }
    });
  }
});
