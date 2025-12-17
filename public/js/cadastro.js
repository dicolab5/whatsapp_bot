
// public/js/cadastro.js - DEBUG VERSION
console.log('🔥 cadastro.js carregado');

document.addEventListener('DOMContentLoaded', function () {
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

  // ---- Requisitos de senha (lista visual) ----
  const reqUpper = document.getElementById('req-upper');
  const reqLower = document.getElementById('req-lower');
  const reqNumber = document.getElementById('req-number');
  const reqSymbol = document.getElementById('req-symbol');
  const reqLength = document.getElementById('req-length');

  function updatePasswordRequirements(value) {
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSymbol = /[^A-Za-z0-9]/.test(value);
    const hasLength = value.length >= 12;

    function setReq(el, ok) {
      if (!el) return;
      el.classList.toggle('text-success', ok);
      el.classList.toggle('text-danger', !ok);
    }

    setReq(reqUpper, hasUpper);
    setReq(reqLower, hasLower);
    setReq(reqNumber, hasNumber);
    setReq(reqSymbol, hasSymbol);
    setReq(reqLength, hasLength);
  }

  // Atualiza requisitos enquanto digita
  password.addEventListener('input', (e) => {
    updatePasswordRequirements(e.target.value);
  });

  // ---- Função de validação forte (usada no submit) ----
  function isStrongPassword(pwd) {
    const minLength = 12;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSymbol = /[^A-Za-z0-9]/.test(pwd);

    return (
      pwd.length >= minLength &&
      hasUpper && hasLower && hasNumber && hasSymbol
    );
  }

  // ---- Submit do formulário ----
  form.addEventListener('submit', async function (e) {
    console.log('📝 Form submit disparado');
    e.preventDefault();

    const pwd = password.value;

    if (!isStrongPassword(pwd)) {
      if (resultMessage) {
        resultMessage.className = 'alert alert-danger';
        resultMessage.innerHTML =
          'A senha deve ter pelo menos 12 caracteres, com letras maiúsculas, minúsculas, números e símbolos.';
      }
      return;
    }

    const data = {
      username: username.value.trim(),
      email: email.value.trim() || null,
      password: pwd,
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
        body: JSON.stringify(data),
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
        // Reseta os requisitos visuais
        updatePasswordRequirements('');
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

// // public/js/cadastro.js - DEBUG VERSION
// console.log('🔥 cadastro.js carregado');

// document.addEventListener('DOMContentLoaded', function() {
//   console.log('✅ DOM carregado');
  
//   const form = document.getElementById('registerForm');
//   console.log('Form encontrado?', form);

//   const reqUpper = document.getElementById('req-upper');
// const reqLower = document.getElementById('req-lower');
// const reqNumber = document.getElementById('req-number');
// const reqSymbol = document.getElementById('req-symbol');
// const reqLength = document.getElementById('req-length');

// function updatePasswordRequirements(value) {
//   const hasUpper = /[A-Z]/.test(value);
//   const hasLower = /[a-z]/.test(value);
//   const hasNumber = /[0-9]/.test(value);
//   const hasSymbol = /[^A-Za-z0-9]/.test(value);
//   const hasLength = value.length >= 12;

//   // helper para trocar classe
//   function setReq(el, ok) {
//     el.classList.toggle('text-success', ok);
//     el.classList.toggle('text-danger', !ok);
//   }

//   setReq(reqUpper, hasUpper);
//   setReq(reqLower, hasLower);
//   setReq(reqNumber, hasNumber);
//   setReq(reqSymbol, hasSymbol);
//   setReq(reqLength, hasLength);
// }

// password.addEventListener('input', (e) => {
//   updatePasswordRequirements(e.target.value);
// });
  
//   if (!form) {
//     console.error('❌ #registerForm NÃO ENCONTRADO!');
//     return;
//   }

//   const username = document.getElementById('username');
//   const email = document.getElementById('email');
//   const password = document.getElementById('password');
//   const resultMessage = document.getElementById('resultMessage');
  
//   console.log('Campos:', { username, email, password, resultMessage });

//   form.addEventListener('submit', async function(e) {
//     console.log('📝 Form submit disparado');
//     e.preventDefault();

//     const pwd = password.value;

//   if (!isStrongPassword(pwd)) {
//     if (resultMessage) {
//       resultMessage.className = 'alert alert-danger';
//       resultMessage.innerHTML =
//         'A senha deve ter pelo menos 12 caracteres, com letras maiúsculas, minúsculas, números e símbolos.';
//     }
//     return;
//   }

//   const data = {
//     username: username.value.trim(),
//     email: email.value.trim() || null,
//     password: pwd
//   };
    
//     console.log('📤 Enviando:', data);

//     if (resultMessage) {
//       resultMessage.textContent = 'Enviando...';
//       resultMessage.className = 'alert alert-info';
//     }

//     try {
//       const res = await fetch('/api/users/register', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(data)
//       });
      
//       console.log('📥 Resposta status:', res.status);
      
//       const result = await res.json();
//       console.log('📥 Resposta completa:', result);
      
//       if (res.ok) {
//         if (resultMessage) {
//           resultMessage.className = 'alert alert-success';
//           resultMessage.innerHTML = '✅ Criado! <a href="/login">Login</a>';
//         }
//         form.reset();
//       } else {
//         if (resultMessage) {
//           resultMessage.className = 'alert alert-danger';
//           resultMessage.textContent = result.error || 'Erro desconhecido';
//         }
//       }
//     } catch (error) {
//       console.error('💥 ERRO FETCH:', error);
//       if (resultMessage) {
//         resultMessage.className = 'alert alert-danger';
//         resultMessage.textContent = 'Erro de rede';
//       }
//     }
//   });

//   function isStrongPassword(password) {
//   const minLength = 12;
//   const hasUpper = /[A-Z]/.test(password);
//   const hasLower = /[a-z]/.test(password);
//   const hasNumber = /[0-9]/.test(password);
//   const hasSymbol = /[^A-Za-z0-9]/.test(password);

//   return (
//     password.length >= minLength &&
//     hasUpper && hasLower && hasNumber && hasSymbol
//   );
// }

  
//   console.log('🎉 Event listener adicionado');
// });
