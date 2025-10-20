// ====================================================
// PROJECT TASK MANAGER - SCRIPT REVISED (v2.0)
// ====================================================

// -----------------------------
// Firebase initialization
// -----------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA3o7I7NSz7_4C7qUOFirnIjot4_rW885o",
  authDomain: "project-task-manager-6a4d6.firebaseapp.com",
  projectId: "project-task-manager-6a4d6",
  storageBucket: "project-task-manager-6a4d6.firebasestorage.app",
  messagingSenderId: "797859086383",
  appId: "1:797859086383:web:d84f87f51b6708540c86da",
  measurementId: "G-XPQS6YQCCS",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// -----------------------------
// DOM Elements
// -----------------------------
const logoutBtn = document.getElementById("logout-btn");
const greetUser = document.getElementById("greet-user");
const taskSummary = document.getElementById("task-summary");
const iaPanel = document.getElementById("ia-panel");
const iaForm = document.getElementById("ia-form");
const iaChat = document.getElementById("ia-chat");
const iaInput = document.getElementById("ia-input");
const iaToggle = document.getElementById("ia-toggle");
const closeIa = document.getElementById("close-ia");

const filterSelect = document.getElementById("filter-tasks");
const searchInput = document.getElementById("search-tasks");
const addQuickBtn = document.getElementById("add-quick-task");
const taskList = document.getElementById("task-list");

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

// -----------------------------
// Authentication
// -----------------------------
onAuthStateChanged(auth, (user) => {
  if (user) {
    greetUser.textContent = `👋 Welcome, ${user.email.split("@")[0]}!`;
    renderTasks();
  } else {
    window.location.href = "index.html";
  }
});

logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// -----------------------------
// Task management
// -----------------------------
function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
  renderTasks();
}

function renderTasks() {
  const filter = filterSelect?.value || "all";
  const searchTerm = (searchInput?.value || "").toLowerCase();

  taskList.innerHTML = "";

  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(searchTerm);
    const matchFilter =
      filter === "all" ||
      (filter === "pending" && !t.completed) ||
      (filter === "completed" && t.completed);
    return matchSearch && matchFilter;
  });

  if (filtered.length === 0) {
    taskList.innerHTML = "<p class='empty-msg'>No tasks found.</p>";
    taskSummary.textContent = "No tasks pending!";
    return;
  }

  filtered.forEach((task, i) => {
    const div = document.createElement("div");
    div.classList.add("task-card");
    div.innerHTML = `
      <input type="checkbox" ${task.completed ? "checked" : ""} data-index="${i}">
      <span class="${task.completed ? "done" : ""}">${task.title}</span>
      <button data-index="${i}" class="delete-btn">🗑️</button>
    `;
    taskList.appendChild(div);
  });

  const pending = tasks.filter((t) => !t.completed).length;
  taskSummary.textContent = `You have ${pending} pending task${pending === 1 ? "" : "s"}.`;
}

taskList?.addEventListener("change", (e) => {
  const index = e.target.dataset.index;
  if (index !== undefined) {
    tasks[index].completed = e.target.checked;
    saveTasks();
  }
});

taskList?.addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-btn")) {
    const index = e.target.dataset.index;
    tasks.splice(index, 1);
    saveTasks();
  }
});

filterSelect?.addEventListener("change", renderTasks);
searchInput?.addEventListener("input", renderTasks);

addQuickBtn?.addEventListener("click", () => {
  const title = prompt("Enter a quick task:");
  if (title) {
    tasks.push({ title, completed: false, datetime: new Date().toISOString() });
    saveTasks();
  }
});

// ====================================================
// AI ASSISTANT (Enhanced, LGPD-safe & friendly)
// ====================================================
if (iaToggle) iaToggle.addEventListener('click', () => iaPanel?.classList.remove('hidden'));
if (closeIa) closeIa.addEventListener('click', () => iaPanel?.classList.add('hidden'));

if (iaForm) {
  iaForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const question = iaInput?.value.trim();
    if (!question) return;
    addMessage(question, 'user');
    iaInput.value = '';
    setTimeout(() => generateIaResponse(question), 500);
  });
}

// 💬 Render chat messages
function addMessage(text, sender = 'ia') {
  if (!iaChat) return;
  const msg = document.createElement('div');
  msg.classList.add('ia-msg');
  if (sender === 'user') msg.classList.add('user');
  msg.textContent = text;
  iaChat.appendChild(msg);
  iaChat.scrollTop = iaChat.scrollHeight;
}

// 💡 Smarter AI response system (LGPD-safe)
function generateIaResponse(question) {
  const lower = question.toLowerCase();
  const pending = tasks.filter(t => !t.completed);
  const expired = tasks.filter(t => new Date(t.datetime) < new Date());
  const soon = tasks.filter(t => {
    const diff = new Date(t.datetime) - new Date();
    return diff > 0 && diff < 86400000;
  });

  let response = "";

  // Task-related questions
  if (lower.includes('task') || lower.includes('todo') || lower.includes('work')) {
    response = `📋 You currently have ${pending.length} pending tasks, and ${expired.length} are overdue.`;
  } 
  else if (lower.includes('today') || lower.includes('now')) {
    if (soon.length > 0) {
      response = `☀️ Here are your tasks for today:\n${soon.map(t => `• ${t.title}`).join('\n')}`;
    } else {
      response = "🎉 No tasks for today! You can take a small break or plan new goals.";
    }
  } 
  else if (lower.includes('motivate') || lower.includes('inspire') || lower.includes('quote')) {
    const quotes = [
      "💪 Keep going — every small step counts!",
      "🚀 Productivity isn’t about doing more, it’s about focusing on what matters.",
      "🌱 Progress, not perfection. You got this!",
      "🔥 The best time to start was yesterday. The next best time is now!"
    ];
    response = quotes[Math.floor(Math.random() * quotes.length)];
  } 
  else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    response = "👋 Hello there! How can I assist you with your tasks today?";
  } 
  else if (lower.includes('help') || lower.includes('guide')) {
    response = "🧭 You can ask me things like:\n• 'Show my tasks for today'\n• 'Motivate me'\n• 'Summarize my pending work'";
  } 
  else {
    // Generic LGPD-safe fallback
    response = "🤖 I respect your privacy and don’t store any personal info. Could you tell me more about what you’d like to do?";
  }

  addMessage(response);
}
