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

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

// ====================================================
// INITIAL LOAD
// ====================================================
window.onload = () => {
  renderTasks();
};

// ====================================================
// TASK FUNCTIONS
// ====================================================

// Add a new task
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const datetime = document.getElementById('datetime').value;

  if (!title || !datetime) return;

  const task = {
    id: Date.now(),
    title,
    description,
    datetime,
    completed: false,
  };

  tasks.push(task);
  saveTasks();
  renderTasks();
  form.reset();
});

// Save tasks locally and to Firestore if logged in
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
  saveTasksToFirestore();
}

// Render task list
function renderTasks() {
  taskList.innerHTML = '';
  tasks.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  tasks.forEach(addTaskToDOM);
}

// Add a single task to the DOM
function addTaskToDOM(task) {
  const li = document.createElement('li');
  if (task.completed) li.classList.add('completed');

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

// Calculate remaining time
function getTimeRemaining(datetime) {
  const now = new Date();
  const target = new Date(datetime);
  const diff = target - now;

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m remaining`;
}

// Toggle task completion
function toggleComplete(id) {
  const task = tasks.find(t => t.id === id);
  task.completed = !task.completed;
  saveTasks();
  renderTasks();
}

// Edit a task
function editTask(id) {
  const task = tasks.find(t => t.id === id);
  const newTitle = prompt('Edit title:', task.title);
  const newDesc = prompt('Edit description:', task.description);
  if (newTitle !== null) task.title = newTitle;
  if (newDesc !== null) task.description = newDesc;
  saveTasks();
  renderTasks();
}

// Remove a task
function removeTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

// Clear all tasks
clearAllBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to delete all tasks?')) {
    tasks = [];
    saveTasks();
    renderTasks();
  }
});

// ====================================================
// AI ASSISTANT
// ====================================================

// Toggle AI panel
iaToggle.addEventListener('click', () => iaPanel.classList.remove('hidden'));
closeIa.addEventListener('click', () => iaPanel.classList.add('hidden'));

// AI form submission
iaForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const question = iaInput.value.trim();
  if (!question) return;

  addMessage(question, 'user');
  iaInput.value = '';
  setTimeout(() => generateIaResponse(question), 500);
});

// Add message to chat
function addMessage(text, sender = 'ia') {
  const msg = document.createElement('div');
  msg.classList.add('ia-msg');
  if (sender === 'user') msg.classList.add('user');
  msg.textContent = text;
  iaChat.appendChild(msg);
  iaChat.scrollTop = iaChat.scrollHeight;
}

// Local AI logic
function generateIaResponse(question) {
  const lower = question.toLowerCase();
  let response = "Sorry, I didn’t quite get that. Could you rephrase?";

  const pending = tasks.filter(t => !t.completed);
  const expired = tasks.filter(t => new Date(t.datetime) < new Date());
  const soon = tasks.filter(t => {
    const diff = new Date(t.datetime) - new Date();
    return diff > 0 && diff < 86400000; // within 24h
  });

  if (lower.includes('urgent') || lower.includes('priority')) {
    response = `You have ${soon.length} tasks close to their deadlines.`;
  } else if (lower.includes('summary') || lower.includes('tasks')) {
    response = `Currently, you have ${pending.length} pending and ${expired.length} overdue tasks.`;
  } else if (lower.includes('today')) {
    response = soon.length > 0
      ? `Your tasks for today are:\n${soon.map(t => `• ${t.title}`).join('\n')}`
      : 'No tasks scheduled for today 🎉';
  } else if (lower.includes('all')) {
    response = pending.length > 0
      ? `Here are your pending tasks:\n${pending.map(t => `• ${t.title}`).join('\n')}`
      : 'You have no pending tasks 🎯';
  }

  addMessage(response);
}

// ====================================================
// FIREBASE AUTH & FIRESTORE INTEGRATION
// ====================================================

// ==============================
// Firebase config
// ==============================
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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==============================
// DOM Elements
// ==============================
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const showRegister = document.getElementById("show-register");
const showLogin = document.getElementById("show-login");
const authSection = document.getElementById("auth-section");
const taskSection = document.getElementById("task-section");
const logoutBtn = document.getElementById("logout-btn");
const userEmail = document.getElementById("user-email");

const taskList = document.getElementById('task-list');
const clearAllBtn = document.getElementById('clear-all');
const iaToggle = document.getElementById('ia-toggle');
const iaPanel = document.getElementById('ia-panel');
const closeIa = document.getElementById('close-ia');
const iaChat = document.getElementById('ia-chat');
const iaForm = document.getElementById('ia-form');
const iaInput = document.getElementById('ia-input');

let tasks = [];

// ==============================
// AUTH FUNCTIONS
// ==============================

// Toggle forms
showRegister.addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
  showRegister.classList.add("hidden");
  showLogin.classList.remove("hidden");
});

showLogin.addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  showRegister.classList.remove("hidden");
  showLogin.classList.add("hidden");
});

// Register
registerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      alert("✅ Account created successfully!");
      registerForm.reset();
      loginForm.classList.remove("hidden");
      registerForm.classList.add("hidden");
      showLogin.classList.add("hidden");
      showRegister.classList.remove("hidden");
    })
    .catch(err => alert(`⚠️ ${err.message}`));
});

// Login
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => loginForm.reset())
    .catch(err => alert(`⚠️ ${err.message}`));
});

// Logout
logoutBtn.addEventListener("click", () => auth.signOut());

// Auth state
auth.onAuthStateChanged((user) => {
  if (user) {
    authSection.classList.add("hidden");
    taskSection.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    userEmail.textContent = user.email;

    loadTasksFromFirestore();
  } else {
    authSection.classList.remove("hidden");
    taskSection.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    userEmail.textContent = "";
    tasks = [];
    renderTasks();
  }
});

// ==============================
// TASK FUNCTIONS
// ==============================

// Add new task
form.addEventListener('submit', (e) => {
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

// Save tasks to local + Firestore
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
  saveTasksToFirestore();
}

// Render task list
function renderTasks() {
  taskList.innerHTML = '';
  tasks.sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));
  tasks.forEach(addTaskToDOM);
}

// Add task to DOM
function addTaskToDOM(task) {
  const li = document.createElement('li');
  if(task.completed) li.classList.add('completed');
  const remaining = getTimeRemaining(task.datetime);
  li.innerHTML = `
    <strong>${task.title}</strong>
    ${task.description?`<span>${task.description}</span>`:''}
    <span class="time-remaining">⏰ ${new Date(task.datetime).toLocaleString()} (${remaining})</span>
    <div class="task-actions">
      <button class="complete-btn" onclick="toggleComplete(${task.id})">${task.completed?'↩️ Undo':'✅ Complete'}</button>
      <button class="edit-btn" onclick="editTask(${task.id})">✏️ Edit</button>
      <button class="remove-btn" onclick="removeTask(${task.id})">🗑️ Remove</button>
    </div>
  `;
  taskList.appendChild(li);
}

// Toggle complete
function toggleComplete(id) {
  const task = tasks.find(t=>t.id===id);
  task.completed = !task.completed;
  saveTasks();
  renderTasks();
}

// Edit task
function editTask(id) {
  const task = tasks.find(t=>t.id===id);
  const newTitle = prompt('Edit title:', task.title);
  const newDesc = prompt('Edit description:', task.description);
  if(newTitle!==null) task.title=newTitle;
  if(newDesc!==null) task.description=newDesc;
  saveTasks();
  renderTasks();
}

// Remove task
function removeTask(id) {
  tasks = tasks.filter(t=>t.id!==id);
  saveTasks();
  renderTasks();
}

// Clear all
clearAllBtn.addEventListener('click', ()=>{
  if(confirm('Are you sure you want to delete all tasks?')){
    tasks=[];
    saveTasks();
    renderTasks();
  }
});

// Time remaining
function getTimeRemaining(datetime){
  const now = new Date();
  const target = new Date(datetime);
  const diff = target-now;
  if(diff<=0) return 'Expired';
  const hours = Math.floor(diff/(1000*60*60));
  const mins = Math.floor((diff%(1000*60*60))/(1000*60));
  return `${hours}h ${mins}m remaining`;
}

// ==============================
// FIRESTORE TASK SYNC
// ==============================
function saveTasksToFirestore(){
  const user = auth.currentUser;
  if(!user) return;
  db.collection('users').doc(user.uid).set({tasks})
    .then(()=> console.log('💾 Tasks synced'))
    .catch(err=> console.error(err));
}

function loadTasksFromFirestore(){
  const user = auth.currentUser;
  if(!user) return;
  db.collection('users').doc(user.uid).get()
    .then(doc=>{
      if(doc.exists && doc.data().tasks){
        tasks=doc.data().tasks;
        renderTasks();
      }
    })
    .catch(err=>console.error(err));
}

// ==============================
// AI ASSISTANT
// ==============================
iaToggle.addEventListener('click', ()=>iaPanel.classList.remove('hidden'));
closeIa.addEventListener('click', ()=>iaPanel.classList.add('hidden'));

iaForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const question = iaInput.value.trim();
  if(!question) return;
  addMessage(question,'user');
  iaInput.value='';
  setTimeout(()=>generateIaResponse(question),500);
});

function addMessage(text, sender='ia'){
  const msg = document.createElement('div');
  msg.classList.add('ia-msg');
  if(sender==='user') msg.classList.add('user');
  msg.textContent=text;
  iaChat.appendChild(msg);
  iaChat.scrollTop = iaChat.scrollHeight;
}

function generateIaResponse(question){
  const lower = question.toLowerCase();
  let response = "Sorry, I didn’t quite get that. Could you rephrase?";
  const pending = tasks.filter(t=>!t.completed);
  const expired = tasks.filter(t=>new Date(t.datetime)<new Date());
  const soon = tasks.filter(t=>{const diff=new Date(t.datetime)-new Date();return diff>0 && diff<86400000;});

  if(lower.includes('urgent') || lower.includes('priority')){
    response=`You have ${soon.length} tasks close to their deadlines.`;
  } else if(lower.includes('summary') || lower.includes('tasks')){
    response=`Currently, you have ${pending.length} pending and ${expired.length} overdue tasks.`;
  } else if(lower.includes('today')){
    response = soon.length>0?`Your tasks for today are:\n${soon.map(t=>`• ${t.title}`).join('\n')}`:'No tasks scheduled for today 🎉';
  } else if(lower.includes('all')){
    response = pending.length>0?`Here are your pending tasks:\n${pending.map(t=>`• ${t.title}`).join('\n')}`:'You have no pending tasks 🎯';
  }

  addMessage(response);
}
