/* ════════════════════════════════════════
   CarbonIQ — profile.js
   User profile and history charts
════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
  const session = await checkSession();
  if (!session.logged_in) {
    window.location.href = '/';
    return;
  }

  document.getElementById('profileUsername').textContent = '🌿 ' + session.username;
  document.getElementById('profileSubtitle').textContent = 'Your sustainability journey';

  const res = await fetch('/api/history');
  const data = await res.json();
  const records = data.records || [];

  renderStats(records);
  renderHistory(records);
  renderProgressChart(records);
});

function renderStats(records) {
  if (!records.length) return;
  const container = document.getElementById('profileStats');
  const best = Math.min(...records.map(r => r.total_yearly));
  const avg = records.reduce((s, r) => s + r.total_yearly, 0) / records.length;
  const latest = records[0]?.total_yearly || 0;

  container.innerHTML = [
    { label: 'Calculations', val: records.length, mono: false },
    { label: 'Best Yearly (kg)', val: best.toFixed(0), mono: true },
    { label: 'Avg Yearly (kg)', val: avg.toFixed(0), mono: true },
    { label: 'Latest (kg/yr)', val: latest.toFixed(0), mono: true },
  ].map(s => `
    <div class="stat-card">
      <div class="stat-card-num" ${s.mono ? 'style="font-family:var(--font-mono)"' : ''}>${s.val}</div>
      <div class="stat-card-label">${s.label}</div>
    </div>
  `).join('');
}

function renderHistory(records) {
  const list = document.getElementById('historyList');
  if (!records.length) {
    list.innerHTML = '<p style="color:#6b8f73;text-align:center;padding:2rem">No calculations yet. <a href="/calculator">Start now →</a></p>';
    return;
  }
  list.innerHTML = records.map(r => `
    <div class="history-item">
      <div class="hist-date">${r.created_at}</div>
      <div>
        <div style="display:flex;gap:1rem;font-size:.85rem;color:#6b8f73;margin-top:.2rem">
          🚗 ${r.transport?.toFixed(2)} · ⚡ ${r.energy?.toFixed(2)} · 🥗 ${r.food?.toFixed(2)} · 🛍️ ${r.activities?.toFixed(2)} kg/day
        </div>
      </div>
      <div class="hist-total">${(r.total_yearly || 0).toFixed(0)} kg/yr</div>
    </div>
  `).join('');
}

function renderProgressChart(records) {
  if (records.length < 2) return;

  const ctx = document.getElementById('progressChart').getContext('2d');
  const sorted = [...records].reverse(); // oldest first

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: sorted.map(r => r.created_at.split(' ')[0]),
      datasets: [
        {
          label: 'Your Yearly CO₂ (kg)',
          data: sorted.map(r => r.total_yearly),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#22c55e',
          pointRadius: 5,
        },
        {
          label: 'Paris Target',
          data: sorted.map(() => 2300),
          borderColor: '#06b6d4',
          borderDash: [6, 3],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#6b8f73', font: { family: 'DM Sans' } } }
      },
      scales: {
        x: { ticks: { color: '#6b8f73' }, grid: { color: '#1e3323' } },
        y: {
          ticks: { color: '#6b8f73', font: { family: 'Space Mono', size: 10 } },
          grid: { color: '#1e3323' }
        }
      }
    }
  });
}
