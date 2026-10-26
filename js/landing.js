// ==========================================================================
// ALOCA. - Landing Page Interactive Script
// Gerenciamento de abas e interatividade do console e da tabela
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {

  // ------------------------------------------------------------------------
  // 1. Dados e Interatividade do Hero Console
  // ------------------------------------------------------------------------
  const heroRoomsData = {
    manha: [
      {
        emoji: '📚',
        name: 'Biblioteca Central',
        time: '07h10 - 08h50 • Profª. Ana Carol',
        statusText: '✓ Confirmado',
        statusClass: 'pill-confirmed'
      },
      {
        emoji: '🔬',
        name: 'Laboratório de Robótica',
        time: '09h10 - 10h40 • Prof. Marcelo Santos',
        statusText: '✓ Confirmado',
        statusClass: 'pill-confirmed'
      },
      {
        emoji: '🛠️',
        name: 'Espaço Maker & 3D',
        time: '10h50 - 12h20 • Livre para agendar',
        statusText: '+ Disponível',
        statusClass: 'pill-available'
      }
    ],
    tarde: [
      {
        emoji: '🔬',
        name: 'Laboratório de Química',
        time: '13h10 - 14h50 • Prof. Rodrigo Gomes',
        statusText: '✓ Confirmado',
        statusClass: 'pill-confirmed'
      },
      {
        emoji: '🛠️',
        name: 'Espaço Maker & Prototipagem',
        time: '14h00 - 15h30 • Profª. Fernanda Lima',
        statusText: '✓ Confirmado',
        statusClass: 'pill-confirmed'
      },
      {
        emoji: '📚',
        name: 'Biblioteca Central',
        time: '15h40 - 17h10 • Livre para agendar',
        statusText: '+ Disponível',
        statusClass: 'pill-available'
      }
    ],
    noite: [
      {
        emoji: '💻',
        name: 'Laboratório de Informática 01',
        time: '19h00 - 20h40 • Profª. Camila Alves',
        statusText: '✓ Confirmado',
        statusClass: 'pill-confirmed'
      },
      {
        emoji: '🔬',
        name: 'Laboratório de Física & Redes',
        time: '19h00 - 20h40 • Prof. Dimitri',
        statusText: '✓ Confirmado',
        statusClass: 'pill-confirmed'
      },
      {
        emoji: '🛠️',
        name: 'Espaço Maker & Robótica',
        time: '20h50 - 22h30 • Livre para agendar',
        statusText: '+ Disponível',
        statusClass: 'pill-available'
      }
    ]
  };

  const heroPeriodBtns = document.querySelectorAll('.hero-brutalist-card .period-pill-btn, .hero-console-card .period-pill-btn');
  const heroRoomsContainer = document.getElementById('hero-rooms-list');

  function renderHeroRooms(period) {
    if (!heroRoomsContainer) return;
    const rooms = heroRoomsData[period] || heroRoomsData.manha;
    
    heroRoomsContainer.innerHTML = rooms.map(room => `
      <div class="brutalist-room-row">
        <div class="room-left-group">
          <span class="room-icon-box">${room.emoji}</span>
          <div class="room-meta-info">
            <span class="room-title-text">${room.name}</span>
            <span class="room-details-text">${room.time}</span>
          </div>
        </div>
        <span class="room-status-pill ${room.statusClass}">${room.statusText}</span>
      </div>
    `).join('');
  }

  heroPeriodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      heroPeriodBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const period = btn.getAttribute('data-period');
      renderHeroRooms(period);
    });
  });

  // Render inicial
  renderHeroRooms('manha');

  // ------------------------------------------------------------------------
  // 2. Interatividade da Tabela da Seção 2 (O dia da escola)
  // ------------------------------------------------------------------------
  const tableData = {
    manha: [
      {
        lesson: '1ª aula',
        time: '07h10 - 08h00',
        room: 'Biblioteca',
        status: '✓ Confirmado',
        statusClass: 'badge-confirmed'
      },
      {
        lesson: '2ª aula',
        time: '08h00 - 08h50',
        room: 'Sala maker',
        status: 'Disponível',
        statusClass: 'badge-free'
      },
      {
        lesson: '3ª aula',
        time: '08h50 - 09h40',
        room: 'Laboratório',
        status: '✓ Confirmado',
        statusClass: 'badge-confirmed'
      }
    ],
    tarde: [
      {
        lesson: '1ª aula',
        time: '13h10 - 14h00',
        room: 'Laboratório',
        status: '✓ Confirmado',
        statusClass: 'badge-confirmed'
      },
      {
        lesson: '2ª aula',
        time: '14h00 - 14h50',
        room: 'Biblioteca',
        status: '✓ Confirmado',
        statusClass: 'badge-confirmed'
      },
      {
        lesson: '3ª aula',
        time: '14h50 - 15h40',
        room: 'Sala maker',
        status: 'Disponível',
        statusClass: 'badge-free'
      }
    ],
    noite: [
      {
        lesson: '1ª aula',
        time: '19h00 - 19h50',
        room: 'Sala maker',
        status: '✓ Confirmado',
        statusClass: 'badge-confirmed'
      },
      {
        lesson: '2ª aula',
        time: '19h50 - 20h40',
        room: 'Laboratório',
        status: '✓ Confirmado',
        statusClass: 'badge-confirmed'
      },
      {
        lesson: '3ª aula',
        time: '20h50 - 21h40',
        room: 'Biblioteca',
        status: 'Disponível',
        statusClass: 'badge-free'
      }
    ]
  };

  const dashTabBtns = document.querySelectorAll('.dash-tabs-bar .dash-tab-pill');
  const dashTableBody = document.getElementById('dash-table-body');

  function renderDashTable(period) {
    if (!dashTableBody) return;
    const rows = tableData[period] || tableData.manha;
    
    dashTableBody.innerHTML = rows.map(r => `
      <tr>
        <td>
          <div class="class-period-col">
            <span class="class-title">${r.lesson}</span>
            <span class="class-time">${r.time}</span>
          </div>
        </td>
        <td>
          <span class="class-room-name">${r.room}</span>
        </td>
        <td>
          <span class="status-badge-cell ${r.statusClass}">${r.status}</span>
        </td>
      </tr>
    `).join('');
  }

  dashTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dashTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const period = btn.getAttribute('data-period');
      renderDashTable(period);
    });
  });

  // Render inicial da tabela
  renderDashTable('manha');

  // Efeito de rolagem suave ao clicar em "Explorar a demonstração"
  const ctaExplore = document.getElementById('btn-explore-demo');
  if (ctaExplore) {
    ctaExplore.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById('agenda-exemplo');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

});
