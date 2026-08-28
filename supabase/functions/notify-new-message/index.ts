// ============================================================================
// BUILD.TECH — Edge Function "notify-new-message"
// ----------------------------------------------------------------------------
// Appelée automatiquement par un Database Webhook Supabase configuré sur
// "INSERT" de la table public.messages (voir README.md, partie
// "9. Configurer les emails de notification").
//
// - Un admin répond à un client  → email au client.
// - Un client écrit à Build.Tech → email à l'adresse de contact de l'entreprise.
// - Anti-spam : au plus un email toutes les 2 minutes par conversation/destinataire
//   (table notifications_log).
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEBOUNCE_MINUTES = 2;

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const message = payload.record;
    if (!message) return new Response("ignored", { status: 200 });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const contactEmail = Deno.env.get("BUILD_TECH_CONTACT_EMAIL") || "build.tech78920@gmail.com";
    const fromAddress = Deno.env.get("BUILD_TECH_FROM_EMAIL") || "Build.Tech <onboarding@resend.dev>";

    if (!resendApiKey) {
      // Notifications email non configurées : on ignore silencieusement.
      return new Response("email_not_configured", { status: 200 });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: conversation } = await admin
      .from("conversations")
      .select("id, subject, user_id, profiles(email)")
      .eq("id", message.conversation_id)
      .maybeSingle();
    if (!conversation) return new Response("conversation_not_found", { status: 200 });

    let recipientEmail: string;
    let subject: string;
    let body: string;

    if (message.sender_role === "admin") {
      recipientEmail = (conversation as any).profiles?.email;
      subject = "Vous avez reçu une nouvelle réponse sur Build.Tech";
      body = `Bonjour,<br><br>Vous avez reçu une nouvelle réponse concernant : <strong>${escapeHtml(conversation.subject || "votre conversation")}</strong>.<br><br>Connectez-vous sur Build.Tech pour la consulter.`;
    } else {
      recipientEmail = contactEmail;
      subject = "Nouveau message client sur Build.Tech";
      body = `Nouveau message reçu concernant : <strong>${escapeHtml(conversation.subject || "une conversation")}</strong>.<br><br>Message : ${escapeHtml(message.content)}`;
    }

    if (!recipientEmail) return new Response("no_recipient", { status: 200 });

    // Anti-spam : a-t-on déjà notifié ce destinataire pour cette conversation récemment ?
    const since = new Date(Date.now() - DEBOUNCE_MINUTES * 60 * 1000).toISOString();
    const { data: recent } = await admin
      .from("notifications_log")
      .select("id")
      .eq("conversation_id", conversation.id)
      .eq("recipient_email", recipientEmail)
      .gte("sent_at", since)
      .maybeSingle();

    if (recent) return new Response("debounced", { status: 200 });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [recipientEmail],
        subject,
        html: body
      })
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      return new Response("resend_error: " + errText, { status: 200 });
    }

    await admin.from("notifications_log").insert({ conversation_id: conversation.id, recipient_email: recipientEmail });

    return new Response("sent", { status: 200 });
  } catch (err) {
    return new Response("error: " + (err as Error).message, { status: 200 });
  }
});

function escapeHtml(str: string) {
  return String(str || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
