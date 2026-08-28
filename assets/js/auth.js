/* ==========================================================================
   BUILD.TECH — Authentification (connexion, inscription, mot de passe)
   ========================================================================== */
(function () {
  function showAlert(containerId, message, type) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(message) + "</div>";
  }
  function clearAlert(containerId) {
    var el = document.getElementById(containerId);
    if (el) el.innerHTML = "";
  }
  function markInvalid(fieldId, invalid) {
    var el = document.getElementById(fieldId);
    if (el) el.classList.toggle("invalid", !!invalid);
  }

  // ---------- Connexion ----------
  var loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      clearAlert("loginAlert");
      var email = document.getElementById("email").value.trim();
      var password = document.getElementById("password").value;
      var valid = true;
      if (!email) { markInvalid("fieldEmail", true); valid = false; } else markInvalid("fieldEmail", false);
      if (!password) { markInvalid("fieldPassword", true); valid = false; } else markInvalid("fieldPassword", false);
      if (!valid) return;

      var btn = document.getElementById("btnLogin");
      setButtonLoading(btn, true, "Connexion en cours…");
      var res = await window.sb.auth.signInWithPassword({ email: email, password: password });
      setButtonLoading(btn, false);

      if (res.error) {
        showAlert("loginAlert", friendlyAuthError(res.error.message), "error");
        return;
      }

      var pending = getParam("pending");
      if (pending && window.resumePendingContactIfAny) {
        var resumed = await window.resumePendingContactIfAny(res.data.user.id);
        if (resumed) return;
      }
      var next = getParam("next");
      window.location.href = next || "profile.html";
    });
  }

  // ---------- Inscription ----------
  var registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      clearAlert("registerAlert");
      var email = document.getElementById("email").value.trim();
      var password = document.getElementById("password").value;
      var password2 = document.getElementById("password2").value;
      var valid = true;
      if (!email) { markInvalid("fieldEmail", true); valid = false; } else markInvalid("fieldEmail", false);
      if (!password || password.length < 6) { markInvalid("fieldPassword", true); valid = false; } else markInvalid("fieldPassword", false);
      if (password !== password2) { markInvalid("fieldPassword2", true); valid = false; } else markInvalid("fieldPassword2", false);
      if (!valid) return;

      var btn = document.getElementById("btnRegister");
      setButtonLoading(btn, true, "Création du compte…");
      var res = await window.sb.auth.signUp({ email: email, password: password });
      setButtonLoading(btn, false);

      if (res.error) {
        showAlert("registerAlert", friendlyAuthError(res.error.message), "error");
        return;
      }

      if (res.data.session) {
        // Confirmation email désactivée côté Supabase : l'utilisateur est déjà connecté.
        window.location.href = "profile.html";
      } else {
        // Confirmation email activée : on informe l'utilisateur.
        showAlert("registerAlert", "Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse avant de vous connecter.", "info");
      }
    });
  }

  // ---------- Mot de passe oublié ----------
  var forgotForm = document.getElementById("forgotForm");
  if (forgotForm) {
    forgotForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      clearAlert("forgotAlert");
      var email = document.getElementById("email").value.trim();
      if (!email) { markInvalid("fieldEmail", true); return; }
      markInvalid("fieldEmail", false);

      var btn = document.getElementById("btnForgot");
      setButtonLoading(btn, true, "Envoi en cours…");
      var redirectTo = window.location.origin + window.location.pathname.replace("forgot-password.html", "reset-password.html");
      var res = await window.sb.auth.resetPasswordForEmail(email, { redirectTo: redirectTo });
      setButtonLoading(btn, false);

      if (res.error) {
        showAlert("forgotAlert", friendlyAuthError(res.error.message), "error");
        return;
      }
      showAlert("forgotAlert", "Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé.", "success");
      forgotForm.reset();
    });
  }

  // ---------- Réinitialisation du mot de passe ----------
  var resetForm = document.getElementById("resetForm");
  if (resetForm) {
    resetForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      clearAlert("resetAlert");
      var password = document.getElementById("password").value;
      if (!password || password.length < 6) { markInvalid("fieldPassword", true); return; }
      markInvalid("fieldPassword", false);

      var btn = document.getElementById("btnReset");
      setButtonLoading(btn, true, "Mise à jour…");
      var res = await window.sb.auth.updateUser({ password: password });
      setButtonLoading(btn, false);

      if (res.error) {
        showAlert("resetAlert", "Le lien a peut-être expiré. Merci de refaire une demande depuis \u00ab Mot de passe oublié \u00bb.", "error");
        return;
      }
      showAlert("resetAlert", "Mot de passe mis à jour. Redirection…", "success");
      setTimeout(function () { window.location.href = "profile.html"; }, 1200);
    });
  }
})();
