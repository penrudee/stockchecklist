// ---------- ระบบ login แบบง่าย (ฝั่ง client ล้วน ไม่ใช่การรักษาความปลอดภัยจริงจัง) ----------
// หมายเหตุสำคัญ: เว็บนี้เป็น static site ไม่มี server ตรวจสอบสิทธิ์
// ระบบนี้แค่ "ล็อกหน้าจอ" ด้วย JavaScript ฝั่ง browser เท่านั้น
// ผู้ที่เข้าถึง source code หรือ localStorage โดยตรงสามารถข้ามได้เสมอ
// ถ้าต้องการป้องกันจริงจังสำหรับหน้า admin ให้ใช้ Cloudflare Access แทน (ดู README)

const AUTH_KEY = "stock_auth_v1";
const SESSION_KEY = "stock_session_v1";

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function ensureDefaultAuth() {
  const existing = localStorage.getItem(AUTH_KEY);
  if (!existing) {
    const defaultHash = await sha256Hex("admin");
    localStorage.setItem(
      AUTH_KEY,
      JSON.stringify({ username: "admin", passwordHash: defaultHash })
    );
  }
}

async function login(username, password) {
  await ensureDefaultAuth();
  const auth = JSON.parse(localStorage.getItem(AUTH_KEY));
  const hash = await sha256Hex(password);
  if (username === auth.username && hash === auth.passwordHash) {
    localStorage.setItem(SESSION_KEY, "true");
    return true;
  }
  return false;
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}

function isLoggedIn() {
  return localStorage.getItem(SESSION_KEY) === "true";
}

// เรียกที่บนสุดของทุกหน้าที่ต้อง login (app.html, settings.html, admin.html)
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = "index.html";
  }
}

async function changeCredentials(newUsername, newPassword) {
  const newHash = await sha256Hex(newPassword);
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ username: newUsername, passwordHash: newHash })
  );
}

function getCurrentUsername() {
  const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || "{}");
  return auth.username || "admin";
}
