// public/js/cadastro.js - DEBUG VERSION
console.log('🔥 cadastro.js carregado');

document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ DOM carregado');
  
  const form = document.getElementById('registerForm');
  console.log('Form encontrado?', form);
  
  if (!form) {
    console.error('❌ #registerForm NÃO ENCONTRADO!');
    return;
  }

  const username = document.getElementById('username');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const resultMessage = document.getElementById('resultMessage');
  
  console.log('Campos:', { username, email, password, resultMessage });

  form.addEventListener('submit', async function(e) {
    console.log('📝 Form submit disparado');
    e.preventDefault();
    
    const data = {
      username: username.value.trim(),
      email: email.value.trim() || null,
      password: password.value
    };
    
    console.log('📤 Enviando:', data);

    if (resultMessage) {
      resultMessage.textContent = 'Enviando...';
      resultMessage.className = 'alert alert-info';
    }

    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      console.log('📥 Resposta status:', res.status);
      
      const result = await res.json();
      console.log('📥 Resposta completa:', result);
      
      if (res.ok) {
        if (resultMessage) {
          resultMessage.className = 'alert alert-success';
          resultMessage.innerHTML = '✅ Criado! <a href="/login">Login</a>';
        }
        form.reset();
      } else {
        if (resultMessage) {
          resultMessage.className = 'alert alert-danger';
          resultMessage.textContent = result.error || 'Erro desconhecido';
        }
      }
    } catch (error) {
      console.error('💥 ERRO FETCH:', error);
      if (resultMessage) {
        resultMessage.className = 'alert alert-danger';
        resultMessage.textContent = 'Erro de rede';
      }
    }
  });
  
  console.log('🎉 Event listener adicionado');
});


// // public/js/cadastro.js
// document.addEventListener('DOMContentLoaded', function() {
//   const form = document.getElementById('registerForm');
  
//   if (!form) {
//     console.error('Form #registerForm não encontrado');
//     return;
//   }

//   form.addEventListener('submit', async (e) => {
//     e.preventDefault();
    
//     const data = {
//       username: document.getElementById('username').value.trim(),
//       email: document.getElementById('email').value.trim() || null,
//       password: document.getElementById('password').value
//     };

//     const resultMessage = document.getElementById('resultMessage');
//     resultMessage.textContent = '';
//     resultMessage.className = '';

//     try {
//       const res = await fetch('/api/users/register', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(data)
//       });

//       const result = await res.json();
      
//       if (res.ok) {
//         resultMessage.className = 'alert alert-success';
//         resultMessage.innerHTML = '✅ Conta criada!<br>7 dias Professional grátis.<br><a href="/login" class="btn btn-success mt-2 w-100">Login</a>';
//         form.reset();
//       } else {
//         resultMessage.className = 'alert alert-danger';
//         resultMessage.textContent = result.error || 'Erro ao criar conta.';
//       }
//     } catch {
//       resultMessage.className = 'alert alert-danger';
//       resultMessage.textContent = 'Erro de conexão.';
//     }
//   });
// });
