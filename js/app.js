const SCHEDULES = {
  manha: [
    { label: "1ª aula", time: "07:10 – 08:00" },
    { label: "2ª aula", time: "08:00 – 08:50" },
    { label: "3ª aula", time: "08:50 – 09:40" },
    { label: "4ª aula", time: "10:00 – 10:50" },
    { label: "5ª aula", time: "10:50 – 11:40" },
    { label: "6ª aula", time: "11:40 – 12:30" }
  ],
  tarde: [
    { label: "1ª aula", time: "13:10 – 14:00" },
    { label: "2ª aula", time: "14:00 – 14:50" },
    { label: "3ª aula", time: "14:50 – 15:40" },
    { label: "4ª aula", time: "16:00 – 16:50" },
    { label: "5ª aula", time: "16:50 – 17:40" },
    { label: "6ª aula", time: "17:40 – 18:30" }
  ],
  noite: [
    { label: "1ª aula", time: "19:00 – 19:45" },
    { label: "2ª aula", time: "19:45 – 20:30" },
    { label: "3ª aula", time: "20:30 – 21:15" },
    { label: "4ª aula", time: "21:30 – 22:15" },
    { label: "5ª aula", time: "22:15 – 23:00" },
    { label: "6ª aula", time: "23:00 – 23:45" }
  ]
};
const INTERVALS = {
  manha: "Intervalo · 09:40 – 10:00",
  tarde: "Intervalo · 15:40 – 16:00",
  noite: "Intervalo · 21:15 – 21:30"
};
const STORAGE_KEY = "etec_reservas_dados";
const NOTICES_KEY = "etec_avisos_dados";
const SETTINGS_KEY = "etec_config_dados";
const SCHOOL_STORAGE_KEY = "etec_escola_ativa";
const syncChannel = (typeof window !== "undefined" && "BroadcastChannel" in window)
  ? new BroadcastChannel("etec_sync_reservations")
  : null;
let localReservationsLastUpdated = Date.now();
function getActiveSchool() {
  try {
    const raw = sessionStorage.getItem(SCHOOL_STORAGE_KEY) || localStorage.getItem(SCHOOL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) return parsed;
    }
  } catch (e) {}
  const defaultSchool = {
    id: "furlan",
    name: "ETEC Antônio Furlan",
    code: "ETEC-FURLAN",
    city: "Barueri - SP",
    description: "Sistema de agendamento de espaços"
  };
  try {
    sessionStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify(defaultSchool));
    localStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify(defaultSchool));
  } catch (e) {}
  return defaultSchool;
}
function updateSchoolUI() {
  const school = getActiveSchool();
  document.title = `${school.name} - Painel de Agendamentos`;
  const footerEl = document.querySelector(".footer-copy");
  if (footerEl) footerEl.textContent = `© 2026 ${school.name} • Centro Paula Souza`;
}
function getAllReservationsRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
function getReservations() {
  const currentSchool = getActiveSchool();
  const all = getAllReservationsRaw();
  if (!Array.isArray(all)) return [];
  return all.filter((r) => (r.schoolId || "furlan") === currentSchool.id);
}
function saveReservations(schoolList) {
  localReservationsLastUpdated = Date.now();
  const currentSchool = getActiveSchool();
  const sanitizedList = (schoolList || []).map((r) => ({
    ...r,
    schoolId: currentSchool.id
  }));
  const allCurrent = getAllReservationsRaw();
  const others = allCurrent.filter((r) => (r.schoolId || "furlan") !== currentSchool.id);
  const fullMerged = [...others, ...sanitizedList];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fullMerged));
  if (syncChannel) {
    try {
      syncChannel.postMessage({
        type: "RESERVATIONS_UPDATED",
        schoolId: currentSchool.id,
        timestamp: localReservationsLastUpdated
      });
    } catch (e) {}
  }
  fetch("/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schoolId: currentSchool.id,
      reservations: sanitizedList
    })
  }).catch(() => {});
  const supa = getAppSupabase();
  if (supa) {
    try {
      const supaRows = sanitizedList.map((r) => ({
        id: r.id,
        school_id: r.schoolId || currentSchool.id,
        space: r.space,
        day: r.day,
        date: r.date,
        period: r.period,
        slot_index: Number(r.slotIndex),
        slot_label: r.slotLabel,
        slot_time: r.slotTime,
        description: r.description || "",
        grade: r.grade || "Turma ETEC",
        author_name: r.authorName,
        author_role: r.authorRole || "Docente CPS",
        author_id: r.authorId,
        is_recurrent: Boolean(r.isRecurrent),
        created_at: r.createdAt || new Date().toISOString()
      }));
      supa.from("agendamentos").upsert(supaRows).catch(() => {});
    } catch (e) {}
  }
}
function getNotices() {
  try {
    const raw = localStorage.getItem(NOTICES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
function saveNotices(list) {
  localStorage.setItem(NOTICES_KEY, JSON.stringify(list));
}
const USER_PROFILE_KEY = "etec_usuario_perfil";
const TOUR_STORAGE_KEY = "etec_tutorial_concluido";
function getUserProfile() {
  try {
    const sessionRaw = sessionStorage.getItem(USER_PROFILE_KEY);
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      if (parsed && parsed.name) {
        if (parsed.name === "Dimitri" || parsed.email === "dguerrask@gmail.com") parsed.userId = "user_dimitri";
        else if (parsed.name === "Ana Carol" || (parsed.email && parsed.email.includes("anacarol"))) parsed.userId = "user_anacarol";
        else if (!parsed.userId) parsed.userId = "user_" + Date.now();
        return parsed;
      }
    }
    const localRaw = localStorage.getItem(USER_PROFILE_KEY);
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (parsed && parsed.name) {
        if (parsed.name === "Dimitri" || parsed.email === "dguerrask@gmail.com") parsed.userId = "user_dimitri";
        else if (parsed.name === "Ana Carol" || (parsed.email && parsed.email.includes("anacarol"))) parsed.userId = "user_anacarol";
        else if (!parsed.userId) parsed.userId = "user_" + Date.now();
        sessionStorage.setItem(USER_PROFILE_KEY, JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (e) {}
  const defaultProfile = {
    name: "Dimitri",
    role: "Docente CPS",
    email: "dguerrask@gmail.com",
    userId: "user_dimitri"
  };
  sessionStorage.setItem(USER_PROFILE_KEY, JSON.stringify(defaultProfile));
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(defaultProfile));
  return defaultProfile;
}
function saveUserProfile(profile) {
  const current = getUserProfile();
  const oldName = current && current.name ? current.name.trim() : "";
  const oldRole = current && current.role ? current.role.trim() : "";
  let uid = (profile && profile.userId) || (current && current.userId);
  if (profile && (profile.name === "Dimitri" || profile.email === "dguerrask@gmail.com")) uid = "user_dimitri";
  if (profile && (profile.name === "Ana Carol" || (profile.email && profile.email.includes("anacarol")))) uid = "user_anacarol";
  const merged = {
    ...current,
    ...profile,
    userId: uid || ("user_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8))
  };
  sessionStorage.setItem(USER_PROFILE_KEY, JSON.stringify(merged));
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(merged));
  applyUserProfile(merged);
  updateReservationsAuthor(merged, oldName);
  fetch("/api/update-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: merged.userId,
      name: merged.name,
      role: merged.role,
      oldName: oldName
    })
  }).then(async (res) => {
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.reservations)) {
        localReservationsLastUpdated = data.lastUpdated || Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.reservations));
        updateUI();
      }
    }
  }).catch(() => {});
}
function updateReservationsAuthor(profile, oldName = "") {
  if (!profile || !profile.name) return;
  const list = getReservations();
  if (!Array.isArray(list) || list.length === 0) return;
  const targetUserId = profile.userId;
  const newName = profile.name.trim();
  const newRole = profile.role ? profile.role.trim() : null;
  const oldNameNorm = (oldName || "").trim().toLowerCase();
  let modified = false;
  const updatedList = list.map((res) => {
    if (!res) return res;
    const matchById = Boolean(targetUserId && res.authorId && res.authorId === targetUserId);
    const matchByOldName = Boolean(oldNameNorm && res.authorName && res.authorName.trim().toLowerCase() === oldNameNorm);
    const isUserDimitriAccount = targetUserId === "user_dimitri" || (profile.email && profile.email.toLowerCase() === "dguerrask@gmail.com");
    const matchKnownDimitri = isUserDimitriAccount && (
      res.authorId === "user_dimitri" ||
      (res.authorName && (res.authorName.trim().toLowerCase() === "dimitri" || res.authorName.trim().toLowerCase() === "jow"))
    );
    const isUserAnaAccount = targetUserId === "user_anacarol" || (profile.email && profile.email.toLowerCase().includes("anacarol"));
    const matchKnownAna = isUserAnaAccount && (
      res.authorId === "user_anacarol" ||
      (res.authorName && (res.authorName.trim().toLowerCase() === "ana carol" || res.authorName.trim().toLowerCase() === "carol" || res.authorName.trim().toLowerCase() === "porra"))
    );
    if (matchById || matchByOldName || matchKnownDimitri || matchKnownAna) {
      const nameNeedsUpdate = res.authorName !== newName;
      const roleNeedsUpdate = Boolean(newRole && res.authorRole !== newRole);
      const idNeedsUpdate = Boolean(targetUserId && res.authorId !== targetUserId);
      if (nameNeedsUpdate || roleNeedsUpdate || idNeedsUpdate) {
        modified = true;
        return {
          ...res,
          authorName: newName,
          authorRole: newRole || res.authorRole || profile.role || "Docente CPS",
          authorId: targetUserId || res.authorId
        };
      }
    }
    return res;
  });
  if (modified) {
    saveReservations(updatedList);
    updateUI();
  }
}
function getAuthorDirectory() {
  const reservations = getReservations();
  const dir = {
    user_anacarol: { name: "Ana Carol", role: "Docente CPS" },
    user_dimitri: { name: "Dimitri", role: "Docente CPS" }
  };
  const myProfile = getUserProfile();
  if (myProfile && myProfile.userId && myProfile.name) {
    dir[myProfile.userId] = {
      name: myProfile.name.trim(),
      role: myProfile.role || "Docente CPS"
    };
  }
  reservations.forEach((r) => {
    if (r && r.authorId && r.authorName) {
      const prev = dir[r.authorId];
      const rTime = r.createdAt ? new Date(r.createdAt).getTime() : 0;
      if (!prev || (rTime && prev.time && rTime >= prev.time) || !prev.time) {
        dir[r.authorId] = {
          name: r.authorName.trim(),
          role: r.authorRole ? r.authorRole.trim() : "Docente CPS",
          time: rTime
        };
      }
    }
  });
  return dir;
}
function getAuthorDisplayName(res) {
  if (!res) return "Docente ETEC";
  const myProfile = getUserProfile();
  if (isOwnReservation(res, myProfile)) {
    return myProfile.name;
  }
  if (res.authorId) {
    const dir = getAuthorDirectory();
    if (dir[res.authorId] && dir[res.authorId].name) {
      return dir[res.authorId].name;
    }
  }
  return res.authorName || "Docente ETEC";
}
function isOwnReservation(reservation, profile) {
  if (!reservation || !profile) return false;
  if (reservation.authorId && profile.userId) {
    return reservation.authorId === profile.userId;
  }
  if (reservation.authorName && profile.name) {
    const rName = reservation.authorName.trim().toLowerCase();
    const pName = profile.name.trim().toLowerCase();
    if (rName && pName && rName === pName) return true;
  }
  if (profile.userId === "user_dimitri" && reservation.authorName) {
    const rName = reservation.authorName.trim().toLowerCase();
    if (rName === "dimitri" || rName === "jow") return true;
  }
  if (profile.userId === "user_anacarol" && reservation.authorName) {
    const rName = reservation.authorName.trim().toLowerCase();
    if (rName === "ana carol" || rName === "carol" || rName === "porra") return true;
  }
  return false;
}
function getInitials(name) {
  if (!name) return "PM";
  const clean = name.trim().replace(/^Prof\.\s*/i, "");
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PM";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function applyUserProfile(profile) {
  const p = profile || getUserProfile();
  const userNameEl = document.querySelector(".user-meta .user-name");
  const userRoleEl = document.querySelector(".user-meta .user-role");
  const userAvatarEl = document.querySelector(".sidebar-bottom .user-avatar");
  const mobileAvatarEl = document.getElementById("mobile-user-avatar");
  const inputName = document.getElementById("cfg-user-name");
  const inputRole = document.getElementById("cfg-user-role");
  if (userNameEl) userNameEl.textContent = p.name;
  if (userRoleEl) userRoleEl.textContent = p.role;
  const initials = getInitials(p.name);
  if (userAvatarEl) userAvatarEl.textContent = initials;
  if (mobileAvatarEl) mobileAvatarEl.textContent = initials;
  if (inputName) inputName.value = p.name;
  if (inputRole) inputRole.value = p.role;
  if (navCounter) {
    const myCount = getReservations().filter((r) => isOwnReservation(r, p)).length;
    navCounter.textContent = myCount;
  }
}
const DAY_KEY_MAP = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
const DAY_FULL_LABELS = {
  seg: "Segunda-feira",
  ter: "Terça-feira",
  qua: "Quarta-feira",
  qui: "Quinta-feira",
  sex: "Sexta-feira",
  sab: "Sábado",
  dom: "Domingo"
};
function getTodayContext() {
  const now = new Date();
  const dayOfWeek = now.getDay(); 
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const todayY = now.getFullYear();
  const todayM = String(now.getMonth() + 1).padStart(2, "0");
  const todayD = String(now.getDate()).padStart(2, "0");
  const todayIso = `${todayY}-${todayM}-${todayD}`;
  const todayDayKey = DAY_KEY_MAP[dayOfWeek];
  let activeSchoolDate = new Date(now);
  let isNextSchoolDay = false;
  if (dayOfWeek === 6) { 
    activeSchoolDate.setDate(now.getDate() + 2);
    isNextSchoolDay = true;
  } else if (dayOfWeek === 0) { 
    activeSchoolDate.setDate(now.getDate() + 1);
    isNextSchoolDay = true;
  }
  const schoolY = activeSchoolDate.getFullYear();
  const schoolM = String(activeSchoolDate.getMonth() + 1).padStart(2, "0");
  const schoolD = String(activeSchoolDate.getDate()).padStart(2, "0");
  const schoolIso = `${schoolY}-${schoolM}-${schoolD}`;
  const schoolDayKey = DAY_KEY_MAP[activeSchoolDate.getDay()];
  return {
    now,
    todayIso,
    todayDayKey,
    isWeekend,
    isNextSchoolDay,
    activeSchoolDate,
    schoolIso,
    schoolDayKey
  };
}
function getWeekdays() {
  const ctx = getTodayContext();
  const monday = new Date(ctx.activeSchoolDate);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - (day - 1));
  const keys = ["seg", "ter", "qua", "qui", "sex"];
  const labels = ["Seg", "Ter", "Qua", "Qui", "Sex"];
  const fullLabels = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];
  return keys.map((key, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dayNum = String(d.getDate()).padStart(2, "0");
    const monthNum = String(d.getMonth() + 1).padStart(2, "0");
    const y = d.getFullYear();
    return {
      key: key,
      label: labels[i],
      fullLabel: fullLabels[i],
      dateStr: `${dayNum}/${monthNum}`,
      isoDate: `${y}-${monthNum}-${dayNum}`,
      dateObj: d
    };
  });
}
function isReservationOnDate(res, targetIsoDate, targetDayKey) {
  if (!res) return false;
  if (res.isRecurrent) {
    let matchesDay = false;
    if (res.recurrentDays && Array.isArray(res.recurrentDays) && res.recurrentDays.length > 0) {
      matchesDay = res.recurrentDays.includes(targetDayKey);
    } else {
      matchesDay = res.day === targetDayKey;
    }
    if (!matchesDay) return false;
    if (res.date && targetIsoDate) {
      if (targetIsoDate < res.date) return false;
    }
    return true;
  }
  if (res.date && targetIsoDate) {
    return res.date === targetIsoDate;
  }
  return res.day === targetDayKey;
}
function hasSlotConflict(existingRes, space, period, slotIndex, targetIsoDate, targetDayKey, isNewRecurrent = false) {
  if (!existingRes) return false;
  if (existingRes.space !== space || existingRes.period !== period || existingRes.slotIndex !== slotIndex) {
    return false;
  }
  if (isNewRecurrent) {
    if (existingRes.isRecurrent) {
      const existingMatchesDay = (existingRes.recurrentDays && existingRes.recurrentDays.includes(targetDayKey)) || existingRes.day === targetDayKey;
      if (existingMatchesDay) return true;
    } else {
      const todayIso = getTodayContext().todayIso;
      const minDate = targetIsoDate || todayIso;
      if (existingRes.day === targetDayKey && (!existingRes.date || existingRes.date >= minDate)) {
        return true;
      }
    }
    return false;
  }
  return isReservationOnDate(existingRes, targetIsoDate, targetDayKey);
}
const initialCtx = getTodayContext();
let activeView = "inicio";
let inicioPeriod = "manha";
let agendaViewMode = "semanal"; 
let agendaPeriod = "manha";
let agendaDay = initialCtx.schoolDayKey;
let agendaDailyDay = initialCtx.schoolDayKey;
let agendaDailyPeriod = "manha";
let currentCalendarDate = new Date(); 
let modalSpace = "Sala Maker";
let modalPeriod = "manha";
let modalSelectedSlotIndex = 0;
let modalDay = initialCtx.schoolDayKey;
let modalSelectedDate = initialCtx.schoolIso;
let miniCalCurrentMonth = new Date();
const pageTitle = document.getElementById("page-title");
const pageSubtitle = document.getElementById("page-subtitle");
const navCounter = document.getElementById("nav-counter");
const modal = document.getElementById("modal-agendamento");
const formAgendamento = document.getElementById("form-agendamento");
const modalDesc = document.getElementById("modal-desc");
const charCounter = document.getElementById("char-counter");
const modalDateDisplay = document.getElementById("modal-date-display");
const modalDatePicker = document.getElementById("modal-date-picker");
const modalSlotsList = document.getElementById("modal-slots-list");
const slotsHeading = document.getElementById("slots-heading");
const recurrenceToggle = document.getElementById("modal-recurrence-toggle");
const recurrenceOptions = document.getElementById("recurrence-options");
function updateAgendaHeaderSubtitle() {
  if (agendaViewMode === "semanal") {
    const weekdays = getWeekdays();
    const startDay = weekdays[0].dateObj.getDate();
    const endDay = weekdays[4].dateObj.getDate();
    const startMonth = weekdays[0].dateObj.toLocaleDateString("pt-BR", { month: "long" });
    const endMonth = weekdays[4].dateObj.toLocaleDateString("pt-BR", { month: "long" });
    if (startMonth === endMonth) {
      pageSubtitle.textContent = `Semana de ${startDay} a ${endDay} de ${startMonth}`;
    } else {
      pageSubtitle.textContent = `Semana de ${startDay} de ${startMonth} a ${endDay} de ${endMonth}`;
    }
  } else if (agendaViewMode === "diaria") {
    const weekdays = getWeekdays();
    const dayObj = weekdays.find((d) => d.key === agendaDailyDay) || weekdays[0];
    pageSubtitle.textContent = `${dayObj.fullLabel}, ${dayObj.dateStr}`;
  } else if (agendaViewMode === "mensal") {
    const monthName = currentCalendarDate.toLocaleDateString("pt-BR", { month: "long" });
    pageSubtitle.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${currentCalendarDate.getFullYear()}`;
  }
}
function switchView(viewName) {
  activeView = viewName;
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("data-view") === viewName);
  });
  document.querySelectorAll(".view-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `view-${viewName}`);
  });
  const agendaSubnav = document.getElementById("agenda-subnav");
  const btnHeaderAgenda = document.getElementById("btn-header-agenda");
  if (agendaSubnav) {
    agendaSubnav.style.display = viewName === "agenda" ? "flex" : "none";
  }
  if (btnHeaderAgenda) {
    btnHeaderAgenda.style.display = viewName === "agenda" ? "none" : "inline-flex";
  }
  const profile = getUserProfile();
  const myTotal = getReservations().filter((r) => isOwnReservation(r, profile)).length;
  if (navCounter) {
    navCounter.textContent = myTotal;
  }
  if (viewName === "inicio") {
    pageTitle.textContent = "Painel de Agendamentos";
    const ctx = getTodayContext();
    pageSubtitle.textContent = ctx.now.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
    renderInicio();
  } else if (viewName === "agenda") {
    pageTitle.textContent = "Agenda";
    switchAgendaViewMode(agendaViewMode);
  } else if (viewName === "minhas-aulas") {
    pageTitle.textContent = "Minhas aulas";
    pageSubtitle.textContent = `${myTotal} ${myTotal === 1 ? "reserva" : "reservas"}`;
    renderMyClasses();
  } else if (viewName === "configuracoes") {
    pageTitle.textContent = "Configurações";
    pageSubtitle.textContent = "Preferências e perfil do usuário";
  }
}
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    const view = link.getAttribute("data-view");
    switchView(view);
  });
});
document.getElementById("btn-header-agenda").addEventListener("click", () => {
  switchView("agenda");
});
document.getElementById("btn-open-modal").addEventListener("click", () => {
  openModal();
});
document.getElementById("btn-close-modal").addEventListener("click", () => {
  closeModal();
});
document.getElementById("btn-cancel-modal").addEventListener("click", () => {
  closeModal();
});
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    closeModal();
  }
});
function openModal(prefill = {}) {
  modalSpace = prefill.space || "Sala Maker";
  modalPeriod = prefill.period || "manha";
  modalSelectedSlotIndex = typeof prefill.slotIndex === "number" ? prefill.slotIndex : 0;
  document.querySelectorAll(".space-option").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-space") === modalSpace);
  });
  document.querySelectorAll(".period-choice").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-period") === modalPeriod);
  });
  const now = new Date();
  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let targetDate = new Date(todayZero);
  if (prefill.date) {
    const parts = prefill.date.split("-");
    targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else if (prefill.day) {
    const dayOffsets = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5 };
    const wantedDay = dayOffsets[prefill.day];
    if (wantedDay) {
      let d = new Date(todayZero);
      for (let i = 0; i < 7; i++) {
        if (d.getDay() === wantedDay && d >= todayZero) {
          targetDate = d;
          break;
        }
        d.setDate(d.getDate() + 1);
      }
    }
  } else {
    if (targetDate.getDay() === 6) {
      targetDate.setDate(targetDate.getDate() + 2);
    } else if (targetDate.getDay() === 0) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
  }
  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, "0");
  const dNum = String(targetDate.getDate()).padStart(2, "0");
  modalSelectedDate = `${y}-${m}-${dNum}`;
  modalDay = DAY_KEY_MAP[targetDate.getDay()];
  miniCalCurrentMonth = new Date(y, targetDate.getMonth(), 1);
  if (modalDatePicker) {
    modalDatePicker.value = modalSelectedDate;
  }
  if (modalDateDisplay) {
    const formatted = targetDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    modalDateDisplay.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
  const miniCal = document.getElementById("modal-mini-calendar");
  const dateBtn = document.getElementById("modal-date-btn");
  if (miniCal) miniCal.style.display = "none";
  if (dateBtn) dateBtn.classList.remove("open");
  modalDesc.value = "";
  charCounter.textContent = "0";
  recurrenceToggle.checked = false;
  recurrenceOptions.style.display = "none";
  syncRecurrenceCheckboxesWithDay(modalDay);
  renderMiniCalendar();
  renderModalSlots();
  modal.classList.add("active");
}
function syncRecurrenceCheckboxesWithDay(dayKey) {
  document.querySelectorAll('input[name="recurrence-day"]').forEach((cb) => {
    cb.checked = (cb.value === dayKey);
  });
}
function closeModal() {
  modal.classList.remove("active");
  const miniCal = document.getElementById("modal-mini-calendar");
  const dateBtn = document.getElementById("modal-date-btn");
  if (miniCal) miniCal.style.display = "none";
  if (dateBtn) dateBtn.classList.remove("open");
}
document.querySelectorAll(".space-option").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".space-option").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    modalSpace = btn.getAttribute("data-space");
    renderModalSlots();
  });
});
document.querySelectorAll(".period-choice").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".period-choice").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    modalPeriod = btn.getAttribute("data-period");
    renderModalSlots();
  });
});
modalDesc.addEventListener("input", () => {
  charCounter.textContent = modalDesc.value.length;
});
recurrenceToggle.addEventListener("change", () => {
  recurrenceOptions.style.display = recurrenceToggle.checked ? "block" : "none";
  if (recurrenceToggle.checked) {
    syncRecurrenceCheckboxesWithDay(modalDay);
  } else {
    document.querySelectorAll('input[name="recurrence-day"]').forEach((cb) => {
      cb.checked = false;
    });
  }
  renderModalSlots();
});
document.querySelectorAll('input[name="recurrence-day"]').forEach((cb) => {
  cb.addEventListener("change", () => {
    if (cb.checked) {
      document.querySelectorAll('input[name="recurrence-day"]').forEach((other) => {
        if (other !== cb) other.checked = false;
      });
      modalDay = cb.value;
      const weekdays = getWeekdays();
      const match = weekdays.find((w) => w.key === modalDay);
      if (match) {
        modalSelectedDate = match.isoDate;
        if (modalDatePicker) modalDatePicker.value = match.isoDate;
        if (modalDateDisplay) {
          const formatted = match.dateObj.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
          modalDateDisplay.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }
      }
      renderModalSlots();
      renderMiniCalendar();
    }
  });
});
const modalDateBtn = document.getElementById("modal-date-btn");
const modalMiniCal = document.getElementById("modal-mini-calendar");
if (modalDateBtn && modalMiniCal) {
  modalDateBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = modalMiniCal.style.display === "flex" || modalMiniCal.style.display === "block";
    modalMiniCal.style.display = isVisible ? "none" : "flex";
    modalDateBtn.classList.toggle("open", !isVisible);
    if (!isVisible) {
      renderMiniCalendar();
    }
  });
  document.addEventListener("click", (e) => {
    if (!modalMiniCal.contains(e.target) && !modalDateBtn.contains(e.target)) {
      modalMiniCal.style.display = "none";
      modalDateBtn.classList.remove("open");
    }
  });
}
const miniCalPrev = document.getElementById("mini-cal-prev");
const miniCalNext = document.getElementById("mini-cal-next");
if (miniCalPrev) {
  miniCalPrev.addEventListener("click", (e) => {
    e.stopPropagation();
    miniCalCurrentMonth.setMonth(miniCalCurrentMonth.getMonth() - 1);
    renderMiniCalendar();
  });
}
if (miniCalNext) {
  miniCalNext.addEventListener("click", (e) => {
    e.stopPropagation();
    miniCalCurrentMonth.setMonth(miniCalCurrentMonth.getMonth() + 1);
    renderMiniCalendar();
  });
}
function renderMiniCalendar() {
  const miniCalDays = document.getElementById("mini-cal-days");
  const miniCalTitle = document.getElementById("mini-cal-title");
  if (!miniCalDays) return;
  const year = miniCalCurrentMonth.getFullYear();
  const month = miniCalCurrentMonth.getMonth();
  if (miniCalTitle) {
    const mName = miniCalCurrentMonth.toLocaleDateString("pt-BR", { month: "long" });
    miniCalTitle.textContent = `${mName.charAt(0).toUpperCase() + mName.slice(1)} ${year}`;
  }
  miniCalDays.innerHTML = "";
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();
  const startingCol = (firstDay.getDay() + 6) % 7;
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingCol - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mini-cal-day is-other-month is-locked";
    btn.disabled = true;
    btn.textContent = dayNum;
    miniCalDays.appendChild(btn);
  }
  const today = new Date();
  const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let d = 1; d <= totalDays; d++) {
    const checkDate = new Date(year, month, d, 0, 0, 0, 0);
    const dayOfWeek = checkDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isPast = checkDate < todayZero;
    const isLocked = isWeekend || isPast;
    const isToday = checkDate.getTime() === todayZero.getTime();
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isSelected = modalSelectedDate === iso;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `mini-cal-day ${isWeekend ? "is-weekend" : ""} ${isPast ? "is-past" : ""} ${isLocked ? "is-locked" : ""} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}`;
    btn.textContent = d;
    if (isLocked) {
      btn.disabled = true;
      if (isWeekend) {
        btn.title = "Finais de semana bloqueados (sem aulas)";
      } else if (isPast) {
        btn.title = "Datas anteriores a hoje bloqueadas";
      }
    } else {
      btn.title = `Selecionar ${d} de ${miniCalCurrentMonth.toLocaleDateString("pt-BR", { month: "short" })}`;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        modalSelectedDate = iso;
        modalDay = DAY_KEY_MAP[dayOfWeek];
        if (recurrenceToggle.checked) {
          syncRecurrenceCheckboxesWithDay(modalDay);
        }
        if (modalDatePicker) modalDatePicker.value = iso;
        if (modalDateDisplay) {
          const formatted = checkDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
          modalDateDisplay.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }
        if (modalMiniCal) modalMiniCal.style.display = "none";
        if (modalDateBtn) modalDateBtn.classList.remove("open");
        modalSelectedSlotIndex = 0;
        renderModalSlots();
        renderMiniCalendar();
      });
    }
    miniCalDays.appendChild(btn);
  }
  const totalCellsSoFar = startingCol + totalDays;
  const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mini-cal-day is-other-month is-locked";
    btn.disabled = true;
    btn.textContent = i;
    miniCalDays.appendChild(btn);
  }
}
function renderModalSlots() {
  const periodLabel = modalPeriod.charAt(0).toUpperCase() + modalPeriod.slice(1);
  slotsHeading.textContent = `Aulas disponíveis – ${periodLabel}`;
  const slots = SCHEDULES[modalPeriod] || [];
  const reservations = getReservations();
  const profile = getUserProfile();
  modalSlotsList.innerHTML = "";
  const otherSpace = modalSpace === "Sala Maker" ? "Biblioteca" : "Sala Maker";
  const isSlotReserved = (space, index) => reservations.some((r) => {
    return hasSlotConflict(r, space, modalPeriod, index, modalSelectedDate, modalDay, recurrenceToggle.checked);
  });
  const isSelfBlockedByOther = (index) => reservations.some((r) => {
    if (!isOwnReservation(r, profile)) return false; 
    return hasSlotConflict(r, otherSpace, modalPeriod, index, modalSelectedDate, modalDay, recurrenceToggle.checked);
  });
  let firstAvailableIndex = -1;
  slots.forEach((slot, index) => {
    const reserved = isSlotReserved(modalSpace, index);
    const selfBlocked = isSelfBlockedByOther(index);
    if (!reserved && !selfBlocked && firstAvailableIndex === -1) {
      firstAvailableIndex = index;
    }
  });
  const currentBlocked = isSlotReserved(modalSpace, modalSelectedSlotIndex) || isSelfBlockedByOther(modalSelectedSlotIndex);
  if (currentBlocked && firstAvailableIndex !== -1) {
    modalSelectedSlotIndex = firstAvailableIndex;
  }
  slots.forEach((slot, index) => {
    if (index === 3) {
      const divider = document.createElement("div");
      divider.className = "interval-divider";
      divider.textContent = INTERVALS[modalPeriod];
      modalSlotsList.appendChild(divider);
    }
    const isReserved = isSlotReserved(modalSpace, index);
    const selfBlocked = isSelfBlockedByOther(index);
    const isUnavailable = isReserved || selfBlocked;
    const isSelected = modalSelectedSlotIndex === index && !isUnavailable;
    const slotCard = document.createElement("div");
    slotCard.className = `slot-card ${isUnavailable ? "reserved" : ""} ${isSelected ? "selected" : ""}`;
    let statusHtml = "";
    if (isReserved) {
      statusHtml = `
        <span class="dot-indicator dot-grey"></span>
        <span>Reservada</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
      `;
    } else if (selfBlocked) {
      statusHtml = `
        <span class="dot-indicator dot-grey"></span>
        <span>Indisponível</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
      `;
    } else if (isSelected) {
      statusHtml = `
        <span class="dot-indicator dot-green"></span>
        <span style="color: #2ee59d;">Selecionada</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ee59d" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      `;
    } else {
      statusHtml = `
        <span class="dot-indicator dot-green"></span>
        <span>Disponível</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      `;
    }
    slotCard.innerHTML = `
      <div>
        <div class="slot-title">${slot.label}</div>
        <div class="slot-time">${slot.time}</div>
      </div>
      <div class="slot-state-badge">
        ${statusHtml}
      </div>
    `;
    if (!isUnavailable) {
      slotCard.addEventListener("click", () => {
        modalSelectedSlotIndex = index;
        renderModalSlots();
      });
    }
    modalSlotsList.appendChild(slotCard);
  });
}
formAgendamento.addEventListener("submit", (e) => {
  e.preventDefault();
  const slots = SCHEDULES[modalPeriod] || [];
  const selectedSlot = slots[modalSelectedSlotIndex];
  if (!selectedSlot) {
    alert("Selecione um horário disponível.");
    return;
  }
  const reservations = getReservations();
  const profile = getUserProfile();
  const isRecurrent = recurrenceToggle.checked;
  const checkedDayInput = document.querySelector('input[name="recurrence-day"]:checked');
  const targetDay = (isRecurrent && checkedDayInput) ? checkedDayInput.value : modalDay;
  const conflict = reservations.some((r) =>
    hasSlotConflict(r, modalSpace, modalPeriod, modalSelectedSlotIndex, modalSelectedDate, targetDay, isRecurrent)
  );
  if (conflict) {
    alert(isRecurrent
      ? `Este horário já possui uma reserva ou rotina na ${DAY_FULL_LABELS[targetDay] || targetDay}. Escolha outra aula.`
      : "Este horário já foi reservado. Escolha outra aula.");
    return;
  }
  const otherSpace = modalSpace === "Sala Maker" ? "Biblioteca" : "Sala Maker";
  const crossConflict = reservations.some((r) =>
    isOwnReservation(r, profile) &&
    hasSlotConflict(r, otherSpace, modalPeriod, modalSelectedSlotIndex, modalSelectedDate, targetDay, isRecurrent)
  );
  if (crossConflict) {
    alert(`Você já possui uma reserva na ${otherSpace} neste mesmo horário (${DAY_FULL_LABELS[targetDay] || targetDay}). Não é possível estar em dois espaços ao mesmo tempo.`);
    return;
  }
  const newReservation = {
    id: "res_" + Date.now(),
    schoolId: getActiveSchool().id,
    space: modalSpace,
    day: targetDay,
    date: modalSelectedDate,
    period: modalPeriod,
    slotIndex: modalSelectedSlotIndex,
    slotLabel: selectedSlot.label,
    slotTime: selectedSlot.time,
    description: modalDesc.value.trim() || (modalSpace === "Sala Maker" ? "Atividade Prática Maker" : "Pesquisa na Biblioteca"),
    grade: "Turma ETEC",
    authorName: profile.name,
    authorRole: profile.role,
    authorId: profile.userId,
    isRecurrent: isRecurrent,
    createdAt: new Date().toISOString()
  };
  reservations.push(newReservation);
  saveReservations(reservations);
  const dayLabel = DAY_FULL_LABELS[targetDay] || targetDay;
  const notices = getNotices();
  notices.unshift({
    title: isRecurrent ? "Rotina semanal confirmada" : "Reserva confirmada",
    desc: isRecurrent
      ? `${modalSpace} · Toda ${dayLabel} (${selectedSlot.label}) por ${profile.name}`
      : `${modalSpace} · ${selectedSlot.label} (${selectedSlot.time}) por ${profile.name}`,
    time: "Agora"
  });
  saveNotices(notices);
  closeModal();
  updateUI();
  alert(isRecurrent ? `Rotina semanal confirmada para todas as ${dayLabel}s!` : "Reserva confirmada com sucesso!");
});
function switchAgendaViewMode(mode) {
  if (mode !== "mensal") mode = "semanal";
  agendaViewMode = mode;
  document.querySelectorAll(".view-switch-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-mode") === mode);
  });
  const contSemanal = document.getElementById("agenda-container-semanal");
  const contMensal = document.getElementById("agenda-container-mensal");
  const badgeInfo = document.getElementById("agenda-view-mode-badge");
  if (contSemanal) contSemanal.style.display = mode === "semanal" ? "flex" : "none";
  if (contMensal) contMensal.style.display = mode === "mensal" ? "flex" : "none";
  function updateAgendaBadge() {
    if (badgeInfo) {
      if (mode === "semanal") badgeInfo.textContent = "Seg a Sex";
      else if (mode === "mensal") {
        const monthName = currentCalendarDate.toLocaleDateString("pt-BR", { month: "long" });
        badgeInfo.textContent = `Mês de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
      }
    }
  }
  updateAgendaBadge();
  updateAgendaHeaderSubtitle();
  renderAgenda();
}
document.querySelectorAll(".view-switch-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.getAttribute("data-mode");
    switchAgendaViewMode(mode);
  });
});
document.querySelectorAll('.period-tabs[data-target="inicio"] .period-btn').forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('.period-tabs[data-target="inicio"] .period-btn').forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    inicioPeriod = btn.getAttribute("data-period");
    renderInicio();
  });
});
document.querySelectorAll('.period-tabs[data-target="agenda"] .period-btn').forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('.period-tabs[data-target="agenda"] .period-btn').forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    agendaPeriod = btn.getAttribute("data-period");
    renderAgendaWeekly();
  });
});
document.querySelectorAll('.period-tabs[data-target="agenda-diaria"] .period-btn').forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('.period-tabs[data-target="agenda-diaria"] .period-btn').forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    agendaDailyPeriod = btn.getAttribute("data-period");
    renderAgendaDaily();
  });
});
document.querySelectorAll(".week-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".week-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    agendaDay = btn.getAttribute("data-day");
    const dayLabel = btn.querySelector(".day-abbr").textContent;
    const dateLabel = btn.querySelector(".day-date").textContent;
    const labelEl = document.getElementById("agenda-current-day-label");
    if (labelEl) labelEl.textContent = `${dayLabel}, ${dateLabel}`;
    renderAgendaWeekly();
  });
});
document.querySelectorAll("#agenda-daily-tabs .daily-day-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#agenda-daily-tabs .daily-day-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    agendaDailyDay = btn.getAttribute("data-day");
    updateAgendaHeaderSubtitle();
    renderAgendaDaily();
  });
});
const btnMonthPrev = document.getElementById("btn-month-prev");
const btnMonthNext = document.getElementById("btn-month-next");
const btnMonthToday = document.getElementById("btn-month-today");
if (btnMonthPrev) {
  btnMonthPrev.addEventListener("click", () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    updateAgendaHeaderSubtitle();
    const badgeInfo = document.getElementById("agenda-view-mode-badge");
    if (badgeInfo && agendaViewMode === "mensal") {
      const monthName = currentCalendarDate.toLocaleDateString("pt-BR", { month: "long" });
      badgeInfo.textContent = `Mês de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
    }
    renderAgendaMonthly();
  });
}
if (btnMonthNext) {
  btnMonthNext.addEventListener("click", () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    updateAgendaHeaderSubtitle();
    const badgeInfo = document.getElementById("agenda-view-mode-badge");
    if (badgeInfo && agendaViewMode === "mensal") {
      const monthName = currentCalendarDate.toLocaleDateString("pt-BR", { month: "long" });
      badgeInfo.textContent = `Mês de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
    }
    renderAgendaMonthly();
  });
}
if (btnMonthToday) {
  btnMonthToday.addEventListener("click", () => {
    currentCalendarDate = new Date();
    updateAgendaHeaderSubtitle();
    const badgeInfo = document.getElementById("agenda-view-mode-badge");
    if (badgeInfo && agendaViewMode === "mensal") {
      const monthName = currentCalendarDate.toLocaleDateString("pt-BR", { month: "long" });
      badgeInfo.textContent = `Mês de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
    }
    renderAgendaMonthly();
  });
}
function renderInicio() {
  const ctx = getTodayContext();
  if (pageSubtitle) {
    pageSubtitle.textContent = ctx.now.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }
  const scheduleTitleEl = document.getElementById("inicio-schedule-title");
  if (scheduleTitleEl) {
    if (ctx.isWeekend) {
      const mondayDateStr = `${String(ctx.activeSchoolDate.getDate()).padStart(2, "0")}/${String(ctx.activeSchoolDate.getMonth() + 1).padStart(2, "0")}`;
      scheduleTitleEl.innerHTML = `Horários de segunda-feira <span class="weekend-tag">Próximo dia letivo · ${mondayDateStr}</span>`;
    } else {
      scheduleTitleEl.textContent = "Horários de hoje";
    }
  }
  const tableBody = document.getElementById("today-schedule-body");
  const slots = SCHEDULES[inicioPeriod] || [];
  const reservations = getReservations();
  const profile = getUserProfile();
  tableBody.innerHTML = "";
  slots.forEach((slot, index) => {
    const matchesSlot = (r, space) => {
      if (r.space !== space || r.period !== inicioPeriod || r.slotIndex !== index) return false;
      return isReservationOnDate(r, ctx.schoolIso, ctx.schoolDayKey);
    };
    const makerRes = reservations.find((r) => matchesSlot(r, "Sala Maker"));
    const biblioRes = reservations.find((r) => matchesSlot(r, "Biblioteca"));
    const hasMyRes = (makerRes && isOwnReservation(makerRes, profile)) || (biblioRes && isOwnReservation(biblioRes, profile));
    const tr = document.createElement("tr");
    if (hasMyRes) {
      tr.classList.add("row-confirmed");
    }
    function renderCell(res, spaceName, otherRes) {
      if (res) {
        const isSelf = isOwnReservation(res, profile);
        if (isSelf) {
          return `
            <button type="button" class="status-badge status-mine status-clickable btn-detalhes-slot" data-id="${res.id}" title="${res.isRecurrent ? "Sua reserva recorrente" : "Sua reserva"} — clique para ver detalhes">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Sua reserva</span>
            </button>
          `;
        }
        const authorNameDisplay = getAuthorDisplayName(res);
        return `
          <button type="button" class="status-badge status-other-user status-clickable btn-detalhes-slot" data-id="${res.id}" title="Reservada por ${authorNameDisplay} — clique para ver detalhes">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>${authorNameDisplay}</span>
          </button>
        `;
      }
      if (otherRes && isOwnReservation(otherRes, profile)) {
        return `
          <span class="status-badge status-unavailable" title="Você já reservou ${otherRes.space} nesta aula">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            <span>Indisponível</span>
          </span>
        `;
      }
      return `
        <button type="button" class="btn-reserve-slot btn-reserve-inicio" data-space="${spaceName}" data-index="${index}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Reservar
        </button>
      `;
    }
    tr.innerHTML = `
      <td>
        <div class="slot-time-col">
          <span class="slot-name">${slot.label}</span>
          <span class="slot-hours">${slot.time}</span>
        </div>
      </td>
      <td>
        ${renderCell(makerRes, "Sala Maker", biblioRes)}
      </td>
      <td>
        ${renderCell(biblioRes, "Biblioteca", makerRes)}
      </td>
    `;
    tr.querySelectorAll(".btn-reserve-inicio").forEach((btn) => {
      btn.addEventListener("click", () => {
        const space = btn.getAttribute("data-space") || "Sala Maker";
        openModal({
          space: space,
          period: inicioPeriod,
          slotIndex: index,
          day: ctx.schoolDayKey,
          date: ctx.schoolIso
        });
      });
    });
    tr.querySelectorAll(".btn-detalhes-slot").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        openReservationDetails(id);
      });
    });
    tableBody.appendChild(tr);
  });
  const todayReservationsTitle = document.getElementById("today-reservations-title");
  const todayDateIndicator = document.getElementById("today-date-indicator");
  if (todayReservationsTitle) {
    todayReservationsTitle.textContent = ctx.isWeekend ? "Suas reservas para segunda-feira" : "Suas reservas de hoje";
  }
  if (todayDateIndicator) {
    const dObj = ctx.isWeekend ? ctx.activeSchoolDate : ctx.now;
    todayDateIndicator.textContent = dObj.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  }
  const cardsContainer = document.getElementById("today-reservations-container");
  cardsContainer.innerHTML = "";
  const relevantReservations = reservations.filter((r) => {
    if (!isOwnReservation(r, profile)) return false;
    return isReservationOnDate(r, ctx.schoolIso, ctx.schoolDayKey);
  });
  if (relevantReservations.length === 0) {
    cardsContainer.innerHTML = `
      <div class="empty-state-card">
        ${ctx.isWeekend
          ? "Você não possui nenhuma reserva para a próxima segunda-feira.<br>Clique em <strong>+ Agendar espaço</strong> acima para antecipar seus horários da semana."
          : "Você não possui nenhuma reserva para hoje.<br>Clique em <strong>+ Agendar espaço</strong> acima para agendar uma aula."}
      </div>
    `;
  } else {
    relevantReservations.forEach((res) => {
      const card = document.createElement("div");
      card.className = "class-card";
      const isMaker = res.space === "Sala Maker";
      const isRecurrent = Boolean(res.isRecurrent);
      const recurrentBadgeHtml = isRecurrent ? `
        <span class="badge-recurrent-discreet" title="Reserva com repetição semanal">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Recorrente</span>
        </span>
      ` : "";
      card.innerHTML = `
        <div class="card-top-row">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="tag-space ${isMaker ? "tag-maker" : "tag-biblio"}">${res.space}</span>
            ${recurrentBadgeHtml}
          </div>
          <span class="status-badge status-confirmed">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Confirmada
          </span>
        </div>
        <div>
          <div class="card-subject">${res.description}</div>
          <div class="card-classroom">${res.grade} · ${res.slotLabel}</div>
        </div>
        <div class="card-bottom-row">
          <span>${res.slotTime}</span>
          <span>50 minutos</span>
        </div>
      `;
      card.style.cursor = "pointer";
      card.addEventListener("click", () => {
        openReservationDetails(res.id);
      });
      cardsContainer.appendChild(card);
    });
  }
  renderNoticesList();
}
function renderAgenda() {
  if (agendaViewMode === "mensal") {
    renderAgendaMonthly();
  } else {
    agendaViewMode = "semanal";
    renderAgendaWeekly();
  }
}
function renderAgendaWeeklyTabs() {
  const container = document.getElementById("agenda-week-tabs");
  if (!container) return;
  const weekdays = getWeekdays();
  container.innerHTML = weekdays.map((d) => `
    <button type="button" class="week-tab ${d.key === agendaDay ? "active" : ""}" data-day="${d.key}">
      <span class="day-abbr">${d.label}</span>
      <span class="day-date">${d.dateStr}</span>
    </button>
  `).join("");
  container.querySelectorAll(".week-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".week-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      agendaDay = btn.getAttribute("data-day");
      const dayObj = weekdays.find((d) => d.key === agendaDay) || weekdays[0];
      const labelEl = document.getElementById("agenda-current-day-label");
      if (labelEl) labelEl.textContent = `${dayObj.label}, ${dayObj.dateStr}`;
      renderAgendaWeekly();
    });
  });
  const currentObj = weekdays.find((d) => d.key === agendaDay) || weekdays[0];
  const labelEl = document.getElementById("agenda-current-day-label");
  if (labelEl) labelEl.textContent = `${currentObj.label}, ${currentObj.dateStr}`;
}
function renderAgendaWeekly() {
  renderAgendaWeeklyTabs();
  const tableBody = document.getElementById("agenda-schedule-body");
  if (!tableBody) return;
  const slots = SCHEDULES[agendaPeriod] || [];
  const reservations = getReservations();
  const profile = getUserProfile();
  const weekdays = getWeekdays();
  const currentDayObj = weekdays.find((d) => d.key === agendaDay) || weekdays[0];
  tableBody.innerHTML = "";
  slots.forEach((slot, index) => {
    const matchesSlot = (r, space) => {
      if (r.space !== space || r.period !== agendaPeriod || r.slotIndex !== index) return false;
      return isReservationOnDate(r, currentDayObj.isoDate, agendaDay);
    };
    const makerRes = reservations.find((r) => matchesSlot(r, "Sala Maker"));
    const biblioRes = reservations.find((r) => matchesSlot(r, "Biblioteca"));
    const tr = document.createElement("tr");
    if (makerRes || biblioRes) {
      tr.classList.add("row-confirmed");
    }
    function renderCell(res, spaceName, otherRes) {
      if (res) {
        const isSelf = isOwnReservation(res, profile);
        if (isSelf) {
          return `
            <button type="button" class="status-badge status-mine status-clickable btn-detalhes-slot" data-id="${res.id}" title="Sua reserva — clique para ver detalhes">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Sua reserva</span>
            </button>
          `;
        }
        const authorNameDisplay = getAuthorDisplayName(res);
        return `
          <button type="button" class="status-badge status-other-user status-clickable btn-detalhes-slot" data-id="${res.id}" title="Reservada por ${authorNameDisplay} — clique para ver detalhes">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>${authorNameDisplay}</span>
          </button>
        `;
      }
      if (otherRes && isOwnReservation(otherRes, profile)) {
        return `
          <span class="status-badge status-unavailable" title="Você já reservou ${otherRes.space} nesta aula">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            <span>Indisponível</span>
          </span>
        `;
      }
      return `
        <button type="button" class="btn-reserve-slot btn-reserve-agenda" data-space="${spaceName}" data-index="${index}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Reservar
        </button>
      `;
    }
    tr.innerHTML = `
      <td>
        <div class="slot-time-col">
          <span class="slot-name">${slot.label}</span>
          <span class="slot-hours">${slot.time}</span>
        </div>
      </td>
      <td>
        ${renderCell(makerRes, "Sala Maker", biblioRes)}
      </td>
      <td>
        ${renderCell(biblioRes, "Biblioteca", makerRes)}
      </td>
    `;
    tr.querySelectorAll(".btn-reserve-agenda").forEach((btn) => {
      btn.addEventListener("click", () => {
        const space = btn.getAttribute("data-space");
        openModal({
          space: space,
          day: agendaDay,
          date: currentDayObj.isoDate,
          period: agendaPeriod,
          slotIndex: index
        });
      });
    });
    tr.querySelectorAll(".btn-detalhes-slot").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        openReservationDetails(id);
      });
    });
    tableBody.appendChild(tr);
  });
}
function renderAgendaDailyTabs() {
  const container = document.getElementById("agenda-daily-tabs");
  if (!container) return;
  const weekdays = getWeekdays();
  container.innerHTML = weekdays.map((d) => `
    <button type="button" class="daily-day-btn ${d.key === agendaDailyDay ? "active" : ""}" data-day="${d.key}">
      <span class="daily-day-name">${d.fullLabel}</span>
      <span class="daily-day-date">${d.dateStr}</span>
    </button>
  `).join("");
  container.querySelectorAll(".daily-day-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".daily-day-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      agendaDailyDay = btn.getAttribute("data-day");
      updateAgendaHeaderSubtitle();
      renderAgendaDaily();
    });
  });
  const currentObj = weekdays.find((d) => d.key === agendaDailyDay) || weekdays[0];
  const titleEl = document.getElementById("agenda-daily-title");
  if (titleEl) {
    titleEl.textContent = `Horários · ${currentObj.label}, ${currentObj.dateStr}`;
  }
}
function renderAgendaDaily() {
  renderAgendaDailyTabs();
  const tableBody = document.getElementById("agenda-daily-schedule-body");
  if (!tableBody) return;
  const slots = SCHEDULES[agendaDailyPeriod] || [];
  const reservations = getReservations();
  const profile = getUserProfile();
  const weekdays = getWeekdays();
  const currentDayObj = weekdays.find((d) => d.key === agendaDailyDay) || weekdays[0];
  tableBody.innerHTML = "";
  slots.forEach((slot, index) => {
    const matchesSlot = (r, space) => {
      if (r.space !== space || r.period !== agendaDailyPeriod || r.slotIndex !== index) return false;
      return isReservationOnDate(r, currentDayObj.isoDate, agendaDailyDay);
    };
    const makerRes = reservations.find((r) => matchesSlot(r, "Sala Maker"));
    const biblioRes = reservations.find((r) => matchesSlot(r, "Biblioteca"));
    const hasMyRes = (makerRes && isOwnReservation(makerRes, profile)) || (biblioRes && isOwnReservation(biblioRes, profile));
    const tr = document.createElement("tr");
    if (hasMyRes) {
      tr.classList.add("row-confirmed");
    }
    function renderDailyCell(res, spaceName, otherRes) {
      if (res) {
        const isSelf = isOwnReservation(res, profile);
        if (isSelf) {
          return `
            <button type="button" class="status-badge status-mine status-clickable btn-detalhes-daily" data-id="${res.id}" title="Sua reserva — clique para ver detalhes">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Sua reserva</span>
            </button>
          `;
        }
        const authorNameDisplay = getAuthorDisplayName(res);
        return `
          <button type="button" class="status-badge status-other-user status-clickable btn-detalhes-daily" data-id="${res.id}" title="Reservada por ${authorNameDisplay} — clique para ver detalhes">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>${authorNameDisplay}</span>
          </button>
        `;
      }
      if (otherRes && isOwnReservation(otherRes, profile)) {
        return `
          <span class="status-badge status-unavailable" title="Você já reservou ${otherRes.space} nesta aula">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            <span>Indisponível</span>
          </span>
        `;
      }
      return `
        <button type="button" class="btn-reserve-slot btn-reserve-daily" data-space="${spaceName}" data-index="${index}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Reservar
        </button>
      `;
    }
    tr.innerHTML = `
      <td>
        <div class="slot-time-col">
          <span class="slot-name">${slot.label}</span>
          <span class="slot-hours">${slot.time}</span>
        </div>
      </td>
      <td>
        ${renderDailyCell(makerRes, "Sala Maker", biblioRes)}
      </td>
      <td>
        ${renderDailyCell(biblioRes, "Biblioteca", makerRes)}
      </td>
    `;
    tr.querySelectorAll(".btn-reserve-daily").forEach((btn) => {
      btn.addEventListener("click", () => {
        const space = btn.getAttribute("data-space") || "Sala Maker";
        openModal({
          space: space,
          day: agendaDailyDay,
          date: currentDayObj.isoDate,
          period: agendaDailyPeriod,
          slotIndex: index
        });
      });
    });
    tr.querySelectorAll(".btn-detalhes-daily").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        openReservationDetails(id);
      });
    });
    tableBody.appendChild(tr);
  });
}
function renderAgendaMonthly() {
  const grid = document.getElementById("calendar-days-grid");
  const heading = document.getElementById("calendar-month-heading");
  if (!grid) return;
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  if (heading) {
    const monthName = currentCalendarDate.toLocaleDateString("pt-BR", { month: "long" });
    heading.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
  }
  grid.innerHTML = "";
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();
  let startingCol = (firstDay.getDay() + 6) % 7;
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingCol - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const cell = document.createElement("div");
    cell.className = "calendar-day-cell is-other-month";
    cell.innerHTML = `
      <div class="day-cell-top">
        <span class="day-cell-num">${dayNum}</span>
      </div>
    `;
    grid.appendChild(cell);
  }
  const reservations = getReservations();
  const dayKeyMap = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  const today = new Date();
  for (let d = 1; d <= totalDays; d++) {
    const thisDate = new Date(year, month, d);
    const dayOfWeek = thisDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dayKey = dayKeyMap[dayOfWeek];
    const isToday = thisDate.getFullYear() === today.getFullYear() &&
                    thisDate.getMonth() === today.getMonth() &&
                    thisDate.getDate() === today.getDate();
    const cell = document.createElement("div");
    cell.className = `calendar-day-cell ${isWeekend ? "is-weekend" : ""} ${isToday ? "is-today" : ""}`;
    const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    let makerCount = 0;
    let biblioCount = 0;
    if (!isWeekend) {
      reservations.forEach((r) => {
        if (r.date === isoDate || (!r.date && r.day === dayKey)) {
          if (r.space === "Sala Maker") makerCount++;
          else if (r.space === "Biblioteca") biblioCount++;
        }
      });
    }
    let chipsHtml = "";
    if (makerCount > 0) {
      chipsHtml += `<span class="day-chip day-chip-maker">Maker (${makerCount})</span>`;
    }
    if (biblioCount > 0) {
      chipsHtml += `<span class="day-chip day-chip-biblio">Biblio (${biblioCount})</span>`;
    }
    cell.innerHTML = `
      <div class="day-cell-top">
        <span class="day-cell-num">${d}</span>
      </div>
      <div class="day-cell-chips">
        ${chipsHtml}
      </div>
    `;
    if (!isWeekend) {
      cell.setAttribute("title", `Clique para ver horários de ${dayKey.toUpperCase()}`);
      cell.addEventListener("click", () => {
        agendaDailyDay = dayKey;
        document.querySelectorAll("#agenda-daily-tabs .daily-day-btn").forEach((b) => {
          b.classList.toggle("active", b.getAttribute("data-day") === dayKey);
        });
        switchAgendaViewMode("diaria");
      });
    }
    grid.appendChild(cell);
  }
  const totalCellsSoFar = startingCol + totalDays;
  const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    const cell = document.createElement("div");
    cell.className = "calendar-day-cell is-other-month";
    cell.innerHTML = `
      <div class="day-cell-top">
        <span class="day-cell-num">${i}</span>
      </div>
    `;
    grid.appendChild(cell);
  }
}
function renderMyClasses() {
  const container = document.getElementById("my-classes-cards-container");
  const recurringContainer = document.getElementById("recurring-routines-container");
  const reservations = getReservations();
  const profile = getUserProfile();
  container.innerHTML = "";
  recurringContainer.innerHTML = "";
  const myReservations = reservations.filter((r) => isOwnReservation(r, profile));
  const myNonRecurrent = myReservations.filter((r) => !r.isRecurrent);
  const recurrentOnes = myReservations.filter((r) => r.isRecurrent);
  if (navCounter) {
    navCounter.textContent = myReservations.length;
  }
  if (activeView === "minhas-aulas" && pageSubtitle) {
    const totalCount = myNonRecurrent.length + recurrentOnes.length;
    pageSubtitle.textContent = `${totalCount} ${totalCount === 1 ? "reserva" : "reservas"}`;
  }
  if (myNonRecurrent.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card">
        Nenhuma reserva pontual cadastrada.<br>
        Clique em <strong>+ Agendar espaço</strong> acima para agendar uma aula.
      </div>
    `;
  } else {
    myNonRecurrent.forEach((res) => {
      const card = document.createElement("div");
      card.className = "class-card";
      const isMaker = res.space === "Sala Maker";
      card.innerHTML = `
        <div class="card-top-row">
          <span class="tag-space ${isMaker ? "tag-maker" : "tag-biblio"}">${res.space}</span>
          <span class="status-badge status-confirmed">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Confirmada
          </span>
        </div>
        <div>
          <div class="card-subject">${res.description}</div>
          <div class="card-classroom">${res.grade} · ${res.slotLabel}</div>
        </div>
        <div class="card-bottom-row">
          <span>${res.slotTime}</span>
          <button type="button" class="card-cancel-btn" data-id="${res.id}">✕ Cancelar</button>
        </div>
      `;
      card.style.cursor = "pointer";
      card.addEventListener("click", (e) => {
        if (!e.target.closest(".card-cancel-btn")) {
          openReservationDetails(res.id);
        }
      });
      card.querySelector(".card-cancel-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm("Deseja realmente cancelar esta reserva?")) {
          cancelReservation(res.id);
        }
      });
      container.appendChild(card);
    });
  }
  if (recurrentOnes.length === 0) {
    recurringContainer.innerHTML = `
      <div style="text-align: center; color: #7a748c; padding: 20px; font-size: 12.5px;">
        Nenhuma rotina semanal cadastrada. Ao agendar, marque a opção "Repetir semanalmente".
      </div>
    `;
  } else {
    recurrentOnes.forEach((r) => {
      const dayKey = r.day || "seg";
      const dayLabel = DAY_FULL_LABELS[dayKey] || dayKey;
      const item = document.createElement("div");
      item.className = "recurring-item";
      item.innerHTML = `
        <div class="recurring-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </div>
        <div class="recurring-details">
          <span class="recurring-title">${r.description} · ${r.space}</span>
          <span class="recurring-desc">Toda ${dayLabel} · ${r.slotLabel} (${r.slotTime})</span>
        </div>
      `;
      item.style.cursor = "pointer";
      item.addEventListener("click", () => {
        openReservationDetails(r.id);
      });
      recurringContainer.appendChild(item);
    });
  }
}
function cancelReservation(id) {
  let list = getReservations();
  list = list.filter((r) => r.id !== id);
  saveReservations(list);
  const supa = getAppSupabase();
  if (supa) {
    try {
      supa.from("agendamentos").delete().eq("id", id).catch(() => {});
    } catch (e) {}
  }
  const notices = getNotices();
  notices.unshift({
    title: "Reserva cancelada",
    desc: "Um dos seus horários foi liberado com sucesso.",
    time: "Agora"
  });
  saveNotices(notices);
  updateUI();
}
function renderNoticesList() {
  const listEl = document.getElementById("notices-list");
  const notices = getNotices();
  if (notices.length === 0) {
    listEl.innerHTML = `
      <div class="notice-item">
        <div class="notice-icon icon-success">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div class="notice-content">
          <span class="notice-title">Sistema pronto para uso</span>
          <p class="notice-desc">Seus agendamentos aparecerão aqui assim que forem realizados.</p>
          <span class="notice-time">Hoje</span>
        </div>
      </div>
    `;
    return;
  }
  listEl.innerHTML = "";
  notices.slice(0, 5).forEach((n) => {
    const item = document.createElement("div");
    item.className = "notice-item";
    item.innerHTML = `
      <div class="notice-icon icon-success">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </div>
      <div class="notice-content">
        <span class="notice-title">${n.title}</span>
        <p class="notice-desc">${n.desc}</p>
        <span class="notice-time">${n.time}</span>
      </div>
    `;
    listEl.appendChild(item);
  });
}
document.getElementById("btn-mark-notices-read").addEventListener("click", () => {
  saveNotices([]);
  renderNoticesList();
});
const cfgModoEscuro = document.getElementById("cfg-modo-escuro");
const cfgAltoContraste = document.getElementById("cfg-alto-contraste");
const cfgTextoMaior = document.getElementById("cfg-texto-maior");
const cfgReduzirAnim = document.getElementById("cfg-reduzir-animacoes");
const cfgLeituraFacil = document.getElementById("cfg-leitura-facilitada");
const cfgDestacarFoco = document.getElementById("cfg-destacar-foco");
const cfgReservaConf = document.getElementById("cfg-reserva-confirmada");
const cfgReservaAlt = document.getElementById("cfg-reserva-alterada");
const cfgReceberEmail = document.getElementById("cfg-receber-email");
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const cfg = JSON.parse(raw);
    if (cfg.modoEscuro) {
      cfgModoEscuro.checked = true;
      document.body.classList.add("dark-theme");
    }
    if (cfg.altoContraste) {
      cfgAltoContraste.checked = true;
      document.body.classList.add("high-contrast");
    }
    if (cfg.textoMaior) {
      cfgTextoMaior.checked = true;
      document.body.classList.add("large-text");
    }
    if (cfg.reduzirAnim) {
      cfgReduzirAnim.checked = true;
      document.body.classList.add("no-animations");
    }
    if (cfg.leituraFacil) {
      cfgLeituraFacil.checked = true;
      document.body.classList.add("readable-text");
    }
    if (cfg.destacarFoco) {
      cfgDestacarFoco.checked = true;
      document.body.classList.add("highlight-focus");
    }
    if (typeof cfg.reservaConf === "boolean") {
      cfgReservaConf.checked = cfg.reservaConf;
    }
    if (typeof cfg.reservaAlt === "boolean") {
      cfgReservaAlt.checked = cfg.reservaAlt;
    }
    if (typeof cfg.receberEmail === "boolean") {
      cfgReceberEmail.checked = cfg.receberEmail;
    }
  } catch (e) {}
}
function saveCurrentSettings() {
  const cfg = {
    modoEscuro: cfgModoEscuro ? cfgModoEscuro.checked : false,
    altoContraste: cfgAltoContraste ? cfgAltoContraste.checked : false,
    textoMaior: cfgTextoMaior ? cfgTextoMaior.checked : false,
    reduzirAnim: cfgReduzirAnim ? cfgReduzirAnim.checked : false,
    leituraFacil: cfgLeituraFacil ? cfgLeituraFacil.checked : false,
    destacarFoco: cfgDestacarFoco ? cfgDestacarFoco.checked : false,
    reservaConf: cfgReservaConf ? cfgReservaConf.checked : true,
    reservaAlt: cfgReservaAlt ? cfgReservaAlt.checked : true,
    receberEmail: cfgReceberEmail ? cfgReceberEmail.checked : false
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(cfg));
}
if (cfgModoEscuro) {
  cfgModoEscuro.addEventListener("change", () => {
    document.body.classList.toggle("dark-theme", cfgModoEscuro.checked);
    saveCurrentSettings();
  });
}
if (cfgAltoContraste) {
  cfgAltoContraste.addEventListener("change", () => {
    document.body.classList.toggle("high-contrast", cfgAltoContraste.checked);
    saveCurrentSettings();
  });
}
if (cfgTextoMaior) {
  cfgTextoMaior.addEventListener("change", () => {
    document.body.classList.toggle("large-text", cfgTextoMaior.checked);
    saveCurrentSettings();
  });
}
if (cfgReduzirAnim) {
  cfgReduzirAnim.addEventListener("change", () => {
    document.body.classList.toggle("no-animations", cfgReduzirAnim.checked);
    saveCurrentSettings();
  });
}
if (cfgLeituraFacil) {
  cfgLeituraFacil.addEventListener("change", () => {
    document.body.classList.toggle("readable-text", cfgLeituraFacil.checked);
    saveCurrentSettings();
  });
}
if (cfgDestacarFoco) {
  cfgDestacarFoco.addEventListener("change", () => {
    document.body.classList.toggle("highlight-focus", cfgDestacarFoco.checked);
    saveCurrentSettings();
  });
}
if (cfgReservaConf) cfgReservaConf.addEventListener("change", saveCurrentSettings);
if (cfgReservaAlt) cfgReservaAlt.addEventListener("change", saveCurrentSettings);
if (cfgReceberEmail) cfgReceberEmail.addEventListener("change", saveCurrentSettings);
const btnSaveProfile = document.getElementById("btn-save-profile");
const profileStatusEl = document.getElementById("profile-save-status");
const inputCfgName = document.getElementById("cfg-user-name");
const inputCfgRole = document.getElementById("cfg-user-role");
function handleProfileSaveAction() {
  const nameVal = inputCfgName ? inputCfgName.value.trim() : "";
  const roleVal = inputCfgRole ? inputCfgRole.value.trim() : "";
  const newName = nameVal || "Docente ETEC";
  const newRole = roleVal || "Docente CPS";
  saveUserProfile({ name: newName, role: newRole });
  if (profileStatusEl) {
    profileStatusEl.textContent = "Perfil atualizado!";
    setTimeout(() => {
      profileStatusEl.textContent = "";
    }, 2500);
  }
  updateUI();
}
if (btnSaveProfile) {
  btnSaveProfile.addEventListener("click", handleProfileSaveAction);
}
if (inputCfgName) {
  inputCfgName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleProfileSaveAction();
    }
  });
  inputCfgName.addEventListener("change", handleProfileSaveAction);
}
if (inputCfgRole) {
  inputCfgRole.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleProfileSaveAction();
    }
  });
  inputCfgRole.addEventListener("change", handleProfileSaveAction);
}
const modalDetalhes = document.getElementById("modal-detalhes-reserva");
const btnCloseDetalhes = document.getElementById("btn-close-detalhes");
const btnFecharDetalhes = document.getElementById("btn-fechar-detalhes");
const btnCancelarReservaDetalhes = document.getElementById("btn-cancelar-reserva-detalhes");
function openReservationDetails(id) {
  const list = getReservations();
  const res = list.find((r) => r.id === id);
  if (!res) return;
  const profile = getUserProfile();
  const isOwner = isOwnReservation(res, profile);
  const espacoEl = document.getElementById("detalhes-espaco");
  if (espacoEl) {
    espacoEl.textContent = res.space;
    espacoEl.className = `tag-space ${res.space === "Sala Maker" ? "tag-maker" : "tag-biblio"}`;
  }
  const horarioEl = document.getElementById("detalhes-horario");
  if (horarioEl) horarioEl.textContent = `${res.slotLabel} · ${res.slotTime}`;
  const authorNameDisplay = getAuthorDisplayName(res);
  const nomeDocenteEl = document.getElementById("detalhes-nome-docente");
  if (nomeDocenteEl) nomeDocenteEl.textContent = authorNameDisplay;
  const cargoDocenteEl = document.getElementById("detalhes-cargo-docente");
  if (cargoDocenteEl) cargoDocenteEl.textContent = res.authorRole || "Docente CPS";
  const avatarEl = document.getElementById("detalhes-avatar");
  if (avatarEl) avatarEl.textContent = getInitials(authorNameDisplay);
  const atividadeEl = document.getElementById("detalhes-atividade");
  if (atividadeEl) atividadeEl.textContent = res.description || "Atividade de aula";
  const ownerPill = document.getElementById("detalhes-owner-pill");
  if (ownerPill) {
    ownerPill.style.display = isOwner ? "inline-block" : "none";
  }
  if (btnCancelarReservaDetalhes) {
    btnCancelarReservaDetalhes.style.display = isOwner ? "inline-block" : "none";
    btnCancelarReservaDetalhes.onclick = () => {
      if (confirm("Deseja realmente cancelar esta reserva?")) {
        cancelReservation(res.id);
        closeReservationDetails();
      }
    };
  }
  if (modalDetalhes) modalDetalhes.classList.add("active");
}
function closeReservationDetails() {
  if (modalDetalhes) modalDetalhes.classList.remove("active");
}
if (btnCloseDetalhes) btnCloseDetalhes.addEventListener("click", closeReservationDetails);
if (btnFecharDetalhes) btnFecharDetalhes.addEventListener("click", closeReservationDetails);
if (modalDetalhes) {
  modalDetalhes.addEventListener("click", (e) => {
    if (e.target === modalDetalhes) closeReservationDetails();
  });
}
const TOUR_STEPS = [
  {
    target: ".nav-menu",
    title: "Menu de Navegação",
    description: "Alterne com um clique entre o Início (resumo de hoje), Agenda semanal completa das salas, Minhas aulas e Configurações."
  },
  {
    target: "#btn-open-modal",
    title: "Agendar Espaço",
    description: "Clique aqui para reservar uma aula na Sala Maker ou na Biblioteca. Escolha a data, o período e confirme rapidamente."
  },
  {
    target: ".panel-box",
    title: "Quadro de Horários",
    description: "Consulte a disponibilidade de cada aula. Clique em 'Reservar' em horários livres ou toque em um horário reservado para ver quem é o docente responsável."
  },
  {
    target: ".notices-panel",
    title: "Mural de Avisos",
    description: "Receba notificações em tempo real sobre confirmações, cancelamentos e avisos de manutenção das salas."
  }
];
let currentTourStep = 0;
const tourBackdrop = document.getElementById("tour-backdrop");
const tourCard = document.getElementById("tour-card");
const tourStepBadge = document.getElementById("tour-step-badge");
const tourTitle = document.getElementById("tour-title");
const tourDescription = document.getElementById("tour-description");
const tourSpotlight = document.getElementById("tour-spotlight");
const btnPrevTour = document.getElementById("btn-prev-tour");
const btnNextTour = document.getElementById("btn-next-tour");
const btnSkipTour = document.getElementById("btn-skip-tour");
function startTour(step = 0) {
  if (activeView !== "inicio") {
    switchView("inicio");
  }
  currentTourStep = step;
  if (tourBackdrop) tourBackdrop.style.display = "block";
  renderTourStep(currentTourStep);
}
function closeTour() {
  if (tourBackdrop) tourBackdrop.style.display = "none";
  if (tourSpotlight) tourSpotlight.style.display = "none";
  localStorage.setItem(TOUR_STORAGE_KEY, "true");
}
function renderTourStep(index) {
  const step = TOUR_STEPS[index];
  if (!step) {
    closeTour();
    return;
  }
  const el = document.querySelector(step.target);
  if (el && tourCard) {
    const rect = el.getBoundingClientRect();
    const pad = 6;
    if (tourSpotlight) {
      tourSpotlight.style.display = "block";
      tourSpotlight.style.top = `${Math.max(0, rect.top - pad)}px`;
      tourSpotlight.style.left = `${Math.max(0, rect.left - pad)}px`;
      tourSpotlight.style.width = `${rect.width + pad * 2}px`;
      tourSpotlight.style.height = `${rect.height + pad * 2}px`;
    }
    const cardWidth = 380;
    const cardHeight = 220;
    let top = 100;
    let left = 100;
    if (index === 0) {
      top = Math.max(20, rect.top);
      left = rect.right + 24;
    } else if (index === 1) {
      top = rect.bottom + 16;
      left = Math.max(20, rect.right - cardWidth);
    } else if (index === 2) {
      if (rect.right + cardWidth + 24 <= window.innerWidth) {
        top = Math.max(20, rect.top);
        left = rect.right + 20;
      } else {
        top = Math.max(20, window.innerHeight - cardHeight - 24);
        left = Math.max(20, window.innerWidth - cardWidth - 24);
      }
    } else if (index === 3) {
      top = Math.max(20, rect.top);
      left = Math.max(20, rect.left - cardWidth - 24);
    } else {
      top = rect.bottom + 16;
      left = rect.left;
    }
    if (left + cardWidth > window.innerWidth - 16) {
      left = window.innerWidth - cardWidth - 16;
    }
    if (left < 16) left = 16;
    if (top + cardHeight > window.innerHeight - 16) {
      top = window.innerHeight - cardHeight - 16;
    }
    if (top < 16) top = 16;
    tourCard.style.top = `${top}px`;
    tourCard.style.left = `${left}px`;
    tourCard.style.transform = "none";
  } else if (tourCard) {
    if (tourSpotlight) tourSpotlight.style.display = "none";
    tourCard.style.top = "50%";
    tourCard.style.left = "50%";
    tourCard.style.transform = "translate(-50%, -50%)";
  }
  if (tourStepBadge) tourStepBadge.textContent = `Passo ${index + 1} de ${TOUR_STEPS.length}`;
  if (tourTitle) tourTitle.textContent = step.title;
  if (tourDescription) tourDescription.textContent = step.description;
  if (btnPrevTour) btnPrevTour.style.visibility = index === 0 ? "hidden" : "visible";
  if (btnNextTour) btnNextTour.textContent = index === TOUR_STEPS.length - 1 ? "Concluir" : "Próximo";
}
if (btnPrevTour) {
  btnPrevTour.addEventListener("click", () => {
    if (currentTourStep > 0) {
      currentTourStep--;
      renderTourStep(currentTourStep);
    }
  });
}
if (btnNextTour) {
  btnNextTour.addEventListener("click", () => {
    if (currentTourStep < TOUR_STEPS.length - 1) {
      currentTourStep++;
      renderTourStep(currentTourStep);
    } else {
      closeTour();
    }
  });
}
if (btnSkipTour) {
  btnSkipTour.addEventListener("click", closeTour);
}
const btnRestartTour = document.getElementById("btn-restart-tour");
if (btnRestartTour) {
  btnRestartTour.addEventListener("click", () => {
    startTour(0);
  });
}
function updateUI() {
  updateSchoolUI();
  const profile = getUserProfile();
  const myCount = getReservations().filter((r) => isOwnReservation(r, profile)).length;
  if (navCounter) {
    navCounter.textContent = myCount;
  }
  if (activeView === "inicio") renderInicio();
  else if (activeView === "agenda") renderAgenda();
  else if (activeView === "minhas-aulas") renderMyClasses();
}
const SUPABASE_APP_URL = "https://azxxweoulvsqvlyfmgtq.supabase.co";
const SUPABASE_APP_KEY = "sb_publishable_n85S7m9uS_TThMm9zo63jA_fHAgpjLP";
let appSupabaseClient = null;
function getAppSupabase() {
  if (!appSupabaseClient && window.supabase && SUPABASE_APP_URL && SUPABASE_APP_KEY) {
    appSupabaseClient = window.supabase.createClient(SUPABASE_APP_URL, SUPABASE_APP_KEY);
  }
  return appSupabaseClient;
}
async function initAuthAndLogout() {
  const client = getAppSupabase();
  const currentProfile = getUserProfile();
  const isExplicit = currentProfile && (currentProfile.userId === "user_dimitri" || currentProfile.userId === "user_anacarol");
  if (client && !isExplicit) {
    try {
      const { data: { session } } = await client.auth.getSession();
      if (session && session.user && session.user.email) {
        const email = session.user.email;
        const lower = email.toLowerCase();
        let formattedName = "";
        let role = "Docente CPS";
        let userId = undefined;
        const meta = session.user.user_metadata || {};
        if (meta.name) formattedName = meta.name;
        if (meta.role) role = meta.role;
        if (!formattedName && currentProfile && currentProfile.name && currentProfile.email === email) {
          formattedName = currentProfile.name;
          role = currentProfile.role || role;
        }
        if (lower === "dguerrask@gmail.com") {
          formattedName = formattedName || "Dimitri";
          userId = "user_dimitri";
        } else if (lower.includes("anacarol") || lower.includes("ana.carol")) {
          formattedName = formattedName || "Ana Carol";
          userId = "user_anacarol";
        } else {
          if (!formattedName) {
            const namePart = email.split("@")[0].replace(/\./g, " ");
            formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
          }
          if (!role) {
            role = lower.includes("aluno") ? "Aluno CPS" : "Docente CPS";
          }
        }
        saveUserProfile({
          name: formattedName,
          role: role,
          email: email,
          userId: userId
        });
      }
    } catch (e) {
      console.warn("Erro ao buscar sessão no app:", e);
    }
  }
  document.querySelectorAll(".logout-link").forEach((logoutLink) => {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "escolas.html";
    });
  });
  const mobileAvatarEl = document.getElementById("mobile-user-avatar");
  if (mobileAvatarEl) {
    mobileAvatarEl.addEventListener("click", () => {
      switchView("configuracoes");
    });
  }
}
async function syncReservationsFromServer(force = false) {
  const supa = getAppSupabase();
  if (supa) {
    try {
      const { data: supaRows } = await supa.from("agendamentos").select("*");
      if (Array.isArray(supaRows) && supaRows.length > 0) {
        const supaList = supaRows.map((row) => ({
          id: row.id,
          schoolId: row.school_id || "furlan",
          space: row.space,
          day: row.day,
          date: row.date,
          period: row.period,
          slotIndex: Number(row.slot_index),
          slotLabel: row.slot_label,
          slotTime: row.slot_time,
          description: row.description || "",
          grade: row.grade || "Turma ETEC",
          authorName: row.author_name,
          authorRole: row.author_role || "Docente CPS",
          authorId: row.author_id,
          isRecurrent: Boolean(row.is_recurrent),
          createdAt: row.created_at
        }));
        const currentLocal = getAllReservationsRaw();
        const map = new Map();
        supaList.forEach((r) => map.set(r.id, r));
        currentLocal.forEach((r) => {
          if (!map.has(r.id)) map.set(r.id, r);
        });
        const mergedList = Array.from(map.values());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedList));
        updateUI();
      }
    } catch (e) {}
  }
  try {
    const res = await fetch("/api/reservations", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const serverList = data.allReservations || data.reservations;
    if (data && Array.isArray(serverList)) {
      const serverTime = data.lastUpdated || 0;
      const currentLocalAll = getAllReservationsRaw();
      if (force || serverTime > localReservationsLastUpdated || (currentLocalAll.length === 0 && serverList.length > 0)) {
        localReservationsLastUpdated = serverTime;
        const map = new Map();
        serverList.forEach((r) => map.set(r.id, r));
        currentLocalAll.forEach((r) => {
          if (!map.has(r.id)) {
            map.set(r.id, r);
          }
        });
        const mergedList = Array.from(map.values());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedList));
        const profile = getUserProfile();
        updateReservationsAuthor(profile);
        updateUI();
        if (modal && modal.classList.contains("active")) {
          renderModalSlots();
        }
        if (mergedList.length > serverList.length) {
          fetch("/api/reservations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reservations: mergedList })
          }).catch(() => {});
        }
      } else if (currentLocalAll.length > 0 && serverList.length === 0) {
        fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reservations: currentLocalAll })
        }).catch(() => {});
      }
    }
  } catch (e) {}
}
if (syncChannel) {
  syncChannel.onmessage = (event) => {
    if (event.data && event.data.type === "RESERVATIONS_UPDATED") {
      updateUI();
      if (modal && modal.classList.contains("active")) {
        renderModalSlots();
      }
    }
  };
}
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY || e.key === "etec_reservas_dados") {
    updateUI();
    if (modal && modal.classList.contains("active")) {
      renderModalSlots();
    }
  }
});
setInterval(() => {
  syncReservationsFromServer(false);
}, 1500);
syncReservationsFromServer(true);
loadSettings();
applyUserProfile();
initAuthAndLogout();
updateSchoolUI();
updateReservationsAuthor(getUserProfile(), "Dimitri");
updateUI();
switchView("inicio");
let lastCheckedDate = new Date().toDateString();
function handleDateTransition() {
  lastCheckedDate = new Date().toDateString();
  const ctx = getTodayContext();
  agendaDay = ctx.schoolDayKey;
  agendaDailyDay = ctx.schoolDayKey;
  currentCalendarDate = new Date();
  updateUI();
}
function scheduleMidnightUpdate() {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
  const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime());
  setTimeout(() => {
    handleDateTransition();
    scheduleMidnightUpdate();
  }, msUntilMidnight);
}
setInterval(() => {
  const currentDateStr = new Date().toDateString();
  if (currentDateStr !== lastCheckedDate) {
    handleDateTransition();
  }
}, 30000);
scheduleMidnightUpdate();
if (!localStorage.getItem(TOUR_STORAGE_KEY)) {
  setTimeout(() => {
    startTour(0);
  }, 700);
}
