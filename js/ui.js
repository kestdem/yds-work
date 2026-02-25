const sections = {
  auth: () => document.getElementById("authSection"),
  dashboard: () => document.getElementById("dashboardSection"),
  exam: () => document.getElementById("examSection"),
  results: () => document.getElementById("resultsSection"),
  admin: () => document.getElementById("adminSection")
};

const alertContainer = () => document.getElementById("alertContainer");

export function showSection(name) {
  Object.entries(sections).forEach(([key, getEl]) => {
    const el = getEl();
    if (!el) return;
    el.hidden = key !== name;
  });
}

export function showAlert(message, type = "info", autoHideMs = 5000) {
  const container = alertContainer();
  if (!container) return;
  const div = document.createElement("div");
  div.className = `alert alert-${type}`;
  div.textContent = message;
  container.appendChild(div);
  if (autoHideMs > 0) {
    setTimeout(() => {
      div.remove();
    }, autoHideMs);
  }
}

export function clearAlerts() {
  const container = alertContainer();
  if (!container) return;
  container.innerHTML = "";
}

export function setUserEmail(email) {
  const el = document.getElementById("userEmailDisplay");
  if (el) {
    if (email) {
      el.textContent = email;
      el.hidden = false;
    } else {
      el.textContent = "";
      el.hidden = true;
    }
  }
}

export function setDashboardState({ isApproved, isAdmin, email }) {
  const approvalText = document.getElementById("approvalStatusText");
  const adminBtn = document.getElementById("adminPanelBtn");
  if (approvalText) {
    if (!isApproved) {
      approvalText.innerHTML = `<span class="badge badge-warning">Not approved</span> Your account is pending admin approval.`;
    } else {
      approvalText.innerHTML = `<span class="badge badge-success">Approved</span> You can start practicing.`;
    }
  }
  if (adminBtn) {
    adminBtn.hidden = !isAdmin;
  }
  setUserEmail(email || "");
}

export function toggleAuthForms(mode) {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const loginTab = document.getElementById("loginTabBtn");
  const registerTab = document.getElementById("registerTabBtn");
  if (!loginForm || !registerForm || !loginTab || !registerTab) return;
  const isLogin = mode === "login";
  loginForm.hidden = !isLogin;
  registerForm.hidden = isLogin;
  loginTab.classList.toggle("tab-active", isLogin);
  registerTab.classList.toggle("tab-active", !isLogin);
}

export function setLogoutVisible(visible) {
  const btn = document.getElementById("logoutBtn");
  if (btn) {
    btn.hidden = !visible;
  }
}

