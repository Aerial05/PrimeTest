export function buildDashboardReportHTML(snapshot, opts = {}) {
  const { autoPrint = false } = opts || {};
  const { capturedAt, appointmentFilters = {}, mostUsedFilters = {}, appointments = [], mostUsed = [], statsOverview = {} } = snapshot || {};

  const esc = (v) => String(v ?? '').replace(/[&<>]/g, (ch)=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[ch]));
  const pretty = (v) => esc(typeof v === 'object' ? JSON.stringify(v, null, 2) : v);
  const toISO = (s) => { try { return new Date(s).toISOString(); } catch(_) { return null; } };
  const calcAge = (birthStr, refDate = new Date()) => {
    try {
      const d = new Date(birthStr);
      if (isNaN(d.getTime())) return '';
      let age = refDate.getFullYear() - d.getFullYear();
      const m = refDate.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && refDate.getDate() < d.getDate())) age--;
      return age >= 0 ? `${age}y` : '';
    } catch(_) { return ''; }
  };
  const linkify = (url) => {
    const u = String(url || '').trim();
    if (!u) return '';
    const safe = esc(u);
    return `<a href="${safe}" target="_blank" rel="noopener">Open</a>`;
  };

  // Build appointments section with structured groups
  const apptBlocks = (appointments || []).map((row, idx) => {
    const firstName = row.FIRST_NAME || row.firstName || '';
    const lastName = row.LAST_NAME || row.lastName || '';
    const gender = row.GENDER || row.gender || '';
    const birthday = row.BIRTHDAY || row.birthday || '';
    const ageStr = birthday ? ` (${calcAge(birthday)})` : '';
    const email = row.EMAIL || row.email || '';
    const phone = row.PHONE || row.phone || '';
    const special = row.SPECIAL_INSTRUCTIONS || row.specialInstructions || '';
    const chief = row.CHIEF_COMPLAINT || row.chiefComplaint || '';
    const apptDate = row.DATE_OF_APPOINTMENT || row.dateOfAppointment || '';
    const time = row.TIME_SLOT || row.timeSlot || '';
    const createdAt = row.CREATED_AT || row.createdAt || '';
    const updatedAt = row.UPDATED_AT || row.updatedAt || '';
    const status = row.BOOKING_STATUS || row.status || '';
    const proof = row.PROOF || row.proof || '';
    const apptId = row.APPT_ID || row.apptId || row.id || '';
    const serviceId = row.SERVICE_ID || row.serviceId || '';
    const serviceType = row.SERVICE_TYPE || row.serviceType || '';
    const serviceName = row.SERVICE_NAME || row.serviceName || (serviceId ? `Service ${serviceId}` : (serviceType || 'Service'));
    const slotRef = row.SLOT_CAPACITY_REF || row.slotCapacityRef || '';

    const userInfo = `
      <div class="kvgrid">
        <div class="kv"><div class="k">Name</div><div class="v"><strong>${esc(lastName)}</strong>${firstName ? `, ${esc(firstName)}` : ''}</div></div>
        <div class="kv"><div class="k">Gender</div><div class="v">${esc(gender)}</div></div>
        <div class="kv"><div class="k">Birthday</div><div class="v">${esc(birthday)}${ageStr ? ` ${esc(ageStr)}` : ''}</div></div>
        <div class="kv"><div class="k">Email</div><div class="v">${esc(email)}</div></div>
        <div class="kv"><div class="k">Phone</div><div class="v">${esc(phone)}</div></div>
      </div>`;

    const apptInfo = `
      <div class="kvgrid">
        <div class="kv"><div class="k">Date</div><div class="v">${esc(apptDate)}</div></div>
        <div class="kv"><div class="k">Time Slot</div><div class="v">${esc(time)}</div></div>
        <div class="kv"><div class="k">Status</div><div class="v">${esc(status)}</div></div>
        <div class="kv"><div class="k">Appointment ID</div><div class="v">${esc(apptId)}</div></div>
        <div class="kv"><div class="k">Created At</div><div class="v">${esc(createdAt)}</div></div>
        <div class="kv"><div class="k">Updated At</div><div class="v">${esc(updatedAt)}</div></div>
        <div class="kv"><div class="k">Proof</div><div class="v">${linkify(proof)}</div></div>
        <div class="kv"><div class="k">Special Instructions</div><div class="v">${pretty(special)}</div></div>
      </div>`;

    const svcInfo = `
      <div class="kvgrid">
        <div class="kv"><div class="k">Service Name</div><div class="v">${esc(serviceName)}</div></div>
        <div class="kv"><div class="k">Service Type</div><div class="v">${esc(serviceType)}</div></div>
        <div class="kv"><div class="k">Service ID</div><div class="v">${esc(serviceId)}</div></div>
        <div class="kv"><div class="k">Slot Capacity Ref</div><div class="v">${esc(slotRef)}</div></div>
      </div>`;

    const chiefBlock = chief ? `<div class="chief"><div class="sectionTitle">Chief Complaint</div><div class="chiefBody">${pretty(chief)}</div></div>` : '';

    return `
      <section class="record">
        <h4 class="recTitle"><span class="svc"><strong>${esc(serviceName)}</strong></span> — <span class="lname"><strong>${esc(lastName)}</strong></span>${firstName ? `<span class="fname">, ${esc(firstName)}</span>` : ''}</h4>
        <div class="section"><div class="sectionTitle">User Info</div>${userInfo}</div>
        <div class="section"><div class="sectionTitle">Appointment Info</div>${apptInfo}</div>
        <div class="section"><div class="sectionTitle">Service Info</div>${svcInfo}</div>
        ${chiefBlock}
      </section>
    `;
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
  .recTitle { margin: 0 0 8px; font-size: 15px; }
  .section { margin-top: 8px; }
  .sectionTitle { font-weight: 700; margin: 6px 0; color: var(--muted); }
  .kvgrid { display: grid; grid-template-columns: 180px 1fr; gap: 6px 10px; }
    .kv { display: contents; }
    .k { font-weight: 700; color: var(--muted); }
    .v { white-space: pre-wrap; word-break: break-word; }
  .chief { margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--border); }
  .chiefBody { white-space: pre-wrap; }
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
