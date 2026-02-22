import { auth, db, ref, get } from './auth.js';

// DOM Elements
const startExamBtn = document.getElementById('start-exam-btn');
const examModeSelect = document.getElementById('exam-mode');
const dashboardSection = document.getElementById('dashboard-section');
const examActiveSection = document.getElementById('exam-active-section');
const resultsSection = document.getElementById('results-section');
const timerDisplay = document.getElementById('timer');
const modeTitle = document.getElementById('mode-title');
const qText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const qProgress = document.getElementById('question-progress');
const nextBtn = document.getElementById('next-btn');
const finishBtn = document.getElementById('finish-btn');
const explanationBox = document.getElementById('explanation-box');

// Exam State
let questions = [];
let currentIndex = 0;
let currentMode = '';
let timerInterval;
let timeElapsed = 0; // in seconds
let timeRemaining = 180 * 60; // 180 mins
let answers = {}; // { qId: selectedOptionCode }

startExamBtn.addEventListener('click', async () => {
    currentMode = examModeSelect.value;
    
    // Fetch Questions
    try {
        const snapshot = await get(ref(db, 'questions'));
        if(!snapshot.exists()) return alert("No questions found in database.");
        
        const allQuestions = [];
        snapshot.forEach(child => {
            allQuestions.push({ id: child.key, ...child.val() });
        });
        
        // Shuffle and slice (up to 80 for real mode)
        questions = allQuestions.sort(() => 0.5 - Math.random());
        if(currentMode === 'real') questions = questions.slice(0, 80);
        
        startExam();
    } catch (err) {
        alert("Error fetching questions: " + err.message);
    }
});

function startExam() {
    dashboardSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    examActiveSection.classList.remove('hidden');
    
    currentIndex = 0;
    answers = {};
    timeElapsed = 0;
    timeRemaining = 180 * 60;
    
    modeTitle.textContent = currentMode === 'real' ? "Real Exam Mode" : "Practice Mode";
    
    // Start Timers
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if(currentMode === 'real') {
            timeRemaining--;
            updateTimerDisplay(timeRemaining);
            if(timeRemaining <= 0) finishExam();
        } else {
            timeElapsed++;
            updateTimerDisplay(timeElapsed);
        }
    }, 1000);
    
    renderQuestion();
}

function updateTimerDisplay(secondsTotal) {
    const m = Math.floor(secondsTotal / 60).toString().padStart(2, '0');
    const s = (secondsTotal % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${m}:${s}`;
}

function renderQuestion() {
    explanationBox.classList.add('hidden');
    nextBtn.classList.add('hidden');
    finishBtn.classList.add('hidden');
    
    const q = questions[currentIndex];
    qProgress.textContent = `Question ${currentIndex + 1} of ${questions.length}`;
    qText.textContent = q.text;
    
    optionsContainer.innerHTML = '';
    
    for (const [key, value] of Object.entries(q.options)) {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = `${key}) ${value}`;
        
        // Re-apply selected state if navigating back (Not implemented in basic flow, but good practice)
        if(answers[q.id] === key) btn.classList.add('selected');

        btn.onclick = () => handleOptionClick(btn, key, q);
        optionsContainer.appendChild(btn);
    }
    
    // In real mode, allow moving to next without feedback. In practice, wait for answer.
    if(currentMode === 'real') {
        if(currentIndex < questions.length - 1) nextBtn.classList.remove('hidden');
        else finishBtn.classList.remove('hidden');
    }
}

function handleOptionClick(btn, selectedKey, qData) {
    // Prevent multiple answers in Practice Mode
    if(currentMode === 'practice' && answers[qData.id]) return; 
    
    // Clear previous selections visually
    Array.from(optionsContainer.children).forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    answers[qData.id] = selectedKey;
    
    if(currentMode === 'practice') {
        const isCorrect = selectedKey === qData.correctAnswer;
        if(isCorrect) {
            btn.classList.add('correct');
        } else {
            btn.classList.add('wrong');
            // Highlight the correct one
            Array.from(optionsContainer.children).forEach(b => {
                if(b.textContent.startsWith(qData.correctAnswer)) b.classList.add('correct');
            });
        }
        showExplanation(qData);
        
        if(currentIndex < questions.length - 1) nextBtn.classList.remove('hidden');
        else finishBtn.classList.remove('hidden');
    }
}

function showExplanation(qData) {
    explanationBox.classList.remove('hidden');
    document.getElementById('exp-text-tr').textContent = qData.translationInfo.textTr;
    document.getElementById('exp-detail').textContent = qData.translationInfo.explanation;
    
    const optsTrList = document.getElementById('exp-options-tr');
    optsTrList.innerHTML = '';
    for (const [key, val] of Object.entries(qData.translationInfo.optionsTr)) {
        const li = document.createElement('li');
        li.textContent = `${key}: ${val}`;
        optsTrList.appendChild(li);
    }
}

nextBtn.addEventListener('click', () => {
    currentIndex++;
    renderQuestion();
});

finishBtn.addEventListener('click', finishExam);

function finishExam() {
    clearInterval(timerInterval);
    examActiveSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    
    let correct = 0;
    let wrong = 0;
    let blank = 0;
    let reviewGrammar = new Set();
    let reviewVocab = new Set();
    
    questions.forEach(q => {
        const userAns = answers[q.id];
        if(!userAns) {
            blank++;
        } else if (userAns === q.correctAnswer) {
            correct++;
        } else {
            wrong++;
            if(q.category === 'Grammar') reviewGrammar.add(q.subCategory);
            if(q.category === 'Vocabulary') reviewVocab.add(q.targetWord);
        }
    });
    
    // Render Stats
    const totalTimeStr = currentMode === 'real' ? 
        `${180 - Math.floor(timeRemaining/60)} mins` : 
        `${Math.floor(timeElapsed/60)}m ${timeElapsed%60}s`;

    document.getElementById('score-summary').innerHTML = `
        <div class="card">Total Time: ${totalTimeStr}</div>
        <div class="card" style="color:var(--success-color)">Correct: ${correct}</div>
        <div class="card" style="color:var(--danger-color)">Wrong: ${wrong}</div>
        <div class="card" style="color:var(--warning-color)">Blank: ${blank}</div>
    `;
    
    // Render Analytics Lists
    const gList = document.getElementById('grammar-review-list');
    gList.innerHTML = reviewGrammar.size ? [...reviewGrammar].map(i => `<li>${i}</li>`).join('') : "<li>None! Great job!</li>";
    
    const vList = document.getElementById('vocab-review-list');
    vList.innerHTML = reviewVocab.size ? [...reviewVocab].map(i => `<li>${i}</li>`).join('') : "<li>None! Perfect!</li>";
}

document.getElementById('back-dashboard-btn').addEventListener('click', () => {
    resultsSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
});
