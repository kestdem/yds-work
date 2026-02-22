import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref, set, get, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// REPLACE WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyCZZ8Sm1zeQX2Da0jdW8-KRse4YdvObLyw",
    authDomain: "yds-work-exam.firebaseapp.com",
    databaseURL: "https://yds-work-exam-default-rtdb.firebaseio.com",
    projectId: "yds-work-exam",
    storageBucket: "yds-work-exam.firebasestorage.app",
    messagingSenderId: "300470113357",
    appId: "1:300470113357:web:4557353b23aeaee9bdb804"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export { auth, db, ref, get }; // Export for app.js

// DOM Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const adminPanelSection = document.getElementById('admin-panel-section');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authError = document.getElementById('auth-error');
const userGreeting = document.getElementById('user-greeting');
const adminControls = document.getElementById('admin-controls');
const showAdminBtn = document.getElementById('show-admin-panel-btn');
const closeAdminBtn = document.getElementById('close-admin-panel-btn');
const usersTbody = document.getElementById('users-tbody');

// Theme Logic
const themeToggle = document.getElementById('theme-toggle');
if(localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});

function showError(msg) {
    authError.textContent = msg;
    authError.classList.remove('hidden');
}

// Authentication Handlers
document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    
    setPersistence(auth, browserSessionPersistence)
        .then(() => signInWithEmailAndPassword(auth, email, password))
        .catch(err => showError("Login Error: " + err.message));
});

registerBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if(!email || !password) return showError("Please enter email and password.");

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            // Strict initialization logic based on rules
            return set(ref(db, `users/${user.uid}`), {
                email: user.email,
                isAdmin: false,
                isApproved: false
            });
        })
        .catch(err => showError("Registration Error: " + err.message));
});

logoutBtn.addEventListener('click', () => signOut(auth));

// State Guard & Routing
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Fetch user metadata from RTDB
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if(snapshot.exists()) {
            const userData = snapshot.val();
            if(!userData.isApproved) {
                alert("Account pending admin approval.");
                await signOut(auth);
                return;
            }
            
            // User is approved
            authSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            userGreeting.textContent = `Welcome, ${user.email}`;
            userGreeting.classList.remove('hidden');
            logoutBtn.classList.remove('hidden');
            
            if(userData.isAdmin) {
                adminControls.classList.remove('hidden');
            } else {
                adminControls.classList.add('hidden');
            }
        } else {
            // Edge case: Auth exists but DB doesn't (Should not happen normally)
            alert("User data missing. Contact Admin.");
            signOut(auth);
        }
    } else {
        // Logged out state
        authSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        adminPanelSection.classList.add('hidden');
        document.getElementById('exam-active-section').classList.add('hidden');
        document.getElementById('results-section').classList.add('hidden');
        userGreeting.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        authError.classList.add('hidden');
    }
});

// Admin Logic
showAdminBtn.addEventListener('click', () => {
    dashboardSection.classList.add('hidden');
    adminPanelSection.classList.remove('hidden');
    loadUsers();
});

closeAdminBtn.addEventListener('click', () => {
    adminPanelSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
});

function loadUsers() {
    onValue(ref(db, 'users'), (snapshot) => {
        usersTbody.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const uid = childSnapshot.key;
            const data = childSnapshot.val();
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${data.email}</td>
                <td><span style="color: ${data.isApproved ? 'green' : 'red'}">${data.isApproved ? 'Approved' : 'Pending'}</span></td>
                <td>${data.isAdmin ? 'Admin' : 'Student'}</td>
                <td class="action-btns">
                    <button onclick="window.toggleApprove('${uid}', ${data.isApproved})">${data.isApproved ? 'Revoke' : 'Approve'}</button>
                    <button onclick="window.toggleAdmin('${uid}', ${data.isAdmin})">${data.isAdmin ? 'Remove Admin' : 'Make Admin'}</button>
                    <button class="danger-btn" onclick="window.deleteUser('${uid}')">Delete DB Rec</button>
                </td>
            `;
            usersTbody.appendChild(tr);
        });
    });
}

// Attach globally for inline HTML onclick handlers inside the dynamically generated table
window.toggleApprove = (uid, currentStatus) => {
    update(ref(db, `users/${uid}`), { isApproved: !currentStatus });
};

window.toggleAdmin = (uid, currentStatus) => {
    update(ref(db, `users/${uid}`), { isAdmin: !currentStatus });
};

window.deleteUser = (uid) => {
    if(confirm("Delete this user's DB record? (They will lose access permanently)")) {
        remove(ref(db, `users/${uid}`));
    }
};
