// Toggle de FAQ sem inline JS
function toggleFaq(element) {
  const answer = element.nextElementSibling;
  const toggle = element.querySelector('.faq-toggle');

  // Fecha outras FAQs abertas
  document.querySelectorAll('.faq-answer.active').forEach(item => {
    if (item !== answer) {
      item.classList.remove('active');
      const icon = item.previousElementSibling.querySelector('.faq-toggle');
      if (icon) icon.classList.remove('active');
    }
  });

  // Alterna a atual
  answer.classList.toggle('active');
  if (toggle) toggle.classList.toggle('active');
}

// Navegação dos botões de plano sem inline JS
function setupPlanButtons() {
  const buttons = document.querySelectorAll('.plan-button[data-plan]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.getAttribute('data-plan');
      window.location.href = `/login?plan=${encodeURIComponent(plan)}`;
    });
  });
}

// CTA principal sem inline JS
function setupCta() {
  const cta = document.getElementById('cta-start-trial');
  if (cta) {
    cta.addEventListener('click', () => {
      window.location.href = '/login';
    });
  }
}

// Inicialização geral da página
document.addEventListener('DOMContentLoaded', () => {
  // FAQ
  document.querySelectorAll('.faq-question').forEach(q => {
    q.addEventListener('click', () => toggleFaq(q));
  });

  // Botões de planos
  setupPlanButtons();

  // CTA
  setupCta();
});


// function toggleFaq(element) {
//             const answer = element.nextElementSibling;
//             const toggle = element.querySelector('.faq-toggle');

//             // Close other open FAQs
//             document.querySelectorAll('.faq-answer.active').forEach(item => {
//                 if (item !== answer) {
//                     item.classList.remove('active');
//                     item.previousElementSibling.querySelector('.faq-toggle').classList.remove('active');
//                 }
//             });

//             // Toggle current FAQ
//             answer.classList.toggle('active');
//             toggle.classList.toggle('active');
//         }