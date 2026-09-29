// State Management
        let notes = JSON.parse(localStorage.getItem('a2ndbrain_notes')) || [
            {
                id: '1',
                title: 'แนวคิด A 2nd Brain',
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
                content: '1. สร้างระบบบันทึกแบบ Mobile First\n2. รองรับ Wiki Link [[แนวคิด A 2nd Brain]]'
            }
        ];

        let currentNoteId = '1';
        let autoSaveTimer = null;

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

        window.addEventListener('DOMContentLoaded', () => {
            renderNoteLists();
            loadNote(currentNoteId);
            setupEventListeners();
        });

        function toggleSidebar() {
            sidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('active');
        }

        function renderNoteLists() {
            const folders = ['urgent', 'longterm', 'resources', 'completed'];
            folders.forEach(f => {
                const container = document.getElementById(`list-${f}`);
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
                        if (window.innerWidth < 768) toggleSidebar();
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

        function triggerSaveStatus() {
            saveDot.classList.add('saving');
            saveText.textContent = 'กำลังบันทึก...';
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(() => {
                saveDot.classList.remove('saving');
                saveText.textContent = 'บันทึกแล้ว';
            }, 600);
        }

        function parseWikiLinks(text) {
            return text.replace(/\[\[(.*?)\]\]/g, (match, p1) => {
                return `<a class="wiki-link" onclick="navigateToNoteTitle('${p1}')">${p1}</a>`;
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
            const parsedMarkdown = marked.parse(noteEditor.value || '');
            notePreview.innerHTML = parseWikiLinks(parsedMarkdown);
        }

        function renderBacklinks() {
            const currentNote = notes.find(n => n.id === currentNoteId);
            if (!currentNote || !currentNote.title) return;

            const backlinksContainer = document.getElementById('backlinks-container');
            const backlinksList = document.getElementById('backlinks-list');
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

        function setupEventListeners() {
            menuToggle.addEventListener('click', toggleSidebar);
            sidebarOverlay.addEventListener('click', toggleSidebar);
            
            document.getElementById('new-note-btn').addEventListener('click', () => createNewNote());
            document.getElementById('delete-note-btn').addEventListener('click', deleteCurrentNote);

            // เมื่อเปลี่ยนโฟลเดอร์ผ่าน Dropdown
            folderSelect.addEventListener('change', () => {
                saveCurrentNote();
            });

            noteTitleInput.addEventListener('input', () => {
                saveCurrentNote();
            });
            noteEditor.addEventListener('input', () => {
                saveCurrentNote();
                renderPreview();
            });

            btnWrite.addEventListener('click', () => {
                btnWrite.classList.add('active');
                btnPreview.classList.remove('active');
                noteEditor.style.display = 'block';
                notePreview.style.display = 'none';
            });

            btnPreview.addEventListener('click', () => {
                btnPreview.classList.add('active');
                btnWrite.classList.remove('active');
                renderPreview();
                noteEditor.style.display = 'none';
                notePreview.style.display = 'block';
            });

            document.getElementById('sync-btn').addEventListener('click', () => {
                localStorage.setItem('stockchecklist_a2ndbrain_backup', JSON.stringify(notes));
                alert('ซิงค์ข้อมูลกับคลังสำรอง Stocklist สำเร็จ!');
            });

            document.getElementById('qr-btn').addEventListener('click', () => {
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    const jsonString = JSON.stringify(notes);
    
    QRCode.toCanvas(document.createElement('canvas'), jsonString, { width: 220 }, function (error, canvas) {
        if (error) {
            QRCode.toCanvas(document.createElement('canvas'), window.location.href, { width: 220 }, function (err, fallbackCanvas) {
                qrContainer.appendChild(fallbackCanvas);
            });
            } else {
            qrContainer.appendChild(canvas);
            }
            });
            document.getElementById('qr-modal').classList.add('active');
        });

            document.getElementById('close-qr-btn').addEventListener('click', () => {
                document.getElementById('qr-modal').classList.remove('active');
            });
        }