/* ==========================================================================
   BUILD.TECH — Admin : activation de l'A2F (TOTP) via Supabase Auth
   ========================================================================== */
(function () {
  var pendingFactorId = null;

  async function refreshStatus() {
    var res = await window.sb.auth.mfa.listFactors();
    var statusBox = document.getElementById("mfaStatus");
    if (res.error) {
      statusBox.innerHTML = '<div class="alert alert-error">Impossible de charger le statut A2F.</div>';
      return;
    }
    var verified = (res.data.totp || []).filter(function (f) { return f.status === "verified"; });

    if (verified.length) {
      statusBox.innerHTML =
        '<div class="alert alert-success">A2F activée sur ce compte.</div>' +
        '<button type="button" class="btn btn-danger btn-sm" id="btnDisableMfa">Désactiver l\'A2F</button>';
      document.getElementById("btnDisableMfa").addEventListener("click", async function () {
        if (!confirm("Désactiver l'A2F sur ce compte ?")) return;
        await window.sb.auth.mfa.unenroll({ factorId: verified[0].id });
        refreshStatus();
      });
      document.getElementById("enrollCard").classList.add("hidden");
    } else {
      statusBox.innerHTML =
        '<p style="margin-bottom:14px;">A2F non activée sur ce compte.</p>' +
        '<button type="button" class="btn btn-primary" id="btnStartEnroll">Activer l\'A2F</button>';
      document.getElementById("btnStartEnroll").addEventListener("click", startEnroll);
    }
  }

  async function startEnroll() {
    var res = await window.sb.auth.mfa.enroll({ factorType: "totp" });
    if (res.error) { toast("Erreur : " + res.error.message, "error"); return; }

    pendingFactorId = res.data.id;
    document.getElementById("qrWrap").innerHTML = res.data.totp.qr_code
      ? '<img src="' + res.data.totp.qr_code + '" alt="QR code A2F" style="width:200px;height:200px;">'
      : "";
    document.getElementById("secretCode").textContent = res.data.totp.secret || "";
    document.getElementById("enrollCard").classList.remove("hidden");
    document.getElementById("enrollCode").value = "";
  }

  async function confirmEnroll() {
    var code = document.getElementById("enrollCode").value.trim();
    if (!pendingFactorId || code.length !== 6) { toast("Saisis le code à 6 chiffres.", "error"); return; }

    var challengeRes = await window.sb.auth.mfa.challenge({ factorId: pendingFactorId });
    if (challengeRes.error) { toast("Erreur : " + challengeRes.error.message, "error"); return; }

    var verifyRes = await window.sb.auth.mfa.verify({
      factorId: pendingFactorId,
      challengeId: challengeRes.data.id,
      code: code
    });
    if (verifyRes.error) { toast("Code incorrect, réessaie.", "error"); return; }

    toast("A2F activée avec succès.", "success");
    document.getElementById("enrollCard").classList.add("hidden");
    refreshStatus();
  }

  document.addEventListener("DOMContentLoaded", function () {
    refreshStatus();
    document.getElementById("btnConfirmEnroll").addEventListener("click", confirmEnroll);
    document.getElementById("btnCancelEnroll").addEventListener("click", async function () {
      if (pendingFactorId) await window.sb.auth.mfa.unenroll({ factorId: pendingFactorId });
      document.getElementById("enrollCard").classList.add("hidden");
      refreshStatus();
    });
  });
})();
