// ==========================================================================
// Página de Contratação SaaS - AgendaEscola
// Script de validação, máscara e integração oficial com WhatsApp
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contratacao-form');
  const phoneInput = document.getElementById('contact-phone');
  const submitBtn = document.getElementById('btn-submit-form');
  const heroCtaBtn = document.getElementById('btn-hero-cta');

  // Smooth scroll ao clicar no botão do plano básico
  if (heroCtaBtn) {
    heroCtaBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const formSection = document.getElementById('form-section');
      if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth' });
        const firstInput = document.getElementById('school-name');
        if (firstInput) {
          setTimeout(() => firstInput.focus(), 400);
        }
      }
    });
  }

  // Máscara dinâmica de telefone / WhatsApp brasileiro: (XX) XXXXX-XXXX
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length > 11) value = value.slice(0, 11);

      if (value.length > 10) {
        value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
      } else if (value.length > 6) {
        value = value.replace(/^(\d{2})(\d{4,5})(\d{0,4})$/, '($1) $2-$3');
      } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
      } else if (value.length > 0) {
        value = value.replace(/^(\d{0,2})$/, '($1');
      }
      e.target.value = value;
    });
  }

  // Envio do formulário com formatação estrita sem emojis
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const schoolName = (document.getElementById('school-name')?.value || '').trim();
      const contactName = (document.getElementById('contact-name')?.value || '').trim();
      const contactPhone = (document.getElementById('contact-phone')?.value || '').trim();
      const roomCount = (document.getElementById('room-count')?.value || '').trim();
      const classSchedules = (document.getElementById('class-schedules')?.value || '').trim();
      const notes = (document.getElementById('notes')?.value || '').trim();

      if (!schoolName || !contactName || !contactPhone || !roomCount || !classSchedules) {
        alert('Por favor, preencha todos os campos obrigatórios antes de prosseguir.');
        return;
      }

      // Validação básica de telefone (mínimo de dígitos)
      const digitsOnly = contactPhone.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        alert('Por favor, informe um número de WhatsApp válido com DDD.');
        phoneInput?.focus();
        return;
      }

      // Montagem da mensagem formatada:
      // REGRA OBRIGATÓRIA: Sem emojis, altamente organizada, separação limpa com títulos e listas.
      const formattedMessage = [
        'SOLICITACAO DE CONTRATACAO - SISTEMA DE AGENDAMENTOS',
        '',
        'DADOS DA INSTITUICAO',
        '- Nome da escola: ' + schoolName,
        '- Nome do responsavel: ' + contactName,
        '- WhatsApp de contato: ' + contactPhone,
        '',
        'ESTRUTURA E PLANO',
        '- Plano de interesse: Plano Basico (a partir de R$ 99/mes)',
        '- Quantidade de salas / espacos: ' + roomCount,
        '- Horarios das aulas / turnos: ' + classSchedules,
        '',
        'OBSERVACOES E NECESSIDADES ESPECIFICAS',
        notes ? '- ' + notes : '- Nenhuma observacao adicional informada.',
        '',
        '--------------------------------------------------',
        'Origem: Solicitacao direta via portal de contratacao.'
      ].join('\n');

      // Feedback visual no botão
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Redirecionando para o WhatsApp...</span>';
      }

      // Número de destino: (11) 98905-0689 -> 5511989050689
      const targetPhone = '5511989050689';
      const encodedText = encodeURIComponent(formattedMessage);
      const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodedText}`;

      // Salva no histórico local de contratações por segurança
      try {
        const lead = {
          schoolName,
          contactName,
          contactPhone,
          roomCount,
          classSchedules,
          notes,
          createdAt: new Date().toISOString()
        };
        const existing = JSON.parse(localStorage.getItem('saas_leads_contratacao') || '[]');
        existing.push(lead);
        localStorage.setItem('saas_leads_contratacao', JSON.stringify(existing));
      } catch (err) {
        console.warn('Falha ao registrar lead localmente:', err);
      }

      // Abre o WhatsApp
      setTimeout(() => {
        window.location.href = whatsappUrl;
        setTimeout(() => {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Solicitar contratação</span><span class="btn-arrow">→</span>';
          }
        }, 2000);
      }, 350);
    });
  }
});
