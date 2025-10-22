// Global application state
let currentUser = null;
let tasks = [];

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const appContainer = document.getElementById('appContainer');
const authContainer = document.getElementById('authContainer');

// Get Firebase services from configuration
const { auth, db } = window.firebaseServices;

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

    // Task form submission
    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', handleAddTask);
    }

    // Chat form submission
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

    // Enter key for task input
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
 */
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('authMessage');

    try {
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
 */
async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageDiv = document.getElementById('regMessage');

    if (password !== confirmPassword) {
        messageDiv.textContent = 'Passwords do not match!';
        messageDiv.className = 'message error';
        return;
    }

    try {
        await auth.createUserWithEmailAndPassword(email, password);
        messageDiv.textContent = 'Account created successfully!';
        messageDiv.className = 'message success';
    } catch (error) {
        messageDiv.textContent = getAuthErrorMessage(error.code);
        messageDiv.className = 'message error';
    }
}

/**
 * Get user-friendly error messages
 */
function getAuthErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'Este email já está em uso.',
        'auth/invalid-email': 'Email inválido.',
        'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres).',
        'auth/user-not-found': 'Usuário não encontrado.',
        'auth/wrong-password': 'Senha incorreta.'
    };
    return errorMessages[errorCode] || 'Erro desconhecido. Tente novamente.';
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

/**
 * Show register form
 */
function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

/**
 * Show login form
 */
function showLogin() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

// ========== TASK MANAGEMENT FUNCTIONS ==========

/**
 * Load tasks from Firestore
 */
async function loadTasks() {
    if (!currentUser) return;

    try {
        const snapshot = await db.collection('tasks')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();

        tasks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Save to localStorage as backup
        localStorage.setItem(`tasks_${currentUser.uid}`, JSON.stringify(tasks));
        renderTasks();
    } catch (error) {
        console.error('Error loading tasks:', error);
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
 * Add a new task
 */
async function handleAddTask(e) {
    e.preventDefault();
    const taskInput = document.getElementById('taskInput');
    const taskText = taskInput.value.trim();
    
    if (taskText === '' || !currentUser) return;

    const task = {
        text: taskText,
        title: taskText,
        completed: false,
        userId: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        urgent: false
    };

    try {
        const docRef = await db.collection('tasks').add(task);
        task.id = docRef.id;
        tasks.unshift(task);
        localStorage.setItem(`tasks_${currentUser.uid}`, JSON.stringify(tasks));
        renderTasks();
        taskInput.value = '';
    } catch (error) {
        console.error('Error adding task:', error);
        addTaskLocally(task);
    }
}

/**
 * Add task to local storage only (fallback)
 */
function addTaskLocally(task) {
    task.id = Date.now().toString();
    tasks.unshift(task);
    localStorage.setItem(`tasks_${currentUser.uid}`, JSON.stringify(tasks));
    renderTasks();
}

/**
 * Update an existing task
 */
async function updateTask(taskId, updates) {
    if (!currentUser) return;

    try {
        await db.collection('tasks').doc(taskId).update(updates);
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
 */
async function deleteTask(taskId) {
    if (!currentUser) return;

    try {
        await db.collection('tasks').doc(taskId).delete();
        tasks = tasks.filter(task => task.id !== taskId);
        localStorage.setItem(`tasks_${currentUser.uid}`, JSON.stringify(tasks));
        renderTasks();
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

/**
 * Toggle task completion status
 */
function toggleTaskCompletion(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        updateTask(taskId, { completed: !task.completed });
    }
}

// ========== UI RENDERING FUNCTIONS ==========

/**
 * Render tasks to the DOM
 */
function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    if (!tasksList) return;

    if (tasks.length === 0) {
        tasksList.innerHTML = '<p class="no-tasks">Nenhuma tarefa encontrada. Adicione sua primeira tarefa!</p>';
        return;
    }

    tasksList.innerHTML = tasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''} ${task.urgent ? 'urgent' : ''}">
            <div class="task-info">
                <span class="task-text">${task.text || task.title}</span>
                <div class="task-meta">
                    ${task.deadline ? `<span>Vence: ${new Date(task.deadline).toLocaleDateString('pt-BR')}</span>` : ''}
                    ${task.urgent ? '<span class="urgent-badge">⚠️ Urgente</span>' : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="btn-complete" onclick="toggleTaskCompletion('${task.id}')">
                    ${task.completed ? '↶ Desfazer' : '✓ Concluir'}
                </button>
                <button class="btn-delete" onclick="deleteTask('${task.id}')">🗑️ Excluir</button>
            </div>
        </div>
    `).join('');
}

/**
 * Show the main application interface
 */
function showApp() {
    if (appContainer && authContainer) {
        appContainer.style.display = 'block';
        authContainer.style.display = 'none';

        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement) {
            userEmailElement.textContent = currentUser.email;
        }
    }
}

/**
 * Show authentication interface
 */
function showAuth() {
    if (appContainer && authContainer) {
        appContainer.style.display = 'none';
        authContainer.style.display = 'flex';
    }
}

// ========== AI ASSISTANT FUNCTIONS ==========

/**
 * AI Assistant class
 */
class AIAssistant {
    constructor() {
        this.responses = {
            'urgent': this.getUrgentTasks.bind(this),
            'summary': this.getTaskSummary.bind(this),
            'today': this.getTodayTasks.bind(this),
            'priority': this.getPrioritySuggestions.bind(this)
        };
    }

    processMessage(message) {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('urgente') || lowerMessage.includes('prioridade')) {
            return this.responses.urgent();
        } else if (lowerMessage.includes('resumo') || lowerMessage.includes('sumário')) {
            return this.responses.summary();
        } else if (lowerMessage.includes('hoje')) {
            return this.responses.today();
        } else if (lowerMessage.includes('sugest') || lowerMessage.includes('dica')) {
            return this.responses.priority();
        } else {
            return "Posso ajudar você com:\n• Tarefas urgentes\n• Resumo de tarefas\n• Tarefas de hoje\n• Sugestões de prioridade\n\nComo posso ajudá-lo?";
        }
    }

    getUrgentTasks() {
        const urgentTasks = tasks.filter(task => task.urgent && !task.completed);

        if (urgentTasks.length === 0) {
            return "🎉 Ótimas notícias! Você não tem tarefas urgentes no momento.";
        }

        let response = `⚠️ Você tem ${urgentTasks.length} tarefa(s) urgente(s):\n\n`;
        urgentTasks.forEach(task => {
            const deadline = task.deadline ? new Date(task.deadline).toLocaleDateString('pt-BR') : 'Sem prazo';
            response += `• ${task.title || task.text} (Vence: ${deadline})\n`;
        });

        return response;
    }

    getTaskSummary() {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed).length;
        const pendingTasks = totalTasks - completedTasks;
        const urgentTasks = tasks.filter(task => task.urgent && !task.completed).length;

        return `📊 Resumo das suas tarefas:\n\n` +
               `• Total: ${totalTasks} tarefas\n` +
               `• Concluídas: ${completedTasks}\n` +
               `• Pendentes: ${pendingTasks}\n` +
               `• Urgentes: ${urgentTasks}\n\n` +
               `${pendingTasks === 0 ? '🎉 Parabéns! Todas as tarefas estão concluídas!' : 'Continue com o bom trabalho! 💪'}`;
    }

    getTodayTasks() {
        const today = new Date().toDateString();
        const todayTasks = tasks.filter(task => {
            if (!task.deadline) return false;
            const taskDate = new Date(task.deadline).toDateString();
            return taskDate === today && !task.completed;
        });

        if (todayTasks.length === 0) {
            return "📅 Você não tem tarefas para hoje.";
        }

        let response = `📅 Você tem ${todayTasks.length} tarefa(s) para hoje:\n\n`;
        todayTasks.forEach(task => {
            response += `• ${task.title || task.text}\n`;
        });

        return response;
    }

    getPrioritySuggestions() {
        const pendingTasks = tasks.filter(task => !task.completed);

        if (pendingTasks.length === 0) {
            return "🎉 Todas as tarefas estão concluídas! Que tal adicionar novas metas?";
        }

        const urgentTasks = pendingTasks.filter(task => task.urgent);
        const nonUrgentTasks = pendingTasks.filter(task => !task.urgent);

        let response = "💡 Sugestões de prioridade:\n\n";

        if (urgentTasks.length > 0) {
            response += "⚡ PRIORIDADE MÁXIMA (faça agora):\n";
            urgentTasks.slice(0, 3).forEach(task => {
                response += `• ${task.title || task.text}\n`;
            });
            response += "\n";
        }

        if (nonUrgentTasks.length > 0) {
            response += "📝 PARA ESTA SEMANA:\n";
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
 */
function handleAIChat(e) {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) return;

    addChatMessage(message, 'user');
    const response = aiAssistant.processMessage(message);
    addChatMessage(response, 'ai');
    input.value = '';
}

/**
 * Handle quick action buttons
 */
function handleQuickAction(action) {
    const responses = {
        'urgent': 'Quais são minhas tarefas urgentes?',
        'summary': 'Me dê um resumo das minhas tarefas',
        'today': 'Quais tarefas tenho para hoje?',
        'priority': 'Quais são suas sugestões de prioridade?'
    };

    const message = responses[action];
    if (message) {
        document.getElementById('chatInput').value = message;
        handleAIChat(new Event('submit'));
    }
}

/**
 * Add a message to the chat interface
 */
function addChatMessage(message, sender) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.innerHTML = message.replace(/\n/g, '<br>');
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
