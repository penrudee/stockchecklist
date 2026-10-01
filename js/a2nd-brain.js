let notes = JSON.parse(localStorage.getItem("a2ndbrain_notes")) || [
  {
    id: "1",
    title: "แนวคิด A 2nd Brain (CODE Framework)",
    folder: "resources",
    content: `ระบบนี้ช่วยจัดเก็บความคิดตามหลัก CODE (Capture, Organize, Distill, Express)

ลองเชื่อมโยงไปที่ [[แผนการพัฒนาระบบ]] เพื่อทดสอบ Wiki Link โดย CODE คือกรอบความคิด 4 ขั้นตอนในการจัดการความรู้ส่วนบุคคล (Personal Knowledge Management) ที่คิดค้นโดย Tiago Forte เพื่อเปลี่ยนข้อมูลที่มีอยู่มากมายให้กลายเป็นผลงานและความคิดสร้างสรรค์

1. **Capture (บันทึกสิ่งที่โดนใจ)**
- เลือกเก็บเฉพาะข้อมูลที่อ่านแล้วรู้สึกว่ามีประโยชน์หรือสะท้อนตัวตน
- เก็บไว้ในที่เดียว เช่น แอปโน้ตดิจิทัล
- ไม่ควรเก็บทุกอย่างที่เห็น เพื่อป้องกันภาวะข้อมูลล้นสมอง

2. **Organize (จัดระเบียบเพื่อนำไปใช้)**
- จัดเก็บข้อมูลตามความสามารถในการนำไปใช้งานจริง
- ใช้ระบบ PARA Method แบ่งเป็น 4 หมวดหมู่:
  * **Projects:** งานที่มีเป้าหมายและกำหนดส่งชัดเจน
  * **Areas:** หน้าที่หรือความรับผิดชอบระยะยาว
  * **Resources:** หัวข้อที่สนใจและเก็บไว้ดูในอนาคต
  * **Archive:** ข้อมูลที่ยังไม่ใช้ตอนนี้แต่เก็บไว้ก่อน

3. **Distill (ย่อสรุปแก่นความรู้)**
- ทำ Progressive Summarization หรือการย่อความแบบเป็นขั้นตอน
- เริ่มจากอ่านซ้ำ ทำตัวหนาข้อความสำคัญ ไฮไลต์ และเขียนสรุปสั้นๆ ด้วยภาษาของตัวเอง เพื่อให้อ่านเข้าใจง่ายในอนาคต

4. **Express (สร้างสรรค์และเผยแพร่)**
- นำความรู้ที่จัดเก็บและสรุปไว้มาลงมือทำจริง
- สร้างผลงาน เขียนบทความ หรือแชร์ชิ้นงานออกไปให้ผู้อื่นได้เห็น (Show your work)`,
  },
  {
    id: "2",
    title: "แผนการพัฒนาระบบ",
    folder: "urgent",
    content:
      "1. สร้างระบบบันทึกแบบ Mobile First\n2. รองรับ Wiki Link [[แนวคิด A 2nd Brain (CODE Framework)]]\n3. แสดงภาพรวม Graph Map",
  },
];

let currentNoteId = "1";
let autoSaveTimer = null;
let networkInstance = null; // ตัวแปรเก็บ Instance ของ Vis.js เพื่อป้องกันการวาด Canvas ซ้ำซ้อน

// DOM Elements Reference
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const menuToggle = document.getElementById("menu-toggle");
const noteTitleInput = document.getElementById("note-title");
const folderSelect = document.getElementById("folder-select");
const noteEditor = document.getElementById("note-editor");
const notePreview = document.getElementById("note-preview");
const btnWrite = document.getElementById("btn-mode-write");
const btnPreview = document.getElementById("btn-mode-preview");
const saveDot = document.getElementById("save-dot");
const saveText = document.getElementById("save-text");

// ==========================================
// 2. INITIALIZATION & UI RENDERING
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
  initEditor();
  renderNoteLists();
  loadNote(currentNoteId);
  setupEventListeners();
});
// ==========================================
// EDITOR ABSTRACTION (CodeMirror + Vim, fallback เป็น textarea)
// ==========================================
let cm = null;
const getContent = () => (cm ? cm.getValue() : noteEditor.value);
const setContent = (v) => {
  if (cm) {
    cm.setValue(v);
    cm.clearHistory();
  } // clearHistory กัน undo ข้ามโน๊ต
  else noteEditor.value = v;
};
const editorEl = () => (cm ? cm.getWrapperElement() : noteEditor);

function initEditor() {
  if (typeof CodeMirror === "undefined") {
    console.warn("CodeMirror ไม่โหลด ใช้ textarea ปกติแทน");
    return;
  }
  const vimOn = localStorage.getItem("a2ndbrain_vim") !== "off";

  cm = CodeMirror.fromTextArea(noteEditor, {
    mode: "markdown",
    theme: "monokai",
    lineWrapping: true,
    lineNumbers: false,
    matchBrackets: true,
    showCursorWhenSelecting: true,
    keyMap: vimOn ? "vim" : "default",
    placeholder: noteEditor.placeholder,
  });

  const vimToggle = document.getElementById("vim-toggle");
  const modeBadge = document.getElementById("vim-mode");

  const applyVimUI = (on) => {
    if (vimToggle) {
      vimToggle.textContent = on ? "Vim: ON" : "Vim: OFF";
      vimToggle.classList.toggle("active", on);
    }
    if (modeBadge) modeBadge.classList.toggle("off", !on);
    if (on && modeBadge) {
      modeBadge.textContent = "NORMAL";
      modeBadge.className = "vim-mode-badge";
    }
  };
  applyVimUI(vimOn);

  if (vimToggle) {
    vimToggle.addEventListener("click", () => {
      const on = cm.getOption("keyMap") !== "vim";
      cm.setOption("keyMap", on ? "vim" : "default");
      localStorage.setItem("a2ndbrain_vim", on ? "on" : "off");
      applyVimUI(on);
      cm.focus();
    });
  }

  // แสดงโหมด Vim บนป้าย
  cm.on("vim-mode-change", (e) => {
    if (!modeBadge) return;
    const mode = e.mode + (e.subMode ? ` (${e.subMode})` : "");
    modeBadge.textContent = mode.toUpperCase();
    modeBadge.className = `vim-mode-badge ${e.mode}`;
  });

  // ----- Ex commands & mapping -----
  const Vim = CodeMirror.Vim;
  Vim.defineEx("write", "w", () => saveCurrentNote()); // :w  บันทึก
  Vim.defineEx("preview", "prev", () => btnPreview.click()); // :prev  ไปโหมดแสดงผล
  Vim.defineEx("brain", "brain", () =>
    document.getElementById("sidebar-map-btn")?.click(),
  ); // :brain  เปิด Brain Map
  Vim.map("jj", "<Esc>", "insert"); // jj ออกจาก insert

  // ----- เปลี่ยนข้อความ -> auto save + preview (แทน event 'input' เดิม) -----
  cm.on("change", (inst, change) => {
    if (change.origin === "setValue") return; // ข้ามตอนโหลดโน๊ต ไม่ให้ trigger save
    saveCurrentNote();
    renderPreview();
  });
}
function toggleSidebar() {
  if (!sidebar) return;
  if (window.innerWidth < 768) {
    sidebar.classList.toggle("open");
    if (sidebarOverlay) sidebarOverlay.classList.toggle("active");
  } else {
    sidebar.classList.toggle("collapsed");
  }
}

function renderNoteLists() {
  const folders = ["urgent", "longterm", "resources", "completed"];
  folders.forEach((f) => {
    const container = document.getElementById(`list-${f}`);
    if (!container) return;
    container.innerHTML = "";
    const folderNotes = notes.filter((n) => n.folder === f);

    folderNotes.forEach((note) => {
      const div = document.createElement("div");
      div.className = `note-item ${note.id === currentNoteId ? "active" : ""}`;
      div.textContent = note.title || "ไม่มีชื่อ";
      div.onclick = () => {
        saveCurrentNote();
        currentNoteId = note.id;
        loadNote(note.id);
        renderNoteLists();
        if (window.innerWidth < 768 && sidebar.classList.contains("open")) {
          toggleSidebar();
        }
      };
      container.appendChild(div);
    });
  });
}

function loadNote(id) {
  const note = notes.find((n) => n.id === id);
  if (!note) {
    if (notes.length > 0) {
      loadNote(notes[0].id);
    } else {
      createNewNote();
    }
    return;
  }
  currentNoteId = id;
  noteTitleInput.value = note.title;
  folderSelect.value = note.folder || "urgent";
  // noteEditor.value = note.content;
  setContent(note.content);
  renderPreview();
  renderBacklinks();
}

// ==========================================
// 3. CORE LOGIC (SAVE, DELETE, NEW)
// ==========================================
function saveCurrentNote() {
  const note = notes.find((n) => n.id === currentNoteId);
  if (note) {
    note.title = noteTitleInput.value;
    note.folder = folderSelect.value;
    // note.content = noteEditor.value;
    note.content = getContent();
    localStorage.setItem("a2ndbrain_notes", JSON.stringify(notes));
    triggerSaveStatus();
    renderNoteLists();
  }
}

function deleteCurrentNote() {
  const note = notes.find((n) => n.id === currentNoteId);
  if (!note) return;

  if (confirm(`คุณต้องการลบโน๊ต "${note.title || "ไม่มีชื่อ"}" ใช่หรือไม่?`)) {
    notes = notes.filter((n) => n.id !== currentNoteId);
    localStorage.setItem("a2ndbrain_notes", JSON.stringify(notes));

    if (notes.length > 0) {
      currentNoteId = notes[0].id;
      loadNote(currentNoteId);
    } else {
      createNewNote();
    }
    renderNoteLists();
  }
}

function createNewNote(customTitle = "") {
  const newId = Date.now().toString();
  const newNote = {
    id: newId,
    title: customTitle || "โน๊ตใหม่ไม่มีชื่อ",
    folder: "urgent",
    content: "",
  };
  notes.push(newNote);
  saveCurrentNote();
  currentNoteId = newId;
  loadNote(newId);
  renderNoteLists();
}

function triggerSaveStatus() {
  if (!saveDot || !saveText) return;
  saveDot.classList.add("saving");
  saveText.textContent = "กำลังบันทึก...";
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveDot.classList.remove("saving");
    saveText.textContent = "บันทึกแล้ว";
  }, 600);
}

// ==========================================
// 4. WIKI LINKS & BACKLINKS PARSER
// ==========================================
function parseWikiLinks(text) {
  return text.replace(/\[\[(.*?)\]\]/g, (match, p1) => {
    return `<a class="wiki-link" onclick="navigateToNoteTitle('${p1.replace(/'/g, "\\'")}')">${p1}</a>`;
  });
}

window.navigateToNoteTitle = function (title) {
  const targetNote = notes.find(
    (n) => n.title.trim().toLowerCase() === title.trim().toLowerCase(),
  );
  if (targetNote) {
    saveCurrentNote();
    loadNote(targetNote.id);
    renderNoteLists();
  } else {
    if (confirm(`ไม่พบโน๊ต "${title}" ต้องการสร้างใหม่หรือไม่?`)) {
      createNewNote(title);
    }
  }
};

function renderPreview() {
  if (typeof marked !== "undefined") {
    // const parsedMarkdown = marked.parse(noteEditor.value || '');
    const parsedMarkdown = marked.parse(getContent() || "");
    notePreview.innerHTML = parseWikiLinks(parsedMarkdown);
  } else {
    // notePreview.innerHTML = parseWikiLinks(noteEditor.value || '');
    notePreview.innerHTML = parseWikiLinks(getContent() || "");
  }
}

function renderBacklinks() {
  const currentNote = notes.find((n) => n.id === currentNoteId);
  if (!currentNote || !currentNote.title) return;

  const backlinksContainer = document.getElementById("backlinks-container");
  const backlinksList = document.getElementById("backlinks-list");
  if (!backlinksContainer || !backlinksList) return;

  backlinksList.innerHTML = "";
  const wikiTag = `[[${currentNote.title}]]`;
  const referringNotes = notes.filter(
    (n) => n.id !== currentNoteId && n.content.includes(wikiTag),
  );

  if (referringNotes.length > 0) {
    backlinksContainer.style.display = "block";
    referringNotes.forEach((ref) => {
      const card = document.createElement("div");
      card.className = "backlink-card";
      card.textContent = `📄 ${ref.title}`;
      card.onclick = () => {
        saveCurrentNote();
        loadNote(ref.id);
        renderNoteLists();
      };
      backlinksList.appendChild(card);
    });
  } else {
    backlinksContainer.style.display = "none";
  }
}

// ==========================================
// 5. BRAIN MAP GENERATOR (FIXED VIS.JS LOOP)
// ==========================================
const normTitle = (t) => (t || "").replace(/\s+/g, " ").trim().toLowerCase();

function generateBrainMap() {
  const container = document.getElementById("graph-container");
  if (!container || typeof vis === "undefined") {
    console.error("vis-network ยังไม่โหลด");
    return;
  }

  if (networkInstance) {
    networkInstance.destroy();
    networkInstance = null;
  }

  // map ชื่อ -> note เพื่อค้นหาเร็วและทนต่อช่องว่าง
  const titleMap = new Map();
  notes.forEach((n) => titleMap.set(normTitle(n.title), n));

  const nodes = notes.map((note) => ({
    id: note.id,
    label: note.title || "ไม่มีชื่อ",
    shape: "dot",
    size: 20,
    color: {
      background: note.id === currentNoteId ? "#ec4899" : "#6366f1",
      border: "#818cf8",
      highlight: { background: "#f472b6", border: "#ffffff" },
    },
    font: { color: "#f8fafc", face: "Prompt", size: 14 },
  }));

  const edges = [];
  const addedEdges = new Set();

  notes.forEach((source) => {
    const regex = /\[\[(.+?)\]\]/g;
    let m;
    while ((m = regex.exec(source.content || "")) !== null) {
      const target = titleMap.get(normTitle(m[1]));
      if (target && target.id !== source.id) {
        const key = `${source.id}->${target.id}`;
        if (!addedEdges.has(key)) {
          addedEdges.add(key);
          edges.push({
            from: source.id,
            to: target.id,
            color: { color: "#06b6d4", highlight: "#a855f7" },
            arrows: { to: { enabled: true, scaleFactor: 0.8 } },
            width: 2,
          });
        }
      }
    }
  });

  console.log("Brain Map:", nodes.length, "nodes,", edges.length, "edges");

  const options = {
    autoResize: true,
    physics: {
      enabled: true,
      barnesHut: {
        gravitationalConstant: -2000,
        centralGravity: 0.3,
        springLength: 120,
      },
      stabilization: { iterations: 150 },
    },
    interaction: { hover: true, zoomView: true, dragNodes: true },
  };

  networkInstance = new vis.Network(
    container,
    { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) },
    options,
  );

  networkInstance.once("stabilizationIterationsDone", () => {
    networkInstance.fit({ animation: false });
  });

  networkInstance.on("click", (params) => {
    if (params.nodes.length > 0) {
      saveCurrentNote();
      loadNote(params.nodes[0]);
      renderNoteLists();
      document.getElementById("map-modal")?.classList.remove("active");
    }
  });
}

// ==========================================
// 6. EVENT LISTENERS SETUP
// ==========================================
function setupEventListeners() {
  if (menuToggle) menuToggle.addEventListener("click", toggleSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener("click", toggleSidebar);

  const newNoteBtn = document.getElementById("new-note-btn");
  const deleteNoteBtn = document.getElementById("delete-note-btn");
  if (newNoteBtn) newNoteBtn.addEventListener("click", () => createNewNote());
  if (deleteNoteBtn) deleteNoteBtn.addEventListener("click", deleteCurrentNote);

  if (folderSelect)
    folderSelect.addEventListener("change", () => saveCurrentNote());
  if (noteTitleInput)
    noteTitleInput.addEventListener("input", () => saveCurrentNote());
  if (noteEditor && !cm) {
    noteEditor.addEventListener("input", () => {
      saveCurrentNote();
      renderPreview();
    });
  }

  if (btnWrite) {
    btnWrite.addEventListener("click", () => {
      btnWrite.classList.add("active");
      btnPreview.classList.remove("active");
      editorEl().style.display = "block";
      notePreview.style.display = "none";
      if (cm) {
        cm.refresh();
        cm.focus();
      } // refresh สำคัญ เพราะเคยถูกซ่อน
    });
  }

  if (btnPreview) {
    btnPreview.addEventListener("click", () => {
      btnPreview.classList.add("active");
      btnWrite.classList.remove("active");
      renderPreview();
      editorEl().style.display = "none";
      notePreview.style.display = "block";
    });
  }

  // Cloud Sync Integration
  const syncBtn = document.getElementById("sync-btn");
  if (syncBtn) {
    syncBtn.addEventListener("click", () => {
      localStorage.setItem(
        "stockchecklist_a2ndbrain_backup",
        JSON.stringify(notes),
      );
      alert("ซิงค์ข้อมูลกับคลังสำรอง Stocklist สำเร็จ!");
    });
  }
  // ในโหมดแสดงผล กด i / Esc เพื่อกลับไปเขียน (สไตล์ Vim)
  document.addEventListener("keydown", (e) => {
    if (notePreview.style.display !== "block") return;
    const tag = (e.target.tagName || "").toLowerCase();
    if (["input", "select", "textarea"].includes(tag)) return;
    if (document.querySelector(".modal.active")) return;
    if (e.key === "i" || e.key === "Escape") {
      e.preventDefault();
      btnWrite.click();
    }
  });
  // ==========================================
  // BACKUP / IMPORT (ZIP)
  // ==========================================
  const backupMsg = document.getElementById("backup-message");
  const setBackupMsg = (text, isError = false) => {
    if (!backupMsg) return;
    backupMsg.textContent = text;
    backupMsg.style.color = isError
      ? "var(--badge-urgent)"
      : "var(--text-muted)";
  };

  const FOLDER_LABELS = {
    urgent: "Projects",
    longterm: "Areas",
    resources: "Resources",
    completed: "Archive",
  };
  const LABEL_TO_FOLDER = Object.fromEntries(
    Object.entries(FOLDER_LABELS).map(([k, v]) => [v.toLowerCase(), k]),
  );

  const safeName = (s) =>
    (s || "ไม่มีชื่อ")
      .replace(/[\\/:*?"<>|]/g, "-")
      .trim()
      .slice(0, 80) || "ไม่มีชื่อ";

  // เปิด Modal
  const qrBtn = document.getElementById("qr-btn");
  if (qrBtn) {
    qrBtn.addEventListener("click", () => {
      setBackupMsg("");
      document.getElementById("qr-modal")?.classList.add("active");
    });
  }

  // ---------- ดาวน์โหลด ZIP ----------
  const exportZipBtn = document.getElementById("export-zip-btn");
  if (exportZipBtn) {
    exportZipBtn.addEventListener("click", async () => {
      if (typeof JSZip === "undefined") {
        setBackupMsg(
          "ไม่พบไลบรารี JSZip (ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต)",
          true,
        );
        return;
      }
      try {
        saveCurrentNote();
        const zip = new JSZip();

        // 1) ไฟล์หลักสำหรับนำเข้ากลับ
        zip.file(
          "notes.json",
          JSON.stringify(
            {
              app: "a2nd-brain",
              version: 1,
              exportedAt: new Date().toISOString(),
              notes,
            },
            null,
            2,
          ),
        );

        // 2) ไฟล์ .md แยกโฟลเดอร์ตาม PARA (เปิดอ่านหรือใช้กับ Obsidian ได้)
        const usedPaths = new Set();
        notes.forEach((n) => {
          const dir = FOLDER_LABELS[n.folder] || "Projects";
          const base = safeName(n.title);
          let path = `notes/${dir}/${base}.md`;
          let i = 2;
          while (usedPaths.has(path)) {
            path = `notes/${dir}/${base} (${i++}).md`;
          }
          usedPaths.add(path);
          zip.file(path, n.content || "");
        });

        const blob = await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `a2nd-brain-backup-${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        setBackupMsg(`สำรองข้อมูลสำเร็จ (${notes.length} โน๊ต)`);
      } catch (err) {
        console.error(err);
        setBackupMsg("สำรองข้อมูลไม่สำเร็จ: " + err.message, true);
      }
    });
  }

  // ---------- นำเข้าจาก ZIP ----------
  const importZipBtn = document.getElementById("import-zip-btn");
  const importZipFile = document.getElementById("import-zip-file");
  if (importZipBtn && importZipFile) {
    importZipBtn.addEventListener("click", () => importZipFile.click());

    importZipFile.addEventListener("change", async () => {
      const file = importZipFile.files[0];
      if (!file) return;

      if (typeof JSZip === "undefined") {
        setBackupMsg("ไม่พบไลบรารี JSZip", true);
        return;
      }

      try {
        const zip = await JSZip.loadAsync(file);
        let incoming = [];

        const jsonEntry = zip.file("notes.json");
        if (jsonEntry) {
          // กรณีมี notes.json (ไฟล์ที่ส่งออกจากแอปนี้)
          const data = JSON.parse(await jsonEntry.async("string"));
          incoming = Array.isArray(data) ? data : data.notes || [];
        } else {
          // กรณีไม่มี notes.json: อ่านจากไฟล์ .md (เช่นโฟลเดอร์จาก Obsidian)
          const mdFiles = Object.values(zip.files).filter(
            (f) => !f.dir && f.name.toLowerCase().endsWith(".md"),
          );

          let seq = 0;
          for (const f of mdFiles) {
            const parts = f.name.split("/");
            const fileName = parts[parts.length - 1].replace(/\.md$/i, "");
            const folderKey =
              parts
                .slice(0, -1)
                .map((p) => LABEL_TO_FOLDER[p.toLowerCase()])
                .find(Boolean) || "resources";
            incoming.push({
              id: `${Date.now()}${seq++}`,
              title: fileName,
              folder: folderKey,
              content: await f.async("string"),
            });
          }
        }

        if (!incoming.length) throw new Error("ไม่พบโน๊ตในไฟล์ ZIP นี้");

        // รวมกับข้อมูลเดิม: ข้าม id ซ้ำ และข้ามชื่อซ้ำในโฟลเดอร์เดียวกัน
        const existingIds = new Set(notes.map((n) => String(n.id)));
        const existingKeys = new Set(
          notes.map(
            (n) => `${n.folder}|${(n.title || "").trim().toLowerCase()}`,
          ),
        );
        let added = 0,
          skipped = 0;

        incoming.forEach((n) => {
          if (!n || typeof n.title !== "string") {
            skipped++;
            return;
          }
          const id = String(n.id || `${Date.now()}${added}`);
          const folder = FOLDER_LABELS[n.folder] ? n.folder : "urgent";
          const key = `${folder}|${n.title.trim().toLowerCase()}`;

          if (existingIds.has(id) || existingKeys.has(key)) {
            skipped++;
            return;
          }

          notes.push({
            id,
            title: n.title,
            folder,
            content: String(n.content || ""),
          });
          existingIds.add(id);
          existingKeys.add(key);
          added++;
        });

        localStorage.setItem("a2ndbrain_notes", JSON.stringify(notes));
        renderNoteLists();
        renderBacklinks();
        setBackupMsg(
          `นำเข้าสำเร็จ: เพิ่ม ${added} โน๊ต, ข้าม ${skipped} (ซ้ำหรือข้อมูลไม่ถูกต้อง)`,
        );
      } catch (err) {
        console.error(err);
        setBackupMsg("นำเข้าไม่สำเร็จ: " + err.message, true);
      }

      importZipFile.value = ""; // เลือกไฟล์เดิมซ้ำได้
    });
  }

  // Open Brain Map Listener
  const sidebarMapBtn = document.getElementById("sidebar-map-btn");
  if (sidebarMapBtn) {
    sidebarMapBtn.addEventListener("click", () => {
      const mapModal = document.getElementById("map-modal");
      if (mapModal) {
        mapModal.classList.add("active");

        // รอให้ Modal ขยายขนาดและสลับ Display ก่อนจึงเรียก Vis.js
        setTimeout(() => {
          generateBrainMap();
        }, 100);
      }
      if (window.innerWidth < 768 && sidebar.classList.contains("open")) {
        toggleSidebar();
      }
    });
  }
  const closeQrBtn = document.getElementById("close-qr-btn");
  if (closeQrBtn) {
    closeQrBtn.addEventListener("click", () => {
      const qrModal = document.getElementById("qr-modal");
      if (qrModal) qrModal.classList.remove("active");
    });
  }
  const closeMapBtn = document.getElementById("close-map-btn");
  if (closeMapBtn) {
    closeMapBtn.addEventListener("click", () => {
      const mapModal = document.getElementById("map-modal");
      if (mapModal) mapModal.classList.remove("active");
    });
  }
}
