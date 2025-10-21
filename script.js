// script.js (modificado e corrigido)
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
  const elements = {
    authSection: document.getElementById("auth-section"),
    loginForm: document.getElementById("login-form"),
    registerForm: document.getElementById("register-form"),
    showRegisterBtn: document.getElementById("show-register"),
    showLoginBtn: document.getElementById("show-login"),
    authMessage: document.getElementById("auth-message"),
    appSection: document.getElementById("app-section"),
    greetUser: document.getElementById("greet-user"),
    taskSummary: document.getElementById("task-summary"),
    logoutBtn: document.getElementById("logout-btn"),
    taskForm: document.getElementById("task-form"),
    titleInput: document.getElementById("title"),
    descInput: document.getElementById("description"),
    datetimeInput: document.getElementById("datetime"),
    taskList: document.getElementById("task-list"),
    clearAllBtn: document.getElementById("clear-all"),
    addQuickBtn: document.getElementById("add-quick"),
    filterSelect: document.getElementById("filter-tasks"),
    searchInput: document.getElementById("search-tasks"),
    iaToggle: document.getElementById("ia-toggle"),
    iaPanel: document.getElementById("ia-panel"),
    closeIa: document.getElementById("close-ia"),
    iaChat: document.getElementById("ia-chat"),
    iaForm: document.getElementById("ia-form"),
    iaInput: document.getElementById("ia-input")
  };

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
    elements.authSection.classList.remove("hidden");
    elements.appSection.classList.add("hidden");
  }

  function showApp(user) {
    elements.authSection.classList.add("hidden");
    elements.appSection.classList.remove("hidden");
    elements.greetUser.textContent = `👋 ${user.email.split("@")[0]}`;
  }

  // ------------------------------
  // Toggle login/register forms
  // ------------------------------
  if (elements.showRegisterBtn) {
    elements.showRegisterBtn.addEventListener("click", (e) => {
      e.preventDefault();
      elements.loginForm.classList.add("hidden");
      elements.registerForm.classList.remove("hidden");
      elements.showRegisterBtn.classList.add("hidden");
      elements.showLoginBtn.classList.remove("hidden");
      elements.authMessage.textContent = "";
    });
  }

  if (elements.showLoginBtn) {
    elements.showLoginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      elements.loginForm.classList.remove("hidden");
      elements.registerForm.classList.add("hidden");
      elements.showRegisterBtn.classList.remove("hidden");
      elements.showLoginBtn.classList.add("hidden");
      elements.authMessage.textContent = "";
    });
  }

  // ------------------------------
  // Register - CORRIGIDO (removido ; dentro do if)
  // ------------------------------
  if (elements.registerForm) {
    elements.registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("reg-email").value.trim();
      const password = document.getElementById("reg-password").value.trim();
      
      if (!email || !password) return;
      
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        elements.authMessage.textContent = "✅ Conta criada. Agora você pode fazer login.";
        elements.authMessage.style.color = "green";
        elements.registerForm.reset();
        
        // switch back to login
        elements.loginForm.classList.remove("hidden");
        elements.registerForm.classList.add("hidden");
        elements.showRegisterBtn.classList.remove("hidden");
        elements.showLoginBtn.classList.add("hidden");
      } catch (err) {
        elements.authMessage.textContent = `❌ ${err.message}`;
        elements.authMessage.style.color = "red";
      }
    });
  }

  // ------------------------------
  // Login
  // ------------------------------
  if (elements.loginForm) {
    elements.loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();
      
      if (!email || !password) return;
      
      try {
        await signInWithEmailAndPassword(auth, email, password);
        elements.loginForm.reset();
      } catch (err) {
        elements.authMessage.textContent = `❌ ${err.message}`;
        elements.authMessage.style.color = "red";
      }
    });
  }

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
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
    });
  }

  // ------------------------------
  // Task CRUD + UI
  // ------------------------------
  if (elements.taskForm) {
    elements.taskForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = elements.titleInput.value.trim();
      const description = elements.descInput.value.trim();
      const datetime = elements.datetimeInput.value;
      
      if (!title || !datetime) {
        alert("Por favor, preencha pelo menos o título e a data!");
        return;
      }
      
      const task = {
        id: Date.now(),
        title,
        description,
        datetime,
        completed: false
      };
      
      tasks.push(task);
      saveLocalAndCloud();
      elements.taskForm.reset();
      renderTasks();
    });
  }

  if (elements.addQuickBtn) {
    elements.addQuickBtn.addEventListener("click", () => {
      const title = prompt("Título da tarefa rápida:");
      if (!title) return;
      
      const task = {
        id: Date.now(),
        title,
        description: "",
        datetime: new Date().toISOString(),
        completed: false
      };
      
      tasks.push(task);
      saveLocalAndCloud();
      renderTasks();
    });
  }

  if (elements.clearAllBtn) {
    elements.clearAllBtn.addEventListener("click", () => {
      if (!confirm("Tem certeza que deseja apagar TODAS as tarefas?")) return;
      tasks = [];
      saveLocalAndCloud();
      renderTasks();
    });
  }

  // Event delegation for task actions (complete/edit/delete)
  if (elements.taskList) {
    elements.taskList.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;}
      
      const id = Number(btn.dataset.id);
      const action = btn.dataset.action;
      const idx = tasks.findIndex(t => t.id === id);
      
     
