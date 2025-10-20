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

// -----------------------------
// AI ASSISTANT (ENGLISH VERSION)
// -----------------------------
iaToggle?.addEventListener("click", () => iaPanel?.classList.remove("hidden"));
closeIa?.addEventListener("click", () => iaPanel?.classList.add("hidden"));

if (iaForm) {
  iaForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const question = iaInput?.value.trim();
    if (!question) return;
    addMessage(question, "user");
    iaInput.value = "";
    setTimeout(() => generateIaResponse(question), 600);
  });
}

function addMessage(text, sender = "ia") {
  const msg = document.createElement("div");
  msg.classList.add("ia-msg", sender);
  msg.textContent = text;
  iaChat?.appendChild(msg);
  iaChat.scrollTop = iaChat.scrollHeight;
}

function generateIaResponse(question) {
  const lower = question.toLowerCase();
  const pending = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);
  const overdue = tasks.filter(
    (t) => new Date(t.datetime) < new Date() && !t.completed
  );

  let response = "";

  if (/(hello|hi|hey)/i.test(lower)) {
    const greetings = [
      "Hey there 👋 How’s your day going?",
      "Hello! Ready to organize your tasks?",
      "Hi! Let’s make some progress today 🚀",
    ];
    response = greetings[Math.floor(Math.random() * greetings.length)];
  } else if (/(pending|incomplete)/i.test(lower)) {
    response = pending.length
      ? `You have ${pending.length} pending task${
          pending.length === 1 ? "" : "s"
        }. Need help with them?`
      : "No pending tasks — nice job! 🎉";
  } else if (/(completed|done|finished)/i.test(lower)) {
    response = completed.length
      ? `You’ve completed ${completed.length} task${
          completed.length === 1 ? "" : "s"
        }. Keep it up 💪`
      : "You haven’t completed any tasks yet — let’s start small!";
  } else if (/(overdue|late|missed)/i.test(lower)) {
    response = overdue.length
      ? `⚠️ You have ${overdue.length} overdue task${
          overdue.length === 1 ? "" : "s"
        }. Want to see them?`
      : "No overdue tasks. Great time management ⏰";
  } else if (/(today|now)/i.test(lower)) {
    const todayTasks = tasks.filter((t) => {
      const diff = new Date(t.datetime) - new Date();
      return diff > 0 && diff < 86400000;
    });
    response = todayTasks.length
      ? `Here’s what’s due today: ${todayTasks
          .map((t) => "• " + t.title)
          .join(", ")}`
      : "No tasks for today — enjoy your day 🌞";
  } else if (/(motivation|quote|inspire)/i.test(lower)) {
    const quotes = [
      "💡 “Discipline beats motivation — every single day.”",
      "🔥 “Dream big. Start small. Act now.”",
      "🌱 “Each task done is a seed of success planted.”",
    ];
    response = quotes[Math.floor(Math.random() * quotes.length)];
  } else if (/(add|create) task/i.test(lower)) {
    response =
      "Sure! Just type the task title and click ‘Add Task’. You can also use the quick add button ➕";
  } else {
    const fallback = [
      "Hmm, I’m not sure I understood. Could you rephrase?",
      "Sorry, can you clarify that for me?",
      "I didn’t quite get that — do you mean your task list?",
    ];
    response = fallback[Math.floor(Math.random() * fallback.length)];
  }

  addMessage(response);
}
