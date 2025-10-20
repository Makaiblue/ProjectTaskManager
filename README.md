# ProjectTaskManager
# 🧠 Project Task Manager with Firebase and AI Assistant
This project is a **Task Management Web App** built with **HTML, CSS, JavaScript**, and **Firebase** for authentication and cloud storage.  
It allows users to create accounts, log in securely, manage their personal tasks, and interact with a simple built-in **AI assistant** that provides smart task insights.

---

## 🚀 Features

- **User Authentication:**  
  Users can register and log in using Firebase Authentication (Email and Password).

- **Task Management System:**  
  Add, edit, complete, or remove tasks.  
  Tasks are stored both **locally** (via LocalStorage) and **remotely** (via Firestore).

- **Real-time Sync with Firebase Firestore:**  
  Each user's tasks are automatically synced to their account in Firestore for persistent access.

- **AI Assistant Panel:**  
  A friendly AI bot that provides useful responses, such as:
  - Listing urgent or overdue tasks.
  - Summarizing pending tasks.
  - Suggesting daily priorities.

- **Responsive Interface:**  
  Clean and minimal UI, optimized for both desktop and mobile screens.

---

## 🛠️ Technologies Used

- **Frontend:**  
  HTML5, CSS3, Vanilla JavaScript (ES6+)

- **Backend (as a Service):**  
  Firebase 11 (App, Auth, Firestore)

- **Storage:**  
  Firestore Database + LocalStorage

- **AI Logic:**  
  Simple JavaScript-based message handling and task context analysis

---

## 🧩 Project Structure
/project-task-manager
│
├── index.html # Main app (login + task manager)
├── register.html # User registration page
├── style.css # Global styles
├── script.js # Core logic (authentication, tasks, AI, Firebase sync)
└── README.md # Project documentation

---

## ⚙️ How It Works

1. **User Registration:**  
   New users can create accounts through `register.html`, which uses Firebase’s `createUserWithEmailAndPassword()` method.

2. **Authentication:**  
   Login and logout are managed via Firebase Auth, ensuring secure access.

3. **Task Management:**  
   After logging in, users can:
   - Add new tasks (title, description, and deadline)
   - Edit or delete existing tasks
   - Mark tasks as completed
   - Clear all tasks at once

4. **Cloud Synchronization:**  
   Tasks are saved to Firestore under the logged-in user’s UID.  
   When a user logs in from another device, their tasks are automatically loaded from the cloud.

5. **AI Assistant:**  
   A sidebar AI chat responds to natural questions such as:
   - “What are my urgent tasks?”
   - “Give me a summary of my tasks.”
   - “Do I have any tasks today?”

---

## 🧠 Development Process

The project was built step by step:

1. **UI Design:**  
   Created a simple and clean user interface using HTML and CSS.

2. **Firebase Integration:**  
   Configured Firebase in the console, set up Authentication and Firestore Database.

3. **Login and Register Pages:**  
   Connected front-end forms with Firebase’s Authentication API.

4. **Task Logic Implementation:**  
   Added features to create, update, complete, and delete tasks with dynamic rendering in JavaScript.

5. **Firestore Sync:**  
   Implemented functions to save and load user tasks from Firebase Firestore.

6. **AI Assistant:**  
   Added a simple interactive chatbot panel that analyzes the user’s tasks and provides contextual feedback.

7. **Testing and Debugging:**  
   Fixed issues related to Firebase initialization, DOM null errors, and variable redeclarations.

---

## 🧾 Requirements

- A Firebase account  
- A configured Firebase project with:
  - Authentication (Email/Password)
  - Firestore Database enabled
- Modern browser supporting ES modules

---
 ## Credits
Marcos David Garcia Lima
