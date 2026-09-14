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
      .select("*, profiles(email, avatar_path)")
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
      var avatarUrl = avatarPublicUrl(c.profiles && c.profiles.avatar_path);
      var avatarImg = avatarUrl
        ? '<img src="' + avatarUrl + '" alt="" style="width:22px;height:22px;border-radius:50%;object-fit:cover;margin-right:6px;vertical-align:middle;">'
        : "";
      var unreadDot = c.unread_by_admin ? '<span class="badge badge-warn">Non lu</span>' : "";
      var statusBadge = c.status === "closed" ? '<span class="badge badge-muted">Fermée</span>' : '<span class="badge badge-success">Ouverte</span>';
      return (
        '<div class="chat-list-item' + (c.id === activeConversationId ? " active" : "") + '" data-conv-id="' + c.id + '">' +
          '<div class="row1"><span>' + avatarImg + escapeHtml(email) + "</span><span class=\"time\">" + formatRelative(c.last_message_at) + "</span></div>" +
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
    var headerAvatarUrl = avatarPublicUrl(conv.profiles && conv.profiles.avatar_path);
    var headerAvatarImg = headerAvatarUrl
      ? '<img src="' + headerAvatarUrl + '" alt="" style="width:26px;height:26px;border-radius:50%;object-fit:cover;margin-right:8px;vertical-align:middle;">'
      : "";
    thread.innerHTML =
      '<div class="chat-thread-header">' +
        '<div><button type="button" class="btn btn-ghost btn-sm" id="btnBackToList" style="margin-right:8px;">← Retour</button>' +
          headerAvatarImg + "<strong>" + escapeHtml(email) + "</strong> — " + escapeHtml(conv.subject || "") + "</div>" +
        '<div class="row-actions">' +
          (conv.status === "open"
            ? '<button type="button" class="btn btn-ghost btn-sm" id="btnCloseConv">Fermer</button>'
            : '<button type="button" class="btn btn-ghost btn-sm" id="btnReopenConv">Réouvrir</button>') +
          '<button type="button" class="btn btn-danger btn-sm" id="btnDeleteConv">Supprimer</button>' +
        "</div>" +
      "</div>" +
      '<div class="chat-messages" id="chatMessages"><div class="loading-row"><span class="spinner"></span> Chargement…</div></div>' +
      '<form class="chat-composer" id="composerForm"><label class="btn btn-ghost btn-sm" for="composerImageInput" title="Envoyer une image" style="cursor:pointer;">📎</label><input type="file" id="composerImageInput" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none;"><textarea id="composerInput" rows="1" placeholder="Répondre…"></textarea><button type="submit" class="btn btn-primary">Envoyer</button></form>';

    document.getElementById("btnBackToList").addEventListener("click", function () {
      document.getElementById("chatList").classList.remove("hide-on-mobile-thread-open");
    });
    var closeBtn = document.getElementById("btnCloseConv");
    if (closeBtn) closeBtn.addEventListener("click", async function () { await closeConversation(id); loadConversations(); });
    var reopenBtn = document.getElementById("btnReopenConv");
    if (reopenBtn) reopenBtn.addEventListener("click", async function () { await reopenConversation(id); loadConversations(); });
    document.getElementById("btnDeleteConv").addEventListener("click", async function () {
      if (!confirm("Supprimer définitivement cette conversation et tous ses messages ? Cette action est irréversible.")) return;
      var res = await deleteConversation(id);
      if (res.error) { toast("Suppression impossible.", "error"); return; }
      activeConversationId = null;
      document.getElementById("chatThread").innerHTML = '<div class="empty-state"><div class="icon">💬</div><p>Sélectionnez une conversation.</p></div>';
      loadConversations();
    });

    document.getElementById("composerForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      var input = document.getElementById("composerInput");
      var content = input.value;
      if (!content.trim()) return;
      input.value = "";
      var res = await sendChatMessage(id, currentAdminId, "admin", content);
      if (res.error) toast("Le message n'a pas pu être envoyé.", "error");
    });
    document.getElementById("composerImageInput").addEventListener("change", async function (e) {
      var file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      var res = await sendChatImage(id, currentAdminId, "admin", file);
      if (res.error) toast(res.error.message || "L'image n'a pas pu être envoyée.", "error");
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
    for (var i = 0; i < (res.data || []).length; i++) {
      container.appendChild(await renderMessageBubble(res.data[i], "admin"));
    }
    container.scrollTop = container.scrollHeight;
  }
  async function appendMessage(msg) {
    var container = document.getElementById("chatMessages");
    if (!container) return;
    container.appendChild(await renderMessageBubble(msg, "admin"));
    container.scrollTop = container.scrollHeight;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
