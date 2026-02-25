import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  ref,
  get,
  set
} from "./firebase-init.js";

import {
  showSection,
  showAlert,
  clearAlerts,
  setDashboardState,
  setUserEmail,
  setLogoutVisible
} from "./ui.js";

import { resetExamStateOnLogout } from "./exam-engine.js";
import { loadAdminDataIfNeeded } from "./admin.js";

const USERS_PATH = "users";

export function initAuth() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const loginTab = document.getElementById("loginTabBtn");
  const registerTab = document.getElementById("registerTabBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
  }
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegisterSubmit);
  }
  if (loginTab) {
    loginTab.addEventListener("click", () => {
      clearAlerts();
      document.getElementById("loginForm").hidden = false;
      document.getElementById("registerForm").hidden = true;
      loginTab.classList.add("tab-active");
      registerTab.classList.remove("tab-active");
    });
  }
  if (registerTab) {
    registerTab.addEventListener("click", () => {
      clearAlerts();
      document.getElementById("loginForm").hidden = true;
      document.getElementById("registerForm").hidden = false;
      registerTab.classList.add("tab-active");
      loginTab.classList.remove("tab-active");
    });
  }
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setUserEmail("");
      setLogoutVisible(false);
      showSection("auth");
      return;
    }

    try {
      const userRef = ref(db, `${USERS_PATH}/${user.uid}`);
      const snap = await get(userRef);
      if (!snap.exists()) {
        await set(userRef, {
          email: user.email || "",
          isApproved: false,
          isAdmin: false
        });
      }
      const data = (snap.exists() ? snap.val() : {
        email: user.email || "",
        isApproved: false,
        isAdmin: false
      });
      const isApproved = !!data.isApproved;
      const isAdmin = !!data.isAdmin;

      if (!isApproved) {
        showAlert("Your account is not approved yet. Please contact an administrator.", "danger", 7000);
        await signOut(auth);
        setUserEmail("");
        setLogoutVisible(false);
        showSection("auth");
        return;
      }

      setDashboardState({
        isApproved,
        isAdmin,
        email: data.email || user.email || ""
      });
      setLogoutVisible(true);
      showSection("dashboard");

      if (isAdmin) {
        loadAdminDataIfNeeded();
      }
    } catch (err) {
      console.error("Error during auth state change", err);
      showAlert("An error occurred while loading your profile.", "danger");
      await signOut(auth);
      setUserEmail("");
      setLogoutVisible(false);
      showSection("auth");
    }
  });
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  clearAlerts();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  if (!email || !password) {
    showAlert("Please enter email and password.", "warning");
    return;
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const userRef = ref(db, `${USERS_PATH}/${cred.user.uid}`);
    await set(userRef, {
      email,
      isApproved: false,
      isAdmin: false
    });
    showAlert("Registration successful. Your account is pending approval.", "success", 8000);
  } catch (err) {
    console.error("Registration error", err);
    showAlert(err.message || "Registration failed.", "danger");
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  clearAlerts();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  if (!email || !password) {
    showAlert("Please enter email and password.", "warning");
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showAlert("Login successful.", "success", 3000);
  } catch (err) {
    console.error("Login error", err);
    showAlert(err.message || "Login failed.", "danger");
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
  } finally {
    resetExamStateOnLogout();
    setUserEmail("");
    setLogoutVisible(false);
    showSection("auth");
  }
}

