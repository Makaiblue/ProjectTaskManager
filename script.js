// script.js (module)
// Comments in English explaining each block.

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

document.addEventListener("DOMContentLoaded", () => {
  // ------------------------------
  // Element references
  // ------------------------------
  const authSection = document.getElementById("auth-section");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const showRegisterBtn = document.getElementById("show-register");
  const showLoginBtn = document.getElementById("show-login");
  const authMessage = document.getElementById("auth-message");

  const appSection = document.getElementById("app-section");
  const greetUser = document.getElementById("greet-user");
  const taskSummary = document.getElementById("task-summary");
  const logoutBtn = document.getElementById("logout-btn");

  const taskForm = document.getElementById("task-form");
  const titleInput = document.getElementById("title");
  const descInput = document.getElementById("description");
  const datetimeInput = document.getElementById("datetime");
  const taskList = document.getElementById("task-list");
  const clearAllBtn = document.getElementById("clear-all");
  const addQuickBtn = document.getElementById("add-quick");
  const filterSelect = document.getElementById("filter-tasks");
  const searchInput = document.getElementById("search-tasks");

  const iaToggle = document.getElementById("ia-toggle");
  const iaPanel = document.getElementById("ia-panel");
  const closeIa = document.getElementById("close-ia");
  const iaChat = document.getElementById("ia-chat");
  const iaForm = document.getElementById("ia-form");
  const iaInput = document.getElementById("ia-input");

  // ------------------------------
  // Local state
  // ------------------------------
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

  // ------------------------------
  // Firebase init
  // ------------------------------
  const firebaseConfig = {
    apiKey: "AIzaSyA3o7I7NSz7_4C7qUOFirnIjot4_rW885o",
    authDomain: "project-task-manager-6a4d6.firebaseapp.com",
    projectId: "project-task-manager-6a4d6",
    storageBucket: "project-task-manager-6a4d6.appspot.com",
    messagingSenderId: "797859086383",
    appId: "1:797859086383:web:d84f87f51b6708540c86da",
    measurementId: "G-XPQS6YQCCS"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // ------------------------------
  // Helpers: UI show/hide
  // ------------------------------
  function showAuth() {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
  }

  function showApp(user) {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    greetUser.textContent = `👋 ${user.email.split("@")[0]}`;
  }

  // ------------------------------
  // Toggle login/register forms
  // ------------------------------
  if (showRegisterBtn) {
    showRegisterBtn.addEventListener("click", (e) => {
      e.preventDefault();
      loginForm.classList.add("hidden");
      registerForm.classList.remove("hidden");
      showRegisterBtn.classList.add("hidden");
      showLoginBtn.classList.remove("hidden");
      authMessage.textContent = "";
    });
  }

  if (showLoginBtn) {
    showLoginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      loginForm.classList.remove("hidden");
      registerForm.classList.add("hidden");
      showRegisterBtn.classList.remove("hidden");
      showLoginBtn.classList.add("hidden");
      authMessage.textContent = "";
    });
  }

  // ------------------------------
  // Register
  // ------------------------------
  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value.trim();
    if (!email || !password) return;

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      authMessage.textContent = "✅ Account created. You can now login.";
      authMessage.style.color = "green";
      registerForm.reset();
      // switch back to login
      loginForm.classList.remove("hidden");
      registerForm.classList.add("hidden");
      showRegisterBtn.classList.remove("hidden");
      showLoginBtn.classList.add("hidden");
    } catch (err) {
      authMessage.textContent = `❌ ${err.message}`;
      authMessage.style.color = "red";
    }
  });

  // ------------------------------
  // Login
  // ------------------------------
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    if (!email || !password) return;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      loginForm.reset();
    } catch (err) {
      authMessage.textContent = `❌ ${err.message}`;
      authMessage.style.color = "red";
    }
  });

  // ------------------------------
  // Auth state observer -> show app when logged
  // ------------------------------
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      showApp(user);
      await loadTasksFromFirestore();
      renderTasks();
    } else {
      showAuth();
      tasks = JSON.parse(localStorage.getItem("tasks")) || [];
      renderTasks();
    }
  });

  // ------------------------------
  // Logout
  // ------------------------------
  logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
    // state change will showAuth automatically
  });

  // ------------------------------
  // Task CRUD + UI
  // ------------------------------
  taskForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    const description = descInput.value.trim();
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
    const task = { id: Date.now(), title, description: "", datetime: new Date().toISOString(), completed: false };
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

  // Event delegation for task actions (complete/edit/delete)
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
      if (newTitle !== null) tasks[idx].title = newTitle;
      if (newDesc !== null) tasks[idx].description = newDesc;
      saveLocalAndCloud();
      renderTasks();
    } else if (action === "delete") {
      tasks.splice(idx, 1);
      saveLocalAndCloud();
      renderTasks();
    }
  });

  // ------------------------------
  // Render tasks with filter & search
  // ------------------------------
  function renderTasks() {
    if (!taskList) return;
    const filter = filterSelect?.value || "all";
    const search = (searchInput?.value || "").toLowerCase();

    // filter & search
    const visible = tasks.filter(t => {
      const matchesFilter = filter === "all" || (filter === "pending" && !t.completed) || (filter === "completed" && t.completed);
      const matchesSearch = t.title.toLowerCase().includes(search) || (t.description || "").toLowerCase().includes(search);
      return matchesFilter && matchesSearch;
    });

    taskList.innerHTML = "";
    if (visible.length === 0) {
      taskList.innerHTML = `<li class="task-card"><div class="left"><div class="title muted">No tasks found</div></div></li>`;
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

    // summary
    const pending = tasks.filter(t=>!t.completed).length;
    taskSummary.textContent = `You have ${pending} pending task${pending===1?"":"s"}.`;
  }

  filterSelect?.addEventListener("change", renderTasks);
  searchInput?.addEventListener("input", renderTasks);

  // ------------------------------
  // Local + Firestore sync
  // ------------------------------
  function saveLocalAndCloud() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
    const user = auth.currentUser;
    if (!user) return;
    // save to Firestore
    setDoc(doc(db, "users", user.uid), { tasks }).catch(err=>console.error(err));
  }

  async function loadTasksFromFirestore() {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const d = await getDoc(doc(db, "users", user.uid));
      if (d.exists()) {
        tasks = d.data().tasks || [];
        localStorage.setItem("tasks", JSON.stringify(tasks));
      } else {
        // if no remote doc, try local storage
        tasks = JSON.parse(localStorage.getItem("tasks")) || [];
      }
    } catch (err) {
      console.error("Firestore load error", err);
      tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    }
  }

  // ------------------------------
  // AI Assistant (English, LGPD-safe)
  // ------------------------------
  iaToggle?.addEventListener("click", ()=> {
    iaPanel.classList.toggle("hidden");
    iaPanel.setAttribute("aria-hidden", iaPanel.classList.contains("hidden") ? "true" : "false");
  });

  closeIa?.addEventListener("click", ()=> {
    iaPanel.classList.add("hidden");
    iaPanel.setAttribute("aria-hidden","true");
  });

  iaForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = iaInput.value.trim();
    if (!q) return;
    addChatMessage(q, "user");
    iaInput.value = "";
    setTimeout(()=> generateResponse(q), 500);
  });

  function addChatMessage(text, who="ia") {
    if(!iaChat) return;
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

    // friendly English responses (LGPD-safe: no external storage of messages)
    let res = "I'm here to help — could you ask about tasks, deadlines or priorities?";
    if (/(hello|hi|hey)/i.test(q)) {
      const arr = ["Hey! How can I help with your tasks today?", "Hi — want a quick summary of your tasks?", "Hello! Ready to organize your day?"];
      res = arr[Math.floor(Math.random()*arr.length)];
    } else if (/(pending|pending tasks|to do|todo|incomplete)/i.test(q)) {
      res = pending.length ? `You have ${pending.length} pending task${pending.length===1?"":"s"}.` : "No pending tasks — great!";
    } else if (/(overdue|late|missed)/i.test(q)) {
      res = overdue.length ? `⚠️ You have ${overdue.length} overdue task${overdue.length===1?"":"s"}.` : "No overdue tasks.";
    } else if (/(today|today's|due today)/i.test(q)) {
      res = dueToday.length ? `Due today: ${dueToday.map(t=>t.title).join(", ")}` : "No tasks due today 🎉";
    } else if (/(summary|all tasks|list)/i.test(q)) {
      res = tasks.length ? `All tasks:\n${tasks.map(t=>`• ${t.title} (${t.completed? "done" : "pending"})`).join("\n")}` : "No tasks at the moment.";
    } else if (/(motivation|quote|inspire)/i.test(q)) {
      const qts = ["Keep going — small steps win the race.", "Focus on progress, not perfection.", "Start now — finish strong."];
      res = qts[Math.floor(Math.random()*qts.length)];
    } else if (/(add|create) task/i.test(q)) {
      res = "To add a task, use the form: title, optional description, and a deadline.";
    } else {
      const fallbacks = ["Sorry, I didn't get that — can you rephrase?", "Not sure I understand — try asking about your tasks or deadlines."];
      res = fallbacks[Math.floor(Math.random()*fallbacks.length)];
    }

    addChatMessage(res, "ia");
  }

  // ------------------------------
  // Utilities
  // ------------------------------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // ------------------------------
  // Initial render from localStorage
  // ------------------------------
  (function init() {
    tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    renderTasks();
  })();

}); // DOMContentLoaded end
