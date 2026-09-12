/* ==========================================================================
   BUILD.TECH — Vérification A2F (étape 2) après une connexion réussie
   ========================================================================== */
(function () {
  function showAlert(message, type) {
    document.getElementById("mfaAlert").innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(message) + "</div>";
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var sessionRes = await window.sb.auth.getSession();
    if (!sessionRes.data.session) { window.location.href = "login.html"; return; }

    var factorsRes = await window.sb.auth.mfa.listFactors();
    var factor = (factorsRes.data && factorsRes.data.totp || []).find(function (f) { return f.status === "verified"; });
    if (!factor) { window.location.href = "admin/index.html"; return; }

    document.getElementById("mfaForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      var code = document.getElementById("code").value.trim();
      if (code.length !== 6) { showAlert("Le code doit contenir 6 chiffres.", "error"); return; }

      var btn = document.getElementById("btnVerify");
      setButtonLoading(btn, true, "Vérification…");
      var challengeRes = await window.sb.auth.mfa.challenge({ factorId: factor.id });
      if (challengeRes.error) { setButtonLoading(btn, false); showAlert(challengeRes.error.message, "error"); return; }

      var verifyRes = await window.sb.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challengeRes.data.id,
        code: code
      });
      setButtonLoading(btn, false);

      if (verifyRes.error) { showAlert("Code incorrect. Réessaie.", "error"); return; }

      var next = getParam("next");
      window.location.href = next || "admin/index.html";
    });
  });
})();
