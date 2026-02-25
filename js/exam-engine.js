import { showSection, showAlert } from "./ui.js";
import { fetchAllQuestions, selectBalancedExamQuestions } from "./questions.js";
import { computeResults, renderResultsSummary } from "./results.js";

const EXAM_STATE_KEY = "yds-exam-state";

let questions = [];
let answers = {};
let mode = "real"; // "real" | "practice"
let currentIndex = 0;
let timerId = null;
let startedAt = null;
let countdownMs = null; // for real exam

export function resetExamStateOnLogout() {
  questions = [];
  answers = {};
  mode = "real";
  currentIndex = 0;
  startedAt = null;
  countdownMs = null;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  window.localStorage.removeItem(EXAM_STATE_KEY);
}

export async function startRealExam() {
  mode = "real";
  await loadQuestions(true);
}

export async function startPracticeMode() {
  mode = "practice";
  await loadQuestions(false);
}

async function loadQuestions(isRealExam) {
  try {
    const all = await fetchAllQuestions();
    if (!all.length) {
      showAlert("No questions available. Please contact an administrator.", "warning");
      return;
    }
    if (isRealExam) {
      questions = selectBalancedExamQuestions(all, 80);
      countdownMs = 180 * 60 * 1000; // 180 minutes
    } else {
      questions = all;
      countdownMs = null;
    }
    answers = {};
    currentIndex = 0;
    startedAt = Date.now();
    persistState();
    renderExamShell();
    renderQuestion();
    initTimer();
    showSection("exam");
  } catch (err) {
    console.error("Failed to load questions", err);
    showAlert("Failed to load questions.", "danger");
  }
}

export function restoreExamIfNeeded() {
  const raw = window.localStorage.getItem(EXAM_STATE_KEY);
  if (!raw) return;
  try {
    const state = JSON.parse(raw);
    if (!state || !Array.isArray(state.questions) || !state.mode) return;
    questions = state.questions;
    answers = state.answers || {};
    mode = state.mode;
    currentIndex = state.currentIndex || 0;
    startedAt = state.startedAt || Date.now();
    countdownMs = typeof state.countdownMs === "number" ? state.countdownMs : null;
    renderExamShell();
    renderQuestion();
    initTimer();
    showSection("exam");
  } catch (err) {
    console.error("Failed to restore exam state", err);
  }
}

function renderExamShell() {
  const examTitle = document.getElementById("examTitle");
  const examModeLabel = document.getElementById("examModeLabel");
  if (examTitle) {
    examTitle.textContent = mode === "real" ? "Real Exam" : "Practice Session";
  }
  if (examModeLabel) {
    examModeLabel.textContent = mode === "real" ? "Timed - 180 minutes" : "Practice - untimed";
  }
  renderQuestionGrid();
}

function renderQuestion() {
  if (!questions.length) return;
  const q = questions[currentIndex];
  const indexText = document.getElementById("examQuestionIndex");
  const categoryLabel = document.getElementById("examCategoryLabel");
  const paragraphEl = document.getElementById("questionParagraph");
  const qTextEl = document.getElementById("questionText");
  const qTextTREl = document.getElementById("questionTextTR");
  const optionsContainer = document.getElementById("optionsContainer");
  const explanationBox = document.getElementById("practiceExplanationBox");
  const explanationEN = document.getElementById("explanationEN");
  const explanationTR = document.getElementById("explanationTR");
  const optionTranslations = document.getElementById("optionTranslations");
  const grammarTopicText = document.getElementById("grammarTopicText");
  const targetWordText = document.getElementById("targetWordText");

  if (indexText) {
    indexText.textContent = `Question ${currentIndex + 1} / ${questions.length}`;
  }
  if (categoryLabel) {
    categoryLabel.textContent = q.category || "";
  }

  if (paragraphEl) {
    if (q.paragraph) {
      paragraphEl.textContent = q.paragraph;
      paragraphEl.hidden = false;
    } else {
      paragraphEl.hidden = true;
      paragraphEl.textContent = "";
    }
  }

  if (qTextEl) qTextEl.textContent = q.questionText || "";
  if (qTextTREl) qTextTREl.textContent = q.questionTextTR || "";

  if (optionsContainer) {
    optionsContainer.innerHTML = "";
    const selected = answers[currentIndex] || null;
    const labels = ["A", "B", "C", "D", "E"];
    labels.forEach((label) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "option-row";
      if (selected === label) {
        row.classList.add("selected");
      }
      if (mode === "practice" && selected) {
        if (label === q.correctAnswer) {
          row.classList.add("correct");
        } else if (label === selected) {
          row.classList.add("wrong");
        }
      }

      const labelSpan = document.createElement("span");
      labelSpan.className = "option-label";
      labelSpan.textContent = label;

      const textSpan = document.createElement("span");
      textSpan.className = "option-text";
      textSpan.textContent = q.options?.[label] || "";

      row.appendChild(labelSpan);
      row.appendChild(textSpan);
      row.addEventListener("click", () => handleOptionSelect(label));
      optionsContainer.appendChild(row);
    });
  }

  if (explanationBox) {
    if (mode === "practice" && answers[currentIndex]) {
      explanationBox.hidden = false;
      if (explanationEN) explanationEN.textContent = q.explanationEN || "";
      if (explanationTR) explanationTR.textContent = q.explanationTR || "";
      if (grammarTopicText) grammarTopicText.textContent = q.grammarTopic ? `Grammar topic: ${q.grammarTopic}` : "";
      if (targetWordText) targetWordText.textContent = q.targetWord ? `Target word: ${q.targetWord}` : "";

      if (optionTranslations) {
        optionTranslations.innerHTML = "";
        const labels = ["A", "B", "C", "D", "E"];
        labels.forEach((label) => {
          const trVal = q.optionsTR?.[label];
          if (!trVal) return;
          const p = document.createElement("p");
          p.textContent = `${label}) ${trVal}`;
          optionTranslations.appendChild(p);
        });
      }
    } else {
      explanationBox.hidden = true;
    }
  }

  renderQuestionGrid();
}

function handleOptionSelect(label) {
  answers[currentIndex] = label;
  persistState();
  renderQuestion();
}

function renderQuestionGrid() {
  const grid = document.getElementById("questionGrid");
  if (!grid) return;
  grid.innerHTML = "";
  questions.forEach((q, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = String(index + 1);
    if (index === currentIndex) {
      btn.classList.add("active");
    }
    const ans = answers[index];
    if (ans) {
      btn.classList.add("answered");
      if (mode === "practice") {
        if (ans === q.correctAnswer) {
          btn.classList.add("correct");
        } else {
          btn.classList.add("wrong");
        }
      }
    }
    btn.addEventListener("click", () => {
      currentIndex = index;
      persistState();
      renderQuestion();
    });
    grid.appendChild(btn);
  });
}

function initTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  const timerDisplay = document.getElementById("timerDisplay");
  const start = startedAt || Date.now();
  if (mode === "real") {
    if (countdownMs == null) {
      countdownMs = 180 * 60 * 1000;
    }
    timerId = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, countdownMs - elapsed);
      if (timerDisplay) {
        timerDisplay.textContent = formatDuration(remaining);
      }
      if (remaining <= 0) {
        clearInterval(timerId);
        timerId = null;
        handleExamFinished(true);
      }
    }, 1000);
  } else {
    timerId = setInterval(() => {
      const elapsed = Date.now() - start;
      if (timerDisplay) {
        timerDisplay.textContent = formatDuration(elapsed);
      }
    }, 1000);
  }
}

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function wireExamControls() {
  const prevBtn = document.getElementById("prevQuestionBtn");
  const nextBtn = document.getElementById("nextQuestionBtn");
  const submitBtn = document.getElementById("submitExamBtn");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (!questions.length) return;
      currentIndex = Math.max(0, currentIndex - 1);
      persistState();
      renderQuestion();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (!questions.length) return;
      currentIndex = Math.min(questions.length - 1, currentIndex + 1);
      persistState();
      renderQuestion();
    });
  }
  if (submitBtn) {
    submitBtn.addEventListener("click", () => handleExamFinished(false));
  }
}

function handleExamFinished(autoFromTimer) {
  if (!questions.length) return;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  const finishedAt = Date.now();
  const result = computeResults(questions, answers, startedAt, finishedAt);
  renderResultsSummary(result);
  window.localStorage.removeItem(EXAM_STATE_KEY);
  questions = [];
  answers = {};
  showSection("results");
  if (autoFromTimer) {
    showAlert("Time is over. Your exam has been submitted automatically.", "warning", 8000);
  }
}

function persistState() {
  if (!questions.length) {
    window.localStorage.removeItem(EXAM_STATE_KEY);
    return;
  }
  const state = {
    questions,
    answers,
    mode,
    currentIndex,
    startedAt,
    countdownMs
  };
  window.localStorage.setItem(EXAM_STATE_KEY, JSON.stringify(state));
}

