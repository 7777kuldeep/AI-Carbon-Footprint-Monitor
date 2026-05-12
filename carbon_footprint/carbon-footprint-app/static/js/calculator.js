/* ════════════════════════════════════════
   CarbonIQ — calculator.js
   Multi-step form logic and submission
════════════════════════════════════════ */

let currentStep = 1;
const TOTAL_STEPS = 4;
let transportCount = 1;

// ── Step Navigation ───────────────────────────────────────────────────────────
function nextStep() {
  if (currentStep < TOTAL_STEPS) {
    goToStep(currentStep + 1);
  }
}
function prevStep() {
  if (currentStep > 1) {
    goToStep(currentStep - 1);
  }
}

function goToStep(n) {
  document.getElementById(`step${currentStep}`).classList.add('hidden');
  document.getElementById(`step${currentStep}`).classList.remove('active');
  currentStep = n;
  document.getElementById(`step${currentStep}`).classList.remove('hidden');
  document.getElementById(`step${currentStep}`).classList.add('active');

  // Update progress
  document.querySelectorAll('.prog-step').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.toggle('active', s === currentStep);
  });
  document.getElementById('progressFill').style.width = `${(currentStep / TOTAL_STEPS) * 100}%`;

  // Button visibility
  document.getElementById('prevBtn').style.display = currentStep === 1 ? 'none' : 'inline-flex';
  document.getElementById('nextBtn').classList.toggle('hidden', currentStep === TOTAL_STEPS);
  document.getElementById('submitBtn').classList.toggle('hidden', currentStep !== TOTAL_STEPS);
}

// ── Transport Entries ─────────────────────────────────────────────────────────
function addTransport() {
  const idx = transportCount++;
  const div = document.createElement('div');
  div.className = 'transport-entry card-input';
  div.innerHTML = `
    <div class="input-row">
      <div class="form-group">
        <label>Vehicle Type</label>
        <select name="transport_mode_${idx}" class="form-select">
          <option value="petrol_car">🚗 Petrol Car</option>
          <option value="diesel_car">🚙 Diesel Car</option>
          <option value="electric_car">⚡ Electric Car</option>
          <option value="motorcycle">🏍️ Motorcycle / Scooter</option>
          <option value="auto_rickshaw">🛺 Auto Rickshaw</option>
          <option value="bus">🚌 Public Bus</option>
          <option value="metro_train">🚇 Metro / Train</option>
          <option value="bicycle">🚲 Bicycle</option>
          <option value="walking">🚶 Walking</option>
        </select>
      </div>
      <div class="form-group">
        <label>Distance (km)</label>
        <input type="number" name="transport_dist_${idx}" class="form-input" placeholder="25" min="0" />
      </div>
      <div class="form-group">
        <label>Frequency</label>
        <select name="transport_freq_${idx}" class="form-select">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <button type="button" onclick="this.parentElement.parentElement.remove()" 
        style="align-self:flex-end;padding:.5rem .75rem;background:none;border:1px solid #ef4444;color:#ef4444;border-radius:8px;cursor:pointer;">✕</button>
    </div>
  `;
  document.getElementById('transportList').appendChild(div);
}

// ── Appliance Toggles ─────────────────────────────────────────────────────────
function toggleAppliance(name, checked) {
  const ctrl = document.getElementById(`ctrl_${name}`);
  if (!ctrl) return;
  ctrl.classList.toggle('hidden', !checked);
}

// ── Form Data Collection ──────────────────────────────────────────────────────
function collectFormData() {
  const form = document.getElementById('carbonForm');
  const data = {};

  // Transport
  data.transport = [];
  const transportEntries = document.querySelectorAll('.transport-entry');
  transportEntries.forEach((_, i) => {
    const mode = form.querySelector(`[name^="transport_mode_"]`);
    // Collect all transport entries
  });

  // Re-collect properly
  data.transport = [];
  let idx = 0;
  while (true) {
    const modeEl = form.querySelector(`[name="transport_mode_${idx}"]`);
    if (!modeEl) break;
    const distEl = form.querySelector(`[name="transport_dist_${idx}"]`);
    const freqEl = form.querySelector(`[name="transport_freq_${idx}"]`);
    if (distEl && parseFloat(distEl.value) > 0) {
      data.transport.push({
        mode: modeEl.value,
        distance_km: parseFloat(distEl.value) || 0,
        frequency: freqEl ? freqEl.value : 'daily'
      });
    }
    idx++;
  }

  // Appliances
  const APPLIANCES = ['ac','fan','refrigerator','washing_machine','tv','computer','water_heater','microwave'];
  data.appliances = [];
  APPLIANCES.forEach(name => {
    const checkbox = form.querySelector(`[name="appl_${name}"]`);
    if (checkbox && checkbox.checked) {
      const hours = parseFloat(form.querySelector(`[name="appl_${name}_hours"]`)?.value || 0);
      const qty = parseInt(form.querySelector(`[name="appl_${name}_qty"]`)?.value || 1);
      data.appliances.push({ name, hours_per_day: hours, quantity: qty });
    }
  });
  data.monthly_kwh = parseFloat(document.getElementById('monthlyKwh')?.value || 0);

  // Food
  const foodSelected = form.querySelector('[name="food_habit"]:checked');
  data.food_habit = foodSelected ? foodSelected.value : 'vegetarian';

  // Activities
  const streaming = form.querySelector('[name="streaming"]:checked');
  const shopping = form.querySelector('[name="shopping"]:checked');
  const waste = form.querySelector('[name="waste"]:checked');
  const cooking = form.querySelector('[name="cooking"]:checked');
  data.activities = {
    streaming: streaming ? streaming.value : 'light',
    shopping: shopping ? shopping.value : 'moderate',
    waste: waste ? waste.value : 'medium',
    cooking: cooking ? cooking.value : 'lpg_cooking_low',
  };

  // Username
  const nameInput = document.getElementById('submitterName');
  data.submitter_name = nameInput ? nameInput.value.trim() : '';

  return data;
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function submitForm() {
  const overlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  overlay.classList.remove('hidden');
  loadingText.textContent = 'Calculating your carbon footprint...';

  const formData = collectFormData();

  try {
    const res = await fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!res.ok) throw new Error('Calculation failed');
    const result = await res.json();

    // Store results for dashboard
    sessionStorage.setItem('carbonResult', JSON.stringify(result));
    sessionStorage.setItem('carbonInput', JSON.stringify(formData));

    loadingText.textContent = 'Done! Loading your dashboard...';
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 600);

  } catch (err) {
    overlay.classList.add('hidden');
    showToast('❌ Error: ' + err.message);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  goToStep(1);
  // Pre-check some appliances
  ['fan', 'refrigerator', 'tv', 'computer'].forEach(name => {
    const ctrl = document.getElementById(`ctrl_${name}`);
    if (ctrl) ctrl.classList.remove('hidden');
  });
});
