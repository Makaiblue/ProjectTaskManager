document.addEventListener("DOMContentLoaded", () => {
  // ====================================================
  // VARIABLES AND ELEMENT REFERENCES
  // ====================================================
  const form = document.getElementById('task-form');
  const taskList = document.getElementById('task-list');
  const clearAllBtn = document.getElementById('clear-all');
  const iaToggle = document.getElementById('ia-toggle');
  const iaPanel = document.getElementById('ia-panel');
  const closeIa = document.getElementById('close-ia');
  const iaChat = document.getElementById('ia-chat');
  const iaForm = document.getElementById('ia-form');
  const iaInput = document.getElementById('ia-input');

  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const showRegister = document.getElementById("show-register");
  const showLogin = document.getElementById("show-login");
  const authSection = document.getElementById("auth-section");
  const taskSection = document.getElementById("task-section");
  const logoutBtn = document.getElementById("logout-btn");
  const userEmail = document.getElementById("user-email");

  let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

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

  if (typeof firebase === 'undefined') {
    console.error("Firebase is not loaded. Make sure to include Firebase SDKs.");
    return;
  }

  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  // ====================================================
  // AUTHENTICATION
  // ====================================================
  if (showRegister) {
    showRegister.addEventListener("click", (e) => {
      e.preventDefault();
      loginForm?.classList.add("hidden");
      registerForm?.classList.remove("hidden");
      showRegister.classList.add("hidden");
      showLogin?.classList.remove("hidden");
    });
  }

  if (showLogin) {
    showLogin.addEventListener("click", (e) => {
      e.preventDefault();
      loginForm?.classList.remove("hidden");
      registerForm?.classList.add("hidden");
      showRegister?.classList.remove("hidden");
      showLogin.classList.add("hidden");
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("reg-email")?.value;
      const password = document.getElementById("reg-password")?.value;

      auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
          alert("✅ Account created successfully!");
          registerForm.reset();
          registerForm.classList.add("hidden");
          loginForm.classList.remove("hidden");
          showLogin.classList.add("hidden");
          showRegister.classList.remove("hidden");
        })
        .catch(err => alert(`⚠️ ${err.message}`));
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("email")?.value;
      const password = document.getElementById("password")?.value;

      auth.signInWithEmailAndPassword(email, password)
        .then(() => {
          loginForm.reset();
        })
        .catch(err => alert(`⚠️ ${err.message}`));
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => auth.signOut());
  }

  // ====================================================
  // AUTH STATE CHANGE
  // ====================================================
  auth.onAuthStateChanged((user) => {
    if (user) {
      showDashboard(user);
      loadTasksFromFirestore();
    } else {
      showLoginScreen();
      tasks = [];
      renderTasks();
    }
  });

  function showDashboard(user) {
    authSection?.classList.add("hidden");
    taskSection?.classList.remove("hidden");
    logoutBtn?.classList.remove("hidden");
    if (userEmail) userEmail.textContent = user.email;
  }

  function showLoginScreen() {
    authSection?.classList.remove("hidden");
    taskSection?.classList.add("hidden");
    logoutBtn?.classList.add("hidden");
    if (userEmail) userEmail.textContent = "";
  }

  // ====================================================
  // TASK MANAGEMENT
  // ====================================================
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('title')?.value.trim();
      const description = document.getElementById('description')?.value.trim();
      const datetime = document.getElementById('datetime')?.value;

      if (!title || !datetime) return;

      const task = { id: Date.now(), title, description, datetime, completed: false };
      tasks.push(task);
      saveTasks();
      renderTasks();
      form.reset();
    });
  }

  function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    saveTasksToFirestore();
  }

  function renderTasks() {
    if (!taskList) return;
    taskList.innerHTML = '';
    tasks.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    tasks.forEach(addTaskToDOM);
  }

  function addTaskToDOM(task) {
    const li = document.createElement('li');
    li.classList.toggle('completed', task.completed);
    const remaining = getTimeRemaining(task.datetime);
    li.innerHTML = `
      <strong>${task.title}</strong>
      ${task.description ? `<span>${task.description}</span>` : ''}
      <span class="time-remaining">⏰ ${new Date(task.datetime).toLocaleString()} (${remaining})</span>
      <div class="task-actions">
        <button class="complete-btn" onclick="toggleComplete(${task.id})">${task.completed ? '↩️ Undo' : '✅ Complete'}</button>
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
    if (diff <= 0) return 'Expired';
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
    const newTitle = prompt('Edit title:', task.title);
    const newDesc = prompt('Edit description:', task.description);
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
    clearAllBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete all tasks?')) {
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
    db.collection('users').doc(user.uid).set({ tasks })
      .then(() => console.log('💾 Tasks synced'))
      .catch(err => console.error(err));
  }

  function loadTasksFromFirestore() {
    const user = auth.currentUser;
    if (!user) return;
    db.collection('users').doc(user.uid).get()
      .then(doc => {
        if (doc.exists && doc.data().tasks) {
          tasks = doc.data().tasks;
          renderTasks();
        }
      })
      .catch(err => console.error(err));
  }

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
