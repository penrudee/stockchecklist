// ---------- สถิติการสั่งสินค้า: นับความถี่ต่อชื่อสินค้า ภายในช่วงวันที่ที่กำหนด ----------

/**
 * @param {object} opts
 * @param {string|null} opts.dateFrom  YYYY-MM-DD หรือ null (ไม่จำกัดเริ่มต้น)
 * @param {string|null} opts.dateTo    YYYY-MM-DD หรือ null (ไม่จำกัดสิ้นสุด)
 * @param {"all"|"ordered"|"out_of_stock"|"received"} opts.basis
 *        นับจากอะไร: "all" = ทุกครั้งที่มีการบันทึกรายการ (ไม่สนใจ flag)
 *        "ordered"/"out_of_stock"/"received" = นับเฉพาะรายการที่ flag นั้นเป็น true
 * @param {number} opts.limit จำนวนอันดับสูงสุดที่จะคืนค่า (default 10)
 */
function computeTopProductStats({ dateFrom = null, dateTo = null, basis = "all", limit = 10 } = {}) {
  let items = getAllItems();

  if (dateFrom) items = items.filter((i) => i.date >= dateFrom);
  if (dateTo) items = items.filter((i) => i.date <= dateTo);
  if (basis !== "all") items = items.filter((i) => i.flags && i.flags[basis]);

  const counts = new Map();
  for (const item of items) {
    counts.set(item.name, (counts.get(item.name) || 0) + 1);
  }

  const totalInRange = items.length;
  const ranked = Array.from(counts.entries())
    .map(([name, count]) => ({
      name,
      count,
      percent: totalInRange > 0 ? (count / totalInRange) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return { totalInRange, ranked };
}
