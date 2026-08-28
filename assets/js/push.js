/* ==========================================================================
   BUILD.TECH — Notifications push (optionnel / avancé)
   Si ce n'est pas configuré (pas de clé VAPID) ou pas supporté par le
   navigateur, le site continue de fonctionner normalement : les
   notifications par email restent le canal fiable dans tous les cas.
   Voir README.md, partie 9.2.
   ========================================================================== */
function urlBase64ToUint8Array(base64String) {
  var padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  var base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  var rawData = window.atob(base64);
  var outputArray = new Uint8Array(rawData.length);
  for (var i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function enablePushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    toast("Les notifications push ne sont pas supportées ici. Les notifications par email restent actives.", "info");
    return;
  }
  var cfg = window.BUILD_TECH_CONFIG || {};
  if (!cfg.VAPID_PUBLIC_KEY) {
    toast("Notifications push non configurées sur ce site (fonctionnalité optionnelle).", "info");
    return;
  }
  var sessionRes = await window.sb.auth.getSession();
  var session = sessionRes.data.session;
  if (!session) {
    toast("Connectez-vous pour activer les notifications.", "info");
    return;
  }
  var permission = await Notification.requestPermission();
  if (permission !== "granted") {
    toast("Notifications refusées par le navigateur.", "info");
    return;
  }
  try {
    var reg = await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(cfg.VAPID_PUBLIC_KEY)
    });
    await window.sb.from("push_subscriptions").insert({ user_id: session.user.id, subscription: sub });
    toast("Notifications activées !", "success");
  } catch (err) {
    toast("Impossible d'activer les notifications push.", "error");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  var btn = document.getElementById("btnEnablePush");
  if (btn) btn.addEventListener("click", enablePushNotifications);
});
