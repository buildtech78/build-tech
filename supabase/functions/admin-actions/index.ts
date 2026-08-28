// ============================================================================
// BUILD.TECH — Edge Function "admin-actions"
// ----------------------------------------------------------------------------
// Regroupe toutes les actions administrateur qui nécessitent des droits
// privilégiés (clé service_role) : suspendre/réactiver/supprimer un compte,
// et gérer les administrateurs (ajouter, retirer, inviter).
//
// SÉCURITÉ : cette fonction revérifie ELLE-MÊME, côté serveur, que l'appelant
// est bien administrateur (et, pour certaines actions, propriétaire) avant
// d'agir. Le frontend ne peut jamais forcer une action privilégiée : même un
// appel direct à cette URL sans les bons droits sera rejeté ici.
//
// Déploiement : voir README.md, partie "9.1 Fonctions serveur (Edge Functions)".
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // 1. Identifier l'appelant à partir de son jeton d'accès.
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return json({ error: "missing_authorization" }, 401);

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "invalid_session" }, 401);
  const callerId = userData.user.id;

  // 2. Vérifier que l'appelant est bien administrateur.
  const { data: callerAdminRow } = await admin
    .from("admins")
    .select("is_owner,status")
    .eq("user_id", callerId)
    .eq("status", "active")
    .maybeSingle();

  if (!callerAdminRow) return json({ error: "forbidden_not_admin" }, 403);
  const callerIsOwner = !!callerAdminRow.is_owner;

  let body: { action?: string; payload?: Record<string, unknown> } = {};
  try { body = await req.json(); } catch { /* body vide */ }
  const { action, payload } = body;

  try {
    switch (action) {
      case "suspend_user":
        return await suspendUser(admin, payload?.userId as string);
      case "reactivate_user":
        return await reactivateUser(admin, payload?.userId as string);
      case "delete_user":
        return await deleteUser(admin, payload?.userId as string);
      case "grant_admin":
        if (!callerIsOwner) return json({ error: "forbidden_owner_only" }, 403);
        return await grantAdmin(admin, payload?.userId as string, callerId);
      case "revoke_admin":
        if (!callerIsOwner) return json({ error: "forbidden_owner_only" }, 403);
        return await revokeAdmin(admin, payload?.userId as string);
      case "invite_admin":
        if (!callerIsOwner) return json({ error: "forbidden_owner_only" }, 403);
        return await inviteAdmin(admin, (payload?.email as string || "").trim().toLowerCase(), callerId);
      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (err) {
    return json({ error: (err as Error).message || "internal_error" }, 500);
  }
});

async function isProtectedOwner(admin: ReturnType<typeof createClient>, userId: string) {
  const { data } = await admin.from("admins").select("is_owner").eq("user_id", userId).maybeSingle();
  return !!data?.is_owner;
}

async function suspendUser(admin: ReturnType<typeof createClient>, userId: string) {
  if (!userId) return json({ error: "missing_userId" }, 400);
  if (await isProtectedOwner(admin, userId)) return json({ error: "cannot_modify_owner" }, 403);

  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
  if (error) return json({ error: error.message }, 500);
  await admin.from("profiles").update({ suspended: true }).eq("id", userId);
  return json({ message: "Compte suspendu." });
}

async function reactivateUser(admin: ReturnType<typeof createClient>, userId: string) {
  if (!userId) return json({ error: "missing_userId" }, 400);
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
  if (error) return json({ error: error.message }, 500);
  await admin.from("profiles").update({ suspended: false }).eq("id", userId);
  return json({ message: "Compte réactivé." });
}

async function deleteUser(admin: ReturnType<typeof createClient>, userId: string) {
  if (!userId) return json({ error: "missing_userId" }, 400);
  if (await isProtectedOwner(admin, userId)) return json({ error: "cannot_modify_owner" }, 403);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return json({ error: error.message }, 500);
  return json({ message: "Compte supprimé." });
}

async function grantAdmin(admin: ReturnType<typeof createClient>, userId: string, callerId: string) {
  if (!userId) return json({ error: "missing_userId" }, 400);
  const { error } = await admin.from("admins").upsert(
    { user_id: userId, is_owner: false, status: "active", added_by: callerId },
    { onConflict: "user_id" }
  );
  if (error) return json({ error: error.message }, 500);
  return json({ message: "Droits administrateur accordés." });
}

async function revokeAdmin(admin: ReturnType<typeof createClient>, userId: string) {
  if (!userId) return json({ error: "missing_userId" }, 400);
  if (await isProtectedOwner(admin, userId)) return json({ error: "cannot_modify_owner" }, 403);

  const { error } = await admin.from("admins").update({ status: "revoked" }).eq("user_id", userId);
  if (error) return json({ error: error.message }, 500);
  return json({ message: "Droits administrateur retirés." });
}

async function inviteAdmin(admin: ReturnType<typeof createClient>, email: string, callerId: string) {
  if (!email) return json({ error: "missing_email" }, 400);

  const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();

  if (existingProfile) {
    const { error } = await admin.from("admins").upsert(
      { user_id: existingProfile.id, is_owner: false, status: "active", added_by: callerId },
      { onConflict: "user_id" }
    );
    if (error) return json({ error: error.message }, 500);
    return json({ message: "Ce compte existait déjà : il est maintenant administrateur." });
  }

  const { error } = await admin.from("admin_invites").upsert(
    { email, invited_by: callerId, accepted: false },
    { onConflict: "email" }
  );
  if (error) return json({ error: error.message }, 500);
  return json({ message: "Invitation enregistrée : cet email deviendra administrateur dès son inscription." });
}
