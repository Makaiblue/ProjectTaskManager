
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA3o7I7NSz7_4C7qUOFirnIjot4_rW885o",
  authDomain: "project-task-manager-6a4d6.firebaseapp.com",
  projectId: "project-task-manager-6a4d6",
  storageBucket: "project-task-manager-6a4d6.appspot.com",
  messagingSenderId: "797859086383",
  appId: "1:797859086383:web:d84f87f51b6708540c86da",
  measurementId: "G-XPQS6YQCCS"
};

// Initialize Firebase (safe to call multiple times; SDK handles it)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Utility helper to safely query DOM elements
function $id(id) { return document.getElementById(id); }
function exists(id) { return !!$id(id); }

// SMALL helper: safe JSON local read
function loadLocalTasks() {
  try { return JSON.parse(localStorage.getItem("tasks")) || []; }
  catch (e) { return []; }
}
function saveLocalTasks(tasks) {
  try { localStorage.setItem("tasks", JSON.stringify(tasks)); }
  catch (e) { console.error("LocalStorage save error", e); }
}

// Escape HTML to avoid injection when rendering user-entered text
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ------------------------------
   PAGE IDENTIFIERS (which HTML loaded?)
   ------------------------------ */
const onIndex = location.pathname.endsWith("index.html") || location.pathname.endsWith("/") || location.pathname.endsWith("/index.html");
const onRegister = location.pathname.endsWith("register.html");
const onApp = location.pathname.endsWith("app.html");

/* ------------------------------
   INDEX (login) page logic
   ------------------------------ */
if (onIndex && exists("login-form")) {
  const loginForm = $id("login-form");
  const loginMessage = $id("login-message");

  // If already logged in — redirect to app.html
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = "app.html";
    }
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginMessage.textContent = "";
    const email = $id("email").value.trim();
    const password = $id("password").value.trim();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will redirect after sign in
    } catch (err) {
      loginMessage.textContent = `Error: ${err.message}`;
      loginMessage.style.color = "red";
    }
  });
}

/* ------------------------------
   REGISTER page logic
   ------------------------------ */
if (onRegister && exists("register-form")) {
  const registerForm = $id("register-form");
  const registerMessage = $id("register-message");

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    registerMessage.textContent = "";
    const email = $id("reg-email").value.trim();
    const password = $id("reg-password").value.trim();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      registerMessage.textContent = "Account created successfully. Redirecting to login...";
      registerMessage.style.color = "green";
      registerForm.reset();
      setTimeout(() => { window.location.href = "index.html"; }, 1200);
    } catch (err) {
      registerMessage.textContent = `Error: ${err.message}`;
      registerMessage.style.color = "red";
    }
  });
}

/* ------------------------------
   APP (dashboard) logic
   ------------------------------ */
if (onApp && exists("greet-user")) {
  // Elements
  const greetUser = $id("greet-user");
  const taskSummary = $id("task-summary");
  const logoutBtn = $id("logout-btn");
  const taskForm = $id("task-form");
  const titleInput = $id("title");
  const descInput = $id("description");
  const datetimeInput = $id("datetime");
  const taskList = $id("task-list");
  const clearAllBtn = $id("clear-all");
  const addQuickBtn = $id("add-quick");
  const filterSelect = $id("filter-tasks");
  const searchInput = $id("search-tasks");

  const iaToggle = $id("ia-toggle");
  const iaPanel = $id("ia-panel");
  const closeIa = $id("close-ia");
  const iaChat = $id("ia-chat");
  const iaForm = $id("ia-form");
  const iaInput = $id("ia-input");

  let tasks = loadLocalTasks();

  // Auth guard: if not logged in, redirect to login
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    // show user greeting
    greetUser.textContent = `👋 ${user.email.split("@")[0]}`;
    // load tasks from Firestore (if any)
    await loadTasksFromFirestore();
    renderTasks();
  });

  // Logout
  logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
    // redirect to login page
    window.location.href = "index.html";
  });

  // Task add
  taskForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = (titleInput.value || "").trim();
    const description = (descInput.value || "").trim();
    const datetime = datetimeInput.value;
    if (!title || !datetime) return;
    const task = { id: Date.now(), title, description, datetime, completed: false };
    tasks.push(task);
    saveLocalAndCloud();
    taskForm.reset();
    renderTasks();
  });

  addQuickBtn?.addEventListener("click", () => {
    const title = prompt("Quick task title:");
    if (!title) return;
    const task = { id: Date.now(), title: title.trim(), description: "", datetime: new Date().toISOString(), completed: false };
    tasks.push(task);
    saveLocalAndCloud();
    renderTasks();
  });

  clearAllBtn?.addEventListener("click", () => {
    if (!confirm("Delete all tasks?")) return;
    tasks = [];
    saveLocalAndCloud();
    renderTasks();
  });

  // Task list actions (delegation)
  taskList?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    if (action === "toggle") {
      tasks[idx].completed = !tasks[idx].completed;
      saveLocalAndCloud();
      renderTasks();
    } else if (action === "edit") {
      const newTitle = prompt("Edit title:", tasks[idx].title);
      if (newTitle === null) return;
      const newDesc = prompt("Edit description:", tasks[idx].description || "");
      tasks[idx].title = newTitle.trim();
      tasks[idx].description = newDesc !== null ? newDesc.trim() : tasks[idx].description;
      saveLocalAndCloud();
      renderTasks();
    } else if (action === "delete") {
      tasks.splice(idx, 1);
      saveLocalAndCloud();
      renderTasks();
    }
  });

  // Filter & search
  filterSelect?.addEventListener("change", renderTasks);
  searchInput?.addEventListener("input", renderTasks);

  // Render function
  function renderTasks() {
    if (!taskList) return;
    const filter = filterSelect?.value || "all";
    const search = (searchInput?.value || "").toLowerCase();
    const visible = tasks.filter(t => {
      const matchesFilter = filter === "all" || (filter === "pending" && !t.completed) || (filter === "completed" && t.completed);
      const matchesSearch = t.title.toLowerCase().includes(search) || (t.description || "").toLowerCase().includes(search);
      return matchesFilter && matchesSearch;
    });

    taskList.innerHTML = "";
    if (visible.length === 0) {
      const li = document.createElement("li");
      li.className = "task-card";
      li.innerHTML = `<div class="left"><div class="title muted">No tasks found</div></div>`;
      taskList.appendChild(li);
    } else {
      visible.sort((a,b)=> new Date(a.datetime) - new Date(b.datetime));
      visible.forEach(task => {
        const li = document.createElement("li");
        li.className = "task-card";
        li.innerHTML = `
          <div class="left">
            <div>
              <div class="title">${escapeHtml(task.title)}</div>
              <div class="meta">${new Date(task.datetime).toLocaleString()}</div>
              ${task.description?`<div class="meta">${escapeHtml(task.description)}</div>`:""}
            </div>
          </div>
          <div class="task-actions">
            <button data-action="toggle" data-id="${task.id}" class="btn small">${task.completed ? '↩️' : '✅'}</button>
            <button data-action="edit" data-id="${task.id}" class="btn small">✏️</button>
            <button data-action="delete" data-id="${task.id}" class="btn small">🗑️</button>
          </div>
        `;
        if (task.completed) li.style.opacity = "0.6";
        taskList.appendChild(li);
      });
    }

    const pending = tasks.filter(t=>!t.completed).length;
    taskSummary.textContent = `You have ${pending} pending task${pending===1?"":"s"}.`;
    saveLocalTasks(tasks);
  }

  // ------------------------------
  // Local + Firestore sync helpers
  // ------------------------------
  function saveLocalAndCloud() {
    saveLocalTasks(tasks);
    const user = auth.currentUser;
    if (!user) return;
    setDoc(doc(db, "users", user.uid), { tasks }).catch(err => console.error("Firestore save error", err));
  }

  async function loadTasksFromFirestore() {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        tasks = snap.data().tasks || [];
        saveLocalTasks(tasks);
      } else {
        tasks = loadLocalTasks();
      }
    } catch (err) {
      console.error("Firestore load error", err);
      tasks = loadLocalTasks();
    }
  }

  /* ------------------------------
     AI ASSISTANT (static intelligent responses in English)
     - LGPD-safe: no external message storage, all local.
     ------------------------------ */
  iaToggle?.addEventListener("click", () => {
    if (!iaPanel) return;
    iaPanel.classList.toggle("hidden");
    iaPanel.setAttribute("aria-hidden", iaPanel.classList.contains("hidden") ? "true" : "false");
  });

  closeIa?.addEventListener("click", () => {
    if (!iaPanel) return;
    iaPanel.classList.add("hidden");
    iaPanel.setAttribute("aria-hidden","true");
  });

  iaForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = (iaInput.value || "").trim();
    if (!q) return;
    addChatMessage(q, "user");
    iaInput.value = "";
    setTimeout(()=> generateResponse(q), 300);
  });

  function addChatMessage(text, who="ia") {
    if (!iaChat) return;
    const el = document.createElement("div");
    el.className = "ia-msg";
    if (who === "user") el.classList.add("user");
    el.textContent = text;
    iaChat.appendChild(el);
    iaChat.scrollTop = iaChat.scrollHeight;
  }

  function generateResponse(query) {
    const q = query.toLowerCase();
    const pending = tasks.filter(t=>!t.completed);
    const overdue = tasks.filter(t=>new Date(t.datetime) < new Date() && !t.completed);
    const dueToday = tasks.filter(t=>{
      const diff = new Date(t.datetime) - new Date();
      return diff > 0 && diff < 86400000;
    });

    let res = "I'm here to help — try asking about tasks, deadlines, or priorities.";
    if (/(hello|hi|hey)/i.test(q)) {
      const arr = ["Hey! How can I help with your tasks today?", "Hi — want a quick summary of your tasks?", "Hello! Ready to organize your day?"];
      res = arr[Math.floor(Math.random()*arr.length)];
    } else if (/(pending|todo|to-do|incomplete)/i.test(q)) {
      res = pending.length ? `You have ${pending.length} pending task${pending.length===1?"":"s"}.` : "No pending tasks — nice!";
    } else if (/(overdue|late|missed)/i.test(q)) {
      res = overdue.length ? `⚠️ You have ${overdue.length} overdue task${overdue.length===1?"":"s"}.` : "No overdue tasks.";
    } else if (/(today|due today)/i.test(q)) {
      res = dueToday.length ? `Due today: ${dueToday.map(t=>t.title).join(", ")}` : "No tasks due today 🎉";
    } else if (/(all|summary|list)/i.test(q)) {
      res = tasks.length ? `All tasks:\n${tasks.map(t=>`• ${t.title} (${t.completed? "done":"pending"})`).join("\n")}` : "No tasks yet.";
    } else if (/(motivat|quote|inspire)/i.test(q)) {
      const qts = ["Keep going — small steps win the race.", "Focus on progress, not perfection.", "Start now — finish strong."];
      res = qts[Math.floor(Math.random()*qts.length)];
    } else if (/(add|create) task/i.test(q)) {
      res = "To add a task, use the form: title, optional description, and a deadline.";
    } else {
      const fallbacks = ["Sorry, I didn't get that — could you rephrase?", "Not sure I understood — try asking about your tasks or deadlines."];
      res = fallbacks[Math.floor(Math.random()*fallbacks.length)];
    }
    addChatMessage(res, "ia");
  }

  // initial render from local storage
  renderTasks();
} // end app logic (onApp)
