let currentMode = ''; 
let activeQuestions = [];
let currentIndex = 0;
let userAnswers = {}; 
let timerInterval;
let timeSeconds = 0; 

function toggleTheme() {
    const body = document.body;
    const btn = document.querySelector('.theme-toggle');
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        btn.innerText = 'Koyu Tema Yap';
    } else {
        body.setAttribute('data-theme', 'dark');
        btn.innerText = 'Açık Tema Yap';
    }
}

function startSession(mode) {
    currentMode = mode;
    document.getElementById('menuScreen').style.display = 'none';
    document.getElementById('quizScreen').style.display = 'block';

    let questionCount = mode === 'exam' ? 80 : questionPool.length; 
    let shuffled = [...questionPool].sort(() => 0.5 - Math.random());
    activeQuestions = shuffled.slice(0, questionCount);

    currentIndex = 0;
    userAnswers = {};
    
    if (mode === 'exam') {
        timeSeconds = 180 * 60; // Sınav modu: 180 dk geri sayım
    } else {
        timeSeconds = 0; // Çalışma modu: İleri doğru sayım
    }
    
    startTimer();
    loadQuestion();
}

function startTimer() {
    timerInterval = setInterval(() => {
        if (currentMode === 'exam') {
            timeSeconds--;
            if (timeSeconds <= 0) {
                clearInterval(timerInterval);
                finishSession();
            }
        } else {
            timeSeconds++;
        }
        
        let m = Math.floor(Math.abs(timeSeconds) / 60).toString().padStart(2, '0');
        let s = (Math.abs(timeSeconds) % 60).toString().padStart(2, '0');
        document.getElementById('timerDisplay').innerText = `Süre: ${m}:${s}`;
    }, 1000);
}

function loadQuestion() {
    const q = activeQuestions[currentIndex];
    document.getElementById('questionCounter').innerText = `Soru ${currentIndex + 1} / ${activeQuestions.length}`;
    document.getElementById('questionText').innerText = q.text;
    
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    document.getElementById('explanationBox').style.display = 'none';

    for (const [key, value] of Object.entries(q.options)) {
        const btn = document.createElement('button');
        btn.className = 'option';
        btn.innerText = `${key}) ${value}`;
        
        if (userAnswers[currentIndex] === key) {
            btn.classList.add('selected');
            if (currentMode === 'practice' && key !== q.correct) {
                btn.classList.add('wrong');
                showExplanation(q);
            }
        }

        btn.onclick = () => selectOption(key, btn, q);
        optionsContainer.appendChild(btn);
    }

    document.getElementById('btnPrev').style.visibility = currentIndex === 0 ? 'hidden' : 'visible';
    
    if (currentIndex === activeQuestions.length - 1) {
        document.getElementById('btnNext').style.display = 'none';
        document.getElementById('btnFinish').style.display = 'inline-block';
    } else {
        document.getElementById('btnNext').style.display = 'inline-block';
        document.getElementById('btnFinish').style.display = 'none';
    }
}

function selectOption(key, btnElem, q) {
    userAnswers[currentIndex] = key;
    
    if (currentMode === 'exam') {
        Array.from(document.querySelectorAll('.option')).forEach(el => el.classList.remove('selected'));
        btnElem.classList.add('selected');
    } 
    else if (currentMode === 'practice') {
        Array.from(document.querySelectorAll('.option')).forEach(el => {
            el.classList.remove('selected', 'wrong', 'correct');
            el.disabled = true; 
        });
        
        btnElem.classList.add('selected');

        if (key !== q.correct) {
            btnElem.classList.add('wrong');
            showExplanation(q);
        } else {
            btnElem.classList.add('correct');
        }
    }
}

function showExplanation(q) {
    const expBox = document.getElementById('explanationBox');
    document.getElementById('explanationText').innerText = `(Doğru Cevap: ${q.correct}) - ${q.explanation}`;
    expBox.style.display = 'block';
}

function prevQuestion() {
    if (currentIndex > 0) { currentIndex--; loadQuestion(); }
}

function nextQuestion() {
    if (currentIndex < activeQuestions.length - 1) { currentIndex++; loadQuestion(); }
}

function finishSession() {
    clearInterval(timerInterval);
    document.getElementById('quizScreen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'block';

    let correctCount = 0, wrongCount = 0, emptyCount = 0;
    let weakGrammar = new Set(), wrongVocab = new Set();

    activeQuestions.forEach((q, index) => {
        let ans = userAnswers[index];
        if (!ans) {
            emptyCount++;
        } else if (ans === q.correct) {
            correctCount++;
        } else {
            wrongCount++;
            if (q.category === 'Gramer') weakGrammar.add(q.subCategory);
            if (q.category === 'Kelime') wrongVocab.add(q.targetWord);
        }
    });

    document.getElementById('resCorrect').innerText = correctCount;
    document.getElementById('resWrong').innerText = wrongCount;
    document.getElementById('resEmpty').innerText = emptyCount;

    let totalTimeUsed = currentMode === 'exam' ? (180 * 60) - timeSeconds : timeSeconds;
    let m = Math.floor(totalTimeUsed / 60);
    let s = totalTimeUsed % 60;
    document.getElementById('resTime').innerText = `${m} dakika ${s} saniye`;

    const gList = document.getElementById('weakGrammarList');
    if (weakGrammar.size > 0) {
        weakGrammar.forEach(item => { let li = document.createElement('li'); li.innerText = item; gList.appendChild(li); });
    } else { gList.innerHTML = "<li>Harika! Gramer hatası yapmadınız.</li>"; }

    const vList = document.getElementById('wrongVocabList');
    if (wrongVocab.size > 0) {
        wrongVocab.forEach(item => { let li = document.createElement('li'); li.innerText = item; vList.appendChild(li); });
    } else { vList.innerHTML = "<li>Mükemmel! Kelime eksiğiniz çıkmadı.</li>"; }
}

async function loginBtnClick() {
    const email = document.getElementById('emailInput').value;
    const pass = document.getElementById('passwordInput').value;
    const errBox = document.getElementById('authError');
    
    if(!email || !pass) {
        errBox.innerText = "Lütfen e-posta ve şifre girin.";
        return;
    }

    errBox.innerText = "Giriş yapılıyor, lütfen bekleyin...";
    
    try {
        // Firebase giriş fonksiyonunu çağır (Önceki adımdaki loginUser fonksiyonu)
        // Başarılı olursa true döndürdüğünü veya hata fırlatmadığını varsayıyoruz
        await loginUser(email, pass); 
        
        // GİRİŞ BAŞARILIYSA EKRANLARI DEĞİŞTİR:
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('menuScreen').style.display = 'flex';
        
    } catch (error) {
        errBox.innerText = error.message || "Giriş başarısız! Yetkiniz olmayabilir.";
    }
}

async function registerBtnClick() {
    const email = document.getElementById('emailInput').value;
    const pass = document.getElementById('passwordInput').value;
    const errBox = document.getElementById('authError');
    
    if(!email || !pass) {
        errBox.innerText = "Lütfen e-posta ve şifre girin.";
        return;
    }

    errBox.innerText = "Kayıt yapılıyor...";
    
    try {
        await registerUser(email, pass);
        errBox.innerText = "Kayıt başarılı! Admin onayından sonra giriş yapabilirsiniz.";
        errBox.style.color = "green";
    } catch (error) {
        errBox.innerText = "Kayıt hatası!";
    }
}

function logout() {
    // Sayfayı yenileyerek (veya Firebase signOut çağırarak) çıkış yap
    location.reload(); 
}
