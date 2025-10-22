// Global application state
let currentUser = null;
let tasks = [];

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const appContainer = document.querySelector('.app-container');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA3o7I7NSz7_4C7qUOFirnIjot4_rW885o",
  authDomain: "project-task-manager-6a4d6.firebaseapp.com",
  projectId: "project-task-manager-6a4d6",
  storageBucket: "project-task-manager-6a4d6.firebasestorage.app",
  messagingSenderId: "797859086383",
  appId: "1:797859086383:web:d84f87f51b6708540c86da",
  measurementId: "G-XPQS6YQCCS"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * Main application initialization
 */
function initializeApp() {
    // Monitor authentication state changes
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            currentUser = user;
            showApp();
            loadTasks();
        } else {
            // User is signed out
            showAuth();
        }
    });

    // Set up event listeners
    setupEventListeners();
}

/**
 * Set up form event listeners
 */
function setupEventListeners() {
    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Registration form submission
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Adicionar evento de Enter no input de tarefas
    const taskInput = document.getElementById('taskInput');
    if (taskInput) {
        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleAddTask(e);
            }
        });
    }
}

// ========== AUTHENTICATION FUNCTIONS ==========

/**
 * Handle user login
 * @param {Event} e - Form submit event
 */
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('authMessage');

    try {
        // Firebase authentication sign in
        await auth.signInWithEmailAndPassword(email, password);
        messageDiv.textContent = 'Login successful!';
        messageDiv.className = 'message success';
    } catch (error) {
        messageDiv.textContent = getAuthErrorMessage(error.code);
        messageDiv.className = 'message error';
    }
}

/**
 * Handle user registration
 * @param {Event} e - Form submit event
 */
async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageDiv = document.getElementById('regMessage');

    // Validate password confirmation
    if (password !== confirmPassword) {
        messageDiv.textContent = 'Passwords do not match!';
        messageDiv.className = 'message error';
        return;
    }

    try {
        // Firebase authentication create user
        await auth.createUserWithEmailAndPassword(email, password);
        messageDiv.textContent = 'Account created successfully!';
        messageDiv.className = 'message success';
    } catch (error) {
        messageDiv.textContent = getAuthErrorMessage(error.code);
        messageDiv.className = 'message error';
    }
}

/**
 * Get user-friendly error messages for Firebase auth errors
 * @param {string} errorCode - Firebase error code
 * @returns {string} User-friendly error message
 */
function getAuthErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'This email is already in use.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password is too weak.',
        'auth/user-not-found': 'User not found.',
        'auth/wrong-password': 'Incorrect password.'
    };
    return errorMessages[errorCode] || 'Unknown error. Please try again.';
}

/**
 * Handle user logout
 */
async function handleLogout() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ========== TASK MANAGEMENT FUNCTIONS ==========

/**
 * Load tasks from Firestore and localStorage
 */
async function loadTasks() {
    if (!currentUser) return;

    try {
        // Load from Firestore - query tasks for current user, ordered by creation date
        const snapshot = await db.collection('tasks')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();

        // Convert Firestore documents to task objects
        tasks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Save to localStorage as backup
        localStorage.setItem(`tasks_${currentUser.uid}`, JSON.stringify(tasks));

        renderTasks();
    } catch (error) {
        console.error('Error loading tasks from Firestore:', error);
        // Fallback to localStorage if Firestore fails
        loadTasksFromLocalStorage();
    }
}

/**
 * Load tasks from localStorage as fallback
 */
function loadTasksFromLocalStorage() {
    const localTasks = localStorage.getItem(`tasks_${currentUser.uid}`);
    if (localTasks) {
        tasks = JSON.parse(localTasks);
        renderTasks();
    }
}

/**
 * Add a new task to Firestore and local state
 */
async function handleAddTask(e) {
    if (e) e.preventDefault();
    
    const taskInput = document.getElementById('taskInput');
    const taskText = taskInput.value.trim();
    
    if (taskText === '' || !currentUser) return;

    // Create task object with required fields
    const task = {
        text: taskText,
        title: taskText, // Para compatibilidade
        completed: false,
        userId: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        urgent: false
    };

    try {
        // Add to Firestore
        const docRef = await db.collection('tasks').add(task);
        task.id = docRef.id;
        tasks.unshift(task); // Add to beginning of array

        // Update localStorage
        localStorage.setItem(`tasks_${currentUser.uid}`, JSON.stringify(tasks));

        renderTasks();
        taskInput.value = '';
        return task;
    } catch (error) {
        console.error('Error adding task to Firestore:', error);
        // Save locally if Firestore fails
        return addTaskLocally(task);
    }
}

/**
 * Add task to local storage only (fallback)
 * @param {Object} task - Task object
 * @returns {Object} The created task
 */
function addTaskLocally(task) {
    task.id = Date.now().toString();
    tasks.unshift(task);
    localStorage.setItem(`tasks_${currentUser.uid}`, JSON.stringify(tasks));
    renderTasks();
    return task;
}

/**
 * Update an existing task
 * @param {string} taskId - ID of task to update
 * @param {Object} updates - Fields to update
 */
async function updateTask(taskId, updates) {
    if (!currentUser) return;

    try {
        // Update in Firestore
        await db.collection('tasks').doc(taskId).update(updates);

        // Update local state
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
            localStorage.setItem(`tasks_${currentUser.uid}`, JSON.stringify(tasks));
            renderTasks();
        }
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

/**
 * Delete a task
 * @param {string} taskId - ID of task to delete
 */
async function deleteTask(taskId) {
    if (!currentUser) return;

    try {
        // Delete from Firestore
        await db.collection('tasks').doc(taskId).delete();

        // Remove from local state
        tasks = tasks.filter(task => task.id !== taskId);
        localStorage.setItem(`tasks_${currentUser.uid}`, JSON.stringify(tasks));
        renderTasks();
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

/**
 * Toggle task completion status
 * @param {string} taskId - ID of task to toggle
 */
function toggleTaskCompletion(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        updateTask(taskId, { completed: !task.completed });
    }
}

// Função para alternar tarefa (compatibilidade)
function toggleTask(id) {
    toggleTaskCompletion(id);
}

/**
 * Check if a task is urgent based on deadline
 * @param {string} deadline - Task deadline string
 * @returns {boolean} True if task is urgent
 */
function isTaskUrgent(deadline) {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 2 && diffDays >= 0; // Urgent if due within 2 days
}

// ========== UI RENDERING FUNCTIONS ==========

/**
 * Render tasks to the DOM
 */
function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    if (!tasksList) return;

    if (tasks.length === 0) {
        tasksList.innerHTML = '<p class="no-tasks">No tasks found.</p>';
        return;
    }

    // Generate HTML for each task
    tasksList.innerHTML = tasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''} ${task.urgent ? 'urgent' : ''}">
            <div class="task-info">
                <span class="task-text">${task.text || task.title}</span>
                ${task.description ? `<p class="task-desc">${task.description}</p>` : ''}
                <div class="task-meta">
                    ${task.deadline ? `<span>Due: ${new Date(task.deadline).toLocaleDateString('en-US')}</span>` : ''}
                    ${task.urgent ? '<span class="urgent-badge">⚠️ Urgent</span>' : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="btn-complete" onclick="toggleTaskCompletion('${task.id}')">
                    ${task.completed ? '↶' : '✓'}
                </button>
                <button class="btn-delete" onclick="deleteTask('${task.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

/**
 * Show the main application interface
 */
function showApp() {
    const authContainer = document.querySelector('.auth-container');
    if (appContainer && authContainer) {
        appContainer.style.display = 'block';
        authContainer.style.display = 'none';

        // Update user information in UI
        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement) {
            userEmailElement.textContent = currentUser.email;
        }

        // Set up application event listeners
        setupAppEventListeners();
    }
}

/**
 * Show authentication interface
 */
function showAuth() {
    const authContainer = document.querySelector('.auth-container');
    if (appContainer && authContainer) {
        appContainer.style.display = 'none';
        authContainer.style.display = 'flex';
    }
}

/**
 * Set up event listeners for the main application
 */
function setupAppEventListeners() {
    // Task form submission
    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', handleAddTask);
    }

    // AI chat form submission
    const chatForm = document.getElementById('chatForm');
    if (chatForm) {
        chatForm.addEventListener('submit', handleAIChat);
    }

    // Quick action buttons
    const quickActions = document.querySelectorAll('.quick-action');
    quickActions.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.dataset.action;
            handleQuickAction(action);
        });
    });

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// ========== AI ASSISTANT FUNCTIONS ==========

/**
 * AI Assistant class for task analysis and responses
 */
class AIAssistant {
    constructor() {
        // Map of response handlers for different query types
        this.responses = {
            'urgent': this.getUrgentTasks.bind(this),
            'summary': this.getTaskSummary.bind(this),
            'today': this.getTodayTasks.bind(this),
            'priority': this.getPrioritySuggestions.bind(this)
        };
    }

    /**
     * Process user message and generate AI response
     * @param {string} message - User message
     * @returns {string} AI response
     */
    processMessage(message) {
        const lowerMessage = message.toLowerCase();

        // Route to appropriate response handler based on keywords
        if (lowerMessage.includes('urgent') || lowerMessage.includes('priority')) {
            return this.responses.urgent();
        } else if (lowerMessage.includes('summary')) {
            return this.responses.summary();
        } else if (lowerMessage.includes('today')) {
            return this.responses.today();
        } else if (lowerMessage.includes('suggestion') || lowerMessage.includes('tip')) {
            return this.responses.priority();
        } else {
            return "I can help you with:\n• Urgent tasks\n• Task summary\n• Today's tasks\n• Priority suggestions\n\nHow can I assist you?";
        }
    }

    /**
     * Get urgent tasks response
     * @returns {string} Formatted urgent tasks message
     */
    getUrgentTasks() {
        const urgentTasks = tasks.filter(task => task.urgent && !task.completed);

        if (urgentTasks.length === 0) {
            return "🎉 Great news! You don't have any urgent tasks at the moment.";
        }

        let response = `⚠️ You have ${urgentTasks.length} urgent task(s):\n\n`;
        urgentTasks.forEach(task => {
            const deadline = task.deadline ? new Date(task.deadline).toLocaleDateString('en-US') : 'No deadline';
            response += `• ${task.title || task.text} (Due: ${deadline})\n`;
        });

        return response;
    }

    /**
     * Get task summary response
     * @returns {string} Formatted task summary message
     */
    getTaskSummary() {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed).length;
        const pendingTasks = totalTasks - completedTasks;
        const urgentTasks = tasks.filter(task => task.urgent && !task.completed).length;

        return `📊 Your task summary:\n\n` +
               `• Total: ${totalTasks} tasks\n` +
               `• Completed: ${completedTasks}\n` +
               `• Pending: ${pendingTasks}\n` +
               `• Urgent: ${urgentTasks}\n\n` +
               `${pendingTasks === 0 ? '🎉 Congratulations! All tasks are completed!' : 'Keep up the good work! 💪'}`;
    }

    /**
     * Get today's tasks response
     * @returns {string} Formatted today's tasks message
     */
    getTodayTasks() {
        const today = new Date().toDateString();
        const todayTasks = tasks.filter(task => {
            if (!task.deadline) return false;
            const taskDate = new Date(task.deadline).toDateString();
            return taskDate === today && !task.completed;
        });

        if (todayTasks.length === 0) {
            return "📅 You don't have any tasks due today.";
        }

        let response = `📅 You have ${todayTasks.length} task(s) for today:\n\n`;
        todayTasks.forEach(task => {
            response += `• ${task.title || task.text}\n`;
        });

        return response;
    }

    /**
     * Get priority suggestions response
     * @returns {string} Formatted priority suggestions message
     */
    getPrioritySuggestions() {
        const pendingTasks = tasks.filter(task => !task.completed);

        if (pendingTasks.length === 0) {
            return "🎉 All tasks are completed! How about adding some new goals?";
        }

        const urgentTasks = pendingTasks.filter(task => task.urgent);
        const nonUrgentTasks = pendingTasks.filter(task => !task.urgent);

        let response = "💡 Priority suggestions:\n\n";

        if (urgentTasks.length > 0) {
            response += "⚡ MAXIMUM PRIORITY (do now):\n";
            urgentTasks.slice(0, 3).forEach(task => {
                response += `• ${task.title || task.text}\n`;
            });
            response += "\n";
        }

        if (nonUrgentTasks.length > 0) {
            response += "📝 FOR THIS WEEK:\n";
            nonUrgentTasks.slice(0, 3).forEach(task => {
                response += `• ${task.title || task.text}\n`;
            });
        }

        return response;
    }
}

// Initialize AI Assistant
const aiAssistant = new AIAssistant();

/**
 * Handle AI chat messages
 * @param {Event} e - Form submit event
 */
function handleAIChat(e) {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) return;

    // Add user message to chat
    addChatMessage(message, 'user');

    // Process with AI and get response
    const response = aiAssistant.processMessage(message);
    addChatMessage(response, 'ai');

    // Clear input
    input.value = '';
}

/**
 * Handle quick action buttons in AI chat
 * @param {string} action - Action type (urgent, summary, today, priority)
 */
function handleQuickAction(action) {
    const responses = {
        'urgent': 'What are my urgent tasks?',
        'summary': 'Give me a summary of my tasks',
        'today': 'What tasks do I have for today?',
        'priority': 'What are your priority suggestions?'
    };

    const message = responses[action];
    if (message) {
        document.getElementById('chatInput').value = message;
        handleAIChat(new Event('submit'));
    }
}

/**
 * Add a message to the chat interface
 * @param {string} message - Message text
 * @param {string} sender - Message sender ('user' or 'ai')
 */
function addChatMessage(message, sender) {
    const chatMessages = document.querySelector('.chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    // Format message with line breaks
    messageDiv.innerHTML = message.replace(/\n/g, '<br>');

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
