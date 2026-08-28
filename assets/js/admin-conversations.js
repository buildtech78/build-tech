/* ==========================================================================
   BUILD.TECH — Admin : conversations (liste + réponse temps réel)
   ========================================================================== */
(function () {
  var currentAdminId = null;
  var activeConversationId = null;
  var messageChannel = null;
  var conversations = [];

  var CONTEXT_LABELS = { component: "Composant", service: "Service", general: "Général" };

  async function init() {
    var sessionRes = await window.sb.auth.getSession();
    currentAdminId = sessionRes.data.session.user.id;
    await loadConversations();
    subscribeToConversationList("status", "open", function () { loadConversations(true); });

    document.getElementById("fStatus").addEventListener("change", renderList);
    document.getElementById("fUnreadOnly").addEventListener("change", renderList);
  }

  async function loadConversations() {
    var res = await window.sb.from("conversations")
      .select("*, profiles(email)")
      .order("last_message_at", { ascending: false });
    if (res.error) { toast("Erreur de chargement des conversations.", "error"); return; }
    conversations = res.data || [];
    renderList();
  }

  function filteredConversations() {
    var status = document.getElementById("fStatus").value;
    var unreadOnly = document.getElementById("fUnreadOnly").checked;
    return conversations.filter(function (c) {
      if (status && c.status !== status) return false;
      if (unreadOnly && !c.unread_by_admin) return false;
      return true;
    });
  }

  function renderList() {
    var list = document.getElementById("chatList");
    var items = filteredConversations();
    if (!items.length) {
      list.innerHTML = '<div class="empty-state"><div class="icon">💬</div><p>Aucune conversation.</p></div>';
      return;
    }
    list.innerHTML = items.map(function (c) {
      var email = c.profiles ? c.profiles.email : "Utilisateur";
      var unreadDot = c.unread_by_admin ? '<span class="badge badge-warn">Non lu</span>' : "";
      var statusBadge = c.status === "closed" ? '<span class="badge badge-muted">Fermée</span>' : '<span class="badge badge-success">Ouverte</span>';
      return (
        '<div class="chat-list-item' + (c.id === activeConversationId ? " active" : "") + '" data-conv-id="' + c.id + '">' +
          '<div class="row1"><span>' + escapeHtml(email) + "</span><span class=\"time\">" + formatRelative(c.last_message_at) + "</span></div>" +
          '<div class="snippet">' + escapeHtml(c.subject || "") + " · " + (CONTEXT_LABELS[c.context_type] || "") + "</div>" +
          '<div style="margin-top:6px;">' + unreadDot + " " + statusBadge + "</div>" +
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

    var conv = conversations.find(function (c) { return c.id === id; });
    if (!conv) return;

    if (conv.unread_by_admin) { await markConversationRead(id, "admin"); conv.unread_by_admin = false; }

    var thread = document.getElementById("chatThread");
    var email = conv.profiles ? conv.profiles.email : "Utilisateur";
    thread.innerHTML =
      '<div class="chat-thread-header">' +
        '<div><button type="button" class="btn btn-ghost btn-sm" id="btnBackToList" style="margin-right:8px;">← Retour</button>' +
          "<strong>" + escapeHtml(email) + "</strong> — " + escapeHtml(conv.subject || "") + "</div>" +
        '<div class="row-actions">' +
          (conv.status === "open"
            ? '<button type="button" class="btn btn-ghost btn-sm" id="btnCloseConv">Fermer</button>'
            : '<button type="button" class="btn btn-ghost btn-sm" id="btnReopenConv">Réouvrir</button>') +
        "</div>" +
      "</div>" +
      '<div class="chat-messages" id="chatMessages"><div class="loading-row"><span class="spinner"></span> Chargement…</div></div>' +
      '<form class="chat-composer" id="composerForm"><textarea id="composerInput" rows="1" placeholder="Répondre…" required></textarea><button type="submit" class="btn btn-primary">Envoyer</button></form>';

    document.getElementById("btnBackToList").addEventListener("click", function () {
      document.getElementById("chatList").classList.remove("hide-on-mobile-thread-open");
    });
    var closeBtn = document.getElementById("btnCloseConv");
    if (closeBtn) closeBtn.addEventListener("click", async function () { await closeConversation(id); loadConversations(); });
    var reopenBtn = document.getElementById("btnReopenConv");
    if (reopenBtn) reopenBtn.addEventListener("click", async function () { await reopenConversation(id); loadConversations(); });

    document.getElementById("composerForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      var input = document.getElementById("composerInput");
      var content = input.value;
      if (!content.trim()) return;
      input.value = "";
      var res = await sendChatMessage(id, currentAdminId, "admin", content);
      if (res.error) toast("Le message n'a pas pu être envoyé.", "error");
    });

    await loadMessages(id);

    if (messageChannel) window.sb.removeChannel(messageChannel);
    messageChannel = subscribeToConversation(id, function (msg) {
      if (msg.sender_role !== "admin") markConversationRead(id, "admin");
      appendMessage(msg);
    });
  }

  async function loadMessages(conversationId) {
    var res = await window.sb.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
    var container = document.getElementById("chatMessages");
    container.innerHTML = "";
    (res.data || []).forEach(function (m) { container.appendChild(renderMessageBubble(m, "admin")); });
    container.scrollTop = container.scrollHeight;
  }
  function appendMessage(msg) {
    var container = document.getElementById("chatMessages");
    if (!container) return;
    container.appendChild(renderMessageBubble(msg, "admin"));
    container.scrollTop = container.scrollHeight;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
