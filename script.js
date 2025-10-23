// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA3o7I7NSz7_4C7qUOFirnIjot4_rW885o",
    authDomain: "project-task-manager-6a4d6.firebaseapp.com",
    projectId: "project-task-manager-6a4d6",
    storageBucket: "project-task-manager-6a4d6.firebasestorage.app",
    messagingSenderId: "797859086383",
    appId: "1:797859086383:web:d84f87f51b6708540c86da",
    measurementId: "G-XPQS6YQCCS"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase services - ONLY ONE DECLARATION
const auth = firebase.auth();
const db = firebase.firestore();

// Global application state
let currentUser = null;
let tasks = [];

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const appContainer = document.getElementById('appContainer');
const authContainer = document.getElementById('authContainer');

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
    
    // Set current date as default for task deadline
    setDefaultTaskDate();
    
    // Monitor authentication state changes
    auth.onAuthStateChanged((user) => {
        console.log('Auth state changed:', user ? user.email : 'No user');
        if (user) {
            currentUser = user;
            showApp();
            loadTasks();
        } else {
            currentUser = null;
            showAuth();
        }
    });

    // Set up event listeners
    setupEventListeners();
}

/**
 * Set current date as default for task deadline input
 */
function setDefaultTaskDate() {
    const taskDeadlineInput = document.getElementById('taskDeadline');
    if (taskDeadlineInput) {
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        taskDeadlineInput.value = formattedDate;
        taskDeadlineInput.min = formattedDate; // Prevent selecting past dates
    }
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
        'auth/email-already-in-use': 'This email is already in use.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password is too weak (minimum 6 characters).',
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
        alert('Please enter a task title.');
        return;
    }

    await addTask({ title, description, deadline });
    e.target.reset();
    // Reset to current date after adding task
    setDefaultTaskDate();
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
        alert('Error adding task. Please try again.');
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
        tasksList.innerHTML = '<p class="no-tasks">No tasks found. Add your first task!</p>';
        return;
    }

    tasksList.innerHTML = tasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''} ${task.urgent ? 'urgent' : ''}">
            <div class="task-info">
                <h4>${task.title}</h4>
                <p>${task.description || 'No description'}</p>
                <div class="task-meta">
                    ${task.deadline ? `Due: ${new Date(task.deadline).toLocaleDateString('en-US')}` : 'No deadline'}
                    ${task.urgent ? ' • <span class="urgent-badge">⚠️ Urgent</span>' : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="btn-complete" onclick="toggleTaskCompletion('${task.id}')">
                    ${task.completed ? '↶ Undo' : '✓ Complete'}
                </button>
                <button class="btn-edit" onclick="editTask('${task.id}')">✏️ Edit</button>
                <button class="btn-delete" onclick="deleteTask('${task.id}')">🗑️ Delete</button>
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

    getUrgentTasks() {
        const urgentTasks = tasks.filter(task => task.urgent && !task.completed);

        if (urgentTasks.length === 0) {
            return "🎉 <strong>Great news!</strong> You don't have any urgent tasks at the moment. Keep up the good work!";
        }

        let response = "⚠️ <strong>URGENT TASKS - IMMEDIATE ATTENTION</strong>\n\n";
        urgentTasks.forEach((task, index) => {
            const deadline = task.deadline ? new Date(task.deadline).toLocaleDateString('en-US') : 'No deadline set';
            response += `${index + 1}. <strong>${task.title}</strong>\n`;
            response += `   📅 <em>Due: ${deadline}</em>\n`;
            if (task.description) {
                response += `   📝 ${task.description}\n`;
            }
            response += `   🚨 <strong>MAXIMUM PRIORITY</strong>\n\n`;
        });

        return response;
    }

    getTaskSummary() {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed).length;
        const pendingTasks = totalTasks - completedTasks;
        const urgentTasks = tasks.filter(task => task.urgent && !task.completed).length;

        return "📊 <strong>YOUR TASKS SUMMARY</strong>\n\n" +
               `• <strong>Total:</strong> ${totalTasks} tasks\n` +
               `• <strong>Completed:</strong> ${completedTasks}\n` +
               `• <strong>Pending:</strong> ${pendingTasks}\n` +
               `• <strong>Urgent:</strong> ${urgentTasks}\n\n` +
               `${pendingTasks === 0 ? 
                 '🎉 <strong>Congratulations! All tasks are completed!</strong>' : 
                 '💪 <strong>Keep up the good work!</strong>'}`;
    }

    getTodayTasks() {
        const today = new Date().toDateString();
        const todayTasks = tasks.filter(task => {
            if (!task.deadline) return false;
            const taskDate = new Date(task.deadline).toDateString();
            return taskDate === today && !task.completed;
        });

        if (todayTasks.length === 0) {
            return "📅 <strong>TODAY</strong>\n\nNo tasks due today. Great work!";
        }

        let response = `📅 <strong>TASKS FOR TODAY</strong> (${todayTasks.length} tasks)\n\n`;
        todayTasks.forEach((task, index) => {
            response += `${index + 1}. <strong>${task.title}</strong>\n`;
            if (task.description) {
                response += `   📝 ${task.description}\n`;
            }
            response += `   ⏰ <strong>Due today!</strong>\n\n`;
        });

        return response;
    }

    getPrioritySuggestions() {
        const pendingTasks = tasks.filter(task => !task.completed);

        if (pendingTasks.length === 0) {
            return "🎉 <strong>ALL TASKS COMPLETED!</strong>\n\nHow about adding new goals or projects?";
        }

        const urgentTasks = pendingTasks.filter(task => task.urgent);
        const highPriority = pendingTasks.filter(task => !task.urgent && task.deadline);
        const normalPriority = pendingTasks.filter(task => !task.urgent && !task.deadline);

        let response = "💡 <strong>PRIORITY SUGGESTIONS - AI</strong>\n\n";

        if (urgentTasks.length > 0) {
            response += "🔴 <strong>MAXIMUM PRIORITY (Do NOW):</strong>\n";
            urgentTasks.slice(0, 3).forEach(task => {
                response += `• ${task.title}\n`;
            });
            response += "\n";
        }

        if (highPriority.length > 0) {
            response += "🟡 <strong>HIGH PRIORITY (This week):</strong>\n";
            highPriority.slice(0, 3).forEach(task => {
                const deadline = new Date(task.deadline).toLocaleDateString('en-US');
                response += `• ${task.title} (due ${deadline})\n`;
            });
            response += "\n";
        }

        if (normalPriority.length > 0) {
            response += "🟢 <strong>NORMAL PRIORITY (When possible):</strong>\n";
            normalPriority.slice(0, 3).forEach(task => {
                response += `• ${task.title}\n`;
            });
        }

        return response;
    }

    getTaskInstructions() {
        if (tasks.length === 0) {
            return "🚀 <strong>AI INSTRUCTIONS</strong>\n\n" +
                   "You don't have any tasks yet. Add some tasks first so I can provide specific instructions!";
        }

        const pendingTasks = tasks.filter(task => !task.completed);
        
        if (pendingTasks.length === 0) {
            return "🎉 <strong>ALL TASKS COMPLETED!</strong>\n\n" +
                   "Excellent work! Here are some suggestions for next steps:\n\n" +
                   "1. <strong>Review completed tasks</strong> - Learn from what was done\n" +
                   "2. <strong>Set new goals</strong> - What do you want to achieve?\n" +
                   "3. <strong>Plan future projects</strong> - Think long-term\n" +
                   "4. <strong>Improve processes</strong> - How can you be more efficient?";
        }

        let response = "🚀 <strong>AI INSTRUCTIONS - HOW TO SOLVE YOUR TASKS</strong>\n\n";

        // Get the most urgent task for detailed instructions
        const mostUrgent = pendingTasks.find(task => task.urgent) || pendingTasks[0];
        
        if (mostUrgent) {
            response += `📋 <strong>MAIN TASK: ${mostUrgent.title}</strong>\n\n`;
            
            // Generate step-by-step instructions based on task content
            const steps = this.generateTaskSteps(mostUrgent);
            steps.forEach((step, index) => {
                response += `${index + 1}. ${step}\n`;
            });
            response += "\n";
        }

        response += "🔄 <strong>RECOMMENDED METHODOLOGY:</strong>\n";
        response += "• <strong>Pomodoro focus</strong> - 25min work / 5min break\n";
        response += "• <strong>Divide and conquer</strong> - Break into smaller parts\n";
        response += "• <strong>First the difficult</strong> - Solve the most complex first\n";
        response += "• <strong>Constant review</strong> - Adjust the plan when necessary\n\n";
        
        response += "💪 <strong>You can do it! Start now and see the progress.</strong>";

        return response;
    }

    generateTaskSteps(task) {
        const commonSteps = [
            "Clearly define the final objective of this task",
            "Identify the resources needed to complete it",
            "Establish mini-goals to track progress",
            "Set aside specific time to work on this task",
            "Eliminate distractions during work periods",
            "Review progress at the end of each session",
            "Celebrate small victories along the way"
        ];

        // Add context-specific steps based on task content
        const title = task.title.toLowerCase();
        
        if (title.includes('study') || title.includes('learn') || title.includes('course')) {
            return [
                "Separate study material into smaller topics",
                "Set realistic learning goals",
                "Use spaced repetition technique for memorization",
                "Practice with exercises and practical examples",
                "Make summaries and notes to solidify content",
                "Teach what you learned to reinforce knowledge",
                "Review periodically to keep knowledge fresh"
            ];
        } else if (title.includes('project') || title.includes('develop') || title.includes('create')) {
            return [
                "Define the project scope and requirements",
                "Create a schedule with important milestones",
                "Identify dependencies and risks",
                "Divide the project into phases or modules",
                "Establish quality criteria and testing",
                "Document progress and important decisions",
                "Plan the final delivery and implementation"
            ];
        } else if (title.includes('meeting') || title.includes('presentation') || title.includes('report')) {
            return [
                "Define the meeting/presentation objective and agenda",
                "Prepare necessary material in advance",
                "Identify participants and their expectations",
                "Establish the main topics to be covered",
                "Prepare supporting examples or data",
                "Anticipate possible questions and objections",
                "Plan next steps and actions"
            ];
        }

        return commonSteps;
    }
}

// Initialize AI Assistant
const aiAssistant = new AIAssistant();

/**
 * Handle quick action buttons
 */
function handleQuickAction(action) {
    const response = aiAssistant.responses[action]();
    displayAIResponse(response);
}

/**
 * Display AI response in the response container
 */
function displayAIResponse(response) {
    const aiResponseContainer = document.getElementById('aiResponse');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai';
    messageDiv.innerHTML = response.replace(/\n/g, '<br>');
    
    // Clear previous responses and add new one
    aiResponseContainer.innerHTML = '';
    aiResponseContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    aiResponseContainer.scrollTop = aiResponseContainer.scrollHeight;
}
