/* ════════════════════════════════════════
   CarbonIQ — dashboard.js
   Results display, charts, and AI recommendations
════════════════════════════════════════ */

// ── Load Results ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const stored = sessionStorage.getItem('carbonResult');
  const inputStored = sessionStorage.getItem('carbonInput');

  if (!stored) {
    document.getElementById('dashboardContent').classList.add('hidden');
    document.getElementById('noResults').classList.remove('hidden');
    return;
  }

  const result = JSON.parse(stored);
  const inputData = inputStored ? JSON.parse(inputStored) : {};
  renderDashboard(result, inputData);
});

function renderDashboard(result, inputData) {
  // ── Score Numbers ──────────────────────────────────────────────────────────
  document.getElementById('dailyCO2').textContent = fmt(result.total_daily);
  document.getElementById('monthlyCO2').textContent = fmt(result.total_monthly);
  document.getElementById('yearlyCO2').textContent = fmt(result.total_yearly, 0);

  const percentile = result.risk_level?.percentile || 50;
  document.getElementById('percentile').textContent = `Top ${100 - percentile}%`;

  // Risk badge
  const badge = document.getElementById('riskBadge');
  const risk = result.risk_level || {};
  badge.textContent = `${risk.emoji || ''} ${risk.level || 'Unknown'} Impact — ${risk.message || ''}`;
  badge.style.color = risk.color || '#22c55e';
  badge.style.borderColor = risk.color || '#22c55e';
  badge.style.background = hexToRgba(risk.color || '#22c55e', 0.1);

  // ── Charts ─────────────────────────────────────────────────────────────────
  renderBreakdownChart(result);
  renderBenchmarkChart(result);
  renderCategoryBars(result);
}

function renderBreakdownChart(result) {
  const cats = result.categories || {};
  const ctx = document.getElementById('breakdownChart').getContext('2d');

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['🚗 Transport', '⚡ Energy', '🥗 Food', '🛍️ Activities'],
      datasets: [{
        data: [cats.transport || 0, cats.energy || 0, cats.food || 0, cats.activities || 0],
        backgroundColor: ['#22c55e', '#06b6d4', '#eab308', '#a78bfa'],
        borderWidth: 0,
        hoverOffset: 6,
      }]
    },
    options: {
      cutout: '65%',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#6b8f73',
            font: { family: 'DM Sans', size: 12 },
            padding: 12,
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.toFixed(2)} kg CO₂/day (${result.percentages?.[ctx.label.split(' ')[1]?.toLowerCase()] || ''}%)`
          }
        }
      },
      animation: { animateRotate: true, duration: 1000 }
    }
  });
}

function renderBenchmarkChart(result) {
  const yearly = result.total_yearly || 0;
  const benches = result.benchmarks || {};
  const ctx = document.getElementById('benchmarkChart').getContext('2d');

  const labels = ['You', 'India Avg', 'World Avg', 'EU Avg', 'Paris Target', 'USA Avg'];
  const values = [yearly, benches.india_avg || 1900, benches.world_avg || 4700, benches.eu_avg || 6400, benches.paris_target || 2300, benches.usa_avg || 14700];
  const colors = values.map((v, i) => i === 0 ? '#22c55e' : '#1e3323');
  const borders = values.map((v, i) => i === 0 ? '#22c55e' : '#243d2a');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 1.5,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.y.toLocaleString()} kg CO₂/year`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#6b8f73', font: { family: 'DM Sans', size: 11 } },
          grid: { color: '#1e3323' }
        },
        y: {
          ticks: {
            color: '#6b8f73',
            font: { family: 'Space Mono', size: 10 },
            callback: v => v.toLocaleString()
          },
          grid: { color: '#1e3323' }
        }
      },
      animation: { duration: 1000 }
    }
  });
}

function renderCategoryBars(result) {
  const cats = result.categories || {};
  const pcts = result.percentages || {};
  const container = document.getElementById('categoryBars');

  const items = [
    { icon: '🚗', label: 'Transport', key: 'transport', color: '#22c55e' },
    { icon: '⚡', label: 'Energy', key: 'energy', color: '#06b6d4' },
    { icon: '🥗', label: 'Food', key: 'food', color: '#eab308' },
    { icon: '🛍️', label: 'Lifestyle', key: 'activities', color: '#a78bfa' },
  ];

  container.innerHTML = items.map(item => {
    const val = cats[item.key] || 0;
    const pct = pcts[item.key] || 0;
    return `
      <div class="cat-bar-item">
        <div class="cat-bar-header">
          <span class="cat-bar-label">${item.icon} ${item.label}</span>
          <span class="cat-bar-val">${fmt(val)} kg/day · ${pct}%</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:0%;background:${item.color}" 
               data-target="${pct}"></div>
        </div>
      </div>
    `;
  }).join('');

  // Animate bars
  setTimeout(() => {
    document.querySelectorAll('.bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.target + '%';
    });
  }, 200);
}

// ── AI Recommendations ────────────────────────────────────────────────────────
async function loadRecommendations() {
  const btn = document.getElementById('loadRecsBtn');
  const loading = document.getElementById('recLoading');
  const grid = document.getElementById('recGrid');

  btn.disabled = true;
  btn.textContent = 'Loading...';
  loading.classList.remove('hidden');
  grid.innerHTML = '';

  const result = JSON.parse(sessionStorage.getItem('carbonResult') || '{}');
  const inputData = JSON.parse(sessionStorage.getItem('carbonInput') || '{}');

  try {
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categories: result.categories,
        total_yearly: result.total_yearly,
        input_data: inputData
      })
    });

    const data = await res.json();
    loading.classList.add('hidden');

    const recs = data.recommendations || [];
    grid.innerHTML = recs.map(rec => `
      <div class="rec-card">
        <div class="rec-card-header">
          <span class="rec-icon">${rec.icon || '🌱'}</span>
          <span class="rec-impact ${rec.impact}">${rec.impact?.toUpperCase() || 'MEDIUM'} IMPACT</span>
        </div>
        <div class="rec-title">${escHtml(rec.title)}</div>
        <div class="rec-desc">${escHtml(rec.description)}</div>
        <div class="rec-footer">
          <span class="rec-tag">💾 ~${(rec.estimated_reduction_kg_yearly || 0).toLocaleString()} kg/yr saved</span>
          <span class="rec-tag">${rec.difficulty === 'easy' ? '✅' : rec.difficulty === 'medium' ? '⚙️' : '🔧'} ${capitalize(rec.difficulty || 'medium')}</span>
        </div>
      </div>
    `).join('');

    btn.textContent = '✅ Loaded';
  } catch (err) {
    loading.classList.add('hidden');
    grid.innerHTML = '<p style="color:#6b8f73;">Failed to load recommendations. Try again.</p>';
    btn.textContent = 'Retry';
    btn.disabled = false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n, d = 2) {
  if (!n && n !== 0) return '—';
  return parseFloat(n).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });
}

function hexToRgba(hex, alpha) {
  if (!hex || !hex.startsWith('#')) return `rgba(34,197,94,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
