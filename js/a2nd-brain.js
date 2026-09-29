// ==========================================
        // 1. STATE & DEFAULT DATA MANAGEMENT
        // ==========================================
        let notes = JSON.parse(localStorage.getItem('a2ndbrain_notes')) || [
            {
                id: '1',
                title: 'แนวคิด A 2nd Brain (CODE Framework)',
                folder: 'resources',
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
- สร้างผลงาน เขียนบทความ หรือแชร์ชิ้นงานออกไปให้ผู้อื่นได้เห็น (Show your work)`
            },
            {
                id: '2',
                title: 'แผนการพัฒนาระบบ',
                folder: 'urgent',
                content: '1. สร้างระบบบันทึกแบบ Mobile First\n2. รองรับ Wiki Link [[แนวคิด A 2nd Brain (CODE Framework)]]\n3. แสดงภาพรวม Graph Map'
            }
        ];

        let currentNoteId = '1';
        let autoSaveTimer = null;

        // DOM Elements Reference
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const menuToggle = document.getElementById('menu-toggle');
        const noteTitleInput = document.getElementById('note-title');
        const folderSelect = document.getElementById('folder-select');
        const noteEditor = document.getElementById('note-editor');
        const notePreview = document.getElementById('note-preview');
        const btnWrite = document.getElementById('btn-mode-write');
        const btnPreview = document.getElementById('btn-mode-preview');
        const saveDot = document.getElementById('save-dot');
        const saveText = document.getElementById('save-text');

        // ==========================================
        // 2. INITIALIZATION & UI RENDERING
        // ==========================================
        window.addEventListener('DOMContentLoaded', () => {
            renderNoteLists();
            loadNote(currentNoteId);
            setupEventListeners();
        });

        function toggleSidebar() {
            if (!sidebar) return;
            if (window.innerWidth < 768) {
                sidebar.classList.toggle('open');
                if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
            } else {
                sidebar.classList.toggle('collapsed');
            }
        }

        function renderNoteLists() {
            const folders = ['urgent', 'longterm', 'resources', 'completed'];
            folders.forEach(f => {
                const container = document.getElementById(`list-${f}`);
                if (!container) return;
                container.innerHTML = '';
                const folderNotes = notes.filter(n => n.folder === f);
                
                folderNotes.forEach(note => {
                    const div = document.createElement('div');
                    div.className = `note-item ${note.id === currentNoteId ? 'active' : ''}`;
                    div.textContent = note.title || 'ไม่มีชื่อ';
                    div.onclick = () => {
                        saveCurrentNote();
                        currentNoteId = note.id;
                        loadNote(note.id);
                        renderNoteLists();
                        if (window.innerWidth < 768 && sidebar.classList.contains('open')) {
                            toggleSidebar();
                        }
                    };
                    container.appendChild(div);
                });
            });
        }

        function loadNote(id) {
            const note = notes.find(n => n.id === id);
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
            folderSelect.value = note.folder || 'urgent';
            noteEditor.value = note.content;
            renderPreview();
            renderBacklinks();
        }

        // ==========================================
        // 3. CORE LOGIC (SAVE, DELETE, NEW)
        // ==========================================
        function saveCurrentNote() {
            const note = notes.find(n => n.id === currentNoteId);
            if (note) {
                note.title = noteTitleInput.value;
                note.folder = folderSelect.value;
                note.content = noteEditor.value;
                localStorage.setItem('a2ndbrain_notes', JSON.stringify(notes));
                triggerSaveStatus();
                renderNoteLists();
            }
        }

        function deleteCurrentNote() {
            const note = notes.find(n => n.id === currentNoteId);
            if (!note) return;

            if (confirm(`คุณต้องการลบโน๊ต "${note.title || 'ไม่มีชื่อ'}" ใช่หรือไม่?`)) {
                notes = notes.filter(n => n.id !== currentNoteId);
                localStorage.setItem('a2ndbrain_notes', JSON.stringify(notes));
                
                if (notes.length > 0) {
                    currentNoteId = notes[0].id;
                    loadNote(currentNoteId);
                } else {
                    createNewNote();
                }
                renderNoteLists();
            }
        }

        function createNewNote(customTitle = '') {
            const newId = Date.now().toString();
            const newNote = {
                id: newId,
                title: customTitle || 'โน๊ตใหม่ไม่มีชื่อ',
                folder: 'urgent',
                content: ''
            };
            notes.push(newNote);
            saveCurrentNote();
            currentNoteId = newId;
            loadNote(newId);
            renderNoteLists();
        }

        function triggerSaveStatus() {
            if (!saveDot || !saveText) return;
            saveDot.classList.add('saving');
            saveText.textContent = 'กำลังบันทึก...';
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(() => {
                saveDot.classList.remove('saving');
                saveText.textContent = 'บันทึกแล้ว';
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

        window.navigateToNoteTitle = function(title) {
            const targetNote = notes.find(n => n.title.trim().toLowerCase() === title.trim().toLowerCase());
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
            if (typeof marked !== 'undefined') {
                const parsedMarkdown = marked.parse(noteEditor.value || '');
                notePreview.innerHTML = parseWikiLinks(parsedMarkdown);
            } else {
                notePreview.innerHTML = parseWikiLinks(noteEditor.value || '');
            }
        }

        function renderBacklinks() {
            const currentNote = notes.find(n => n.id === currentNoteId);
            if (!currentNote || !currentNote.title) return;

            const backlinksContainer = document.getElementById('backlinks-container');
            const backlinksList = document.getElementById('backlinks-list');
            if (!backlinksContainer || !backlinksList) return;

            backlinksList.innerHTML = '';
            const wikiTag = `[[${currentNote.title}]]`;
            const referringNotes = notes.filter(n => n.id !== currentNoteId && n.content.includes(wikiTag));

            if (referringNotes.length > 0) {
                backlinksContainer.style.display = 'block';
                referringNotes.forEach(ref => {
                    const card = document.createElement('div');
                    card.className = 'backlink-card';
                    card.textContent = `📄 ${ref.title}`;
                    card.onclick = () => {
                        saveCurrentNote();
                        loadNote(ref.id);
                        renderNoteLists();
                    };
                    backlinksList.appendChild(card);
                });
            } else {
                backlinksContainer.style.display = 'none';
            }
        }

        // ==========================================
        // 5. BRAIN MAP GENERATOR (VIS.JS)
        // ==========================================
        function generateBrainMap() {
            const container = document.getElementById('graph-container');
            if (!container || typeof vis === 'undefined') return;

            const nodes = [];
            const edges = [];
            const addedEdges = new Set();

            notes.forEach(note => {
                nodes.push({
                    id: note.id,
                    label: note.title || 'ไม่มีชื่อ',
                    shape: 'dot',
                    size: 16,
                    color: {
                        background: note.id === currentNoteId ? '#a855f7' : '#6366f1',
                        border: '#818cf8',
                        highlight: { background: '#ec4899', border: '#f472b6' }
                    },
                    font: { color: '#f8fafc', face: 'Prompt' }
                });
            });

            notes.forEach(sourceNote => {
                const matches = sourceNote.content.matchAll(/\[\[(.*?)\]\]/g);
                for (const match of matches) {
                    const targetTitle = match[1].trim().toLowerCase();
                    const targetNote = notes.find(n => n.title.trim().toLowerCase() === targetTitle);

                    if (targetNote) {
                        const edgeKey = `${sourceNote.id}->${targetNote.id}`;
                        if (!addedEdges.has(edgeKey)) {
                            addedEdges.add(edgeKey);
                            edges.push({
                                from: sourceNote.id,
                                to: targetNote.id,
                                color: { color: 'rgba(255,255,255,0.25)', highlight: '#06b6d4' },
                                arrows: 'to'
                            });
                        }
                    }
                }
            });

            const data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
            const options = {
                physics: {
                    barnesHut: { gravConstant: -3000, springLength: 100 }
                },
                interaction: { hover: true, zoomView: true, dragNodes: true }
            };

            const network = new vis.Network(container, data, options);

            // เมื่อคลิกจุด Node บน Graph Map ให้กระโดดเปิดโน๊ตนั้นทันที
            network.on("click", function (params) {
                if (params.nodes.length > 0) {
                    const clickedNoteId = params.nodes[0];
                    saveCurrentNote();
                    loadNote(clickedNoteId);
                    renderNoteLists();
                    const mapModal = document.getElementById('map-modal');
                    if (mapModal) mapModal.classList.remove('active');
                }
            });
        }

        // ==========================================
        // 6. EVENT LISTENERS SETUP
        // ==========================================
        function setupEventListeners() {
            if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
            if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

            const newNoteBtn = document.getElementById('new-note-btn');
            const deleteNoteBtn = document.getElementById('delete-note-btn');
            if (newNoteBtn) newNoteBtn.addEventListener('click', () => createNewNote());
            if (deleteNoteBtn) deleteNoteBtn.addEventListener('click', deleteCurrentNote);

            if (folderSelect) folderSelect.addEventListener('change', () => saveCurrentNote());
            if (noteTitleInput) noteTitleInput.addEventListener('input', () => saveCurrentNote());
            if (noteEditor) {
                noteEditor.addEventListener('input', () => {
                    saveCurrentNote();
                    renderPreview();
                });
            }

            if (btnWrite) {
                btnWrite.addEventListener('click', () => {
                    btnWrite.classList.add('active');
                    btnPreview.classList.remove('active');
                    noteEditor.style.display = 'block';
                    notePreview.style.display = 'none';
                });
            }

            if (btnPreview) {
                btnPreview.addEventListener('click', () => {
                    btnPreview.classList.add('active');
                    btnWrite.classList.remove('active');
                    renderPreview();
                    noteEditor.style.display = 'none';
                    notePreview.style.display = 'block';
                });
            }

            // Cloud Sync Integration
            const syncBtn = document.getElementById('sync-btn');
            if (syncBtn) {
                syncBtn.addEventListener('click', () => {
                    localStorage.setItem('stockchecklist_a2ndbrain_backup', JSON.stringify(notes));
                    alert('ซิงค์ข้อมูลกับคลังสำรอง Stocklist สำเร็จ!');
                });
            }

            // QR Code Modal & Generator
            const qrBtn = document.getElementById('qr-btn');
            if (qrBtn) {
                qrBtn.addEventListener('click', () => {
                    const qrContainer = document.getElementById('qrcode');
                    if (!qrContainer) return;
                    qrContainer.innerHTML = '';

                    if (typeof QRCode !== 'undefined') {
                        const jsonString = JSON.stringify(notes);
                        try {
                            new QRCode(qrContainer, {
                                text: jsonString,
                                width: 200,
                                height: 200,
                                colorDark: "#000000",
                                colorLight: "#ffffff",
                                correctLevel: QRCode.CorrectLevel.L
                            });
                        } catch (e) {
                            new QRCode(qrContainer, {
                                text: window.location.href,
                                width: 200,
                                height: 200
                            });
                        }
                    } else {
                        qrContainer.innerHTML = '<p style="color:red; font-size:0.8rem;">ไม่พบไลบรารี QRCode</p>';
                    }

                    const qrModal = document.getElementById('qr-modal');
                    if (qrModal) qrModal.classList.add('active');
                });
            }

            const closeQrBtn = document.getElementById('close-qr-btn');
            if (closeQrBtn) {
                closeQrBtn.addEventListener('click', () => {
                    const qrModal = document.getElementById('qr-modal');
                    if (qrModal) qrModal.classList.remove('active');
                });
            }

            // Open Brain Map from Sidebar Button
            const sidebarMapBtn = document.getElementById('sidebar-map-btn');
            if (sidebarMapBtn) {
                sidebarMapBtn.addEventListener('click', () => {
                    const mapModal = document.getElementById('map-modal');
                    if (mapModal) {
                        mapModal.classList.add('active');
                        generateBrainMap();
                    }
                    if (window.innerWidth < 768 && sidebar.classList.contains('open')) {
                        toggleSidebar();
                    }
                });
            }

            const closeMapBtn = document.getElementById('close-map-btn');
            if (closeMapBtn) {
                closeMapBtn.addEventListener('click', () => {
                    const mapModal = document.getElementById('map-modal');
                    if (mapModal) mapModal.classList.remove('active');
                });
            }
        }