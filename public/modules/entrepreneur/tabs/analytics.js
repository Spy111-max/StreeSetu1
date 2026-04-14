import { currency, fetchJson, renderEmpty, setMessage } from '../core.js';

const businessTotals = document.getElementById('businessTotals');
const businessFinanceForm = document.getElementById('businessFinanceForm');
const businessFinanceMsg = document.getElementById('businessFinanceMsg');
const businessFinanceRecords = document.getElementById('businessFinanceRecords');

function renderTotals(totals) {
  businessTotals.innerHTML = `
    <div class="stat-card"><strong>${currency(totals.revenue)}</strong><span>Total revenue</span></div>
    <div class="stat-card"><strong>${Number(totals.items_sold || 0)}</strong><span>Items sold</span></div>
    <div class="stat-card"><strong>${Number(totals.product_count || 0)}</strong><span>Products</span></div>
    <div class="stat-card"><strong>${Number(totals.order_count || 0)}</strong><span>Orders</span></div>
  `;
}

function renderFinanceRecords(records) {
  if (!records.length) {
    renderEmpty(businessFinanceRecords, 'No finance records yet.');
    return;
  }

  businessFinanceRecords.innerHTML = records
    .map(
      (record) => `
        <article class="mini-card">
          <div class="item-topline">
            <strong>${record.period.toUpperCase()} • ${record.record_date}</strong>
            <span>${currency(record.revenue)}</span>
          </div>
          <p>Expenses: ${currency(record.expenses)} • Orders: ${record.orders_count}</p>
          <p>${record.notes || 'No notes recorded.'}</p>
        </article>
      `
    )
    .join('');
}

export async function loadEntrepreneurAnalytics() {
  const data = await fetchJson('/api/dashboard/entrepreneur/analytics');
  renderTotals(data.totals || {});
  renderFinanceRecords(data.records || []);
}

export function initEntrepreneurAnalyticsTab() {
  businessFinanceForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(businessFinanceMsg, 'Saving...');
    const formData = new FormData(businessFinanceForm);
    try {
      await fetchJson('/api/dashboard/entrepreneur/analytics', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(formData.entries()))
      });
      businessFinanceForm.reset();
      await loadEntrepreneurAnalytics();
      setMessage(businessFinanceMsg, 'Finance record saved.', true);
    } catch (error) {
      setMessage(businessFinanceMsg, error.message);
    }
  });
}
