let currentFilter = { nameFilter: null, dateFrom: null, dateTo: null };

document.getElementById("whoami").textContent = "ผู้ใช้: " + getCurrentUsername();
document.getElementById("btnLogout").addEventListener("click", logout);

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function refreshTable() {
  const groups = listItems(currentFilter);
  const container = document.getElementById("tableContainer");
  container.innerHTML = "";
  if (groups.length === 0) {
    container.innerHTML = "<p>ยังไม่มีรายการ</p>";
  }
  for (const group of groups) {
    const wrap = document.createElement("div");
    wrap.className = "day-group";
    wrap.innerHTML = `<h2>${group.date}</h2>`;
    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>สินค้า</th>
          <th class="flag-cell">สั่งซื้อแล้ว</th>
          <th class="flag-cell">ได้รับแล้ว</th>
          <th class="flag-cell">สินค้าขาด</th>
          <th class="flag-cell">เลื่อนวันถัดไป</th>
          <th>โน้ต / มัดจำ</th>
          <th>จัดการ</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");
    for (const item of group.items) {
      const hasAffiliate = !!(item.flags.affiliate_url && item.flags.affiliate_url.trim() !== "");
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <a class="item-link" data-id="${item.id}" data-name="${escapeHtml(item.name)}" title="${hasAffiliate ? "เปิดลิงก์ affiliate" : "ค้นหาในหน้าค้นหาสินค้า"}">${escapeHtml(item.name)}</a>
          <button class="ghost affiliate-btn" data-action="affiliate" data-id="${item.id}" data-current="${hasAffiliate ? escapeHtml(item.flags.affiliate_url) : ""}" title="ผูก/แก้ไขลิงก์ affiliate">
            ${hasAffiliate ? "🔗" : "⛓️‍💥"}
          </button>
        </td>
        <td class="flag-cell"><input type="checkbox" data-id="${item.id}" data-flag="ordered" ${item.flags.ordered ? "checked" : ""}></td>
        <td class="flag-cell"><input type="checkbox" data-id="${item.id}" data-flag="received" ${item.flags.received ? "checked" : ""}></td>
        <td class="flag-cell"><input type="checkbox" data-id="${item.id}" data-flag="out_of_stock" ${item.flags.out_of_stock ? "checked" : ""}></td>
        <td class="flag-cell"><input type="checkbox" data-id="${item.id}" data-flag="postpone"></td>
        <td class="note-cell">
          ${item.flags.note ? `<div class="note-text">📝 ${escapeHtml(item.flags.note)}</div>` : `<div class="empty-note">ยังไม่มีโน้ต</div>`}
          ${item.flags.customer_name ? `<div>👤 ${escapeHtml(item.flags.customer_name)}</div>` : ""}
          ${item.flags.deposit_amount > 0 ? `<div class="deposit-text">มัดจำ ฿${item.flags.deposit_amount}</div>` : ""}
          <button class="ghost" data-action="note" data-id="${item.id}" style="margin-top:4px;">✏️ แก้โน้ต/มัดจำ</button>
          ${item.flags.deposit_amount > 0 ? `<button class="ghost" data-action="print-receipt" data-id="${item.id}" style="margin-top:4px;">🧾 พิมพ์ใบเสร็จ</button>` : ""}
        </td>
        <td class="row-actions">
          <button class="ghost" data-action="edit" data-id="${item.id}" data-name="${escapeHtml(item.name)}">✏️ แก้ไข</button>
          <button class="danger" data-action="delete" data-id="${item.id}">🗑️ ลบ</button>
        </td>
      `;
      tbody.appendChild(tr);
    }
    wrap.appendChild(table);
    container.appendChild(wrap);
  }
  bindRowEvents();
  refreshSummary();
}

function bindRowEvents() {
  document.querySelectorAll('input[type="checkbox"][data-flag]').forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      const flag = e.target.dataset.flag;
      if (flag === "postpone") {
        if (e.target.checked) {
          postponeToNextDay(id);
          refreshTable();
        }
        return;
      }
      setFlag(id, flag, e.target.checked);
      refreshSummary();
    });
  });

  document.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      if (confirm("ยืนยันการลบรายการนี้?")) {
        deleteItem(id);
        refreshTable();
      }
    });
  });

  document.querySelectorAll('button[data-action="edit"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      const oldName = e.target.dataset.name;
      const newName = prompt("แก้ไขชื่อสินค้า:", oldName);
      if (newName && newName.trim() !== "" && newName !== oldName) {
        updateItemName(id, newName.trim());
        refreshTable();
      }
    });
  });

  document.querySelectorAll('button[data-action="affiliate"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const button = e.target.closest("button");
      const id = button.dataset.id;
      const current = button.dataset.current || "";
      const url = prompt(
        "วางลิงก์ affiliate ของสินค้านี้ (จาก Shopee Affiliate Portal)\nเว้นว่างแล้วกด OK เพื่อลบลิงก์เดิม",
        current
      );
      if (url === null) return;
      setAffiliateUrl(id, url);
      refreshTable();
    });
  });

  document.querySelectorAll('button[data-action="note"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      openNoteModal(id);
    });
  });

  document.querySelectorAll('button[data-action="print-receipt"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      window.open(`receipt.html?id=${encodeURIComponent(id)}`, "_blank");
    });
  });

  document.querySelectorAll("a.item-link").forEach((a) => {
    a.addEventListener("click", (e) => {
      const name = e.target.dataset.name;
      window.open(`shopee.html?q=${encodeURIComponent(name)}`, "_blank");
    });
  });
}

function refreshSummary() {
  const s = summary();
  document.getElementById("summaryText").textContent =
    `รวมทั้งหมด ${s.totalItems} รายการ | สินค้าขาดที่ยังไม่ได้รับ ${s.totalMissingUnresolved} รายการ`;
}

// ---------- autocomplete ----------
const searchOldInput = document.getElementById("searchOldInput");
const searchSuggestions = document.getElementById("searchSuggestions");

function renderSuggestions(container, names, onPick) {
  container.innerHTML = "";
  if (names.length === 0) {
    container.classList.add("hidden");
    return;
  }
  names.forEach((n) => {
    const div = document.createElement("div");
    div.textContent = n;
    div.addEventListener("click", () => onPick(n));
    container.appendChild(div);
  });
  container.classList.remove("hidden");
}

searchOldInput.addEventListener(
  "input",
  debounce((e) => {
    const q = e.target.value.trim();
    if (q.length === 0) {
      searchSuggestions.classList.add("hidden");
      currentFilter.nameFilter = null;
      refreshTable();
      return;
    }
    const names = autocompleteNames(q);
    renderSuggestions(searchSuggestions, names, (name) => {
      searchOldInput.value = name;
      searchSuggestions.classList.add("hidden");
      currentFilter.nameFilter = name;
      refreshTable();
    });
  }, 150)
);

// ---------- สร้างรายการใหม่ ----------
const btnNewItem = document.getElementById("btnNewItem");
const newItemBox = document.getElementById("newItemBox");
const newItemInput = document.getElementById("newItemInput");
const newItemSuggestions = document.getElementById("newItemSuggestions");

btnNewItem.addEventListener("click", () => {
  newItemBox.classList.toggle("hidden");
  if (!newItemBox.classList.contains("hidden")) newItemInput.focus();
});

newItemInput.addEventListener(
  "input",
  debounce((e) => {
    const q = e.target.value.trim();
    if (q.length === 0) {
      newItemSuggestions.classList.add("hidden");
      return;
    }
    const names = autocompleteNames(q);
    renderSuggestions(newItemSuggestions, names, (name) => {
      newItemInput.value = name;
      newItemSuggestions.classList.add("hidden");
    });
  }, 150)
);

newItemInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const name = newItemInput.value.trim();
    if (name === "") return;
    addItem(name);
    newItemInput.value = "";
    newItemSuggestions.classList.add("hidden");
    refreshTable();
  }
});

// ---------- filter ----------
document.getElementById("btnApplyFilter").addEventListener("click", () => {
  currentFilter = {
    nameFilter: document.getElementById("filterName").value.trim() || null,
    dateFrom: document.getElementById("filterDateFrom").value || null,
    dateTo: document.getElementById("filterDateTo").value || null,
  };
  refreshTable();
});

document.getElementById("btnClearFilter").addEventListener("click", () => {
  document.getElementById("filterName").value = "";
  document.getElementById("filterDateFrom").value = "";
  document.getElementById("filterDateTo").value = "";
  currentFilter = { nameFilter: null, dateFrom: null, dateTo: null };
  refreshTable();
});

// ---------- modal: โน้ต / มัดจำ ----------
let noteModalItemId = null;
let noteModalOpenedAt = 0;
const noteModalOverlay = document.getElementById("noteModalOverlay");
const noteModalBox = document.getElementById("noteModalBox");

function openNoteModal(id) {
  const item = getItemById(id);
  if (!item) return;
  noteModalItemId = id;
  noteModalOpenedAt = Date.now();

  // reset ค่าทุกครั้งที่เปิด
  document.getElementById("modalCustomerName").value = item.flags.customer_name || "";
  document.getElementById("modalNote").value = item.flags.note || "";
  document.getElementById("modalDeposit").value =
    Number(item.flags.deposit_amount) > 0 ? item.flags.deposit_amount : "";

  noteModalOverlay.classList.remove("hidden");
  // focus ที่ช่องแรกหลัง render
  setTimeout(() => document.getElementById("modalCustomerName").focus(), 50);
}

function closeNoteModal() {
  noteModalOverlay.classList.add("hidden");
  noteModalItemId = null;
}

// ปุ่มยกเลิก
document.getElementById("modalCancel").addEventListener("click", closeNoteModal);

// ปุ่มบันทึก
document.getElementById("modalSave").addEventListener("click", () => {
  if (!noteModalItemId) return;
  const depositRaw = document.getElementById("modalDeposit").value;
  const depositNum = depositRaw === "" ? 0 : Math.max(0, Math.floor(Number(depositRaw) || 0));

  setNoteAndDeposit(noteModalItemId, {
    customerName: document.getElementById("modalCustomerName").value.trim(),
    note: document.getElementById("modalNote").value.trim(),
    depositAmount: depositNum,
  });
  closeNoteModal();
  refreshTable();
});

// ปิดเมื่อคลิกพื้นหลัง (ต้องเช็คว่าคลิกเริ่มที่ overlay จริง ไม่ใช่ลากจากในกล่องออกมา)
noteModalOverlay.addEventListener("mousedown", (e) => {
  if (e.target === noteModalOverlay) {
    noteModalOverlay.dataset.clickedOnOverlay = "1";
  } else {
    delete noteModalOverlay.dataset.clickedOnOverlay;
  }
});
noteModalOverlay.addEventListener("mouseup", (e) => {
  if (e.target === noteModalOverlay && noteModalOverlay.dataset.clickedOnOverlay === "1") {
    closeNoteModal();
  }
  delete noteModalOverlay.dataset.clickedOnOverlay;
});

// ปิดด้วยปุ่ม Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !noteModalOverlay.classList.contains("hidden")) {
    closeNoteModal();
  }
});

// กด Enter ในช่อง input เพื่อบันทึก (ยกเว้น textarea)
["modalCustomerName", "modalNote", "modalDeposit"].forEach((id) => {
  document.getElementById(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("modalSave").click();
    }
  });
});

// ---------- init ----------
refreshTable();