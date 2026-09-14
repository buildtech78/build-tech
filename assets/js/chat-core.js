/* ==========================================================================
   BUILD.TECH — Fonctions partagées du chat temps réel
   (utilisées par chat.html côté client ET par admin/conversations.html)
   ========================================================================== */

var CHAT_IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5 Mo
var CHAT_IMAGE_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

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

/** Envoie une image dans une conversation. Le fichier est stocké dans le
 *  bucket privé "chat-attachments", sous {conversation_id}/{nom-unique},
 *  ce qui permet aux règles de sécurité de vérifier que seuls le client
 *  concerné et les administrateurs peuvent y accéder. */
async function sendChatImage(conversationId, senderId, senderRole, file) {
  if (CHAT_IMAGE_ALLOWED_TYPES.indexOf(file.type) === -1) {
    return { error: { message: "Format d'image non supporté (JPG, PNG, WEBP ou GIF)." } };
  }
  if (file.size > CHAT_IMAGE_MAX_SIZE) {
    return { error: { message: "L'image dépasse la taille maximale autorisée (5 Mo)." } };
  }

  var ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  var uniqueName = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2)) + "." + ext;
  var path = conversationId + "/" + uniqueName;

  var uploadRes = await window.sb.storage.from("chat-attachments").upload(path, file, { contentType: file.type });
  if (uploadRes.error) return { error: uploadRes.error };

  return window.sb.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    sender_role: senderRole,
    image_path: path
  });
}

/** Génère une URL temporaire (1h) pour afficher une image de chat — le
 *  bucket étant privé, il n'existe pas d'URL publique permanente. */
async function getSignedChatImageUrl(path) {
  var res = await window.sb.storage.from("chat-attachments").createSignedUrl(path, 3600);
  return res.data ? res.data.signedUrl : null;
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

function deleteConversation(conversationId) {
  return window.sb.from("conversations").delete().eq("id", conversationId);
}

async function renderMessageBubble(msg, currentRole) {
  var mine = msg.sender_role === currentRole;
  var div = document.createElement("div");
  div.className = "msg " + (mine ? "mine" : "theirs");

  var html = "";
  if (msg.image_path) {
    var url = await getSignedChatImageUrl(msg.image_path);
    html += url
      ? '<a href="' + url + '" target="_blank" rel="noopener"><img src="' + url + '" alt="Image envoyée" style="max-width:220px;max-height:220px;border-radius:8px;display:block;margin-bottom:' + (msg.content ? "6px" : "0") + ';"></a>'
      : '<span class="field-hint">Image indisponible</span>';
  }
  if (msg.content) {
    html += escapeHtml(msg.content).replace(/\n/g, "<br>");
  }
  html += '<span class="msg-time">' + formatDate(msg.created_at, true) + "</span>";

  div.innerHTML = html;
  return div;
}
