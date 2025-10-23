// Firebase configuration with your project data
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

// Firebase service references
const auth = firebase.auth();
const db = firebase.firestore();

// Export services for use in other files
window.firebaseServices = { auth, db };
