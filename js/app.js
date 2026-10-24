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

function getReservations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveReservations(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
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
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { name: "Prof. Marcelo", role: "Docente CPS" };
}

function saveUserProfile(profile) {
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  applyUserProfile(profile);
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
}

let activeView = "inicio";
let inicioPeriod = "manha";
let agendaPeriod = "manha";
let agendaDay = "seg";

let modalSpace = "Sala Maker";
let modalPeriod = "manha";
let modalSelectedSlotIndex = 0;
let modalDay = "seg";

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

function switchView(viewName) {
  activeView = viewName;

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("data-view") === viewName);
  });

  document.querySelectorAll(".view-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `view-${viewName}`);
  });

  const total = getReservations().length;

  if (viewName === "inicio") {
    pageTitle.textContent = "Painel de Agendamentos";
    pageSubtitle.textContent = "11 de setembro, 2026";
    renderInicio();
  } else if (viewName === "agenda") {
    pageTitle.textContent = "Agenda";
    pageSubtitle.textContent = "Semana de 14 a 18 de setembro";
    renderAgenda();
  } else if (viewName === "minhas-aulas") {
    pageTitle.textContent = "Minhas aulas";
    pageSubtitle.textContent = `${total} ${total === 1 ? "reserva" : "reservas"}`;
    renderMyClasses();
  } else if (viewName === "configuracoes") {
    pageTitle.textContent = "Configurações";
    pageSubtitle.textContent = "Prévia • alterações salvas localmente";
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
  modalDay = prefill.day || "seg";
  modalSelectedSlotIndex = typeof prefill.slotIndex === "number" ? prefill.slotIndex : 0;

  document.querySelectorAll(".space-option").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-space") === modalSpace);
  });

  document.querySelectorAll(".period-choice").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-period") === modalPeriod);
  });

  modalDesc.value = "";
  charCounter.textContent = "0";
  recurrenceToggle.checked = false;
  recurrenceOptions.style.display = "none";

  renderModalSlots();
  modal.classList.add("active");
}

function closeModal() {
  modal.classList.remove("active");
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
});

modalDatePicker.addEventListener("change", () => {
  if (modalDatePicker.value) {
    const parts = modalDatePicker.value.split("-");
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const formatted = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    modalDateDisplay.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
});

function renderModalSlots() {
  const periodLabel = modalPeriod.charAt(0).toUpperCase() + modalPeriod.slice(1);
  slotsHeading.textContent = `Aulas disponíveis – ${periodLabel}`;

  const slots = SCHEDULES[modalPeriod] || [];
  const reservations = getReservations();
  modalSlotsList.innerHTML = "";

  slots.forEach((slot, index) => {
    if (index === 3) {
      const divider = document.createElement("div");
      divider.className = "interval-divider";
      divider.textContent = INTERVALS[modalPeriod];
      modalSlotsList.appendChild(divider);
    }

    const isReserved = reservations.some(
      (r) => r.space === modalSpace && r.day === modalDay && r.period === modalPeriod && r.slotIndex === index
    );

    const isSelected = modalSelectedSlotIndex === index && !isReserved;

    const slotCard = document.createElement("div");
    slotCard.className = `slot-card ${isReserved ? "reserved" : ""} ${isSelected ? "selected" : ""}`;

    let statusHtml = "";
    if (isReserved) {
      statusHtml = `
        <span class="dot-indicator dot-grey"></span>
        <span>Reservada</span>
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

    if (!isReserved) {
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
  const conflict = reservations.some(
    (r) => r.space === modalSpace && r.day === modalDay && r.period === modalPeriod && r.slotIndex === modalSelectedSlotIndex
  );

  if (conflict) {
    alert("Este horário já foi reservado. Escolha outra aula.");
    return;
  }

  const isRecurrent = recurrenceToggle.checked;
  const profile = getUserProfile();
  const newReservation = {
    id: "res_" + Date.now(),
    space: modalSpace,
    day: modalDay,
    period: modalPeriod,
    slotIndex: modalSelectedSlotIndex,
    slotLabel: selectedSlot.label,
    slotTime: selectedSlot.time,
    description: modalDesc.value.trim() || (modalSpace === "Sala Maker" ? "Atividade Prática Maker" : "Pesquisa na Biblioteca"),
    grade: "Turma ETEC",
    authorName: profile.name,
    authorRole: profile.role,
    isRecurrent: isRecurrent,
    createdAt: new Date().toISOString()
  };

  reservations.push(newReservation);
  saveReservations(reservations);

  const notices = getNotices();
  notices.unshift({
    title: "Reserva confirmada",
    desc: `${modalSpace} · ${selectedSlot.label} (${selectedSlot.time}) por ${profile.name}`,
    time: "Agora"
  });
  saveNotices(notices);

  closeModal();
  updateUI();
  alert("Reserva confirmada com sucesso!");
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
    renderAgenda();
  });
});

document.querySelectorAll(".week-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".week-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    agendaDay = btn.getAttribute("data-day");
    const dayLabel = btn.querySelector(".day-abbr").textContent;
    const dateLabel = btn.querySelector(".day-date").textContent;
    document.getElementById("agenda-current-day-label").textContent = `${dayLabel}, ${dateLabel}`;
    renderAgenda();
  });
});

function renderInicio() {
  const tableBody = document.getElementById("today-schedule-body");
  const slots = SCHEDULES[inicioPeriod] || [];
  const reservations = getReservations();

  tableBody.innerHTML = "";

  slots.forEach((slot, index) => {
    const makerRes = reservations.find((r) => r.space === "Sala Maker" && r.period === inicioPeriod && r.slotIndex === index);
    const biblioRes = reservations.find((r) => r.space === "Biblioteca" && r.period === inicioPeriod && r.slotIndex === index);

    const activeRes = makerRes || biblioRes;
    const spaceText = activeRes ? activeRes.space : "Disponível";

    const tr = document.createElement("tr");
    if (activeRes) {
      tr.classList.add("row-confirmed");
    }

    let statusColHtml = "";
    if (activeRes) {
      statusColHtml = `
        <button type="button" class="status-badge status-confirmed status-clickable btn-detalhes-slot" data-id="${activeRes.id}" title="Clique para ver quem agendou">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>${activeRes.authorName || "Confirmada"}</span>
        </button>
      `;
    } else {
      statusColHtml = `
        <button type="button" class="btn-reserve-slot" data-index="${index}" data-period="${inicioPeriod}">
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
        <span class="space-label">${spaceText}</span>
      </td>
      <td class="align-right">
        ${statusColHtml}
      </td>
    `;

    const resBtn = tr.querySelector(".btn-reserve-slot");
    if (resBtn) {
      resBtn.addEventListener("click", () => {
        openModal({ period: inicioPeriod, slotIndex: index });
      });
    }

    const detBtn = tr.querySelector(".btn-detalhes-slot");
    if (detBtn) {
      detBtn.addEventListener("click", () => {
        openReservationDetails(activeRes.id);
      });
    }

    tableBody.appendChild(tr);
  });

  const cardsContainer = document.getElementById("today-reservations-container");
  cardsContainer.innerHTML = "";

  const myReservations = reservations.slice(0, 4);

  if (myReservations.length === 0) {
    cardsContainer.innerHTML = `
      <div class="empty-state-card">
        Você não possui nenhuma reserva agendada ainda.<br>
        Clique em <strong>+ Agendar espaço</strong> para criar seu primeiro horário.
      </div>
    `;
  } else {
    myReservations.forEach((res) => {
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
  const tableBody = document.getElementById("agenda-schedule-body");
  const slots = SCHEDULES[agendaPeriod] || [];
  const reservations = getReservations();
  const profile = getUserProfile();

  tableBody.innerHTML = "";

  slots.forEach((slot, index) => {
    const makerRes = reservations.find((r) => r.space === "Sala Maker" && r.day === agendaDay && r.period === agendaPeriod && r.slotIndex === index);
    const biblioRes = reservations.find((r) => r.space === "Biblioteca" && r.day === agendaDay && r.period === agendaPeriod && r.slotIndex === index);

    const tr = document.createElement("tr");
    if (makerRes || biblioRes) {
      tr.classList.add("row-confirmed");
    }

    function renderCell(res, spaceName) {
      if (res) {
        const isSelf = res.authorName === profile.name;
        const label = isSelf ? "Sua reserva" : (res.authorName || "Reservada");
        return `
          <button type="button" class="status-badge status-confirmed status-clickable btn-detalhes-slot" data-id="${res.id}" title="Clique para ver quem agendou">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>${label}</span>
          </button>
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
        ${renderCell(makerRes, "Sala Maker")}
      </td>
      <td>
        ${renderCell(biblioRes, "Biblioteca")}
      </td>
    `;

    tr.querySelectorAll(".btn-reserve-agenda").forEach((btn) => {
      btn.addEventListener("click", () => {
        const space = btn.getAttribute("data-space");
        openModal({ space: space, day: agendaDay, period: agendaPeriod, slotIndex: index });
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

function renderMyClasses() {
  const container = document.getElementById("my-classes-cards-container");
  const recurringContainer = document.getElementById("recurring-routines-container");
  const reservations = getReservations();

  container.innerHTML = "";
  recurringContainer.innerHTML = "";

  if (reservations.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card">
        Você não possui nenhuma reserva cadastrada.<br>
        Clique em <strong>+ Agendar espaço</strong> acima para realizar sua primeira reserva.
      </div>
    `;
  } else {
    reservations.forEach((res) => {
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

  const recurrentOnes = reservations.filter((r) => r.isRecurrent);
  if (recurrentOnes.length === 0) {
    recurringContainer.innerHTML = `
      <div style="text-align: center; color: #7a748c; padding: 20px; font-size: 12.5px;">
        Nenhuma rotina semanal cadastrada. Ao agendar, marque a opção "Repetir semanalmente".
      </div>
    `;
  } else {
    recurrentOnes.forEach((r) => {
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
          <span class="recurring-desc">Semanal · ${r.slotLabel} (${r.slotTime})</span>
        </div>
      `;
      recurringContainer.appendChild(item);
    });
  }
}

function cancelReservation(id) {
  let list = getReservations();
  list = list.filter((r) => r.id !== id);
  saveReservations(list);

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

if (btnSaveProfile) {
  btnSaveProfile.addEventListener("click", () => {
    const nameInput = document.getElementById("cfg-user-name");
    const roleInput = document.getElementById("cfg-user-role");

    const newName = nameInput.value.trim() || "Prof. Marcelo";
    const newRole = roleInput.value.trim() || "Docente CPS";

    saveUserProfile({ name: newName, role: newRole });

    if (profileStatusEl) {
      profileStatusEl.textContent = "Perfil atualizado!";
      setTimeout(() => {
        profileStatusEl.textContent = "";
      }, 2500);
    }

    updateUI();
  });
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
  const isOwner = res.authorName === profile.name;

  const espacoEl = document.getElementById("detalhes-espaco");
  if (espacoEl) {
    espacoEl.textContent = res.space;
    espacoEl.className = `tag-space ${res.space === "Sala Maker" ? "tag-maker" : "tag-biblio"}`;
  }

  const horarioEl = document.getElementById("detalhes-horario");
  if (horarioEl) horarioEl.textContent = `${res.slotLabel} · ${res.slotTime}`;

  const nomeDocenteEl = document.getElementById("detalhes-nome-docente");
  if (nomeDocenteEl) nomeDocenteEl.textContent = res.authorName || "Docente ETEC";

  const cargoDocenteEl = document.getElementById("detalhes-cargo-docente");
  if (cargoDocenteEl) cargoDocenteEl.textContent = res.authorRole || "Docente CPS";

  const avatarEl = document.getElementById("detalhes-avatar");
  if (avatarEl) avatarEl.textContent = getInitials(res.authorName || "DE");

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
  const count = getReservations().length;
  navCounter.textContent = count;

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
  if (client) {
    try {
      const { data: { session } } = await client.auth.getSession();
      if (session && session.user && session.user.email) {
        const email = session.user.email;
        const namePart = email.split("@")[0].replace(/\./g, " ");
        const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        const role = email.toLowerCase().includes("aluno") ? "Aluno CPS" : "Docente CPS";
        saveUserProfile({
          name: formattedName,
          role: role,
          email: email
        });
      }
    } catch (e) {
      console.warn("Erro ao buscar sessão no app:", e);
    }
  }

  document.querySelectorAll(".logout-link").forEach((logoutLink) => {
    logoutLink.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        localStorage.removeItem("etec_usuario_perfil");
      } catch (err) {}
      if (client) {
        try {
          await client.auth.signOut();
        } catch (err) {
          console.warn("Erro ao deslogar do Supabase:", err);
        }
      }
      window.location.href = "index.html";
    });
  });

  const mobileAvatarEl = document.getElementById("mobile-user-avatar");
  if (mobileAvatarEl) {
    mobileAvatarEl.addEventListener("click", () => {
      switchView("configuracoes");
    });
  }
}

loadSettings();
applyUserProfile();
initAuthAndLogout();
updateUI();
switchView("inicio");

if (!localStorage.getItem(TOUR_STORAGE_KEY)) {
  setTimeout(() => {
    startTour(0);
  }, 700);
}
