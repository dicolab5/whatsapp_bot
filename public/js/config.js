document.addEventListener("DOMContentLoaded", () => {

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(";").shift();
    }

    // ------------------------------------
    // CARREGAR INFORMAÇÕES DO PERFIL
    // ------------------------------------
    async function loadUserInfo() {
        const res = await fetch("api/config/profile");
        const data = await res.json();

        document.getElementById("infoUsername").innerText = data.username;
        document.getElementById("infoEmail").innerText = data.email;
        document.getElementById("infoAccountType").innerText = data.account_type;
        document.getElementById("infoExpires").innerText =
            new Date(data.subscription_expires).toLocaleDateString('pt-BR');

        if (data.two_factor_enabled) {
            document.getElementById("disable2FA").classList.remove("d-none");
            document.getElementById("enable2FA").classList.add("d-none");
        }
    }

    loadUserInfo();



    // ------------------------------------
    // ALTERAR SENHA
    // ------------------------------------
    document.getElementById("changePassword").onclick = async () => {
        const currentPassword = document.getElementById("oldPass").value;
        const newPassword = document.getElementById("newPass").value;

        const res = await fetch("api/config/password", {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": getCookie("XSRF-TOKEN")
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        alert(res.ok ? "Senha alterada!" : "Erro ao alterar senha");
    };



    // ------------------------------------
    // ALTERAR CPF E TELEFONE
    // ------------------------------------
    document.getElementById("savePersonal").onclick = async () => {
        const cpf = document.getElementById("cpf").value;
        const phone = document.getElementById("cellphone").value;

        const res = await fetch("api/config/personal", {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": getCookie("XSRF-TOKEN")
            },
            body: JSON.stringify({ cpf, phone })
        });

        alert(res.ok ? "Dados atualizados!" : "Erro ao atualizar dados");
    };



    // ------------------------------------
    // ATIVAR 2FA (gera QR CODE)
    // ------------------------------------
    document.getElementById("enable2FA").onclick = async () => {
        const res = await fetch("api/auth/enable-2fa", {
            method: "POST",
            credentials: "include",
            headers: {
                "X-CSRF-Token": getCookie("XSRF-TOKEN")
            }
        });

        const data = await res.json();

        if (data.qrCode) {
            document.getElementById("qrCode").src = data.qrCode;
            document.getElementById("qrcodeContainer").style.display = "block";
        }
    };



    // ------------------------------------
    // VERIFICAR TOKEN DE 2FA (TOTP)
    // ------------------------------------
    document.getElementById("verify2FA").onclick = async () => {
        const token = document.getElementById("totpToken").value.trim();  // ← token + trim()

        // const res = await fetch("api/auth/verify-2fa", {
        //     method: "POST",
        //     credentials: "include",
        //     headers: {
        //         "Content-Type": "application/json",
        //         "X-CSRF-Token": getCookie("XSRF-TOKEN")
        //     },
        //     body: JSON.stringify({ code })
        // });

        const res = await fetch("api/auth/verify-2fa", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": getCookie("XSRF-TOKEN")
            },
            body: JSON.stringify({ token })  // ← { token } ao invés de { code }
        });

        if (res.ok) {
            alert("2FA ativado!");
            location.reload();
        } else {
            alert("Código inválido");
        }
    };



    // ------------------------------------
    // DESATIVAR 2FA
    // ------------------------------------
    document.getElementById("disable2FA").onclick = async () => {
        const res = await fetch("api/auth/disable-2fa", {
            method: "POST",
            credentials: "include",
            headers: {
                "X-CSRF-Token": getCookie("XSRF-TOKEN")
            }
        });

        if (res.ok) {
            alert("2FA desativado!");
            location.reload();
        }
    };



    // ------------------------------------
    // RENOVAR ASSINATURA (placeholder)
    // ------------------------------------
    document.getElementById("renewPlan").onclick = () => {
        alert("Página de pagamento em desenvolvimento!");
    };

});
