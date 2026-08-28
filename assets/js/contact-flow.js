/* ==========================================================================
   BUILD.TECH — Démarrer une conversation depuis une fiche service/composant
   ========================================================================== */
(function () {
  var PENDING_KEY = "buildtech-pending-contact";

  /** Appelé par un bouton "Nous contacter" sur une fiche service ou composant. */
  window.contactAbout = async function (contextType, contextId, label) {
    var sessionRes = await window.sb.auth.getSession();
    var session = sessionRes.data.session;
    if (!session) {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ contextType: contextType, contextId: contextId, label: label }));
      window.location.href = "login.html?next=chat.html&pending=1";
      return;
    }
    await startOrOpenConversation(session.user.id, contextType, contextId, label);
  };

  async function startOrOpenConversation(userId, contextType, contextId, label) {
    var existing = null;
    if (contextId) {
      var existingRes = await window.sb.from("conversations")
        .select("id,status")
        .eq("user_id", userId)
        .eq("context_type", contextType)
        .eq("context_id", contextId)
        .eq("status", "open")
        .maybeSingle();
      existing = existingRes.data;
    }
    if (existing) {
      window.location.href = "chat.html?c=" + existing.id;
      return;
    }
    var subject = contextType === "component"
      ? "Composant : " + label
      : contextType === "service"
        ? "Service : " + label
        : "Demande générale";
    var firstMessage = contextType === "component"
      ? "Bonjour, je suis intéressé par le composant : " + label + "."
      : contextType === "service"
        ? "Bonjour, je souhaite avoir des informations concernant le service " + label + "."
        : "Bonjour, j'ai une question.";

    var convRes = await window.sb.from("conversations").insert({
      user_id: userId,
      subject: subject,
      context_type: contextType,
      context_id: contextId || null,
      status: "open"
    }).select().single();

    if (convRes.error) {
      toast("Impossible de démarrer la conversation. Réessayez.", "error");
      return;
    }

    await window.sb.from("messages").insert({
      conversation_id: convRes.data.id,
      sender_id: userId,
      sender_role: "user",
      content: firstMessage
    });

    window.location.href = "chat.html?c=" + convRes.data.id;
  }

  /** À rappeler juste après une connexion réussie, pour reprendre une
   *  demande de contact démarrée avant d'être identifié. */
  window.resumePendingContactIfAny = async function (userId) {
    var raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return false;
    sessionStorage.removeItem(PENDING_KEY);
    try {
      var pending = JSON.parse(raw);
      await startOrOpenConversation(userId, pending.contextType, pending.contextId, pending.label);
      return true;
    } catch (e) { return false; }
  };
})();
