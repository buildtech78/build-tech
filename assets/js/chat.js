/* ==========================================================================
   BUILD.TECH — Page "Mes conversations" (côté utilisateur), temps réel
   ========================================================================== */
(function () {
  var currentUserId = null;
  var activeConversationId = null;
  var messageChannel = null;
  var conversations = [];

  var CONTEXT_LABELS = { component: "Composant", service: "Service", general: "Général" };

  async function init() {
    var sessionRes = await window.sb.auth.getSession();
    var session = sessionRes.data.session;
    if (!session) return;
    currentUserId = session.user.id;

    await loadConversations();

    var wanted = getParam("c");
    if (wanted) openConversation(wanted);

    subscribeToConversationList("user_id", currentUserId, function () { loadConversations(true); });
  }

  async function loadConversations(silent) {
    var res = await window.sb.from("conversations")
      .select("*")
      .eq("user_id", currentUserId)
      .order("last_message_at", { ascending: false });

    if (res.error) {
      if (!silent) toast("Impossible de charger vos conversations.", "error");
      return;
    }
    conversations = res.data || [];
    renderList();
  }

  function renderList() {
    var list = document.getElementById("chatList");
    if (!conversations.length) {
      list.innerHTML = '<div class="empty-state"><div class="icon">💬</div><p>Aucune conversation pour le moment.</p></div>';
      return;
    }
    list.innerHTML = conversations.map(function (c) {
      var unreadDot = c.unread_by_user ? '<span class="badge badge-warn">Nouveau</span>' : "";
      var statusBadge = c.status === "closed" ? '<span class="badge badge-muted">Fermée</span>' : '<span class="badge badge-success">Ouverte</span>';
      return (
        '<div class="chat-list-item' + (c.id === activeConversationId ? " active" : "") + '" data-conv-id="' + c.id + '">' +
          '<div class="row1"><span>' + escapeHtml(c.subject || "Conversation") + "</span><span class=\"time\">" + formatRelative(c.last_message_at) + "</span></div>" +
          '<div class="snippet">' + (CONTEXT_LABELS[c.context_type] || "Général") + " " + unreadDot + " " + statusBadge + "</div>" +
        "</div>"
      );
    }).join("");

    list.querySelectorAll("[data-conv-id]").forEach(function (item) {
      item.addEventListener("click", function () { openConversation(item.getAttribute("data-conv-id")); });
    });
  }

  async function openConversation(id) {
    activeConversationId = id;
    renderList();
    document.getElementById("chatList").classList.add("hide-on-mobile-thread-open");

    var conv = conversations.find(function (c) { return c.id === id; }) ;
    if (!conv) {
      var convRes = await window.sb.from("conversations").select("*").eq("id", id).maybeSingle();
      conv = convRes.data;
    }
    if (!conv) return;

    if (conv.unread_by_user) await markConversationRead(id, "user");

    var thread = document.getElementById("chatThread");
    thread.innerHTML =
      '<div class="chat-thread-header">' +
        '<div><button type="button" class="btn btn-ghost btn-sm" id="btnBackToList" style="margin-right:8px;">← Retour</button>' + escapeHtml(conv.subject || "Conversation") + "</div>" +
        (conv.status === "open"
          ? '<button type="button" class="btn btn-ghost btn-sm" id="btnCloseConv">Fermer la conversation</button>'
          : '<span class="badge badge-muted">Conversation fermée</span>') +
      "</div>" +
      '<div class="chat-messages" id="chatMessages"><div class="loading-row"><span class="spinner"></span> Chargement des messages…</div></div>' +
      (conv.status === "open"
        ? '<form class="chat-composer" id="composerForm"><textarea id="composerInput" rows="1" placeholder="Écrivez votre message…" required></textarea><button type="submit" class="btn btn-primary">Envoyer</button></form>'
        : "");

    document.getElementById("btnBackToList").addEventListener("click", function () {
      document.getElementById("chatList").classList.remove("hide-on-mobile-thread-open");
    });

    var closeBtn = document.getElementById("btnCloseConv");
    if (closeBtn) {
      closeBtn.addEventListener("click", async function () {
        if (!confirm("Fermer cette conversation ? Vous pourrez toujours la consulter ensuite.")) return;
        await closeConversation(id);
        loadConversations();
        openConversation(id);
      });
    }

    var composerForm = document.getElementById("composerForm");
    if (composerForm) {
      composerForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        var input = document.getElementById("composerInput");
        var content = input.value;
        if (!content.trim()) return;
        input.value = "";
        var res = await sendChatMessage(id, currentUserId, "user", content);
        if (res.error) toast("Le message n'a pas pu être envoyé.", "error");
      });
    }

    await loadMessages(id);

    if (messageChannel) window.sb.removeChannel(messageChannel);
    messageChannel = subscribeToConversation(id, function (msg) {
      if (msg.sender_role !== "user") markConversationRead(id, "user");
      appendMessage(msg);
    });
  }

  async function loadMessages(conversationId) {
    var res = await window.sb.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
    var container = document.getElementById("chatMessages");
    if (!container) return;
    if (res.error) {
      container.innerHTML = '<div class="alert alert-error">Impossible de charger les messages.</div>';
      return;
    }
    container.innerHTML = "";
    (res.data || []).forEach(function (m) { container.appendChild(renderMessageBubble(m, "user")); });
    container.scrollTop = container.scrollHeight;
  }

  function appendMessage(msg) {
    var container = document.getElementById("chatMessages");
    if (!container) return;
    container.appendChild(renderMessageBubble(msg, "user"));
    container.scrollTop = container.scrollHeight;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
