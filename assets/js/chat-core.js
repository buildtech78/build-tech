/* ==========================================================================
   BUILD.TECH — Fonctions partagées du chat temps réel
   (utilisées par chat.html côté client ET par admin/conversations.html)
   ========================================================================== */

/** S'abonne aux nouveaux messages d'une conversation en temps réel. */
function subscribeToConversation(conversationId, onInsert) {
  var channel = window.sb.channel("messages-" + conversationId)
    .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: "conversation_id=eq." + conversationId },
      function (payload) { onInsert(payload.new); }
    )
    .subscribe();
  return channel;
}

/** S'abonne aux mises à jour de la liste de conversations (nouveaux messages,
 *  changements de statut) pour rafraîchir les badges non-lu sans recharger. */
function subscribeToConversationList(filterColumn, filterValue, onChange) {
  var channel = window.sb.channel("conversations-list-" + filterValue)
    .on("postgres_changes",
      { event: "*", schema: "public", table: "conversations", filter: filterColumn + "=eq." + filterValue },
      onChange
    )
    .subscribe();
  return channel;
}

async function sendChatMessage(conversationId, senderId, senderRole, content) {
  content = content.trim();
  if (!content) return { error: "empty" };
  if (content.length > 4000) return { error: "too_long" };
  return window.sb.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    sender_role: senderRole,
    content: content
  });
}

function markConversationRead(conversationId, asRole) {
  var patch = asRole === "admin" ? { unread_by_admin: false } : { unread_by_user: false };
  return window.sb.from("conversations").update(patch).eq("id", conversationId);
}

function closeConversation(conversationId) {
  return window.sb.from("conversations").update({ status: "closed" }).eq("id", conversationId);
}

function reopenConversation(conversationId) {
  return window.sb.from("conversations").update({ status: "open" }).eq("id", conversationId);
}

function renderMessageBubble(msg, currentRole) {
  var mine = msg.sender_role === currentRole;
  var div = document.createElement("div");
  div.className = "msg " + (mine ? "mine" : "theirs");
  div.innerHTML = escapeHtml(msg.content).replace(/\n/g, "<br>") +
    '<span class="msg-time">' + formatDate(msg.created_at, true) + "</span>";
  return div;
}
