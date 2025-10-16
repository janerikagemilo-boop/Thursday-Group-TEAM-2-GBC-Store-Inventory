const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const productNames = [
  'Coke', 'Pepsi', 'Sprite', 'Royal', 'Mountain Dew', '7 Up', 'Dr Pepper', 'Fanta', 'Sarsi', 'Root Beer',
  'Tanduay', 'San Miguel', 'Red Horse', 'Emperador', 'Ginebra', 'Fundador', 'The Bar', 'Smirnoff', 'Vodka Cruiser', 'Soju'
];
const count = productNames.length;
const inventory = [];

for (let i = 0; i < count; i++) {
  const quantity = ((i + 1) % 10 === 0) ? 0 : ((i + 1) % 12) + 1;
  const buyPrice = 5 + (i + 1);
  const sellPrice = buyPrice + (2 + ((i + 1) % 3));
  let expiry;
  if ((i + 1) % 8 === 0) expiry = '2025-10-01'; // expired
  else if ((i + 1) % 5 === 0) expiry = '2025-10-20'; // near expiry
  else if ((i + 1) % 4 === 0) expiry = '2025-10-31';
  else expiry = '2026-12-14';

  inventory.push({ name: productNames[i], quantity, buyPrice, sellPrice, expiry });
}

const jsonPath = path.join(__dirname, 'inventory.json');
fs.writeFileSync(jsonPath, JSON.stringify(inventory, null, 2));

const worksheet = XLSX.utils.json_to_sheet(inventory);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
XLSX.writeFile(workbook, path.join(__dirname, 'inventory_export.xlsx'));

const csv = XLSX.utils.sheet_to_csv(worksheet);
fs.writeFileSync(path.join(__dirname, 'inventory_export.csv'), csv);

console.log('✅ Generated 20 items and exported to inventory_export.xlsx and inventory_export.csv');