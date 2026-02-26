// State Management
let currentWorkKey = null;
let currentPartKey = null;
let currentRoundQuestions = [];
let currentQuestionIndex = 0;
let roundScore = 0;

// User Progress Structure: { work: { part: { correct: [], incorrect: [], unattempted: [] } } }
let userProgress = {};

// DOM Elements
const menuScreen = document.getElementById('menu-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const workList = document.getElementById('work-list');
const partSelection = document.getElementById('part-selection');
const partList = document.getElementById('part-list');
const selectedWorkTitle = document.getElementById('selected-work-title');

const quizPartTitle = document.getElementById('quiz-part-title');
const progressBar = document.getElementById('progress-bar');
const questionNumber = document.getElementById('question-number');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const feedbackContainer = document.getElementById('feedback-container');
const answerResult = document.getElementById('answer-result');
const explanationText = document.getElementById('explanation-text');
const nextBtn = document.getElementById('next-btn');
const quizBackBtn = document.getElementById('quiz-back-btn');

const finalScore = document.getElementById('final-score');
const totalQuestionsDisplay = document.getElementById('total-questions');
const resultMessage = document.getElementById('result-message');
const retryBtn = document.getElementById('retry-btn');
const menuBtn = document.getElementById('menu-btn');

// Initialize
function init() {
    loadProgress();
    renderWorkSelection();

    document.getElementById('back-to-works').addEventListener('click', () => {
        partSelection.classList.add('hidden');
        workList.parentElement.classList.remove('hidden');
    });

    quizBackBtn.addEventListener('click', showPartSelection);
    nextBtn.addEventListener('click', nextQuestion);
    retryBtn.addEventListener('click', startQuiz);
    menuBtn.addEventListener('click', showMenu);
}

function loadProgress() {
    const saved = localStorage.getItem('classical_quiz_progress');
    if (saved) {
        userProgress = JSON.parse(saved);
    }
}

function saveProgress() {
    localStorage.setItem('classical_quiz_progress', JSON.stringify(userProgress));
}

function initPartProgress(workKey, partKey) {
    if (!userProgress[workKey]) userProgress[workKey] = {};
    if (!userProgress[workKey][partKey]) {
        const questions = quizData[workKey].parts[partKey].questions;
        userProgress[workKey][partKey] = {
            correct: [],
            incorrect: [],
            unattempted: questions.map(q => q.id)
        };
    }
}

function renderWorkSelection() {
    workList.innerHTML = '';
    Object.keys(quizData).forEach(workKey => {
        const work = quizData[workKey];
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<h3>${work.title}</h3>`;
        card.onclick = () => selectWork(workKey);
        workList.appendChild(card);
    });
}

function selectWork(workKey) {
    currentWorkKey = workKey;
    const work = quizData[workKey];
    selectedWorkTitle.textContent = `${work.title} - パートを選択`;
    renderPartSelection(work.parts);
    workList.parentElement.classList.add('hidden');
    partSelection.classList.remove('hidden');
}

function renderPartSelection(parts) {
    partList.innerHTML = '';
    Object.keys(parts).forEach(partKey => {
        const part = parts[partKey];
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<h3>${part.title}</h3>`;
        card.onclick = () => {
            currentPartKey = partKey;
            startQuiz();
        };
        partList.appendChild(card);
    });
}

function startQuiz() {
    initPartProgress(currentWorkKey, currentPartKey);
    const progress = userProgress[currentWorkKey][currentPartKey];
    const questionsPool = quizData[currentWorkKey].parts[currentPartKey].questions;

    // Priority: Incorrect > Unattempted > Correct
    let selectionIds = [];

    // 1. Incorrect
    selectionIds = [...progress.incorrect];

    // 2. Unattempted
    if (selectionIds.length < 5) {
        const needed = 5 - selectionIds.length;
        selectionIds = selectionIds.concat(progress.unattempted.slice(0, needed));
    }

    // 3. Correct (if still not 5)
    if (selectionIds.length < 5) {
        const needed = 5 - selectionIds.length;
        // Shuffle correct ones to avoid same order
        const shuffledCorrect = [...progress.correct].sort(() => Math.random() - 0.5);
        selectionIds = selectionIds.concat(shuffledCorrect.slice(0, needed));
    }

    // Limit to 5
    selectionIds = selectionIds.slice(0, 5);

    // Map IDs to actual question objects
    currentRoundQuestions = selectionIds.map(id => questionsPool.find(q => q.id === id));

    if (currentRoundQuestions.length === 0) {
        alert("問題がありません。");
        showPartSelection();
        return;
    }

    currentQuestionIndex = 0;
    roundScore = 0;

    quizPartTitle.textContent = quizData[currentWorkKey].parts[currentPartKey].title;
    showScreen(quizScreen);
    resetBackgroundColor();
    showQuestion();
}

function resetBackgroundColor() {
    document.body.style.backgroundColor = '#f8f5f0';
    document.body.classList.remove('dark-bg');
}

function updateBackgroundColor() {
    const neutral = [248, 245, 240];
    const targetBlue = [30, 58, 138];
    const targetRed = [169, 50, 38];
    const maxQ = 5;

    const correctCount = roundScore;
    const incorrectCount = (currentQuestionIndex + 1) - roundScore;
    const neutralCount = Math.max(0, maxQ - (currentQuestionIndex + 1));

    const r = Math.round((neutral[0] * neutralCount + targetBlue[0] * correctCount + targetRed[0] * incorrectCount) / maxQ);
    const g = Math.round((neutral[1] * neutralCount + targetBlue[1] * correctCount + targetRed[1] * incorrectCount) / maxQ);
    const b = Math.round((neutral[2] * neutralCount + targetBlue[2] * correctCount + targetRed[2] * incorrectCount) / maxQ);

    document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

    // Adjust text color if background is dark
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    if (brightness < 140) {
        document.body.classList.add('dark-bg');
    } else {
        document.body.classList.remove('dark-bg');
    }
}

function showQuestion() {
    const question = currentRoundQuestions[currentQuestionIndex];
    if (!question) return;

    feedbackContainer.classList.add('hidden');
    optionsContainer.innerHTML = '';

    const progressPerc = (currentQuestionIndex / currentRoundQuestions.length) * 100;
    progressBar.style.width = `${progressPerc}%`;
    questionNumber.textContent = `${currentQuestionIndex + 1} / ${currentRoundQuestions.length}`;

    questionText.textContent = question.question;

    question.options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = option;
        btn.onclick = () => handleAnswer(index, btn);
        optionsContainer.appendChild(btn);
    });
}

function handleAnswer(selectedIndex, selectedBtn) {
    const question = currentRoundQuestions[currentQuestionIndex];
    const isCorrect = selectedIndex === question.answer;

    if (isCorrect) roundScore++;

    // Update Progress
    const progress = userProgress[currentWorkKey][currentPartKey];
    const questionId = question.id;

    // Remove from all pools first
    progress.unattempted = progress.unattempted.filter(id => id !== questionId);
    progress.incorrect = progress.incorrect.filter(id => id !== questionId);
    progress.correct = progress.correct.filter(id => id !== questionId);

    if (isCorrect) {
        progress.correct.push(questionId);
    } else {
        progress.incorrect.push(questionId);
    }
    saveProgress();

    const buttons = optionsContainer.querySelectorAll('.option-btn');
    buttons.forEach(btn => btn.disabled = true);

    selectedBtn.classList.add(isCorrect ? 'correct' : 'incorrect');
    if (!isCorrect) {
        buttons[question.answer].classList.add('correct');
    }

    answerResult.textContent = isCorrect ? '正解！' : '不正解...';
    answerResult.className = isCorrect ? 'correct' : 'incorrect';
    explanationText.textContent = question.explanation;
    feedbackContainer.classList.remove('hidden');

    updateBackgroundColor();

    setTimeout(() => {
        feedbackContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    if (currentQuestionIndex === currentRoundQuestions.length - 1) {
        progressBar.style.width = '100%';
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentRoundQuestions.length) {
        showQuestion();
    } else {
        showResult();
    }
}

function showResult() {
    finalScore.textContent = roundScore;
    totalQuestionsDisplay.textContent = currentRoundQuestions.length;

    const percentage = (roundScore / currentRoundQuestions.length) * 100;
    if (percentage === 100) {
        resultMessage.textContent = '最高に『ハイ！』ってやつだアアアアア！全問正解...だが、この問題だけで勝った気になるなよ？ 無駄無駄無駄無駄ァ！';
    } else if (percentage >= 80) {
        resultMessage.textContent = 'あ、一応合格点？ 詰めが甘いんだよ。その数問のミスがッ！ 命取りになるってことがッ！ ッ理解ッできていないのかッ！ このド低脳がァーーッ！';
    } else if (percentage >= 60) {
        resultMessage.textContent = 'ギリギリだな。運が良かっただけだ。おまえは今までに間違えた古典の数を覚えているのか？ 中途半端な知識なんて、ゴミ以下だッ！';
    } else if (percentage >= 40) {
        resultMessage.textContent = 'きさまッ！ 冗談で言っているのかッ！？ おまえの頭の中は『お花畑』なのか？ 教科書を読み直す勇気も、理解する知能も、今のきさまには『無い』ッ！マンモーニなんだよッ！';
    } else {
        resultMessage.textContent = '便器に吐き出されたタンカスどもがッ！おまえはもはや古典どころか、日本語を喋る資格すら無い。この『便所掃除のメシ』以下のクズめ！';
    }

    showScreen(resultScreen);
}

function showPartSelection() {
    resetBackgroundColor();
    showScreen(menuScreen);
    workList.parentElement.classList.add('hidden');
    partSelection.classList.remove('hidden');
}

function showMenu() {
    resetBackgroundColor();
    showScreen(menuScreen);
    partSelection.classList.add('hidden');
    workList.parentElement.classList.remove('hidden');
}

function showScreen(screen) {
    [menuScreen, quizScreen, resultScreen].forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', init);
