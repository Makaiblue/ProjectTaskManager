// Global application state
let currentUser = null;
let tasks = [];

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const appContainer = document.getElementById('appContainer');
const authContainer = document.getElementById('authContainer');

// Wait for Firebase to be loaded
function getFirebaseServices() {
    if (window.firebaseServices) {
        return window.firebaseServices;
    } else {
        // Fallback: initialize directly if firebase-config didn't load
        const firebaseConfig = {
            apiKey: "AIzaSyA3o7I7NSz7_4C7qUOFirnIjot4_rW885o",
            authDomain: "project-task-manager-6a4d6.firebaseapp.com",
            projectId: "project-task-manager-6a4d6",
            storageBucket: "project-task-manager-6a4d6.firebasestorage.app",
            messagingSenderId: "797859086383",
            appId: "1:797859086383:web:d84f87f51b6708540c86da",
            measurementId: "G-XPQS6YQCCS"
        };
        
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        return {
            auth: firebase.auth(),
            db: firebase.firestore(),
            firebase: firebase
        };
    }
}

// Get Firebase services
const { auth, db } = getFirebaseServices();

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    initializeApp();
});

/**
 * Main application initialization
 */
function initializeApp() {
    console.log('Initializing app...');
    
    // Monitor authentication state changes
    auth.onAuthStateChanged((user) => {
        console.log('Auth state changed:', user);
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
}

// ========== AUTHENTICATION FUNCTIONS ==========

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
        messageDiv.textContent = 'Login realizado com sucesso!';
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
        messageDiv.textContent = 'As senhas não coincidem!';
        messageDiv.className = 'message error';
        return;
    }

    try {
        await auth.createUserWithEmailAndPassword(email, password);
        messageDiv.textContent = 'Conta criada com sucesso!';
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
        tasks = [];
        currentUser = null;
    } catch (error) {
        console.error('Logout error:', error);
    }
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

        renderTasks();
    } catch (error) {
        console.error('Error loading tasks:', error);
        renderTasks();
    }
}

/**
 * Handle adding a new task from the form
 */
async function handleAddTask(e) {
    e.preventDefault();
    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDescription').value;
    const deadline = document.getElementById('taskDeadline').value;

    if (!title.trim()) {
        alert('Por favor, insira um título para a tarefa.');
        return;
    }

    await addTask({ title, description, deadline });
    e.target.reset();
}

/**
 * Add a new task to Firestore
 */
async function addTask(taskData) {
    if (!currentUser) return;

    const task = {
        title: taskData.title,
        description: taskData.description,
        deadline: taskData.deadline,
        completed: false,
        userId: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        urgent: isTaskUrgent(taskData.deadline)
    };

    try {
        const docRef = await db.collection('tasks').add(task);
        task.id = docRef.id;
        tasks.unshift(task);
        renderTasks();
        return task;
    } catch (error) {
        console.error('Error adding task:', error);
        alert('Erro ao adicionar tarefa. Tente novamente.');
    }
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

/**
 * Edit a task
 */
function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskDeadline').value = task.deadline || '';
        deleteTask(taskId);
    }
}

/**
 * Check if a task is urgent based on deadline
 */
function isTaskUrgent(deadline) {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 2 && diffDays >= 0;
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
                <h4>${task.title}</h4>
                <p>${task.description || 'Sem descrição'}</p>
                <div class="task-meta">
                    ${task.deadline ? `Vence: ${new Date(task.deadline).toLocaleDateString('pt-BR')}` : 'Sem data de vencimento'}
                    ${task.urgent ? ' • <span class="urgent-badge">⚠️ Urgente</span>' : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="btn-complete" onclick="toggleTaskCompletion('${task.id}')">
                    ${task.completed ? '↶ Desfazer' : '✓ Concluir'}
                </button>
                <button class="btn-edit" onclick="editTask('${task.id}')">✏️ Editar</button>
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
 * AI Assistant class with enhanced instructions
 */
class AIAssistant {
    constructor() {
        this.responses = {
            'urgent': this.getUrgentTasks.bind(this),
            'summary': this.getTaskSummary.bind(this),
            'today': this.getTodayTasks.bind(this),
            'priority': this.getPrioritySuggestions.bind(this),
            'instructions': this.getTaskInstructions.bind(this)
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
        } else if (lowerMessage.includes('instruç') || lowerMessage.includes('como fazer') || lowerMessage.includes('ajuda')) {
            return this.responses.instructions();
        } else {
            return "🤖 <strong>Assistente IA:</strong> Posso ajudar você com:\n\n" +
                   "• 📋 <strong>Tarefas urgentes</strong> - Veja o que precisa de atenção imediata\n" +
                   "• 📊 <strong>Resumo geral</strong> - Status completo das suas tarefas\n" +
                   "• 📅 <strong>Tarefas de hoje</strong> - O que vencer hoje\n" +
                   "• 💡 <strong>Sugestões inteligentes</strong> - Prioridades baseadas em IA\n" +
                   "• 🚀 <strong>Instruções detalhadas</strong> - Como resolver suas tarefas\n\n" +
                   "Como posso ajudá-lo hoje?";
        }
    }

    getUrgentTasks() {
        const urgentTasks = tasks.filter(task => task.urgent && !task.completed);

        if (urgentTasks.length === 0) {
            return "🎉 <strong>Ótimas notícias!</strong> Você não tem tarefas urgentes no momento. Continue com o bom trabalho!";
        }

        let response = "⚠️ <strong>TAREFAS URGENTES - ATENÇÃO IMEDIATA</strong>\n\n";
        urgentTasks.forEach((task, index) => {
            const deadline = task.deadline ? new Date(task.deadline).toLocaleDateString('pt-BR') : 'Sem prazo definido';
            response += `${index + 1}. <strong>${task.title}</strong>\n`;
            response += `   📅 <em>Vence: ${deadline}</em>\n`;
            if (task.description) {
                response += `   📝 ${task.description}\n`;
            }
            response += `   🚨 <strong>Prioridade MÁXIMA</strong>\n\n`;
        });

        return response;
    }

    getTaskSummary() {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed).length;
        const pendingTasks = totalTasks - completedTasks;
        const urgentTasks = tasks.filter(task => task.urgent && !task.completed).length;

        return "📊 <strong>RESUMO DAS SUAS TAREFAS</strong>\n\n" +
               `• <strong>Total:</strong> ${totalTasks} tarefas\n` +
               `• <strong>Concluídas:</strong> ${completedTasks}\n` +
               `• <strong>Pendentes:</strong> ${pendingTasks}\n` +
               `• <strong>Urgentes:</strong> ${urgentTasks}\n\n` +
               `${pendingTasks === 0 ? 
                 '🎉 <strong>Parabéns! Todas as tarefas estão concluídas!</strong>' : 
                 '💪 <strong>Continue com o bom trabalho!</strong>'}`;
    }

    getTodayTasks() {
        const today = new Date().toDateString();
        const todayTasks = tasks.filter(task => {
            if (!task.deadline) return false;
            const taskDate = new Date(task.deadline).toDateString();
            return taskDate === today && !task.completed;
        });

        if (todayTasks.length === 0) {
            return "📅 <strong>HOJE</strong>\n\nNão há tarefas vencendo hoje. Ótimo trabalho!";
        }

        let response = `📅 <strong>TAREFAS PARA HOJE</strong> (${todayTasks.length} tarefas)\n\n`;
        todayTasks.forEach((task, index) => {
            response += `${index + 1}. <strong>${task.title}</strong>\n`;
            if (task.description) {
                response += `   📝 ${task.description}\n`;
            }
            response += `   ⏰ <strong>Vence hoje!</strong>\n\n`;
        });

        return response;
    }

    getPrioritySuggestions() {
        const pendingTasks = tasks.filter(task => !task.completed);

        if (pendingTasks.length === 0) {
            return "🎉 <strong>TODAS AS TAREFAS CONCLUÍDAS!</strong>\n\nQue tal adicionar novas metas ou projetos?";
        }

        const urgentTasks = pendingTasks.filter(task => task.urgent);
        const highPriority = pendingTasks.filter(task => !task.urgent && task.deadline);
        const normalPriority = pendingTasks.filter(task => !task.urgent && !task.deadline);

        let response = "💡 <strong>SUGESTÕES DE PRIORIDADE - IA</strong>\n\n";

        if (urgentTasks.length > 0) {
            response += "🔴 <strong>PRIORIDADE MÁXIMA (Faça AGORA):</strong>\n";
            urgentTasks.slice(0, 3).forEach(task => {
                response += `• ${task.title}\n`;
            });
            response += "\n";
        }

        if (highPriority.length > 0) {
            response += "🟡 <strong>ALTA PRIORIDADE (Esta semana):</strong>\n";
            highPriority.slice(0, 3).forEach(task => {
                const deadline = new Date(task.deadline).toLocaleDateString('pt-BR');
                response += `• ${task.title} (vence ${deadline})\n`;
            });
            response += "\n";
        }

        if (normalPriority.length > 0) {
            response += "🟢 <strong>PRIORIDADE NORMAL (Quando possível):</strong>\n";
            normalPriority.slice(0, 3).forEach(task => {
                response += `• ${task.title}\n`;
            });
        }

        return response;
    }

    getTaskInstructions() {
        if (tasks.length === 0) {
            return "🚀 <strong>INSTRUÇÕES IA</strong>\n\n" +
                   "Você ainda não tem tarefas. Adicione algumas tarefas primeiro para que eu possa fornecer instruções específicas!";
        }

        const pendingTasks = tasks.filter(task => !task.completed);
        
        if (pendingTasks.length === 0) {
            return "🎉 <strong>TODAS AS TAREFAS CONCLUÍDAS!</strong>\n\n" +
                   "Excelente trabalho! Aqui estão algumas sugestões para próximos passos:\n\n" +
                   "1. <strong>Revise tarefas concluídas</strong> - Aprenda com o que foi feito\n" +
                   "2. <strong>Estabeleça novas metas</strong> - O que você quer alcançar?\n" +
                   "3. <strong>Planeje projetos futuros</strong> - Pense a longo prazo\n" +
                   "4. <strong>Aprimore processos</strong> - Como pode ser mais eficiente?";
        }

        let response = "🚀 <strong>INSTRUÇÕES IA - COMO RESOLVER SUAS TAREFAS</strong>\n\n";

        // Get the most urgent task for detailed instructions
        const mostUrgent = pendingTasks.find(task => task.urgent) || pendingTasks[0];
        
        if (mostUrgent) {
            response += `📋 <strong>TAREFA PRINCIPAL: ${mostUrgent.title}</strong>\n\n`;
            
            // Generate step-by-step instructions based on task content
            const steps = this.generateTaskSteps(mostUrgent);
            steps.forEach((step, index) => {
                response += `${index + 1}. ${step}\n`;
            });
            response += "\n";
        }

        response += "🔄 <strong>METODOLOGIA RECOMENDADA:</strong>\n";
        response += "• <strong>Foco Pomodoro</strong> - 25min trabalho / 5min descanso\n";
        response += "• <strong>Divide e conquista</strong> - Quebre em partes menores\n";
        response += "• <strong>Primeiro o difícil</strong> - Resolva o mais complexo primeiro\n";
        response += "• <strong>Revisão constante</strong> - Ajuste o plano quando necessário\n\n";
        
        response += "💪 <strong>Você consegue! Comece agora e veja o progresso.</strong>";

        return response;
    }

    generateTaskSteps(task) {
        const commonSteps = [
            "Defina claramente o objetivo final desta tarefa",
            "Identifique os recursos necessários para concluir",
            "Estabeleça mini-metas para acompanhar o progresso",
            "Reserve tempo específico para trabalhar nesta tarefa",
            "Elimine distrações durante o período de trabalho",
            "Revise o progresso ao final de cada sessão",
            "Celebre as pequenas vitórias no caminho"
        ];

        // Add context-specific steps based on task content
        const title = task.title.toLowerCase();
        
        if (title.includes('estudar') || title.includes('aprender') || title.includes('curso')) {
            return [
                "Separe o material de estudo em tópicos menores",
                "Estabeleça metas de aprendizado realistas",
                "Use a técnica de repetição espaçada para memorização",
                "Pratique com exercícios e exemplos práticos",
                "Faça resumos e anotações para fixar o conteúdo",
                "Ensine o que aprendeu para solidificar o conhecimento",
                "Revise periodicamente para manter o conhecimento fresco"
            ];
        } else if (title.includes('projeto') || title.includes('desenvolver') || title.includes('criar')) {
            return [
                "Defina o escopo e requisitos do projeto",
                "Crie um cronograma com marcos importantes",
                "Identifique as dependências e riscos",
                "Divida o projeto em fases ou módulos",
                "Estabeleça critérios de qualidade e teste",
                "Documente o progresso e decisões importantes",
                "Planeje a entrega e implementação final"
            ];
        } else if (title.includes('reunião') || title.includes('apresentação') || title.includes('relatório')) {
            return [
                "Defina o objetivo e agenda da reunião/apresentação",
                "Prepare o material necessário com antecedência",
                "Identifique os participantes e suas expectativas",
                "Estabeleça os tópicos principais a serem cobertos",
                "Prepare exemplos ou dados de apoio",
                "Antecipe possíveis perguntas e objeções",
                "Planeje os próximos passos e ações"
            ];
        }

        return commonSteps;
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
    
    // Simulate typing delay for better UX
    setTimeout(() => {
        addChatMessage(response, 'ai');
    }, 500);

    input.value = '';
}

/**
 * Handle quick action buttons
 */
function handleQuickAction(action) {
    const responses = {
        'urgent': 'Quais são minhas tarefas urgentes?',
        'summary': 'Me dê um resumo completo das minhas tarefas',
        'today': 'Quais tarefas tenho para hoje?',
        'priority': 'Quais são suas sugestões de prioridade inteligentes?',
        'instructions': 'Me dê instruções detalhadas de IA para minhas tarefas'
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
