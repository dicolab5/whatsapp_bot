// public/js/config.js 
document.addEventListener('DOMContentLoaded', () => {

  // -------- Requisitos de senha forte na troca de senha --------
const newPassInput = document.getElementById('newPass');

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

function isStrongPassword(pwd) {
  return (
    pwd.length >= 12 &&
    /[A-Z]/.test(pwd) &&
    /[a-z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    /[^A-Za-z0-9]/.test(pwd)
  );
}

newPassInput.addEventListener('input', (e) => {
  updatePasswordRequirements(e.target.value);
});


  // Mascaras de formatação tel e cpf
  const cpfInput = document.getElementById('cpf');
  const phoneInput = document.getElementById('cellphone');

  cpfInput.addEventListener('input', (e) => {
    e.target.value = maskCPF(e.target.value);
  });

  phoneInput.addEventListener('input', (e) => {
    e.target.value = maskPhone(e.target.value);
  });

  // CARREGAR INFORMAÇÕES DO PERFIL
  async function loadUserInfo() {
    try {
      const res = await apiFetch('/api/config/profile'); // GET, apiFetch também funciona
      const data = await res.json();

      document.getElementById('infoUsername').innerText = data.username;
      document.getElementById('infoEmail').innerText = data.email;
      document.getElementById('infoAccountType').innerText = data.account_type;
      document.getElementById('infoExpires').innerText =
        data.subscription_expires
          ? new Date(data.subscription_expires).toLocaleDateString('pt-BR')
          : '-';
      
      document.getElementById('fullName').value = data.full_name || '';
      document.getElementById('cellphone').value = data.phone || '';
      document.getElementById('cpf').value = data.cpf || '';

      if (data.two_factor_enabled) {
        document.getElementById('disable2FA').classList.remove('d-none');
        document.getElementById('enable2FA').classList.add('d-none');
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    }
  }

  loadUserInfo();

  // SALVAR NOME COMPLETO
  document.getElementById('saveFullName').onclick = async () => {
  const full_name = document.getElementById('fullName').value.trim();
  if (!full_name) { alert('Informe seu nome completo'); return; }

  try {
    const res = await apiFetch('/api/config/full-name', {
      method: 'PUT',
      body: JSON.stringify({ full_name })
    });
    alert(res.ok ? 'Nome atualizado!' : 'Erro ao atualizar nome');
  } catch (err) {
    console.error('Erro ao atualizar nome:', err);
    alert('Erro ao atualizar nome');
  }
};

  // ALTERAR SENHA
  document.getElementById('changePassword').onclick = async () => {
  const currentPassword = document.getElementById('oldPass').value;
  const newPassword = document.getElementById('newPass').value;

  if (!isStrongPassword(newPassword)) {
    alert('A nova senha deve ter pelo menos 12 caracteres, com letras maiúsculas, minúsculas, números e símbolos.');
    return;
  }

  try {
    const res = await apiFetch('/api/config/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    });

    alert(res.ok ? 'Senha alterada!' : 'Erro ao alterar senha');
    if (res.ok) {
      document.getElementById('oldPass').value = '';
      document.getElementById('newPass').value = '';
      updatePasswordRequirements('');
    }
  } catch (err) {
    console.error('Erro ao alterar senha:', err);
    alert('Erro ao alterar senha');
  }
};
  // document.getElementById('changePassword').onclick = async () => {
  //   const currentPassword = document.getElementById('oldPass').value;
  //   const newPassword = document.getElementById('newPass').value;

  //   try {
  //     const res = await apiFetch('/api/config/password', {
  //       method: 'PUT',
  //       body: JSON.stringify({ currentPassword, newPassword })
  //     });

  //     alert(res.ok ? 'Senha alterada!' : 'Erro ao alterar senha');
  //   } catch (err) {
  //     console.error('Erro ao alterar senha:', err);
  //     alert('Erro ao alterar senha');
  //   }
  // };

  // SALVAR TELEFONE
document.getElementById('savePhone').onclick = async () => {
  const phone = document.getElementById('cellphone').value;

  try {
    const res = await apiFetch('/api/config/phone', {
      method: 'PUT',
      body: JSON.stringify({ phone })
    });

    alert(res.ok ? 'Telefone atualizado!' : 'Erro ao atualizar telefone');
  } catch (err) {
    console.error('Erro ao atualizar telefone:', err);
    alert('Erro ao atualizar telefone');
  }
};

// SALVAR CPF
document.getElementById('saveCPF').onclick = async () => {
  const cpf = document.getElementById('cpf').value;

  try {
    const res = await apiFetch('/api/config/cpf', {
      method: 'PUT',
      body: JSON.stringify({ cpf })
    });

    alert(res.ok ? 'CPF atualizado!' : 'Erro ao atualizar CPF');
  } catch (err) {
    console.error('Erro ao atualizar CPF:', err);
    alert('Erro ao atualizar CPF');
  }
};

  // ATIVAR 2FA (gera QR CODE)
  document.getElementById('enable2FA').onclick = async () => {
    try {
      const res = await apiFetch('/api/auth/enable-2fa', {
        method: 'POST'
      });
      const data = await res.json();

      if (data.qrCode) {
        document.getElementById('qrCode').src = data.qrCode;
        document.getElementById('qrcodeContainer').style.display = 'block';
      } else {
        alert('Erro ao gerar QR Code de 2FA');
      }
    } catch (err) {
      console.error('Erro ao ativar 2FA:', err);
      alert('Erro ao ativar 2FA');
    }
  };

  // VERIFICAR TOKEN DE 2FA (TOTP)
  document.getElementById('verify2FA').onclick = async () => {
    const token = document.getElementById('totpToken').value.trim();

    try {
      const res = await apiFetch('/api/auth/verify-2fa', {
        method: 'POST',
        body: JSON.stringify({ token })
      });

      if (res.ok) {
        alert('2FA ativado!');
        location.reload();
      } else {
        alert('Código inválido');
      }
    } catch (err) {
      console.error('Erro ao verificar 2FA:', err);
      alert('Erro ao verificar 2FA');
    }
  };

  // DESATIVAR 2FA
  document.getElementById('disable2FA').onclick = async () => {
    try {
      const res = await apiFetch('/api/auth/disable-2fa', {
        method: 'POST'
      });

      if (res.ok) {
        alert('2FA desativado!');
        location.reload();
      } else {
        alert('Erro ao desativar 2FA');
      }
    } catch (err) {
      console.error('Erro ao desativar 2FA:', err);
      alert('Erro ao desativar 2FA');
    }
  };

  // RENOVAR ASSINATURA
  document.getElementById('renewPlan').onclick = () => {
    window.location.href = '/subscription.html';
  };
});
