document.addEventListener("DOMContentLoaded", () => {
  // ====================================================
  // VARIABLES AND ELEMENT REFERENCES
  // ====================================================
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const showRegisterBtn = document.getElementById("show-register");
  const showLoginBtn = document.getElementById("show-login");
  const authSection = document.getElementById("auth-section");
  const dashboardSection = document.getElementById("dashboard-section");
  const logoutBtn = document.getElementById("logout-btn");
  const userEmailDisplay = document.getElementById("user-email");

  const taskForm = document.getElementById("task-form");
  const taskList = document.getElementById("task-list");
  const clearAllBtn = document.getElementById("clear-all");

  const iaToggle = document.getElementById("ia-toggle");
  const iaPanel = document.getElementById("ia-panel");
  const closeIa = document.getElementById("close-ia");
  const iaChat = document.getElementById("ia-chat");
  const iaForm = document.getElementById("ia-form");
  const iaInput = document.getElementById("ia-input");

  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

  // ====================================================
  // FIREBASE CONFIG
  // ====================================================
  const firebaseConfig = {
    apiKey: "AIzaSyA3o7I7NSz7_4C7qUOFirnIjot4_rW885o",
    authDomain: "project-task-manager-6a4d6.firebaseapp.com",
    projectId: "project-task-manager-6a4d6",
    storageBucket: "project-task-manager-6a4d6.appspot.com",
    messagingSenderId: "797859086383",
    appId: "1:797859086383:web:d84f87f51b6708540c86da",
    measurementId: "G-XPQS6YQCCS"
  };

  // Initialize Firebase
  const app = firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  // ====================================================
  // AUTHENTICATION
  // ====================================================
  if (showRegisterBtn) {
    showRegisterBtn.addEventListener("click", (e) => {
      e.preventDefault();
      loginForm.classList.add("hidden");
      registerForm.classList.remove("hidden");
      showRegisterBtn.classList.add("hidden");
      showLoginBtn.classList.remove("hidden");
    });
  }

  if (showLoginBtn) {
    showLoginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      loginForm.classList.remove("hidden");
      registerForm.classList.add("hidden");
      showRegisterBtn.classList.remove("hidden");
      showLoginBtn.classList.add("hidden");
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("reg-email").value;
      const password = document.getElementById("reg-password").value;

      auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
          alert("✅ Account created successfully!");
          registerForm.reset();
          registerForm.classList.add("hidden");
          loginForm.classList.remove("hidden");
          showRegisterBtn.classList.remove("hidden");
          showLoginBtn.classList.add("hidden");
        })
        .catch(err => alert(`⚠️ ${err.message}`));
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      auth.signInWithEmailAndPassword(email, password)
        .then(() => loginForm.reset())
        .catch(err => alert(`⚠️ ${err.message}`));
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => auth.signOut());
  }

  auth.onAuthStateChanged((user) => {
    if (user) {
      authSection.classList.add("hidden");
      dashboardSection.classList.remove("hidden");
      logoutBtn.classList.remove("hidden");
      userEmailDisplay.textContent = user.email;
      loadTasksFromFirestore();
    } else {
      authSection.classList.remove("hidden");
      dashboardSection.classList.add("hidden");
      logoutBtn.classList.add("hidden");
      userEmailDisplay.textContent = "";
      tasks = [];
      renderTasks();
    }
  });

  // ====================================================
  // TASK MANAGEMENT
  // ====================================================
  if (taskForm) {
    taskForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = document.getElementById("title").value.trim();
      const description = document.getElementById("description").value.trim();
      const datetime = document.getElementById("datetime").value;

      if (!title || !datetime) return;

      const task = { id: Date.now(), title, description, datetime, completed: false };
      tasks.push(task);
      saveTasks();
      renderTasks();
      taskForm.reset();
    });
  }

  function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
    saveTasksToFirestore();
  }

  function renderTasks() {
    if (!taskList) return;
    taskList.innerHTML = "";
    tasks.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    tasks.forEach(addTaskToDOM);
  }

  function addTaskToDOM(task) {
    if (!taskList) return;
    const li = document.createElement("li");
    if (task.completed) li.classList.add("completed");
    const remaining = getTimeRemaining(task.datetime);
    li.innerHTML = `
      <strong>${task.title}</strong>
      ${task.description ? `<span>${task.description}</span>` : ""}
      <span class="time-remaining">⏰ ${new Date(task.datetime).toLocaleString()} (${remaining})</span>
      <div class="task-actions">
        <button class="complete-btn" onclick="toggleComplete(${task.id})">${task.completed ? "↩️ Undo" : "✅ Complete"}</button>
        <button class="edit-btn" onclick="editTask(${task.id})">✏️ Edit</button>
        <button class="remove-btn" onclick="removeTask(${task.id})">🗑️ Remove</button>
      </div>
    `;
    taskList.appendChild(li);
  }

  function getTimeRemaining(datetime) {
    const now = new Date();
    const target = new Date(datetime);
    const diff = target - now;
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m remaining`;
  }

  window.toggleComplete = function(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
  }

  window.editTask = function(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newTitle = prompt("Edit title:", task.title);
    const newDesc = prompt("Edit description:", task.description);
    if (newTitle !== null) task.title = newTitle;
    if (newDesc !== null) task.description = newDesc;
    saveTasks();
    renderTasks();
  }

  window.removeTask = function(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to delete all tasks?")) {
        tasks = [];
        saveTasks();
        renderTasks();
      }
    });
  }

  // ====================================================
  // FIRESTORE SYNC
  // ====================================================
  function saveTasksToFirestore() {
    const user = auth.currentUser;
    if (!user) return;
    db.collection("users").doc(user.uid).set({ tasks })
      .then(() => console.log("💾 Tasks synced"))
      .catch(err => console.error(err));
  }

  function loadTasksFromFirestore() {
    const user = auth.currentUser;
    if (!user) return;
    db.collection("users").doc(user.uid).get()
      .then(doc => {
        if (doc.exists && doc.data().tasks) {
          tasks = doc.data().tasks;
          renderTasks();
        }
      })
      .catch(err => console.error(err));
  }

  // ====================================================
  // AI ASSISTANT (ENGLISH, interactive)
  // ====================================================
  if (iaToggle) iaToggle.addEventListener("click", () => iaPanel?.classList.remove("hidden"));
  if (closeIa) closeIa.addEventListener("click", () => iaPanel?.classList.add("hidden"));

  if (iaForm) {
    iaForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const question = iaInput?.value.trim();
      if (!question) return;
      addMessage(question, "user");
      iaInput.value = "";

      setTimeout(() => generateIaResponse(question), 500);
    });
  }

  function addMessage(text, sender = "ia") {
    if (!iaChat) return;
    const msg = document.createElement("div");
    msg.classList.add("ia-msg");
    if (sender === "user") msg.classList.add("user");
    msg.textContent = text;
    iaChat.appendChild(msg);
    iaChat.scrollTop = iaChat.scrollHeight;
  }

  function generateIaResponse(question) {
    const lower = question.toLowerCase();
    let response = "I'm here to help! Could you provide more details?";
    const pending = tasks.filter(t => !t.completed);
    const expired = tasks.filter(t => new Date(t.datetime) < new Date());
    const soon = tasks.filter(t => {
      const diff = new Date(t.datetime) - new Date();
      return diff > 0 && diff < 86400000;
    });

    if (lower.includes("urgent") || lower.includes("priority")) {
      response = `You have ${soon.length} tasks approaching their deadlines.`;
    } else if (lower.includes("summary") || lower.includes("tasks")) {
      response = `You currently have ${pending.length} pending tasks and ${expired.length} overdue tasks.`;
    } else if (lower.includes("today")) {
      response = soon.length > 0
        ? `Tasks for today:\n${soon.map(t => `• ${t.title}`).join("\n")}`
        : "No tasks scheduled for today 🎉";
    } else if (lower.includes("all")) {
      response = pending.length > 0
        ? `Here are your pending tasks:\n${pending.map(t => `• ${t.title}`).join("\n")}`
        : "You have no pending tasks 🎯";
    }

    addMessage(response);
  }
});
