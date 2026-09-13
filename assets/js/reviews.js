/* ==========================================================================
   BUILD.TECH — Page Avis : liste publique + formulaire 5 étoiles (connectés)
   ========================================================================== */
(function () {
  var currentRating = 0;
  var session = null;
  var profile = null;
  var isAdmin = false;

  function renderStars(n) {
    var full = "★".repeat(n);
    var empty = "☆".repeat(5 - n);
    return full + empty;
  }

  async function loadReviews() {
    var res = await window.sb.from("reviews").select("*").order("created_at", { ascending: false });
    var loading = document.getElementById("reviewsLoading");
    var empty = document.getElementById("reviewsEmpty");
    var list = document.getElementById("reviewsList");
    loading.classList.add("hidden");

    if (res.error) { toast("Impossible de charger les avis.", "error"); return; }
    var reviews = res.data || [];

    if (!reviews.length) {
      empty.classList.remove("hidden");
      document.getElementById("avgSummary").textContent = "Aucun avis pour le moment — soyez le premier à donner votre avis !";
      return;
    }

    var avg = reviews.reduce(function (sum, r) { return sum + r.rating; }, 0) / reviews.length;
    document.getElementById("avgSummary").textContent =
      avg.toFixed(1) + " / 5 · basé sur " + reviews.length + " avis" + (reviews.length > 1 ? "" : "");

    list.innerHTML = reviews.map(function (r) {
      var canDelete = session && (isAdmin || r.user_id === session.user.id);
      return (
        '<div class="blueprint-card review-card">' +
          '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">' +
            '<div class="stars">' + renderStars(r.rating) + "</div>" +
            (canDelete ? '<button type="button" class="btn btn-danger btn-sm" data-delete-review="' + r.id + '">Supprimer</button>' : "") +
          "</div>" +
          (r.comment ? "<p>" + escapeHtml(r.comment) + "</p>" : "") +
          '<div class="meta">' + escapeHtml(r.display_name || "Client Build.Tech") + " · " + formatDate(r.created_at) + "</div>" +
        "</div>"
      );
    }).join("");

    list.querySelectorAll("[data-delete-review]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!confirm("Supprimer définitivement cet avis ?")) return;
        var res2 = await window.sb.from("reviews").delete().eq("id", btn.getAttribute("data-delete-review"));
        if (res2.error) { toast("Suppression impossible.", "error"); return; }
        toast("Avis supprimé.", "success");
        loadReviews();
        initForm();
      });
    });
  }

  function setRating(n) {
    currentRating = n;
    document.getElementById("ratingValue").value = n;
    document.querySelectorAll("#starInput button").forEach(function (btn) {
      btn.classList.toggle("active", Number(btn.getAttribute("data-star")) <= n);
    });
  }

  async function initForm() {
    var sessionRes = await window.sb.auth.getSession();
    session = sessionRes.data.session;
    var hint = document.getElementById("reviewFormHint");
    var form = document.getElementById("reviewForm");

    if (!session) {
      hint.textContent = "Connectez-vous pour laisser un avis.";
      hint.innerHTML += ' <a href="login.html?next=avis.html" style="color:var(--blue); font-weight:600;">Se connecter</a>';
      return;
    }

    var profileRes = await window.sb.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
    profile = profileRes.data;

    var adminRes = await window.sb.from("admins").select("status").eq("user_id", session.user.id).eq("status", "active").maybeSingle();
    isAdmin = !!adminRes.data;

    hint.classList.add("hidden");
    form.classList.remove("hidden");

    var existingRes = await window.sb.from("reviews").select("*").eq("user_id", session.user.id).maybeSingle();
    if (existingRes.data) {
      setRating(existingRes.data.rating);
      document.getElementById("reviewComment").value = existingRes.data.comment || "";
      document.getElementById("reviewFormTitle").textContent = "Modifier mon avis";
      document.getElementById("btnSubmitReview").textContent = "Mettre à jour mon avis";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadReviews();
    initForm();

    document.querySelectorAll("#starInput button").forEach(function (btn) {
      btn.addEventListener("click", function () { setRating(Number(btn.getAttribute("data-star"))); });
    });

    document.getElementById("reviewForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      if (currentRating < 1) { toast("Choisissez une note de 1 à 5 étoiles.", "error"); return; }

      var displayName = (profile && profile.first_name) ? profile.first_name : "Client Build.Tech";
      var payload = {
        user_id: session.user.id,
        display_name: displayName,
        rating: currentRating,
        comment: document.getElementById("reviewComment").value.trim() || null
      };

      var btn = document.getElementById("btnSubmitReview");
      setButtonLoading(btn, true, "Publication…");
      var res = await window.sb.from("reviews").upsert(payload, { onConflict: "user_id" });
      setButtonLoading(btn, false);

      if (res.error) { toast("Erreur : " + res.error.message, "error"); return; }
      toast("Merci pour votre avis !", "success");
      loadReviews();
    });
  });
})();
