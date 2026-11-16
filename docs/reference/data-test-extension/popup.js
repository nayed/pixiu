const $ = (id) => document.getElementById(id);

function verdict(entries) {
  if (entries.length === 0) return { text: "No attempt yet", cls: "muted" };
  const worked = entries.filter((e) => e.ok).length;
  if (worked === entries.length) return { text: `Yes (${worked} of ${entries.length})`, cls: "yes" };
  if (worked === 0) {
    const last = entries[0];
    const why = last.status ? `HTTP ${last.status}` : last.note ?? "failed";
    return { text: `No (0 of ${entries.length}; latest: ${why})`, cls: "no" };
  }
  return { text: `Sometimes (${worked} of ${entries.length})`, cls: "no" };
}

function show(id, result) {
  $(id).textContent = result.text;
  $(id).className = result.cls;
}

function formatReset(iso) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  const minutes = Math.round((date.getTime() - Date.now()) / 60000);
  const away = minutes >= 0 ? `in ${Math.floor(minutes / 60)} h ${minutes % 60} min` : "already passed";
  return `${date.toLocaleString()} (${away})`;
}

async function render() {
  const { log = [] } = await chrome.storage.local.get("log");

  show("answer-tab", verdict(log.filter((e) => e.source === "tab")));
  show("answer-bg-open", verdict(log.filter((e) => e.source === "background" && e.claudeTabsOpen > 0)));
  show("answer-bg-closed", verdict(log.filter((e) => e.source === "background" && e.claudeTabsOpen === 0)));

  const latest = log.find((e) => e.ok);
  if (latest) {
    const { session, week } = latest.summary;
    $("session-percent").textContent = session?.percent != null ? `${session.percent}%` : "-";
    $("session-reset").textContent = formatReset(session?.resetsAt);
    $("week-percent").textContent = week?.percent != null ? `${week.percent}%` : "-";
    $("week-reset").textContent = formatReset(week?.resetsAt);
    $("raw").textContent = JSON.stringify(latest.raw, null, 2);
  }

  const table = $("log");
  table.replaceChildren();
  if (log.length === 0) {
    const row = table.insertRow();
    const cell = row.insertCell();
    cell.textContent = "Nothing recorded yet.";
    cell.className = "muted";
    return;
  }
  for (const entry of log) {
    const row = table.insertRow();
    row.insertCell().textContent = new Date(entry.at).toLocaleTimeString();
    const where = entry.source === "tab" ? "tab" : `background, ${entry.claudeTabsOpen} tab(s)`;
    row.insertCell().textContent = where;
    const result = row.insertCell();
    result.textContent = entry.ok ? "ok" : entry.status ? `HTTP ${entry.status}` : "failed";
    result.className = entry.ok ? "yes" : "no";
    row.insertCell().textContent = entry.ok
      ? `session ${entry.summary.session?.percent ?? "-"}%, week ${entry.summary.week?.percent ?? "-"}%`
      : entry.note ?? "";
  }
}

$("poll-now").addEventListener("click", async () => {
  $("poll-now").disabled = true;
  await chrome.runtime.sendMessage({ type: "poll-now" });
  $("poll-now").disabled = false;
  render();
});

chrome.storage.onChanged.addListener(render);
render();
