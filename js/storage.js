// ---------- ฐานข้อมูลสินค้าขาด: เก็บใน localStorage ของแต่ละ browser ----------
// แต่ละ item เป็น object แบบยืดหยุ่น (schema-less) เพิ่ม field ใหม่ได้ในอนาคต
// โดยไม่กระทบข้อมูลเก่า เพราะไม่มีการกำหนด schema ตายตัว

const ITEMS_KEY = "stock_items_v1";

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getAllItems() {
  return JSON.parse(localStorage.getItem(ITEMS_KEY) || "[]");
}

function saveAllItems(items) {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

function addItem(name) {
  const items = getAllItems();
  const item = {
    id: uuid(),
    name: name.trim(),
    date: todayStr(),
    flags: {
      ordered: false,
      received: false,
      out_of_stock: false,
      affiliate_url: null,
      note: null,            // โน้ตสั้น เช่น "ลูกค้าสั่งจอง"
      customer_name: null,   // ชื่อลูกค้า (ใช้ตอนพิมพ์ใบเสร็จมัดจำ)
      deposit_amount: 0,     // ยอดมัดจำ (บาท)
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  items.push(item);
  saveAllItems(items);
  return item;
}

function updateItemName(id, newName) {
  const items = getAllItems();
  const item = items.find((i) => i.id === id);
  if (item) {
    item.name = newName.trim();
    item.updated_at = new Date().toISOString();
    saveAllItems(items);
  }
}

function deleteItem(id) {
  saveAllItems(getAllItems().filter((i) => i.id !== id));
}

function setFlag(id, flag, value) {
  const items = getAllItems();
  const item = items.find((i) => i.id === id);
  if (item) {
    item.flags[flag] = value;
    item.updated_at = new Date().toISOString();
    saveAllItems(items);
  }
}

function setAffiliateUrl(id, url) {
  const items = getAllItems();
  const item = items.find((i) => i.id === id);
  if (item) {
    item.flags.affiliate_url = url && url.trim() !== "" ? url.trim() : null;
    item.updated_at = new Date().toISOString();
    saveAllItems(items);
  }
}

/**
 * บันทึกโน้ตสั้น + ข้อมูลมัดจำ ของรายการสินค้าหนึ่งชิ้น
 * @param {string} id
 * @param {{note?: string, customerName?: string, depositAmount?: number}} data
 */
function setNoteAndDeposit(id, { note = "", customerName = "", depositAmount = 0 } = {}) {
  const items = getAllItems();
  const item = items.find((i) => i.id === id);
  if (item) {
    item.flags.note = note && note.trim() !== "" ? note.trim() : null;
    item.flags.customer_name = customerName && customerName.trim() !== "" ? customerName.trim() : null;
    item.flags.deposit_amount = Number(depositAmount) || 0;
    item.updated_at = new Date().toISOString();
    saveAllItems(items);
  }
}

function getItemById(id) {
  return getAllItems().find((i) => i.id === id) || null;
}

function getShopName() {
  return localStorage.getItem("stock_shop_name") || "ร้านค้าของฉัน";
}

function setShopName(name) {
  localStorage.setItem("stock_shop_name", name.trim() || "ร้านค้าของฉัน");
}

function postponeToNextDay(id) {
  const items = getAllItems();
  const item = items.find((i) => i.id === id);
  if (item) {
    const d = new Date(item.date + "T00:00:00");
    d.setDate(d.getDate() + 1);
    item.date = d.toISOString().slice(0, 10);
    item.updated_at = new Date().toISOString();
    saveAllItems(items);
  }
}

function listItems({ nameFilter = null, dateFrom = null, dateTo = null } = {}) {
  let items = getAllItems();
  if (nameFilter) {
    const q = nameFilter.toLowerCase();
    items = items.filter((i) => i.name.toLowerCase().includes(q));
  }
  if (dateFrom) items = items.filter((i) => i.date >= dateFrom);
  if (dateTo) items = items.filter((i) => i.date <= dateTo);

  items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.name.localeCompare(b.name)));

  const groupsMap = new Map();
  for (const item of items) {
    if (!groupsMap.has(item.date)) groupsMap.set(item.date, []);
    groupsMap.get(item.date).push(item);
  }
  return Array.from(groupsMap.entries()).map(([date, items]) => ({ date, items }));
}

function autocompleteNames(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const names = new Set(getAllItems().map((i) => i.name));
  return Array.from(names)
    .filter((n) => n.toLowerCase().includes(q))
    .sort()
    .slice(0, 15);
}

function summary() {
  const items = getAllItems();
  const totalItems = items.length;
  const totalMissingUnresolved = items.filter(
    (i) => i.flags.out_of_stock && !i.flags.received
  ).length;
  return { totalItems, totalMissingUnresolved };
}

function exportBackup() {
  const data = {
    exported_at: new Date().toISOString(),
    items: getAllItems(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stock-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importBackup(jsonText) {
  const data = JSON.parse(jsonText);
  if (!Array.isArray(data.items)) throw new Error("ไฟล์สำรองไม่ถูกต้อง");
  saveAllItems(data.items);
}
