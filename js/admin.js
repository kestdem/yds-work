import {
  db,
  ref,
  get,
  update,
  remove,
  push,
  set,
  onValue
} from "./firebase-init.js";

import { showAlert } from "./ui.js";
import { shuffle } from "./questions.js";

const USERS_PATH = "users";
const QUESTIONS_PATH = "questions";
const LOGS_PATH = "logs";

let adminDataLoaded = false;

export function loadAdminDataIfNeeded() {
  if (adminDataLoaded) return;
  adminDataLoaded = true;
  subscribeUsers();
  subscribeLogs();
  loadQuestionSummary();
}

export function initAdminPanel() {
  const usersTab = document.getElementById("adminUsersTabBtn");
  const questionsTab = document.getElementById("adminQuestionsTabBtn");
  const logsTab = document.getElementById("adminLogsTabBtn");
  const usersPanel = document.getElementById("adminUsersPanel");
  const questionsPanel = document.getElementById("adminQuestionsPanel");
  const logsPanel = document.getElementById("adminLogsPanel");

  if (usersTab && questionsTab && logsTab && usersPanel && questionsPanel && logsPanel) {
    usersTab.addEventListener("click", () => {
      usersTab.classList.add("tab-active");
      questionsTab.classList.remove("tab-active");
      logsTab.classList.remove("tab-active");
      usersPanel.hidden = false;
      questionsPanel.hidden = true;
      logsPanel.hidden = true;
    });
    questionsTab.addEventListener("click", () => {
      questionsTab.classList.add("tab-active");
      usersTab.classList.remove("tab-active");
      logsTab.classList.remove("tab-active");
      usersPanel.hidden = true;
      questionsPanel.hidden = false;
      logsPanel.hidden = true;
    });
    logsTab.addEventListener("click", () => {
      logsTab.classList.add("tab-active");
      usersTab.classList.remove("tab-active");
      questionsTab.classList.remove("tab-active");
      usersPanel.hidden = true;
      questionsPanel.hidden = true;
      logsPanel.hidden = false;
    });
  }

  const importInput = document.getElementById("questionsImportInput");
  const exportBtn = document.getElementById("exportQuestionsBtn");
  const bulkBtn = document.getElementById("bulkAddQuestionsBtn");

  if (importInput) {
    importInput.addEventListener("change", handleQuestionsImport);
  }
  if (exportBtn) {
    exportBtn.addEventListener("click", handleQuestionsExport);
  }
  if (bulkBtn) {
    bulkBtn.addEventListener("click", handleBulkQuestionsAdd);
  }
}

function subscribeUsers() {
  const usersRef = ref(db, USERS_PATH);
  onValue(usersRef, (snap) => {
    const listEl = document.getElementById("usersList");
    if (!listEl) return;
    listEl.innerHTML = "";

    const header = document.createElement("div");
    header.className = "table-row table-header";
    header.innerHTML = `
      <div class="table-cell">Email</div>
      <div class="table-cell">Approved</div>
      <div class="table-cell">Admin</div>
      <div class="table-cell">Actions</div>
    `;
    listEl.appendChild(header);

    if (!snap.exists()) return;
    const obj = snap.val();
    const entries = Object.keys(obj).map((uid) => ({ uid, ...obj[uid] }));
    entries.sort((a, b) => a.email.localeCompare(b.email));

    entries.forEach((user) => {
      const row = document.createElement("div");
      row.className = "table-row";
      const approved = !!user.isApproved;
      const admin = !!user.isAdmin;
      row.innerHTML = `
        <div class="table-cell">${user.email || ""}</div>
        <div class="table-cell">
          <span class="badge ${approved ? "badge-success" : "badge-warning"}">
            ${approved ? "Approved" : "Pending"}
          </span>
        </div>
        <div class="table-cell">
          <span class="badge ${admin ? "badge-info" : ""}">
            ${admin ? "Admin" : "User"}
          </span>
        </div>
        <div class="table-cell table-actions"></div>
      `;
      const actionsCell = row.querySelector(".table-actions");
      const approveBtn = document.createElement("button");
      approveBtn.type = "button";
      approveBtn.className = "btn btn-ghost";
      approveBtn.textContent = approved ? "Revoke" : "Approve";
      approveBtn.addEventListener("click", () => toggleApproval(user.uid, !approved, user.email));

      const adminBtn = document.createElement("button");
      adminBtn.type = "button";
      adminBtn.className = "btn btn-ghost";
      adminBtn.textContent = admin ? "Remove admin" : "Make admin";
      adminBtn.addEventListener("click", () => toggleAdmin(user.uid, !admin, user.email));

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-ghost";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => deleteUserRecord(user.uid, user.email));

      actionsCell.appendChild(approveBtn);
      actionsCell.appendChild(adminBtn);
      actionsCell.appendChild(deleteBtn);
      listEl.appendChild(row);
    });
  });
}

async function toggleApproval(uid, isApproved, email) {
  try {
    await update(ref(db, `${USERS_PATH}/${uid}`), { isApproved });
    await logAction("SET_APPROVAL", { uid, email, isApproved });
    showAlert("User approval updated.", "success", 2000);
  } catch (err) {
    console.error("Failed to update approval", err);
    showAlert("Failed to update approval.", "danger");
  }
}

async function toggleAdmin(uid, isAdmin, email) {
  try {
    await update(ref(db, `${USERS_PATH}/${uid}`), { isAdmin });
    await logAction("SET_ADMIN", { uid, email, isAdmin });
    showAlert("User admin status updated.", "success", 2000);
  } catch (err) {
    console.error("Failed to update admin", err);
    showAlert("Failed to update admin status.", "danger");
  }
}

async function deleteUserRecord(uid, email) {
  if (!window.confirm(`Delete database record for ${email}? This cannot be undone.`)) {
    return;
  }
  try {
    await remove(ref(db, `${USERS_PATH}/${uid}`));
    await logAction("DELETE_USER_DB_RECORD", { uid, email });
    showAlert("User record deleted from database.", "success", 2000);
  } catch (err) {
    console.error("Failed to delete user", err);
    showAlert("Failed to delete user record.", "danger");
  }
}

async function handleQuestionsImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data)) {
      showAlert("JSON must be an array of questions.", "warning");
      return;
    }
    await importQuestionsArray(data);
    await logAction("IMPORT_QUESTIONS_FILE", { count: data.length, fileName: file.name });
    showAlert("Questions imported successfully.", "success");
    loadQuestionSummary();
  } catch (err) {
    console.error("Import error", err);
    showAlert("Failed to import questions.", "danger");
  } finally {
    event.target.value = "";
  }
}

async function handleBulkQuestionsAdd() {
  const textarea = document.getElementById("bulkQuestionsTextarea");
  if (!textarea) return;
  const text = textarea.value.trim();
  if (!text) {
    showAlert("Please paste a JSON array of questions.", "warning");
    return;
  }
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) {
      showAlert("JSON must be an array of questions.", "warning");
      return;
    }
    await importQuestionsArray(data);
    await logAction("BULK_ADD_QUESTIONS", { count: data.length });
    showAlert("Questions added successfully.", "success");
    textarea.value = "";
    loadQuestionSummary();
  } catch (err) {
    console.error("Bulk add error", err);
    showAlert("Failed to add questions.", "danger");
  }
}

async function importQuestionsArray(arr) {
  const updates = {};
  arr.forEach((q) => {
    const id = q.id || push(ref(db, QUESTIONS_PATH)).key;
    updates[`${QUESTIONS_PATH}/${id}`] = {
      id,
      questionText: q.questionText || "",
      questionTextTR: q.questionTextTR || "",
      paragraph: q.paragraph || "",
      options: q.options || {},
      optionsTR: q.optionsTR || {},
      correctAnswer: q.correctAnswer || "A",
      category: q.category || "Grammar",
      subCategory: q.subCategory || "",
      difficulty: q.difficulty || "medium",
      explanationEN: q.explanationEN || "",
      explanationTR: q.explanationTR || "",
      targetWord: q.targetWord || "",
      grammarTopic: q.grammarTopic || ""
    };
  });
  await update(ref(db), updates);
}

async function handleQuestionsExport() {
  try {
    const snap = await get(ref(db, QUESTIONS_PATH));
    if (!snap.exists()) {
      showAlert("No questions to export.", "warning");
      return;
    }
    const obj = snap.val();
    const arr = Object.keys(obj).map((id) => ({ id, ...obj[id] }));
    shuffle(arr);
    const blob = new Blob([JSON.stringify(arr, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "questions-export.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    await logAction("EXPORT_QUESTIONS", { count: arr.length });
  } catch (err) {
    console.error("Export error", err);
    showAlert("Failed to export questions.", "danger");
  }
}

function loadQuestionSummary() {
  const summaryEl = document.getElementById("questionsSummary");
  if (!summaryEl) return;
  get(ref(db, QUESTIONS_PATH)).then((snap) => {
    if (!snap.exists()) {
      summaryEl.textContent = "No questions in the database.";
      return;
    }
    const obj = snap.val();
    const arr = Object.keys(obj).map((id) => obj[id]);
    const total = arr.length;
    const byCategory = {};
    arr.forEach((q) => {
      const c = q.category || "Uncategorized";
      byCategory[c] = (byCategory[c] || 0) + 1;
    });
    const parts = [`Total questions: ${total}`];
    Object.keys(byCategory).forEach((cat) => {
      parts.push(`${cat}: ${byCategory[cat]}`);
    });
    summaryEl.textContent = parts.join(" | ");
  }).catch((err) => {
    console.error("Failed to load question summary", err);
  });
}

function subscribeLogs() {
  const logsRef = ref(db, `${LOGS_PATH}`);
  onValue(logsRef, (snap) => {
    const listEl = document.getElementById("logsList");
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!snap.exists()) return;
    const obj = snap.val();
    const entries = Object.keys(obj).map((id) => ({ id, ...obj[id] }));
    entries.sort((a, b) => b.timestamp - a.timestamp);
    entries.slice(0, 100).forEach((log) => {
      const row = document.createElement("div");
      row.className = "log-row";
      const date = new Date(log.timestamp || 0);
      row.innerHTML = `
        <div><strong>${log.action}</strong></div>
        <div class="log-meta">${date.toLocaleString()} &middot; ${log.adminEmail || log.adminUid}</div>
        <div class="log-meta">${JSON.stringify(log.details || {})}</div>
      `;
      listEl.appendChild(row);
    });
  });
}

async function logAction(action, details) {
  try {
    const user = window.firebaseCurrentUser || null;
    const logRef = push(ref(db, LOGS_PATH));
    await set(logRef, {
      timestamp: Date.now(),
      adminUid: user?.uid || "",
      adminEmail: user?.email || "",
      action,
      details: details || {}
    });
  } catch (err) {
    console.error("Failed to write log", err);
  }
}

