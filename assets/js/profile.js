/* ==========================================================================
   BUILD.TECH — Page Profil : infos du compte, photo de profil, prénom/nom
   ========================================================================== */
(function () {
  var MAX_AVATAR_SIZE = 4 * 1024 * 1024; // 4 Mo
  var ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
  var currentUserId = null;

  function avatarPublicUrl(path) {
    if (!path) return null;
    var res = window.sb.storage.from("avatars").getPublicUrl(path);
    return res.data ? res.data.publicUrl : null;
  }

  function renderAvatar(profile, email) {
    var box = document.getElementById("avatarInitial");
    var url = avatarPublicUrl(profile && profile.avatar_path);
    if (url) {
      box.innerHTML = '<img src="' + url + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
    } else {
      box.textContent = (email || "?").charAt(0).toUpperCase();
    }
  }

  async function loadProfile() {
    var sessionRes = await window.sb.auth.getSession();
    var session = sessionRes.data.session;
    if (!session) return; // auth-guard.js gère déjà la redirection
    currentUserId = session.user.id;

    document.getElementById("pEmail").textContent = session.user.email;

    var profileRes = await window.sb.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
    var profile = profileRes.data;

    renderAvatar(profile, session.user.email);

    if (profile) {
      document.getElementById("pCreatedAt").textContent = formatDate(profile.created_at);
      document.getElementById("firstName").value = profile.first_name || "";
      document.getElementById("lastName").value = profile.last_name || "";
    }

    var convRes = await window.sb.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", session.user.id);
    document.getElementById("pConvCount").textContent = convRes.count != null ? convRes.count : "—";
  }

  async function handleAvatarUpload(e) {
    var file = e.target.files && e.target.files[0];
    if (!file || !currentUserId) return;

    if (ALLOWED_TYPES.indexOf(file.type) === -1) {
      toast("Format d'image non supporté (JPG, PNG ou WEBP uniquement).", "error");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      toast("L'image dépasse la taille maximale autorisée (4 Mo).", "error");
      return;
    }

    var ext = file.name.split(".").pop().toLowerCase();
    var path = currentUserId + "/avatar." + ext;

    var uploadRes = await window.sb.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadRes.error) {
      toast("Échec de l'envoi de la photo : " + uploadRes.error.message, "error");
      return;
    }

    var updateRes = await window.sb.from("profiles").update({ avatar_path: path }).eq("id", currentUserId);
    if (updateRes.error) {
      toast("La photo a été envoyée mais le profil n'a pas pu être mis à jour.", "error");
      return;
    }

    renderAvatar({ avatar_path: path }, null);
    toast("Photo de profil mise à jour.", "success");
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadProfile();

    var logoutBtn = document.getElementById("btnLogoutProfile");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async function () {
        await window.sb.auth.signOut();
        window.location.href = "index.html";
      });
    }

    var avatarInput = document.getElementById("avatarInput");
    if (avatarInput) avatarInput.addEventListener("change", handleAvatarUpload);

    var nameForm = document.getElementById("nameForm");
    if (nameForm) {
      nameForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        var payload = {
          first_name: document.getElementById("firstName").value.trim() || null,
          last_name: document.getElementById("lastName").value.trim() || null
        };
        var res = await window.sb.from("profiles").update(payload).eq("id", currentUserId);
        if (res.error) { toast("Erreur : " + res.error.message, "error"); return; }
        toast("Informations enregistrées.", "success");
      });
    }
  });
})();
