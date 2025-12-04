let csrfToken;

async function loadCsrf() {
  const res = await fetch('/csrf-token');
  const data = await res.json();
  csrfToken = data.csrfToken;
}

document.addEventListener('DOMContentLoaded', loadCsrf);

async function createCheckout(plan) {
  const res = await fetch('/api/subscriptions/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify({
      plan,
      billing_cycle: billingSelect.value
    })
  });
}