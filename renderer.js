// Environment detection for Electron vs browser preview
let fs, path, XLSX;
const isElectronEnv = typeof require === 'function';
if (isElectronEnv) {
  fs = require('fs');
  path = require('path');
  XLSX = require('xlsx');
}

const filePath = isElectronEnv ? require('path').join(__dirname, 'inventory.json') : 'inventory.json';
let inventory = [];
let currentEditIndex = null;
let currentDeleteIndex = null;

// 🧩 Load existing inventory
if (isElectronEnv) {
  if (fs.existsSync(filePath)) {
    try {
      inventory = JSON.parse(fs.readFileSync(filePath));
    } catch (err) {
      console.error("Failed to parse inventory.json:", err);
      inventory = [];
    }
  }
} else {
  // Browser preview: fetch JSON asynchronously
  fetch(filePath)
    .then(res => res.ok ? res.json() : [])
    .then(data => { inventory = Array.isArray(data) ? data : []; refresh(); })
    .catch(() => { /* ignore preview load errors */ });
}

// 🧾 Toast Notification Function
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// 📅 Date Formatting Function (moved here)
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date)) return 'Invalid Date';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Run after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('addBtn');
  const searchInput = document.getElementById('searchInput');
  const filterSelect = document.getElementById('filterSelect');
  const exportBtn = document.getElementById('exportBtn');
  const generateBtn = document.getElementById('generateBtn');
  const saveEditBtn = document.getElementById('saveEditBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

  if (addBtn) addBtn.addEventListener('click', addItem);
  if (searchInput) searchInput.addEventListener('input', refresh);
  if (filterSelect) filterSelect.addEventListener('change', refresh);
  if (exportBtn) exportBtn.addEventListener('click', exportToExcel);
  if (generateBtn) generateBtn.addEventListener('click', generateDemoData);
  if (saveEditBtn) saveEditBtn.addEventListener('click', saveEdit);
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);
  if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', confirmDelete);
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);

  renderTable();
  updateDashboard();
  checkExpiredItems();
});

function refresh() {
  renderTable();
  updateDashboard();
}

// ➕ Add New Item
function addItem() {
  const name = document.getElementById('name').value.trim();
  const quantity = parseInt(document.getElementById('quantity').value);
  const buyPrice = parseFloat(document.getElementById('buyPrice').value);
  const sellPrice = parseFloat(document.getElementById('sellPrice').value);
  const expiry = document.getElementById('expiry').value;

  if (!name || isNaN(quantity) || isNaN(buyPrice) || isNaN(sellPrice)) {
    alert("⚠️ Please fill all fields correctly!");
    return;
  }

  inventory.push({ name, quantity, buyPrice, sellPrice, expiry });
  saveInventory();
  refresh();
  clearForm();
  checkExpiredItems();
  showToast("✅ Product added successfully!");
}

// 🧹 Clear Input Form
function clearForm() {
  ['name', 'quantity', 'buyPrice', 'sellPrice', 'expiry'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

// 💾 Save to JSON
function saveInventory() {
  if (isElectronEnv) {
    fs.writeFileSync(filePath, JSON.stringify(inventory, null, 2));
  } else {
    // In preview, skip filesystem operations
  }
}

// 📋 Render Table
function renderTable() {
  const tbody = document.querySelector('#inventoryTable tbody');
  tbody.innerHTML = '';

  const searchText = document.getElementById('searchInput').value.toLowerCase();
  const filterType = document.getElementById('filterSelect').value;
  const today = new Date();

  inventory.forEach((item, index) => {
    const profit = (item.sellPrice - item.buyPrice) * item.quantity;
    const expiryDate = item.expiry ? new Date(item.expiry) : null;
    let statusKey = "good";
    let statusLabel = "Good";
    let rowClass = "";

    // 🔹 Expiry status
    if (expiryDate) {
      const diffDays = (expiryDate - today) / (1000 * 60 * 60 * 24);
      if (diffDays < 0) {
        statusKey = "expired";
        statusLabel = "Expired";
        rowClass = "expired";
      } else if (diffDays <= 7) {
        statusKey = "near-expiry";
        statusLabel = "Near Expiry";
        rowClass = "near-expiry";
      }
    }

    // 🔹 Stock status
    if (item.quantity === 0) {
      statusKey = "out-of-stock";
      statusLabel = "Out of Stock";
      rowClass = "out-of-stock";
    } else if (item.quantity < 5) {
      statusKey = "low-stock";
      statusLabel = "Low Stock";
      rowClass = "low-stock";
    }

    // 🔹 Filtering logic
    const matchesSearch = item.name.toLowerCase().includes(searchText);
    const matchesFilter = filterType === "all" || filterType === statusKey || (filterType === "good" && statusKey === "good");


    if (matchesSearch && matchesFilter) {
      const row = document.createElement('tr');
      if (rowClass) row.classList.add(rowClass);
      const statusBadge = `<span class="badge ${statusKey}">${statusLabel}</span>`;
      row.innerHTML = `
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>₱${item.buyPrice.toFixed(2)}</td>
        <td>₱${item.sellPrice.toFixed(2)}</td>
        <td>₱${profit.toFixed(2)}</td>
        <td>${formatDate(item.expiry)}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="editBtn" data-index="${index}">✏️</button>
          <button class="deleteBtn" data-index="${index}">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    }
  });

  document.querySelectorAll('.editBtn').forEach(btn =>
    btn.addEventListener('click', e => editItem(e.target.dataset.index))
  );

  document.querySelectorAll('.deleteBtn').forEach(btn =>
    btn.addEventListener('click', e => deleteItem(e.target.dataset.index))
  );
}

// 📊 Dashboard Updates
function updateDashboard() {
  const total = inventory.length;
  const low = inventory.filter(i => i.quantity < 5 && i.quantity > 0).length;
  const out = inventory.filter(i => i.quantity === 0).length;
  const expired = inventory.filter(i => {
    if (!i.expiry) return false;
    return new Date(i.expiry) < new Date();
  }).length;

  const totalProfit = inventory.reduce((sum, i) => {
    return sum + (i.sellPrice - i.buyPrice) * i.quantity;
  }, 0);

  document.getElementById('totalProducts').textContent = total;
  document.getElementById('lowStock').textContent = low;
  document.getElementById('outOfStock').textContent = out;
  document.getElementById('expiredCount').textContent = expired;
  document.getElementById('totalProfit').textContent = `₱${totalProfit.toFixed(2)}`;
}

// ✏️ Edit Modal Logic
function editItem(index) {
  const item = inventory[index];
  if (!item) return;

  currentEditIndex = index;

  document.getElementById('editName').value = item.name;
  document.getElementById('editQty').value = item.quantity;
  document.getElementById('editBuy').value = item.buyPrice;
  document.getElementById('editSell').value = item.sellPrice;
  document.getElementById('editExpiry').value = item.expiry;

  document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
  currentEditIndex = null;
}

function saveEdit() {
  if (currentEditIndex === null) return;

  const updated = {
    name: document.getElementById('editName').value.trim(),
    quantity: parseInt(document.getElementById('editQty').value),
    buyPrice: parseFloat(document.getElementById('editBuy').value),
    sellPrice: parseFloat(document.getElementById('editSell').value),
    expiry: document.getElementById('editExpiry').value
  };

  inventory[currentEditIndex] = updated;
  saveInventory();
  refresh();
  closeEditModal();
  checkExpiredItems();
}

// 🗑️ Delete Modal Logic
function deleteItem(index) {
  const item = inventory[index];
  if (!item) return;
  currentDeleteIndex = index;
  document.getElementById('deleteMessage').textContent =
    `Are you sure you want to delete “${item.name}”?`;
  document.getElementById('deleteModal').style.display = 'flex';
}

function closeDeleteModal() {
  document.getElementById('deleteModal').style.display = 'none';
  currentDeleteIndex = null;
}

function confirmDelete() {
  if (currentDeleteIndex === null) return;
  inventory.splice(currentDeleteIndex, 1);
  saveInventory();
  refresh();
  checkExpiredItems();
  closeDeleteModal();
}

// ⚠️ Combined Expiry + Stock Warnings
function checkExpiredItems() {
  const today = new Date();
  const expired = [];
  const nearExpiry = [];
  const lowStock = [];
  const outOfStock = [];

  inventory.forEach(item => {
    if (item.quantity === 0) outOfStock.push(item.name);
    else if (item.quantity < 5) lowStock.push(item.name);

    if (!item.expiry) return;
    const expDate = new Date(item.expiry);
    const diffDays = (expDate - today) / (1000 * 60 * 60 * 24);

    if (diffDays < 0)
      expired.push(`${item.name} (expired on ${formatDate(item.expiry)})`);
    else if (diffDays <= 7)
      nearExpiry.push(`${item.name} (expires on ${formatDate(item.expiry)})`);
  });

  if (expired.length)
    showToast(`❌ Expired: ${expired.join(', ')}`, 'error');
  if (nearExpiry.length)
    showToast(`⏳ Near Expiry: ${nearExpiry.join(', ')}`, 'warning');
  if (lowStock.length)
    showToast(`📉 Low Stock: ${lowStock.join(', ')}`, 'info');
  if (outOfStock.length)
    showToast(`📦 Out of Stock: ${outOfStock.join(', ')}`, 'info');
}

// 📤 Export Inventory
function exportToExcel() {
  if (!isElectronEnv) {
    alert('CSV/XLSX export is available in the Electron app.');
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(inventory);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
  XLSX.writeFile(workbook, 'inventory_export.xlsx');
  alert("✅ Exported successfully!");
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  fs.writeFileSync(path.join(__dirname, 'inventory_export.csv'), csv);
  console.log("✅ CSV file saved as inventory_export.csv");
}

window.editItem = editItem;
window.deleteItem = deleteItem;
window.exportToExcel = exportToExcel;
// 🔧 Generate demo inventory via Node script (Electron only)
function generateDemoData() {
  if (!isElectronEnv) {
    alert('Generator is available in the Electron app.');
    return;
  }
  try {
    // Run generator script; requiring it executes its code
    require(path.join(__dirname, 'generate_inventory.js'));
    // Reload JSON and refresh UI
    inventory = JSON.parse(fs.readFileSync(filePath));
    refresh();
    checkExpiredItems();
    showToast('✅ Demo data generated and loaded!', 'info');
  } catch (err) {
    console.error('Failed to generate demo data:', err);
    alert('❌ Failed to generate demo data. Check console for details.');
  }
}
