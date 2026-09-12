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

    await loadTraffic();
    await loadSignupsByMonth();
  }

  async function loadTraffic() {
    var now = Date.now();
    var ranges = [
      ["Aujourd'hui", new Date(now - 24 * 3600 * 1000).toISOString()],
      ["7 derniers jours", new Date(now - 7 * 24 * 3600 * 1000).toISOString()],
      ["30 derniers jours", new Date(now - 30 * 24 * 3600 * 1000).toISOString()]
    ];
    var rowsHtml = "";
    for (var i = 0; i < ranges.length; i++) {
      var res = await window.sb.from("page_views").select("*", { count: "exact", head: true }).gte("created_at", ranges[i][1]);
      rowsHtml += row(ranges[i][0], res.count || 0);
    }
    var totalRes = await window.sb.from("page_views").select("*", { count: "exact", head: true });
    rowsHtml += row("Total depuis le lancement", totalRes.count || 0);
    document.getElementById("trafficTable").innerHTML = rowsHtml;
  }

  async function loadSignupsByMonth() {
    var months = [];
    var now = new Date();
    for (var i = 5; i >= 0; i--) {
      var start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      months.push({ label: start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }), start: start, end: end });
    }
    var rowsHtml = "";
    for (var j = 0; j < months.length; j++) {
      var m = months[j];
      var res = await window.sb.from("profiles").select("*", { count: "exact", head: true })
        .gte("created_at", m.start.toISOString()).lt("created_at", m.end.toISOString());
      rowsHtml += row(m.label, res.count || 0);
    }
    document.getElementById("signupsTable").innerHTML = rowsHtml;
  }

  function statCard(num, label) {
    return '<div class="stat-card"><div class="num">' + num + '</div><div class="label">' + label + "</div></div>";
  }
  function row(label, value) {
    return "<tr><td>" + escapeHtml(label) + "</td><td><strong>" + value + "</strong></td></tr>";
  }

  document.addEventListener("DOMContentLoaded", loadStats);
})();
