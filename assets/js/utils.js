/* ==========================================================================
   BUILD.TECH — Fonctions utilitaires partagées
   ========================================================================== */

/** Échappe le HTML pour empêcher les injections XSS lors de l'insertion
 *  de contenu (saisi par un utilisateur ou venant de la base) dans le DOM. */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Formate un prix numérique en euros. */
function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "—";
  var num = Number(value);
  if (Number.isNaN(num)) return "—";
  return num.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Formate une date ISO en date/heure lisible (fr-FR). */
function formatDate(iso, withTime) {
  if (!iso) return "—";
  var d = new Date(iso);
  var opts = withTime
    ? { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "2-digit", year: "numeric" };
  return d.toLocaleString("fr-FR", opts);
}

/** Date relative courte pour les listes de conversations ("il y a 5 min"). */
function formatRelative(iso) {
  if (!iso) return "";
  var diffMs = Date.now() - new Date(iso).getTime();
  var mins = Math.round(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return "il y a " + mins + " min";
  var hours = Math.round(mins / 60);
  if (hours < 24) return "il y a " + hours + " h";
  var days = Math.round(hours / 24);
  if (days < 7) return "il y a " + days + " j";
  return formatDate(iso, false);
}

/** Empêche un input de déclencher trop d'appels réseau (recherche live). */
function debounce(fn, delay) {
  var timer = null;
  return function () {
    var args = arguments, ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function () { fn.apply(ctx, args); }, delay || 300);
  };
}

/** Récupère un paramètre de l'URL courante. */
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/** Affiche une notification toast en bas à droite. */
function toast(message, type) {
  type = type || "info";
  var region = document.getElementById("toast-region");
  if (!region) {
    region = document.createElement("div");
    region.id = "toast-region";
    region.setAttribute("aria-live", "polite");
    document.body.appendChild(region);
  }
  var el = document.createElement("div");
  el.className = "toast " + type;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(function () {
    el.style.opacity = "0";
    el.style.transition = "opacity .25s ease";
    setTimeout(function () { el.remove(); }, 250);
  }, 4200);
}

/** Traduit les messages d'erreur Supabase les plus courants en français simple. */
function friendlyAuthError(message) {
  if (!message) return "Une erreur est survenue. Veuillez réessayer.";
  var m = message.toLowerCase();
  if (m.indexOf("invalid login credentials") !== -1) return "Email ou mot de passe incorrect.";
  if (m.indexOf("user already registered") !== -1) return "Un compte existe déjà avec cet email.";
  if (m.indexOf("password should be at least") !== -1) return "Le mot de passe doit contenir au moins 6 caractères.";
  if (m.indexOf("rate limit") !== -1) return "Trop de tentatives. Merci de patienter un instant.";
  if (m.indexOf("email not confirmed") !== -1) return "Cet email n'a pas encore été confirmé.";
  return message;
}

/** Active un état de chargement simple sur un bouton (texte + attribut disabled). */
function setButtonLoading(btn, loading, loadingText) {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent = loadingText || "Veuillez patienter…";
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.originalText || btn.textContent;
    btn.disabled = false;
  }
}

/** Petite animation "reveal" au scroll pour les sections marquées .reveal */
function initScrollReveal() {
  var items = document.querySelectorAll(".reveal");
  if (!items.length) return;
  if (!("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("in"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach(function (el) { io.observe(el); });
}
document.addEventListener("DOMContentLoaded", initScrollReveal);

/* Enregistrement du service worker (PWA : installabilité + notifications push).
   Sans effet si le navigateur ne supporte pas les service workers. */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    var inAdmin = window.location.pathname.indexOf("/admin/") !== -1;
    var swPath = inAdmin ? "../sw.js" : "./sw.js";
    navigator.serviceWorker.register(swPath).catch(function () { /* silencieux : la PWA est un bonus, pas un pré-requis */ });
  });
}
