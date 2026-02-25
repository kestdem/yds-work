export function computeResults(questions, answers, startedAt, finishedAt) {
  let correct = 0;
  let wrong = 0;
  let blank = 0;
  const grammarTopics = new Set();
  const vocab = new Set();

  questions.forEach((q, index) => {
    const selected = answers[index] || null;
    if (!selected) {
      blank++;
      return;
    }
    if (selected === q.correctAnswer) {
      correct++;
    } else {
      wrong++;
      if (q.grammarTopic) {
        grammarTopics.add(q.grammarTopic);
      }
      if (q.targetWord) {
        vocab.add(q.targetWord);
      }
    }
  });

  const total = correct + wrong + blank;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const durationMs = Math.max(0, (finishedAt || Date.now()) - (startedAt || Date.now()));

  return {
    correct,
    wrong,
    blank,
    percent,
    durationMs,
    grammarTopics: Array.from(grammarTopics),
    vocab: Array.from(vocab)
  };
}

export function renderResultsSummary(result) {
  const { correct, wrong, blank, percent, durationMs, grammarTopics, vocab } = result;
  const timeEl = document.getElementById("resultsTime");
  const correctEl = document.getElementById("resultsCorrect");
  const wrongEl = document.getElementById("resultsWrong");
  const blankEl = document.getElementById("resultsBlank");
  const percentEl = document.getElementById("resultsPercent");

  if (timeEl) timeEl.textContent = formatDuration(durationMs);
  if (correctEl) correctEl.textContent = String(correct);
  if (wrongEl) wrongEl.textContent = String(wrong);
  if (blankEl) blankEl.textContent = String(blank);
  if (percentEl) percentEl.textContent = String(percent);

  renderChart({ correct, wrong, blank });
  renderReviewLists(grammarTopics, vocab);
}

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function renderChart({ correct, wrong, blank }) {
  const svg = document.getElementById("resultsChart");
  if (!svg) return;
  const total = correct + wrong + blank || 1;
  const maxHeight = 80;
  const barWidth = 40;
  const gap = 15;
  const baseY = 100;
  const startX = 25;

  const toHeight = (v) => (v / total) * maxHeight;

  const bars = [
    { label: "Correct", value: correct, color: "var(--color-success)" },
    { label: "Wrong", value: wrong, color: "var(--color-danger)" },
    { label: "Blank", value: blank, color: "var(--color-warning)" }
  ];

  svg.innerHTML = "";

  bars.forEach((bar, index) => {
    const height = toHeight(bar.value);
    const x = startX + index * (barWidth + gap);
    const y = baseY - height;

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(x));
    rect.setAttribute("y", String(y));
    rect.setAttribute("width", String(barWidth));
    rect.setAttribute("height", String(height));
    rect.setAttribute("rx", "6");
    rect.setAttribute("fill", bar.color);
    svg.appendChild(rect);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(x + barWidth / 2));
    label.setAttribute("y", "112");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "8");
    label.textContent = bar.label;
    svg.appendChild(label);
  });
}

function renderReviewLists(grammarTopics, vocab) {
  const grammarList = document.getElementById("grammarReviewList");
  const vocabList = document.getElementById("vocabReviewList");
  if (grammarList) {
    grammarList.innerHTML = "";
    grammarTopics.forEach((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      grammarList.appendChild(li);
    });
  }
  if (vocabList) {
    vocabList.innerHTML = "";
    vocab.forEach((w) => {
      const li = document.createElement("li");
      li.textContent = w;
      vocabList.appendChild(li);
    });
  }
}

