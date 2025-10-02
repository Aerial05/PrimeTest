export function buildDashboardReportHTML(snapshot, opts = {}) {
  const { autoPrint = false } = opts || {};
  const { capturedAt, appointmentFilters = {}, mostUsedFilters = {}, appointments = [], mostUsed = [], statsOverview = {} } = snapshot || {};

  const esc = (v) => String(v ?? '').replace(/[&<>]/g, (ch)=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[ch]));
  const pretty = (v) => esc(typeof v === 'object' ? JSON.stringify(v, null, 2) : v);

  // Build appointments section with all fields per record in a compact two-column grid
  const apptBlocks = (appointments || []).map((row, idx) => {
    const keys = Object.keys(row || {}).sort();
    const rows = keys.map(k => `<div class="kv"><div class="k">${esc(k)}</div><div class="v">${pretty(row[k])}</div></div>`).join('');
    return `<section class="record"><h4>Appointment ${idx + 1}</h4><div class="kvgrid">${rows}</div></section>`;
  }).join('');

  const mostUsedRows = (mostUsed || []).map(item => `<tr><td>${esc(item.label)}</td><td class="num">${esc(item.value)}</td></tr>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>PrimeLab - Dashboard Report</title>
  <style>
    :root { --ink:#0f172a; --muted:#475569; --border:#cbd5e1; --bg:#ffffff; --pill:#f1f5f9; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: var(--ink); background: var(--bg); margin: 24px; }
    h1 { margin: 0 0 8px; }
    h2 { margin: 24px 0 8px; border-bottom: 2px solid var(--border); padding-bottom: 6px; }
    h3 { margin: 16px 0 6px; color: var(--muted); }
    h4 { margin: 0 0 8px; }
    .meta { color: var(--muted); font-size: 12px; margin-bottom: 6px; }
    .pill { display: inline-block; background: var(--pill); border: 1px solid var(--border); padding: 2px 8px; border-radius: 999px; font-size: 12px; margin-right: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid var(--border); padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f8fafc; }
    td.num { text-align: right; }
    .records { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px,1fr)); gap: 12px; }
    .record { border: 1px solid var(--border); border-radius: 8px; padding: 10px; break-inside: avoid; page-break-inside: avoid; }
    .kvgrid { display: grid; grid-template-columns: 180px 1fr; gap: 6px 10px; }
    .kv { display: contents; }
    .k { font-weight: 700; color: var(--muted); }
    .v { white-space: pre-wrap; word-break: break-word; }
    @page { size: A4 portrait; margin: 10mm; }
    @media print { body { margin: 0; } .no-print { display: none !important; } }
  </style>
  ${autoPrint ? '<script>function doPrint(){ setTimeout(()=>{ window.print(); }, 100); }</script>' : ''}
  </head>
<body ${autoPrint ? 'onload="doPrint()"' : ''}>
  <h1>Dashboard Report</h1>
  <div class="meta">Captured at: ${esc(capturedAt || new Date().toISOString())}</div>

  <h2>Summary (Stats Overview)</h2>
  <table>
    <thead><tr><th>Metric</th><th>Value</th></tr></thead>
    <tbody>
      <tr><td>Upcoming Today</td><td class="num">${esc(statsOverview?.upcoming?.today ?? '')}</td></tr>
      <tr><td>Upcoming Next 7 Days</td><td class="num">${esc(statsOverview?.upcoming?.sevenDays ?? '')}</td></tr>
      <tr><td>Upcoming This Month</td><td class="num">${esc(statsOverview?.upcoming?.month ?? '')}</td></tr>
      <tr><td>Tests Completed (7d)</td><td class="num">${esc(statsOverview?.completed?.d7 ?? '')}</td></tr>
      <tr><td>Tests Completed (30d)</td><td class="num">${esc(statsOverview?.completed?.d30 ?? '')}</td></tr>
      <tr><td>Approved This Month</td><td class="num">${esc(statsOverview?.approvedThisMonth ?? '')}</td></tr>
      <tr><td>Pending Today</td><td class="num">${esc(statsOverview?.pendingToday ?? '')}</td></tr>
    </tbody>
  </table>

  <h2>Appointment Statistics</h2>
  <div>
    <span class="pill">By Month: ${appointmentFilters.monthMode ? 'On' : 'Off'}</span>
    <span class="pill">Range: ${esc(appointmentFilters.range || '')}</span>
    <span class="pill">Month: ${typeof appointmentFilters.selMonth === 'number' ? appointmentFilters.selMonth + 1 : ''}/${esc(appointmentFilters.selYear || '')}</span>
    <span class="pill">Status: ${esc(appointmentFilters.trendStatus || 'all')}</span>
    <span class="pill">Type: ${esc(appointmentFilters.trendSvcType || 'All Services')}</span>
  </div>

  <h3>Appointments (${appointments.length})</h3>
  <div class="records">${apptBlocks || '<p>No appointments matched the filters.</p>'}</div>

  <h2>Most Used Services</h2>
  <div>
    <span class="pill">All Time: ${mostUsedFilters.svcTotalMode ? 'On' : 'Off'}</span>
    <span class="pill">Type: ${esc(mostUsedFilters.svcFilter || 'All Services')}</span>
    <span class="pill">Month: ${typeof mostUsedFilters.svcSelMonth === 'number' ? mostUsedFilters.svcSelMonth + 1 : ''}/${esc(mostUsedFilters.svcSelYear || '')}</span>
  </div>
  <table>
    <thead><tr><th>Service</th><th>Count</th></tr></thead>
    <tbody>${mostUsedRows || '<tr><td colspan="2">No data</td></tr>'}</tbody>
  </table>
</body></html>`;
  return html;
}
export function printDashboardReport(targetWindow) {
  let raw;
  try {
    raw = sessionStorage.getItem('adminDashboardReportSnapshot');
  } catch (_) {}
  if (!raw) {
    alert('No report data available yet. Open the dashboard and adjust filters first.');
    return;
  }
  let snapshot;
  try {
    snapshot = JSON.parse(raw);
  } catch (e) {
    alert('Could not read report snapshot.');
    return;
  }
  const html = buildDashboardReportHTML(snapshot, { autoPrint: true });
  const w = targetWindow || window.open('', '_blank', 'noopener,noreferrer');
  if (!w) { alert('Popup blocked. Please allow popups to print the report.'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export default printDashboardReport;
