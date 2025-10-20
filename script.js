
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // ====================================================
  // VARIABLES
  // ====================================================
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const showRegister = document.getElementById("show-register");
  const showLogin = document.getElementById("show-login");
  const authSection = document.getElementById("auth-section");
  const taskSection = document.getElementById("task-section");
  const logoutBtn = document.getElementById("logout-btn");
  const userEmailElem = document.getElementById("user-email");
  const authMessage = document.getElementById("auth-message");

  const form = document.getElementById('task-form');
  const taskList = document.getElementById('task-list');
  const clearAllBtn = document.getElementById('clear-all');

  const iaToggle = document.getElementById('ia-toggle');
  const iaPanel = document.getElementById('ia-panel');
  const closeIa = document.getElementById('close-ia');
  const iaChat = document.getElementById('ia-chat');
  const iaForm = document.getElementById('ia-form');
  const iaInput = document.getElementById('ia-input');

  let tasks = [];

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

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // ====================================================
  // AUTHENTICATIONshowRegister.addEventListener("click", e => {
    e.preventDefault();
  // ====================================================
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    showRegister.classList.add("hidden");
    showLogin.classList.remove("hidden");
  });

  showLogin.addEventListener("click", e => {
    e.preventDefault();
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    showRegister.classList.remove("hidden");
    showLogin.classList.add("hidden");showRegister.addEventListener("click", e => {
    e.preventDefault();
  });

  registerForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value.trim();

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      authMessage.textContent = "✅ Account created successfully! Redirecting...";
      authMessage.style.color = "green";
      registerForm.reset();
      setTimeout(() => {
        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");
        showRegister.classList.remove("hidden");
        showLogin.classList.add("hidden");
        authMessage.textContent = "";
      }, 1500);
    } catch (err) {
      authMessage.textContent = `❌ Error: ${err.message}`;
      authMessage.style.color = "red";
    }
  });

  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
      await signInWithEmailAndPassword(auth, email, password);
      loginForm.reset();
    } catch (err) {
      authMessage.textContent = `❌ Error: ${err.message}`;
      authMessage.style.color = "red";
    }
  });

  logoutBtn.addEventListener("click", () => {
    signOut(auth);
  });

  onAuthStateChanged(auth, user => {
    if (user) {showRegister.addEventListener("click", e => {
    e.preventDefault();
      authSection.classList.add("hidden");
      taskSection.classList.remove("hidden");
      userEmailElem.textContent = user.email;
      loadTasks();
    } else {
      authSection.classList.remove("hidden");
      taskSection.classList.add("hidden");
      userEmailElem.textContent = "";
      tasks = [];
      renderTasks();
    }
  });

  // ====================================================
  // TASK MANAGEMENT
  // ====================================================
  form.addEventListener('submit', e => {
    e.preventDefault();
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const datetime = document.getElementById('datetime').value;

    if (!title || !datetime) return;

    const task = { id: Date.now(), title, description, datetime, completed: false };
    tasks.push(task);
    saveTasks();
    renderTasks();
    form.reset();
  });

  function saveTasks() {
    const user = auth.currentUser;
    if (!user) return;
    setDoc(doc(db, "users", user.uid), { tasks }).catch(err => console.error(err));
  }

  async function loadTasks() {
    const user = auth.currentUser;
    if (!user) return;
    const docSnap = await getDoc(doc(db, "users", user.uid));showRegister.addEventListener("click", e => {
    e.preventDefault();
    if (docSnap.exists()) {
      tasks = docSnap.data().tasks || [];
      renderTasks();
    }
  }

  function renderTasks() {
    if (!taskList) return;
    taskList.innerHTML = '';
    tasks.sort((a,b)=> new Date(a.datetime) - new Date(b.datetime));
    tasks.forEach(task => {
      const li = document.createElement('li');
      li.classList.toggle('completed', task.completed);
      const remaining = getTimeRemaining(task.datetime);
      li.innerHTML = `
        <strong>${task.title}</strong>
        ${task.description ? `<span>${task.description}</span>` : ''}
        <span class="time-remaining">⏰ ${new Date(task.datetime).toLocaleString()} (${remaining})</span>
        <div class="task-actions">
          <button onclick="toggleComplete(${task.id})">${task.completed ? '↩️ Undo' : '✅ Complete'}</button>
          <button onclick="editTask(${task.id})">✏️ Edit</button>
          <button onclick="removeTask(${task.id})">🗑️ Remove</button>
        </div>
      `;
      taskList.appendChild(li);
    });
  }

  function getTimeRemaining(datetime) {
    const diff = new Date(datetime) - new Date();
    if(diff <= 0) return "Expired";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000)/60000);
    return `${h}h ${m}m remaining`;
  }

  window.toggleComplete = id => {
    const task = tasks.find(t=>t.id===id);
    if(!task) return;
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
  }

  window.editTask = id => {
    const task = tasks.find(t=>t.id===id);
    if(!task) return;
    const newTitle = prompt("Edit title:", task.title);
    const newDesc = prompt("Edit description:", task.description);
    if(newTitle!==null) task.title=newTitle;
    if(newDesc!==null) task.description=newDesc;
    saveTasks();
    renderTasks();
  }

  window.removeTask = id => {
    tasks = tasks.filter(t=>t.id!==id);
    saveTasks();
    renderTasks();
  }

  clearAllBtn.addEventListener('click', () => {
    if(confirm("Are you sure you want to delete all tasks?")) {
      tasks = [];
      saveTasks();
      renderTasks();
    }
  });

  // ====================================================
  // AI ASSISTANT
  // ====================================================
  iaToggle.addEventListener('click', () => iaPanel.classList.remove('hidden'));
  closeIa.addEventListener('click', () => iaPanel.classList.add('hidden'));

  iaForm.addEventListener('submit', e => {
    e.preventDefault();
    const question = iaInput.value.trim();
    if(!question) return;
    addMessage(question, 'user');
    iaInput.value = '';
    setTimeout(()=>generateIaResponse(question), 500);
  });

  function addMessage(text, sender='ia') {
    if(!iaChat) return;
    const msg = document.createElement('div');
    msg.classList.add('ia-msg');
    if(sender==='user') msg.classList.add('user');
    msg.textContent=text;
    iaChat.appendChild(msg);
    iaChat.scrollTop = iaChat.scrollHeight;
  }

  function generateIaResponse(question) {
    const lower = question.toLowerCase();
    let response = "Sorry, I didn’t quite get that. Try asking about tasks, deadlines, or priorities!";
    const pending = tasks.filter(t=>!t.completed);
    const expired = tasks.filter(t=>new Date(t.datetime)<new Date());
    const soon = tasks.filter(t=>{
      const diff = new Date(t.datetime)-new Date();
      return diff>0 && diff<86400000;
    });

    if(lower.includes("urgent") || lower.includes("priority")) {
      response = `You have ${soon.length} tasks close to their deadlines.`;
    } else if(lower.includes("summary") || lower.includes("tasks")) {
      response = `You currently have ${pending.length} pending and ${expired.length} overdue tasks.`;
    } else if(lower.includes("today")) {
      response = soon.length>0 ? `Today's tasks:\n${soon.map(t=>`• ${t.title}`).join("\n")}` : "No tasks scheduled for today 🎉";
    } else if(lower.includes("all")) {
      response = pending.length>0 ? `Pending tasks:\n${pending.map(t=>`• ${t.title}`).join("\n")}` : "You have no pending tasks 🎯";
    }

    addMessage(response);
  }
});
