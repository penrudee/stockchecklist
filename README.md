# จดบันทึกสินค้าขาด — เวอร์ชันเว็บ (Static site, host บน Cloudflare Pages)

## โครงสร้างไฟล์
```
index.html      -> หน้า login (ค่าเริ่มต้น admin / admin)
app.html        -> หน้าหลัก จดบันทึกสินค้าขาด (ต้องล็อกอิน)
settings.html   -> เปลี่ยน username/password, สำรอง/กู้คืนข้อมูล (ต้องล็อกอิน)
shopee.html     -> หน้าค้นหาสินค้า ธีมคล้าย Shopee (public ไม่ต้องล็อกอิน)
admin.html      -> จัดการ catalog สินค้า/ลิงก์ affiliate (ต้องล็อกอิน, ใช้คนเดียว)
products.json   -> catalog สินค้าที่ admin ดูแล ให้หน้า shopee.html อ่าน
css/, js/       -> ไฟล์ style และ logic
```

ไม่มีขั้นตอน build ใด ๆ — เป็น HTML/CSS/JS ล้วน อัปโหลดทั้งโฟลเดอร์นี้ขึ้น Cloudflare Pages ได้ทันที

## Deploy ขึ้น Cloudflare Pages

1. สร้าง repo บน GitHub/GitLab แล้ว push โฟลเดอร์นี้ทั้งหมดขึ้นไป (หรืออัปโหลดตรงผ่าน Cloudflare dashboard แบบ "Direct Upload" ก็ได้ ไม่ต้องมี git)
2. ไปที่ Cloudflare dashboard → Workers & Pages → Create → Pages → เชื่อม repo
3. ตั้งค่า Build: **Framework preset = None**, **Build command = (ว่างไว้)**, **Build output directory = /** (root ของ repo)
4. Deploy — จะได้ URL เช่น `your-project.pages.dev`

## ⚠️ เรื่องความปลอดภัยที่ต้องเข้าใจก่อนใช้จริง

เว็บนี้เป็น **static site ล้วน ไม่มี server ตรวจสอบสิทธิ์** ระบบ login ที่ทำให้เป็นแค่ "ล็อกหน้าจอด้วย JavaScript ฝั่ง browser" เท่านั้น:

- ใครก็ตามที่เปิด DevTools แล้วรัน `localStorage.setItem("stock_session_v1","true")` จะเข้า `app.html`/`admin.html` ได้ทันทีโดยไม่ต้องรู้รหัสผ่าน
- ไฟล์ `admin.html`, `app.html` ยังถูก host เป็นไฟล์ public บนเซิร์ฟเวอร์ ใครรู้ URL ตรงก็เปิดดู source code ได้ (แม้จะโดน JS redirect ออกก็ตาม)
- เหมาะสำหรับกันคนทั่วไปสุ่มเข้ามาเห็นข้อมูล **ไม่เหมาะกับการป้องกันข้อมูลที่ต้องรักษาความลับจริงจัง**

**ถ้าต้องการป้องกันหน้า `admin.html` (และ/หรือ `app.html`) แบบจริงจัง** โดยไม่ต้องเขียน backend เอง แนะนำใช้ **Cloudflare Access** (อยู่ใน Cloudflare Zero Trust ซึ่งใช้ฟรีได้กับจำนวนผู้ใช้ไม่มาก):

1. ไปที่ Cloudflare dashboard → Zero Trust → Access → Applications → Add an application → Self-hosted
2. ระบุ path ที่ต้องการป้องกัน เช่น `your-project.pages.dev/admin.html`
3. ตั้ง policy เช่น "อนุญาตเฉพาะอีเมลนี้เท่านั้น" (login ผ่าน One-Time PIN ทางอีเมล ไม่ต้องเขียนโค้ดเพิ่ม)
4. จะได้การยืนยันตัวตนที่ edge ของ Cloudflare จริง ๆ ก่อนแม้แต่จะโหลดไฟล์ HTML

## เรื่อง catalog สินค้า (products.json) — ทำไมแก้ใน admin.html แล้วไม่ขึ้นทันที

เพราะไม่มี backend เก็บข้อมูลกลาง ไฟล์ `products.json` ที่หน้า `shopee.html` อ่าน คือไฟล์ static ที่ deploy มากับเว็บ ขั้นตอนอัปเดตปกติคือ:

1. เปิด `admin.html` → กด "โหลดข้อมูลปัจจุบันจากเว็บ" (ดึง products.json ที่ deploy อยู่มาแก้ต่อ)
2. แก้ไข/เพิ่ม/ลบสินค้าในตาราง
3. กด "Export products.json" เพื่อดาวน์โหลดไฟล์ใหม่
4. เอาไฟล์ที่ได้ไป replace ไฟล์ `products.json` เดิมใน repo แล้ว push/deploy ใหม่ (หรืออัปโหลดใหม่ผ่าน Cloudflare Direct Upload)

**ถ้าต้องการให้แก้ปุ๊บขึ้นปั๊บโดยไม่ต้อง deploy ใหม่ทุกครั้ง** ต้องเพิ่ม backend เล็ก ๆ เช่น **Cloudflare Pages Functions + Workers KV** (ยังอยู่ในระบบนิเวศ Cloudflare ตัวเดิม ไม่ต้องหา hosting อื่น) — แจ้งได้ถ้าต้องการให้ผมต่อให้ในขั้นถัดไป

## ข้อมูลเก็บที่ไหน

- ข้อมูลสินค้าที่จดในหน้า `app.html` และ username/password → เก็บใน **localStorage ของแต่ละ browser** เท่านั้น (ไม่ sync ข้ามเครื่อง/เบราว์เซอร์) ควรกดสำรองข้อมูล (`settings.html`) เป็นระยะ
- catalog สินค้า/affiliate link ในหน้า `shopee.html` → เก็บใน `products.json` ที่ deploy รวมกับเว็บ (เหมือนกันทุกคนที่เข้าเว็บ)

## จุดที่ควรต่อยอดเพิ่มเติม

- เพิ่ม Cloudflare Access ป้องกันหน้า admin จริงจัง (แนะนำอย่างยิ่งก่อนใช้งานจริง)
- เพิ่ม Cloudflare Pages Functions + KV ถ้าต้องการแก้ catalog แบบ real-time
- แทนที่ `alert()`/`prompt()` ด้วย modal ที่สวยงามขึ้น
- ใส่ favicon และปรับ meta tags สำหรับ SEO ของหน้า `shopee.html`
