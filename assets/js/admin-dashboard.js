/* ==========================================================================
   BUILD.TECH — Admin : tableau de bord (statistiques)
   ========================================================================== */
(function () {
  async function count(table, filters) {
    var q = window.sb.from(table).select("*", { count: "exact", head: true });
    (filters || []).forEach(function (f) { q = q.eq(f[0], f[1]); });
    var res = await q;
    return res.count || 0;
  }

  async function loadStats() {
    var sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    var totalUsers = await count("profiles");
    var newUsersRes = await window.sb.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo);
    var newUsers = newUsersRes.count || 0;
    var totalConversations = await count("conversations");
    var openConversations = await count("conversations", [["status", "open"]]);
    var unreadConversations = await count("conversations", [["unread_by_admin", true]]);
    var availableComponents = await count("components", [["available", true]]);
    var activeServices = await count("services", [["active", true]]);

    var statGrid = document.getElementById("statGrid");
    statGrid.innerHTML =
      statCard(totalUsers, "Utilisateurs") +
      statCard(openConversations, "Conversations ouvertes") +
      statCard(unreadConversations, "Conversations non lues") +
      statCard(availableComponents, "Composants disponibles");

    document.getElementById("statDetails").innerHTML =
      row("Nouveaux utilisateurs (7 derniers jours)", newUsers) +
      row("Total conversations", totalConversations) +
      row("Services actifs", activeServices);
  }

  function statCard(num, label) {
    return '<div class="stat-card"><div class="num">' + num + '</div><div class="label">' + label + "</div></div>";
  }
  function row(label, value) {
    return "<tr><td>" + escapeHtml(label) + "</td><td><strong>" + value + "</strong></td></tr>";
  }

  document.addEventListener("DOMContentLoaded", loadStats);
})();
