import { initTheme } from "./theme.js";
import { initAuth } from "./auth.js";
import { showSection } from "./ui.js";
import { wireExamControls, startRealExam, startPracticeMode, restoreExamIfNeeded } from "./exam-engine.js";
import { initAdminPanel } from "./admin.js";
import { auth, onAuthStateChanged } from "./firebase-init.js";

function init() {
  initTheme();
  wireExamControls();
  initAuth();
  initAdminPanel();

  const realExamBtn = document.getElementById("realExamBtn");
  const practiceBtn = document.getElementById("practiceModeBtn");
  const adminPanelBtn = document.getElementById("adminPanelBtn");
  const backFromResultsBtn = document.getElementById("backToDashboardFromResultsBtn");
  const backFromAdminBtn = document.getElementById("backToDashboardFromAdminBtn");

  if (realExamBtn) {
    realExamBtn.addEventListener("click", () => {
      startRealExam();
    });
  }

  if (practiceBtn) {
    practiceBtn.addEventListener("click", () => {
      startPracticeMode();
    });
  }

  if (adminPanelBtn) {
    adminPanelBtn.addEventListener("click", () => {
      showSection("admin");
    });
  }

  if (backFromResultsBtn) {
    backFromResultsBtn.addEventListener("click", () => {
      showSection("dashboard");
    });
  }

  if (backFromAdminBtn) {
    backFromAdminBtn.addEventListener("click", () => {
      showSection("dashboard");
    });
  }

  // Expose current user for logging (admin.js).
  onAuthStateChanged(auth, (user) => {
    window.firebaseCurrentUser = user || null;
  });

  // Attempt to restore an exam session if present.
  restoreExamIfNeeded();
}

document.addEventListener("DOMContentLoaded", init);

