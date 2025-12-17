// Toggle de FAQ (igual padrão das outras páginas)
// public/js/terms.js
function toggleFaq(element) {
  const answer = element.nextElementSibling;
  const toggle = element.querySelector('.faq-toggle');

  // Fecha outras respostas abertas
  document.querySelectorAll('.faq-answer.active').forEach(item => {
    if (item !== answer) {
      item.classList.remove('active');
      const icon = item.previousElementSibling.querySelector('.faq-toggle');
      if (icon) icon.classList.remove('active');
    }
  });

  // Alterna atual
  answer.classList.toggle('active');
  if (toggle) toggle.classList.toggle('active');
}

// Inicialização da página de termos
document.addEventListener('DOMContentLoaded', () => {
  // FAQ
  document.querySelectorAll('.faq-question').forEach(q => {
    q.addEventListener('click', () => toggleFaq(q));
  });

  // CTA "Criar minha conta"
  const cta = document.getElementById('cta-terms-signup');
  if (cta) {
    cta.addEventListener('click', () => {
      window.location.href = '/cadastro';
    });
  }
});
