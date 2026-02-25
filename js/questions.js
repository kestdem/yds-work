import { db, ref, get } from "./firebase-init.js";

const QUESTIONS_PATH = "questions";

export async function fetchAllQuestions() {
  const snap = await get(ref(db, QUESTIONS_PATH));
  if (!snap.exists()) return [];
  const obj = snap.val();
  return Object.keys(obj).map((id) => ({
    id,
    ...obj[id]
  }));
}

export function selectBalancedExamQuestions(allQuestions, examSize = 80) {
  const categories = [
    "Grammar",
    "Vocabulary",
    "Cloze Test",
    "Translation",
    "Paraphrase",
    "Reading"
  ];
  const grouped = {};
  categories.forEach((c) => (grouped[c] = []));
  for (const q of allQuestions) {
    if (grouped[q.category]) {
      grouped[q.category].push(q);
    }
  }

  const perCategoryBase = Math.floor(examSize / categories.length);
  const remainder = examSize % categories.length;

  const selected = [];
  categories.forEach((cat, index) => {
    const count = perCategoryBase + (index < remainder ? 1 : 0);
    const pool = grouped[cat] || [];
    shuffle(pool);
    for (let i = 0; i < Math.min(count, pool.length); i++) {
      selected.push(pool[i]);
    }
  });

  if (selected.length < examSize) {
    const remaining = allQuestions.filter((q) => !selected.includes(q));
    shuffle(remaining);
    for (let i = 0; i < examSize - selected.length && i < remaining.length; i++) {
      selected.push(remaining[i]);
    }
  }

  shuffle(selected);
  return selected.slice(0, examSize);
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

