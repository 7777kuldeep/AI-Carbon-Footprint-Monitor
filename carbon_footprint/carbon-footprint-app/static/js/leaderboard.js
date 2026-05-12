/* ════════════════════════════════════════
   CarbonIQ — leaderboard.js
════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();
    renderLeaderboard(data.leaderboard || []);
  } catch (e) {
    document.getElementById('podium').innerHTML = '<p style="color:#6b8f73">Failed to load leaderboard.</p>';
  }
});

function renderLeaderboard(lb) {
  renderPodium(lb.slice(0, 3));
  renderTable(lb);
  renderChart(lb.slice(0, 8));
}

function renderPodium(top3) {
  const podium = document.getElementById('podium');
  if (!top3.length) {
    podium.innerHTML = '<p style="color:#6b8f73;padding:2rem;">No submissions yet. Be the first! 🌱</p>';
    return;
  }

  const order = [top3[1], top3[0], top3[2]].filter(Boolean); // 2nd, 1st, 3rd
  const classes = ['second', 'first', 'third'];
  const ranks = ['🥈', '🥇', '🥉'];
  const rankIndexes = [1, 0, 2];

  podium.innerHTML = order.map((user, i) => `
    <div class="podium-item ${classes[i]}">
      <div class="podium-rank">${ranks[i]}</div>
      <div class="podium-name">${escHtml(user?.username || '?')}</div>
      <div class="podium-co2">${(user?.yearly_co2 || 0).toLocaleString()} kg</div>
      <div class="podium-block">#${rankIndexes[i] + 1}</div>
    </div>
  `).join('');
}

function renderTable(lb) {
  const tbody = document.getElementById('lbBody');
  if (!lb.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#6b8f73;padding:2rem">No data yet.</td></tr>';
    return;
  }

  tbody.innerHTML = lb.map(row => `
    <tr>
      <td><span class="lb-rank ${row.rank <= 3 ? 'top' : ''}">#${row.rank}</span></td>
      <td style="font-weight:600">${escHtml(row.username)}</td>
      <td style="font-size:.85rem">${row.badge}</td>
      <td style="font-family:'Space Mono',monospace;color:#22c55e">${(row.yearly_co2).toLocaleString()}</td>
      <td style="color:#6b8f73">${row.submissions}</td>
    </tr>
  `).join('');
}

function renderChart(lb) {
  const ctx = document.getElementById('lbChart').getContext('2d');
  if (!lb.length) return;

  const greenTarget = 2300; // Paris Agreement target

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: lb.map(u => u.username),
      datasets: [
        {
          label: 'Yearly CO₂ (kg)',
          data: lb.map(u => u.yearly_co2),
          backgroundColor: lb.map(u => u.yearly_co2 < 2300 ? '#22c55e' : u.yearly_co2 < 4700 ? '#eab308' : '#ef4444'),
          borderRadius: 6,
          borderWidth: 0,
        },
        {
          label: 'Paris Target (2,300 kg)',
          data: lb.map(() => greenTarget),
          type: 'line',
          borderColor: '#22c55e',
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
        legend: {
          labels: { color: '#6b8f73', font: { family: 'DM Sans' } }
        }
      },
      scales: {
        x: { ticks: { color: '#6b8f73' }, grid: { color: '#1e3323' } },
        y: {
          ticks: { color: '#6b8f73', font: { family: 'Space Mono', size: 10 }, callback: v => v.toLocaleString() },
          grid: { color: '#1e3323' }
        }
      }
    }
  });
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
