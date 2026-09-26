/* ESS HOD CUP 2026 - site logic. You normally do not need to edit this file. */

/* =====================================================================
   Derived data
   ===================================================================== */
const TEAM = Object.fromEntries(TEAMS.map(t => [t.id, t]));
PLAYERS.forEach(p => { p.id = `${p.team}-${p.jersey}`; });
const PLAYER = Object.fromEntries(PLAYERS.map(p => [p.id, p]));
PLAYERS.forEach(p => { p.goals = 0; });
MATCHES.forEach(m => (m.goals || []).forEach(([team, jersey]) => { const p = PLAYER[`${team}-${jersey}`]; if (p) p.goals++; }));

const LIVE_WINDOW = 110 * 60 * 1000;
function statusOf(m) {
  if (m.hs != null && m.as != null) return "finished";
  const t = Date.parse(m.date), now = Date.now();
  if (now < t) return "upcoming";
  if (now < t + LIVE_WINDOW) return "live";
  return "pending";
}
const STATUS_LABEL = { upcoming: "Upcoming", live: "Live", finished: "Finished", pending: "Result to come" };

function computeStandings() {
  const rows = Object.fromEntries(TEAMS.map(t => [t.id, { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }]));
  const h2h = {};
  MATCHES.filter(m => !m.stage && statusOf(m) === "finished").forEach(m => {
    const a = rows[m.home], b = rows[m.away];
    a.p++; b.p++; a.gf += m.hs; a.ga += m.as; b.gf += m.as; b.ga += m.hs;
    if (m.hs > m.as) { a.w++; b.l++; h2h[m.home + m.away] = 1; h2h[m.away + m.home] = -1; }
    else if (m.hs < m.as) { b.w++; a.l++; h2h[m.home + m.away] = -1; h2h[m.away + m.home] = 1; }
    else { a.d++; b.d++; }
  });
  const list = Object.values(rows).map(r => ({ ...r, gd: r.gf - r.ga, pts: r.w * 3 + r.d }));
  list.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || -(h2h[x.team.id + y.team.id] || 0) || x.team.name.localeCompare(y.team.name));
  list.forEach((r, i) => r.pos = i + 1);
  return list;
}
const groupComplete = () => { const l = MATCHES.filter(m => !m.stage); return l.length > 0 && l.every(m => statusOf(m) === "finished"); };
function sideOf(m, which) {
  if (m[which]) return { team: TEAM[m[which]] };
  const seed = m[which + "Seed"];
  if (groupComplete() && computeStandings()[seed - 1]) return { team: computeStandings()[seed - 1].team };
  return { label: seed === 1 ? "League winner" : "League runner-up" };
}

/* =====================================================================
   Formatting & small helpers
   ===================================================================== */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (iso, opts) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).format(new Date(iso));
const fDate = iso => fmt(iso, { weekday: "short", day: "numeric", month: "short" });
const fLong = iso => fmt(iso, { weekday: "long", day: "numeric", month: "long" });
const fTime = iso => fmt(iso, { hour: "2-digit", minute: "2-digit", hour12: false });
const dayKey = iso => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const byDate = (a, b) => Date.parse(a.date) - Date.parse(b.date);
const venueOf = m => m.venue || DEFAULT_VENUE;

function badge(team, size = "md") {
  if (!team) return `<span class="badge ${size} tbd" aria-hidden="true">?</span>`;
  return `<span class="badge ${size}${team.short.length > 3 ? " long" : ""}" style="background:${team.color}" aria-hidden="true">${esc(team.short)}</span>`;
}
function pill(status) { return `<span class="pill ${status}">${STATUS_LABEL[status]}</span>`; }
function scoreHTML(m) {
  const s = statusOf(m);
  if (s === "finished") return `<div class="score num">${m.hs}<span class="dash">-</span>${m.as}</div>`;
  if (s === "live") return `<div class="score live-score" aria-label="In progress">Live</div>`;
  return `<div class="score time num">${fTime(m.date)}</div>`;
}
function sideHTML(side, right) {
  const name = side.team ? side.team.name : side.label;
  return `<div class="side${right ? " right" : ""}">${badge(side.team)}<span class="name">${esc(name)}</span></div>`;
}
function matchCard(m, showDate = true) {
  const s = statusOf(m);
  return `<article class="card match">
    <div class="match-meta"><span>${m.stage ? `<span class="stage">${esc(m.stage)}</span>, ` : ""}${showDate ? esc(fDate(m.date)) + ", " : ""}${esc(fTime(m.date))}${venueOf(m) ? " at " + esc(venueOf(m)) : ""}</span>${pill(s)}</div>
    <div class="match-row">${sideHTML(sideOf(m, "home"))}${scoreHTML(m)}${sideHTML(sideOf(m, "away"), true)}</div>
  </article>`;
}
const empty = (title, text = "") => `<div class="card empty"><strong>${esc(title)}</strong>${text ? `<span>${esc(text)}</span>` : ""}</div>`;
const pageHead = (title, text) => `<div class="page-head"><div class="wrap"><h1>${esc(title)}</h1>${text ? `<p>${esc(text)}</p>` : ""}</div></div>`;
const searchIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`;

function topScorers() {
  const list = PLAYERS.filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
  let rank = 0;
  return list.map((p, i) => { if (i === 0 || p.goals !== list[i - 1].goals) rank = i + 1; return { ...p, rank }; });
}

function standingsTable(rows, compact) {
  const q = groupComplete() ? 0 : 2;
  return `<div class="card table-wrap"><table>
    <thead><tr><th class="c" title="Position">Pos</th><th>Team</th><th class="c" title="Played">P</th>
    ${compact ? "" : `<th class="c" title="Won">W</th><th class="c" title="Drawn">D</th><th class="c" title="Lost">L</th><th class="c" title="Goals for">GF</th><th class="c" title="Goals against">GA</th>`}
    <th class="c" title="Goal difference">GD</th><th class="c" title="Points">Pts</th></tr></thead>
    <tbody>${rows.map(r => `<tr class="${r.pos === 1 && r.p ? "lead-row" : ""} ${r.pos <= 2 ? "q" : ""}">
      <td class="pos">${r.pos}</td>
      <td><div class="team-cell">${badge(r.team, "sm")}${esc(r.team.name)}</div></td>
      <td class="c num">${r.p}</td>
      ${compact ? "" : `<td class="c num">${r.w}</td><td class="c num">${r.d}</td><td class="c num">${r.l}</td><td class="c num">${r.gf}</td><td class="c num">${r.ga}</td>`}
      <td class="c num">${r.gd > 0 ? "+" + r.gd : r.gd}</td>
      <td class="pts num">${r.pts}</td></tr>`).join("")}</tbody>
  </table></div>`;
}

/* =====================================================================
   Pages
   ===================================================================== */
const PITCH = `<svg class="pitch" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">
  <rect x="30" y="30" width="1140" height="540"/><line x1="600" y1="30" x2="600" y2="570"/><circle cx="600" cy="300" r="95"/>
  <circle cx="600" cy="300" r="5" fill="currentColor"/><rect x="30" y="150" width="175" height="300"/><rect x="30" y="225" width="60" height="150"/>
  <circle cx="150" cy="300" r="5" fill="currentColor"/><path d="M205 240 A95 95 0 0 1 205 360"/><rect x="995" y="150" width="175" height="300"/>
  <rect x="1110" y="225" width="60" height="150"/><circle cx="1050" cy="300" r="5" fill="currentColor"/><path d="M995 240 A95 95 0 0 0 995 360"/>
  <path d="M30 50 A20 20 0 0 0 50 30 M1150 30 A20 20 0 0 0 1170 50 M30 550 A20 20 0 0 1 50 570 M1150 570 A20 20 0 0 1 1170 550"/></svg>`;

function countdownTarget() {
  const now = Date.now();
  if (now < Date.parse(TOURNAMENT_START)) return { label: "Tournament kicks off in", at: TOURNAMENT_START, note: fLong(TOURNAMENT_START) + ", " + fTime(TOURNAMENT_START) };
  const live = MATCHES.find(m => statusOf(m) === "live");
  const next = MATCHES.filter(m => statusOf(m) === "upcoming").sort(byDate)[0];
  if (next) {
    const h = sideOf(next, "home"), a = sideOf(next, "away");
    return { label: live ? "Playing now. Next kick-off in" : "Next kick-off in", at: next.date,
      note: `${h.team ? h.team.name : h.label} vs ${a.team ? a.team.name : a.label}, ${fDate(next.date)} at ${fTime(next.date)}` };
  }
  if (!MATCHES.length) return { label: "The tournament is under way", at: null, note: "Fixtures will appear here soon." };
  return null;
}

function pageHome() {
  const all = [...MATCHES].sort(byDate);
  const live = all.filter(m => statusOf(m) === "live");
  const upcoming = all.filter(m => statusOf(m) === "upcoming");
  const results = all.filter(m => statusOf(m) === "finished").reverse();
  const motd = live[0] || upcoming[0] || results[0];
  const played = results.length;
  const goals = results.reduce((s, m) => s + m.hs + m.as, 0);
  const cd = countdownTarget();
  const scorers = topScorers().slice(0, 5);

  const motdHTML = motd ? (() => {
    const h = sideOf(motd, "home"), a = sideOf(motd, "away");
    const team = (s) => `<div class="motd-team">${badge(s.team, "lg")}<span>${esc(s.team ? s.team.name : s.label)}</span></div>`;
    return `<article class="card motd">
      <div class="motd-top"><span>${motd.stage ? esc(motd.stage) + ", " : ""}${esc(fLong(motd.date))}, ${esc(fTime(motd.date))}</span>${pill(statusOf(motd))}</div>
      <div class="motd-body">${team(h)}${scoreHTML(motd)}${team(a)}</div>
      ${venueOf(motd) ? `<div class="motd-foot">${esc(venueOf(motd))}</div>` : ""}</article>`;
  })() : empty("Fixtures coming soon", "The match schedule will be published before kick-off on " + fLong(TOURNAMENT_START) + ".");

  return `
  <section class="hero">
    ${PITCH}
    <div class="wrap hero-grid">
      <div>
        <h1><img class="hero-logo" src="logo.webp" alt="HOD Cup 2026, Estate Security Service" width="640" height="430"></h1>
        <p class="lead">The Estate Security Service inter-department football tournament. Fixtures, results and the table, all in one place.</p>
        <div class="hero-actions"><a class="btn btn-light" href="#/fixtures">View fixtures</a><a class="btn btn-outline" href="#/standings">See the table</a></div>
      </div>
      <div>
        ${cd && !cd.at ? `<p class="board-title">${esc(cd.label)}</p><p class="board-note">${esc(cd.note)}</p>` : cd ? `<p class="board-title">${esc(cd.label)}</p>
        <div class="board" role="timer" data-target="${esc(cd.at)}">
          <div class="cell"><b data-u="d">--</b><span>days</span></div>
          <div class="cell"><b data-u="h">--</b><span>hours</span></div>
          <div class="cell"><b data-u="m">--</b><span>min</span></div>
          <div class="cell"><b data-u="s">--</b><span>sec</span></div>
        </div>
        <p class="board-note">${esc(cd.note)}</p>` : `<p class="board-title">All matches played</p><p class="board-note">Thanks for following the ESS HOD CUP 2026.</p>`}
      </div>
    </div>
  </section>
  ${TEAMS.length ? `<section class="stats" aria-label="Tournament statistics">
    <dl class="wrap">
      <div><dt>Teams</dt><dd class="num">${TEAMS.length}</dd></div>
      <div><dt>Players</dt><dd class="num">${PLAYERS.length}</dd></div>
      <div><dt>Matches played</dt><dd class="num">${played}/${MATCHES.length}</dd></div>
      <div><dt>Goals</dt><dd class="num">${goals}</dd></div>
      <div><dt>Goals per match</dt><dd class="num">${played ? (goals / played).toFixed(1) : "0.0"}</dd></div>
    </dl>
  </section>` : ""}
  <div class="wrap home-grid">
    <div class="stack">
      <section><div class="sec-head"><h2>Match of the day</h2></div>${motdHTML}</section>
      <section><div class="sec-head"><h2>Latest results</h2><a href="#/results">All results</a></div>
        ${results.length ? `<div class="list">${results.slice(0, 3).map(m => matchCard(m)).join("")}</div>` : empty("No results yet", "Final scores appear here after each match.")}</section>
      <section><div class="sec-head"><h2>Upcoming matches</h2><a href="#/fixtures">All fixtures</a></div>
        ${live.length + upcoming.length ? `<div class="list">${[...live, ...upcoming].slice(0, 4).map(m => matchCard(m)).join("")}</div>` : empty("No upcoming matches", MATCHES.length ? "" : "Check back once the fixtures are published.")}</section>
    </div>
    <aside class="stack">
      <section><div class="sec-head"><h2>Table</h2><a href="#/standings">Full table</a></div>${TEAMS.length ? standingsTable(computeStandings(), true) : empty("Teams to be announced", "The table appears once the teams are confirmed.")}</section>
      <section><div class="sec-head"><h2>Top scorers</h2><a href="#/scorers">Leaderboard</a></div>
        ${scorers.length ? `<ol class="card mini">${scorers.map(p => `<li><span class="rk">${p.rank}</span>${badge(TEAM[p.team], "sm")}
          <div class="who"><div>${esc(p.name)}</div><small>${esc(TEAM[p.team].name)}</small></div><span class="g num">${p.goals}</span></li>`).join("")}</ol>`
          : empty("No goals yet")}</section>
    </aside>
  </div>`;
}

let fixtureState = { q: "", status: "all" };
function filteredFixtures() {
  const q = fixtureState.q.trim().toLowerCase();
  return [...MATCHES].sort(byDate).filter(m => {
    const s = statusOf(m);
    if (fixtureState.status !== "all" && s !== fixtureState.status && !(fixtureState.status === "finished" && s === "pending")) return false;
    if (!q) return true;
    const h = sideOf(m, "home"), a = sideOf(m, "away");
    return [h.team?.name, a.team?.name, h.label, a.label, m.stage, venueOf(m)].some(v => v && v.toLowerCase().includes(q));
  });
}
function fixtureListHTML() {
  if (!MATCHES.length) return empty("Fixtures coming soon", "The schedule will be published here once the teams and draw are final.");
  const list = filteredFixtures();
  if (!list.length) return empty("No matches found", "Try a different team name or clear the status filter.");
  const groups = [];
  list.forEach(m => { const k = dayKey(m.date); const g = groups.find(x => x.k === k); g ? g.items.push(m) : groups.push({ k, items: [m] }); });
  return groups.map(g => `<section class="day"><h2>${esc(fLong(g.items[0].date))}${g.items[0].md ? `, matchday ${g.items[0].md}` : ""}</h2>
    <div class="grid2">${g.items.map(m => matchCard(m, false)).join("")}</div></section>`).join("");
}
function pageFixtures() {
  const seg = [["all", "All"], ["upcoming", "Upcoming"], ["live", "Live"], ["finished", "Finished"]];
  return `${pageHead("Fixtures", "Every match of the tournament. Kick-off is " + fLong(TOURNAMENT_START) + " at " + fTime(TOURNAMENT_START) + ".")}
  <div class="wrap content">
    <div class="toolbar">
      <label class="search"><span class="sr-only">Search matches</span>${searchIcon}<input class="input" id="fx-q" placeholder="Search by team" value="${esc(fixtureState.q)}"></label>
      <div class="seg" role="group" aria-label="Filter by status">${seg.map(([v, l]) => `<button type="button" data-status="${v}" aria-pressed="${fixtureState.status === v}">${l}</button>`).join("")}</div>
      <button class="btn btn-primary" id="fx-pdf" type="button" ${!MATCHES.length ? "hidden" : ""}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/></svg>Download PDF</button>
    </div>
    <div id="fx-list">${fixtureListHTML()}</div>
  </div>`;
}
function bindFixtures() {
  const input = document.getElementById("fx-q");
  input.addEventListener("input", () => { fixtureState.q = input.value; document.getElementById("fx-list").innerHTML = fixtureListHTML(); });
  document.querySelectorAll("[data-status]").forEach(b => b.addEventListener("click", () => {
    fixtureState.status = b.dataset.status;
    document.querySelectorAll("[data-status]").forEach(x => x.setAttribute("aria-pressed", x === b));
    document.getElementById("fx-list").innerHTML = fixtureListHTML();
  }));
  document.getElementById("fx-pdf").addEventListener("click", downloadPdf);
}

function pageResults() {
  const res = MATCHES.filter(m => statusOf(m) === "finished").sort(byDate).reverse();
  const scorerList = (m, team) => {
    const g = (m.goals || []).filter(x => x[0] === team).sort((a, b) => a[2] - b[2]);
    if (!g.length) return `<ul class="scorers"><li class="min">No scorers</li></ul>`;
    return `<ul class="scorers">${g.map(([t, j, min]) => `<li>${esc(PLAYER[`${t}-${j}`]?.name || "Unknown")} <span class="min">${min}'</span></li>`).join("")}</ul>`;
  };
  return `${pageHead("Results", "Final scores, goal scorers and match reports.")}
  <div class="wrap content"><div class="list">${res.length ? res.map(m => {
    const h = TEAM[m.home], a = TEAM[m.away];
    return `<article class="card result">
      <div class="result-meta"><span>${esc(fLong(m.date))}${m.md ? `, matchday ${m.md}` : ""}</span><span>${esc(venueOf(m))}</span></div>
      <div class="result-body">
        <div><div class="result-team">${badge(h)}<span>${esc(h.name)}</span></div>${scorerList(m, m.home)}</div>
        <div class="score num">${m.hs}<span class="dash">-</span>${m.as}</div>
        <div><div class="result-team">${badge(a)}<span>${esc(a.name)}</span></div>${scorerList(m, m.away)}</div>
      </div>
      ${m.summary ? `<p class="summary">${esc(m.summary)}</p>` : ""}
    </article>`; }).join("") : empty("No results yet", "Completed matches will be listed here.")}</div></div>`;
}

function pageStandings() {
  return `${pageHead("Standings", "Updated automatically from every finished match. Win 3 points, draw 1, loss 0.")}
  <div class="wrap content">${TEAMS.length ? standingsTable(computeStandings(), false) : empty("Teams to be announced", "The league table appears once the teams are confirmed.")}
    <p class="legend">The top two teams, marked in blue, qualify for the final. Ties are separated by goal difference, then goals scored.
    P played, W won, D drawn, L lost, GF goals for, GA goals against, GD goal difference, Pts points.</p></div>`;
}

function pageTeams() {
  return `${pageHead("Teams", TEAMS.length ? TEAMS.length + " departments competing for the cup." : "The departments taking part in the cup.")}
  <div class="wrap content">${TEAMS.length ? "" : empty("Teams to be announced", "Registered teams and their captains will be listed here.")}<div class="team-grid">${TEAMS.map(t => {
    const n = PLAYERS.filter(p => p.team === t.id).length;
    return `<a class="card team-card" href="#/players?team=${t.id}">${badge(t, "lg")}
      <div><h2>${esc(t.name)}</h2><p>Captain: ${esc(t.captain || "To be confirmed")}</p><p class="squad">${n} players</p></div></a>`; }).join("")}</div></div>`;
}

let playerState = { q: "", team: "", position: "" };
function filteredPlayers() {
  const q = playerState.q.trim().toLowerCase();
  return PLAYERS.filter(p => (!playerState.team || p.team === playerState.team) && (!playerState.position || p.position === playerState.position)
    && (!q || p.name.toLowerCase().includes(q) || String(p.jersey) === q))
    .sort((a, b) => a.team === b.team ? a.jersey - b.jersey : TEAM[a.team].name.localeCompare(TEAM[b.team].name));
}
function playerListHTML() {
  if (!PLAYERS.length) return empty("Squads to be announced", "Player lists will appear here once teams register their squads.");
  const list = filteredPlayers();
  const head = `<p class="count">${list.length} of ${PLAYERS.length} players</p>`;
  if (!list.length) return head + empty("No players match", "Clear a filter or check the spelling.");
  return head + `<ul class="player-grid">${list.map(p => { const t = TEAM[p.team]; return `<li class="card player">
    <div class="photo" style="background:linear-gradient(160deg, ${t.color}, #001845)"><span class="jn">${p.jersey}</span><svg aria-hidden="true"><use href="#silhouette"/></svg></div>
    <div class="player-info"><div class="pn">${esc(p.name)}${t.captain === p.name ? " (C)" : ""}</div><div class="pt">${esc(t.name)}</div>
    <div class="pm"><span>${esc(p.position)}</span><span><b class="num">${p.goals}</b> ${p.goals === 1 ? "goal" : "goals"}</span></div></div></li>`; }).join("")}</ul>`;
}
function pagePlayers(params) {
  if (params.has("team")) playerState.team = TEAM[params.get("team")] ? params.get("team") : "";
  return `${pageHead("Players", "Search the full squad list for every team.")}
  <div class="wrap content">
    <div class="toolbar players">
      <label class="search"><span class="sr-only">Search players</span>${searchIcon}<input class="input" id="pl-q" placeholder="Search by name or jersey number" value="${esc(playerState.q)}"></label>
      <select class="input" id="pl-team" aria-label="Filter by team"><option value="">All teams</option>${TEAMS.map(t => `<option value="${t.id}" ${playerState.team === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select>
      <select class="input" id="pl-pos" aria-label="Filter by position"><option value="">All positions</option>${["Goalkeeper","Defender","Midfielder","Forward"].map(p => `<option ${playerState.position === p ? "selected" : ""}>${p}</option>`).join("")}</select>
    </div>
    <div id="pl-list">${playerListHTML()}</div>
  </div>`;
}
function bindPlayers() {
  const upd = () => { document.getElementById("pl-list").innerHTML = playerListHTML(); };
  document.getElementById("pl-q").addEventListener("input", e => { playerState.q = e.target.value; upd(); });
  document.getElementById("pl-team").addEventListener("change", e => { playerState.team = e.target.value; upd(); });
  document.getElementById("pl-pos").addEventListener("change", e => { playerState.position = e.target.value; upd(); });
}

function pageScorers() {
  const list = topScorers();
  return `${pageHead("Top scorers", "The race for the golden boot, updated with every goal.")}
  <div class="wrap content">${list.length ? `<div class="card table-wrap"><table>
    <thead><tr><th class="c">Rank</th><th>Player</th><th>Team</th><th class="r">Goals</th></tr></thead>
    <tbody>${list.map(p => `<tr class="${p.rank === 1 ? "lead-row" : ""}"><td class="pos">${p.rank}</td>
      <td><div style="font-weight:600;white-space:nowrap">${esc(p.name)}</div><div style="font-size:13px;color:var(--muted)">#${p.jersey} ${esc(p.position)}</div></td>
      <td><div class="team-cell">${badge(TEAM[p.team], "sm")}${esc(TEAM[p.team].name)}</div></td>
      <td class="pts num" style="text-align:right">${p.goals}</td></tr>`).join("")}</tbody></table></div>` : empty("No goals yet", "The golden boot race starts with the first goal of the tournament.")}</div>`;
}

/* =====================================================================
   PDF download
   ===================================================================== */
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
async function downloadPdf() {
  const btn = document.getElementById("fx-pdf");
  btn.disabled = true;
  try {
    if (!window.jspdf) {
      await loadScript("jspdf.umd.min.js");
      await loadScript("jspdf.plugin.autotable.min.js");
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape" });
    const w = doc.internal.pageSize.getWidth();
    doc.setFillColor(2, 62, 125); doc.rect(0, 0, w, 26, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text("ESS HOD CUP 2026 - Fixtures", 14, 16);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("Kick-off times are local", w - 14, 16, { align: "right" });
    const list = filteredFixtures();
    doc.autoTable({
      startY: 34,
      head: [["Date", "Time", "Stage", "Home", "Score", "Away", "Venue", "Status"]],
      body: list.map(m => {
        const h = sideOf(m, "home"), a = sideOf(m, "away"), s = statusOf(m);
        return [fDate(m.date), fTime(m.date), m.stage || (m.md ? "Matchday " + m.md : ""), h.team ? h.team.name : h.label,
          s === "finished" ? `${m.hs} - ${m.as}` : "vs", a.team ? a.team.name : a.label, venueOf(m), STATUS_LABEL[s]];
      }),
      headStyles: { fillColor: [3, 83, 164], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [243, 246, 250] },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 4: { halign: "center", fontStyle: "bold" } },
    });
    doc.save("ess-hod-cup-2026-fixtures.pdf");
  } catch (e) {
    toast("The PDF couldn't be created. Refresh the page and try again.");
  } finally { btn.disabled = false; }
}

let toastTimer;
function toast(text) {
  const el = document.getElementById("toast");
  el.textContent = text; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

/* =====================================================================
   Router, countdown, theme
   ===================================================================== */
const ROUTES = {
  "": [pageHome], fixtures: [pageFixtures, bindFixtures], results: [pageResults], standings: [pageStandings],
  teams: [pageTeams], players: [pagePlayers, bindPlayers], scorers: [pageScorers],
};
const TITLES = { "": "", fixtures: "Fixtures", results: "Results", standings: "Standings", teams: "Teams", players: "Players", scorers: "Top scorers" };
let lastRoute = null;
function render() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, qs] = raw.split("?");
  const key = ROUTES[path] ? path : "";
  const [page, bind] = ROUTES[key];
  const app = document.getElementById("app");
  app.innerHTML = page(new URLSearchParams(qs || ""));
  if (bind) bind();
  document.title = TITLES[key] ? `${TITLES[key]} | ESS HOD CUP 2026` : "ESS HOD CUP 2026";
  document.querySelectorAll("#nav a").forEach(a => {
    const on = a.getAttribute("href").replace(/^#\/?/, "") === key;
    on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
    if (on) a.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
  if (lastRoute !== null && lastRoute !== key) { window.scrollTo(0, 0); app.focus({ preventScroll: true }); }
  lastRoute = key;
  tick();
}

function tick() {
  const board = document.querySelector(".board[data-target]");
  if (!board) return;
  let s = Math.max(0, Math.floor((Date.parse(board.dataset.target) - Date.now()) / 1000));
  if (s === 0) { render(); return; }
  const v = { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
  board.querySelectorAll("[data-u]").forEach(el => { el.textContent = String(v[el.dataset.u]).padStart(2, "0"); });
}
setInterval(tick, 1000);
// Re-render once a minute so live / finished states follow the clock.
setInterval(() => { if (!document.activeElement || !["INPUT", "SELECT"].includes(document.activeElement.tagName)) render(); }, 60000);

const SUN = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;
const MOON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;
function isDark() {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
}
function paintToggle() {
  const b = document.getElementById("theme-toggle");
  b.innerHTML = isDark() ? SUN : MOON;
  b.setAttribute("aria-label", isDark() ? "Switch to light mode" : "Switch to dark mode");
}
try { const saved = localStorage.getItem("hodcup-theme"); if (saved === "light" || saved === "dark") document.documentElement.dataset.theme = saved; } catch {}
document.getElementById("theme-toggle").addEventListener("click", () => {
  const next = isDark() ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("hodcup-theme", next); } catch {}
  paintToggle();
});
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", paintToggle);
paintToggle();

window.addEventListener("hashchange", render);
render();
