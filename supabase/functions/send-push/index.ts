// ============================================================================
// BUILD.TECH — Edge Function "send-push" (OPTIONNEL / AVANCÉ)
// ----------------------------------------------------------------------------
// Envoie une notification push navigateur quand un administrateur répond à
// un client. Si tu ne configures pas cette fonction, le site continue de
// fonctionner normalement : les notifications par email restent le canal
// fiable dans tous les cas (voir notify-new-message).
//
// Nécessite trois secrets supplémentaires : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT (ex: "mailto:build.tech78920@gmail.com").
// Voir README.md, partie "9.2 Notifications push (optionnel)".
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const message = payload.record;
    if (!message || message.sender_role !== "admin") {
      return new Response("ignored", { status: 200 });
    }

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");
    if (!vapidPublic || !vapidPrivate || !vapidSubject) {
      return new Response("push_not_configured", { status: 200 });
    }
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: conversation } = await admin
      .from("conversations")
      .select("id, subject, user_id")
      .eq("id", message.conversation_id)
      .maybeSingle();
    if (!conversation) return new Response("conversation_not_found", { status: 200 });

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, subscription")
      .eq("user_id", conversation.user_id);

    if (!subs || !subs.length) return new Response("no_subscriptions", { status: 200 });

    const notificationPayload = JSON.stringify({
      title: "Build.Tech",
      body: "Vous avez reçu une nouvelle réponse sur Build.Tech.",
      url: "./chat.html?c=" + conversation.id
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription, notificationPayload);
      } catch (err) {
        // Abonnement expiré ou invalide : on le supprime silencieusement.
        if ((err as any)?.statusCode === 410 || (err as any)?.statusCode === 404) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    return new Response("sent", { status: 200 });
  } catch (err) {
    return new Response("error: " + (err as Error).message, { status: 200 });
  }
});
