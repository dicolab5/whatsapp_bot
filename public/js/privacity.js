// Toggle de FAQ (mesma lógica da index, reaproveitada)
// public/js/privacity.js
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

// Inicialização da página de privacidade
document.addEventListener('DOMContentLoaded', () => {
  // FAQ
  document.querySelectorAll('.faq-question').forEach(q => {
    q.addEventListener('click', () => toggleFaq(q));
  });

  // CTA "Começar agora com segurança"
  const cta = document.getElementById('cta-privacy-login');
  if (cta) {
    cta.addEventListener('click', () => {
      window.location.href = '/login';
    });
  }
});
