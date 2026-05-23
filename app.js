const WARNING_TIME_SECONDS = 10;
const DEFAULT_EXTRA_SECONDS = 10;

let appIndex = null;
let currentPart = null;
let currentPartInfo = null;
let currentTest = null;
let currentCandidate = "";
let currentStages = [];
let currentStageIndex = 0;
let stageStates = {};

let mediaRecorder = null;
let activeRecordingStream = null;
let recordedChunks = [];
let audioPlayer = null;

let timerInterval = null;
let secondsRemaining = 0;

let fullPairSimulation = false;
let isFullPairRunning = false;
let isFullPairPaused = false;
let fullPairRunToken = 0;
let fullPairTimer = null;
let activeNameCapture = "";
let attemptNumber = 0;

let candidate1Name = "Candidate 1";
let candidate2Name = "Candidate 2";

let speechRecognition = null;
let recognitionFinalText = "";
let recognitionBaseText = "";
let isSpeechRecognitionRunning = false;

const screens = {
    name: document.getElementById("nameScreen"),
    menu: document.getElementById("menuScreen"),
    testList: document.getElementById("testListScreen"),
    candidate: document.getElementById("candidateScreen"),
    practice: document.getElementById("practiceScreen")
};

const studentHeader = document.getElementById("studentHeader");
const studentNameInput = document.getElementById("studentNameInput");
const saveNameButton = document.getElementById("saveNameButton");

const reloadContentButton = document.getElementById("reloadContentButton");
const partsContainer = document.getElementById("partsContainer");
const contentStatus = document.getElementById("contentStatus");

const backToMenuButton = document.getElementById("backToMenuButton");
const testListTitle = document.getElementById("testListTitle");
const testListSubtitle = document.getElementById("testListSubtitle");
const testListContainer = document.getElementById("testListContainer");

const backToTestsFromCandidateButton = document.getElementById("backToTestsFromCandidateButton");
const candidateScreenTitle = document.getElementById("candidateScreenTitle");
const candidateScreenSubtitle = document.getElementById("candidateScreenSubtitle");
const candidateChoiceContainer = document.getElementById("candidateChoiceContainer");

const backToTestsButton = document.getElementById("backToTestsButton");
const practiceTitle = document.getElementById("practiceTitle");
const taskTitle = document.getElementById("taskTitle");
const timeInfoText = document.getElementById("timeInfoText");
const timerNote = document.getElementById("timerNote");

const pairSimulationPanel = document.getElementById("pairSimulationPanel");
const candidate1NameInput = document.getElementById("candidate1NameInput");
const candidate2NameInput = document.getElementById("candidate2NameInput");
const attemptInfo = document.getElementById("attemptInfo");

const stageNavigation = document.getElementById("stageNavigation");
const stageCounter = document.getElementById("stageCounter");
const stageTitle = document.getElementById("stageTitle");
const stageDescription = document.getElementById("stageDescription");

const examinerPromptBox = document.getElementById("examinerPromptBox");
const examinerPromptText = document.getElementById("examinerPromptText");
const speakerBox = document.getElementById("speakerBox");
const speakerText = document.getElementById("speakerText");

const imagesContainer = document.getElementById("imagesContainer");
const questionsContainer = document.getElementById("questionsContainer");
const helpContainer = document.getElementById("helpContainer");

const timerDisplay = document.getElementById("timerDisplay");

const startRecordingButton = document.getElementById("startRecordingButton");
const pauseResumeButton = document.getElementById("pauseResumeButton");
const stopRecordingButton = document.getElementById("stopRecordingButton");
const playRecordingButton = document.getElementById("playRecordingButton");

const audioProgressBox = document.getElementById("audioProgressBox");
const audioProgress = document.getElementById("audioProgress");
const audioCurrentTime = document.getElementById("audioCurrentTime");
const audioDuration = document.getElementById("audioDuration");
const back10Button = document.getElementById("back10Button");
const playPauseAudioButton = document.getElementById("playPauseAudioButton");
const forward10Button = document.getElementById("forward10Button");

const transcriptionInput = document.getElementById("transcriptionInput");
const transcriptionStatus = document.getElementById("transcriptionStatus");

const previousStageButton = document.getElementById("previousStageButton");
const nextStageButton = document.getElementById("nextStageButton");

const shareButton = document.getElementById("shareButton");
const emailButton = document.getElementById("emailButton");
const downloadButton = document.getElementById("downloadButton");
const repeatAttemptButton = document.getElementById("repeatAttemptButton");

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
    registerServiceWorker();

    const savedName = localStorage.getItem("studentName") || "";
    studentNameInput.value = savedName;

    if (savedName) {
        updateStudentHeader(savedName);
        showScreen("menu");
    } else {
        showScreen("name");
    }

    configureEvents();
    await loadContentIndex();
}

function configureEvents() {
    saveNameButton.addEventListener("click", saveStudentName);

    reloadContentButton.addEventListener("click", async () => {
        await loadContentIndex();
        showScreen("menu");
    });

    backToMenuButton.addEventListener("click", () => {
        stopEverything();
        showScreen("menu");
    });

    backToTestsFromCandidateButton.addEventListener("click", () => {
        stopEverything();
        showScreen("testList");
    });

    backToTestsButton.addEventListener("click", () => {
        if (isCurrentlyRecording() || isFullPairRunning) {
            alert("Stop the recording before going back.");
            return;
        }

        stopEverything();
        showScreen("testList");
    });

    previousStageButton.addEventListener("click", () => {
        goToStage(currentStageIndex - 1);
    });

    nextStageButton.addEventListener("click", () => {
        goToStage(currentStageIndex + 1);
    });

    startRecordingButton.addEventListener("click", () => {
        if (fullPairSimulation) {
            startFullPairSimulation();
        } else {
            startNormalRecording();
        }
    });

    pauseResumeButton.addEventListener("click", () => {
        if (fullPairSimulation) {
            toggleFullPairPause();
        }
    });

    stopRecordingButton.addEventListener("click", () => {
        if (fullPairSimulation) {
            stopFullPairSimulationManually();
        } else {
            stopNormalRecording();
        }
    });

    playRecordingButton.addEventListener("click", toggleAudioPlayback);
    playPauseAudioButton.addEventListener("click", toggleAudioPlayback);
    back10Button.addEventListener("click", () => seekAudioBySeconds(-10));
    forward10Button.addEventListener("click", () => seekAudioBySeconds(10));
    audioProgress.addEventListener("input", seekAudio);

    transcriptionInput.addEventListener("input", saveCurrentTranscription);

    candidate1NameInput.addEventListener("input", () => {
        candidate1Name = candidate1NameInput.value.trim() || "Candidate 1";
        refreshTextOnly();
    });

    candidate2NameInput.addEventListener("input", () => {
        candidate2Name = candidate2NameInput.value.trim() || "Candidate 2";
        refreshTextOnly();
    });

    shareButton.addEventListener("click", shareRecordings);
    emailButton.addEventListener("click", openGmailDraft);
    downloadButton.addEventListener("click", downloadCurrentRecording);
    repeatAttemptButton.addEventListener("click", repeatAttempt);
}

function saveStudentName() {
    const name = studentNameInput.value.trim();

    if (!name) {
        alert("Please write a session name.");
        return;
    }

    localStorage.setItem("studentName", name);
    updateStudentHeader(name);
    showScreen("menu");
}

function updateStudentHeader(name) {
    studentHeader.textContent = `Session: ${name}`;
}

function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove("active");
    });

    screens[screenName].classList.add("active");
}

/* CONTENT LOADING */

async function loadContentIndex() {
    try {
        contentStatus.textContent = "Loading content...";

        const index = await fetchJsonNoCache("content/index.json");

        if (!index || !Array.isArray(index.parts)) {
            throw new Error("content/index.json does not contain a valid 'parts' array.");
        }

        appIndex = index;
        renderPartsMenu();

        const now = new Date();
        contentStatus.textContent = `Content loaded: ${now.toLocaleString()}`;
    } catch (error) {
        console.error(error);
        contentStatus.textContent = "Could not load content/index.json. Check the file and Live Server.";
        alert("Could not load content/index.json. Check that Live Server is running and the JSON is valid.");
    }
}

async function fetchJsonNoCache(path) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await fetch(`${path}${separator}t=${Date.now()}`, {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`Could not load ${path}`);
    }

    return response.json();
}

function renderPartsMenu() {
    partsContainer.innerHTML = "";

    appIndex.parts.forEach(part => {
        const button = document.createElement("button");
        button.className = "part-button";

        if (part.id === "complete") {
            button.classList.add("complete");
        }

        button.innerHTML = `
            <span>${part.title || part.id}</span>
            <small>${part.description || "Loaded from content/index.json"}</small>
        `;

        button.addEventListener("click", () => {
            openPart(part.id);
        });

        partsContainer.appendChild(button);
    });
}

function openPart(partId) {
    if (!appIndex) {
        alert("Content has not loaded yet.");
        return;
    }

    const part = appIndex.parts.find(item => item.id === partId);

    if (!part) {
        alert("Part not found in content/index.json.");
        return;
    }

    currentPart = partId;
    currentPartInfo = part;

    testListTitle.textContent = part.title || "Tests";
    testListSubtitle.textContent = part.description || "Choose a test.";
    testListContainer.innerHTML = "";

    if (!Array.isArray(part.tests) || part.tests.length === 0) {
        testListContainer.innerHTML = `<p class="small-note">No tests found for this section.</p>`;
        showScreen("testList");
        return;
    }

    part.tests.forEach(test => {
        const button = document.createElement("button");
        button.className = "test-button";

        button.innerHTML = `
            <strong>${test.title || test.id}</strong>
            <br>
            <span class="small-note">${test.description || test.file || ""}</span>
        `;

        button.addEventListener("click", () => {
            loadTest(test);
        });

        testListContainer.appendChild(button);
    });

    showScreen("testList");
}

async function loadTest(testReference) {
    try {
        stopEverything();

        let test = null;

        if (testReference.file) {
            test = await fetchJsonNoCache(testReference.file);
        } else {
            test = testReference;
        }

        currentTest = await prepareTest(test);
        fullPairSimulation = Boolean(currentTest.fullPairSimulation);

        if (currentTest.candidateSets && currentTest.candidateSets.length > 0 && !fullPairSimulation) {
            renderCandidateChoice();
            showScreen("candidate");
            return;
        }

        currentCandidate = "";
        setupStages(getStagesFromTest(currentTest));
        showScreen("practice");
    } catch (error) {
        console.error(error);
        alert("Could not load the selected test. Check the JSON file and its paths.");
    }
}

async function prepareTest(test) {
    if (test.sourceFiles) {
        return buildCompleteTestFromSourceFiles(test);
    }

    return test;
}

/* COMPLETE TEST COMPOSITION FROM SOURCE FILES */

async function buildCompleteTestFromSourceFiles(completeTest) {
    const sourceFiles = completeTest.sourceFiles;

    const part1 = sourceFiles.part1 ? await fetchJsonNoCache(sourceFiles.part1) : null;
    const part2 = sourceFiles.part2 ? await fetchJsonNoCache(sourceFiles.part2) : null;
    const part3 = sourceFiles.part3 ? await fetchJsonNoCache(sourceFiles.part3) : null;
    const part4 = sourceFiles.part4 ? await fetchJsonNoCache(sourceFiles.part4) : null;

    const stages = [];

    stages.push({
        id: "intro",
        title: "Introduction",
        description: "The examiner introduces the test.",
        speaker: "Examiner",
        examinerPrompt: completeTest.introPrompt || "Good morning. This is the B2 First Speaking Test. I am going to ask both candidates some questions. Please answer clearly. Let's begin.",
        responseSeconds: 0,
        extraSeconds: 0,
        closingPrompt: "",
        images: [],
        questions: ["Listen to the examiner."],
        helpScript: ["Stay calm.", "Speak clearly.", "Try to answer in full sentences."]
    });

    stages.push({
        id: "candidate1_name",
        title: "Candidate 1 name",
        description: "Candidate 1 says their name.",
        speaker: "{{candidate1}}",
        examinerPrompt: "Candidate 1, what's your name?",
        responseSeconds: 5,
        extraSeconds: 0,
        captureName: "candidate1",
        closingPrompt: "Thank you.",
        images: [],
        questions: ["What's your name?"],
        helpScript: ["My name is...", "I'm..."]
    });

    stages.push({
        id: "candidate2_name",
        title: "Candidate 2 name",
        description: "Candidate 2 says their name.",
        speaker: "{{candidate2}}",
        examinerPrompt: "Candidate 2, what's your name?",
        responseSeconds: 5,
        extraSeconds: 0,
        captureName: "candidate2",
        closingPrompt: "Thank you.",
        images: [],
        questions: ["What's your name?"],
        helpScript: ["My name is...", "I'm..."]
    });

    stages.push(...buildPart1PairStages(part1));
    stages.push(...buildPart2PairStages(part2));
    stages.push(...buildPart3PairStages(part3));
    stages.push(...buildPart4PairStages(part4));

    return {
        ...completeTest,
        part: "complete",
        partTitle: completeTest.partTitle || "Complete Speaking Test",
        taskTitle: completeTest.taskTitle || "Full B2 First Speaking Pair Simulation",
        fullPairSimulation: true,
        continuousMode: true,
        stages
    };
}

function buildPart1PairStages(part1) {
    if (!part1) return [];

    if (Array.isArray(part1.fullPairStages)) {
        return part1.fullPairStages;
    }

    const questions = Array.isArray(part1.questions) ? part1.questions : [];
    const helpScript = Array.isArray(part1.helpScript) ? part1.helpScript : [];

    const stages = [];

    questions.forEach((question, index) => {
        const candidateToken = index % 2 === 0 ? "{{candidate1}}" : "{{candidate2}}";
        const candidateNumber = index % 2 === 0 ? "candidate1" : "candidate2";

        stages.push({
            id: `part1_${candidateNumber}_q${index + 1}`,
            title: `Part 1 - ${candidateToken}`,
            description: "Interview question.",
            speaker: candidateToken,
            examinerPrompt: `${candidateToken}, ${lowercaseFirstLetter(question)}`,
            responseSeconds: part1.responseSeconds || 30,
            extraSeconds: part1.extraSeconds ?? 0,
            closingPrompt: "Thank you.",
            images: [],
            questions: [question],
            helpScript
        });
    });

    return stages;
}

function buildPart2PairStages(part2) {
    if (!part2) return [];

    if (Array.isArray(part2.fullPairStages)) {
        return part2.fullPairStages;
    }

    if (!Array.isArray(part2.candidateSets) || part2.candidateSets.length < 2) {
        return getStagesFromTest(part2);
    }

    const candidateA = part2.candidateSets[0];
    const candidateB = part2.candidateSets[1];

    const aStages = candidateA.stages || [];
    const bStages = candidateB.stages || [];

    const aLong = aStages[0];
    const aShort = aStages[1];
    const bLong = bStages[0];
    const bShort = bStages[1];

    const stages = [];

    if (aLong) {
        stages.push(convertStageForPair(aLong, {
            id: "part2_candidate1_long_turn",
            title: "Part 2 - {{candidate1}} long turn",
            speaker: "{{candidate1}}",
            promptPrefix: "{{candidate1}}, here are your photographs. "
        }));
    }

    if (bShort) {
        stages.push(convertStageForPair(bShort, {
            id: "part2_candidate2_short_response",
            title: "Part 2 - {{candidate2}} short response",
            speaker: "{{candidate2}}",
            promptPrefix: "{{candidate2}}, "
        }));
    }

    if (bLong) {
        stages.push(convertStageForPair(bLong, {
            id: "part2_candidate2_long_turn",
            title: "Part 2 - {{candidate2}} long turn",
            speaker: "{{candidate2}}",
            promptPrefix: "{{candidate2}}, here are your photographs. "
        }));
    }

    if (aShort) {
        stages.push(convertStageForPair(aShort, {
            id: "part2_candidate1_short_response",
            title: "Part 2 - {{candidate1}} short response",
            speaker: "{{candidate1}}",
            promptPrefix: "{{candidate1}}, "
        }));
    }

    return stages;
}

function convertStageForPair(stage, options) {
    const questions = stage.questions || [];
    const mainQuestion = questions.length > 0 ? questions[questions.length - 1] : "";

    return {
        id: options.id || stage.id,
        title: options.title || stage.title,
        description: stage.description || "",
        speaker: options.speaker || stage.speaker || "",
        examinerPrompt: stage.examinerPrompt || `${options.promptPrefix || ""}${mainQuestion}`,
        responseSeconds: stage.responseSeconds ?? stage.timeLimitSeconds ?? 60,
        extraSeconds: stage.extraSeconds ?? 0,
        closingPrompt: stage.closingPrompt ?? "Thank you.",
        images: stage.images || [],
        questions,
        helpScript: stage.helpScript || []
    };
}

function buildPart3PairStages(part3) {
    if (!part3) return [];

    if (Array.isArray(part3.fullPairStages)) {
        return part3.fullPairStages;
    }

    if (!Array.isArray(part3.stages)) {
        return getStagesFromTest(part3);
    }

    return part3.stages.map((stage, index) => {
        const isAgreement = index > 0 || String(stage.id || "").includes("agreement");

        return {
            id: `part3_${stage.id || index + 1}`,
            title: stage.title || (isAgreement ? "Part 3 - Agreement" : "Part 3 - Discussion"),
            description: stage.description || "",
            speaker: "{{candidate1}} and {{candidate2}}",
            examinerPrompt: stage.examinerPrompt || (stage.questions || []).join(" "),
            responseSeconds: stage.responseSeconds ?? stage.timeLimitSeconds ?? (isAgreement ? 60 : 120),
            extraSeconds: stage.extraSeconds ?? 0,
            closingPrompt: stage.closingPrompt ?? "Thank you.",
            images: stage.images || [],
            questions: stage.questions || [],
            helpScript: stage.helpScript || []
        };
    });
}

function buildPart4PairStages(part4) {
    if (!part4) return [];

    if (Array.isArray(part4.fullPairStages)) {
        return part4.fullPairStages;
    }

    const questions = Array.isArray(part4.questions) ? part4.questions : [];
    const helpScript = Array.isArray(part4.helpScript) ? part4.helpScript : [];

    return questions.map((question, index) => {
        let speaker = index % 2 === 0 ? "{{candidate1}}" : "{{candidate2}}";

        if (index >= questions.length - 2) {
            speaker = "{{candidate1}} and {{candidate2}}";
        }

        return {
            id: `part4_q${index + 1}`,
            title: speaker.includes("and") ? "Part 4 - Both candidates" : `Part 4 - ${speaker}`,
            description: "Follow-up discussion question.",
            speaker,
            examinerPrompt: speaker.includes("and")
                ? `Now, both of you. ${question}`
                : `${speaker}, ${lowercaseFirstLetter(question)}`,
            responseSeconds: speaker.includes("and")
                ? (part4.bothResponseSeconds || 60)
                : (part4.individualResponseSeconds || 30),
            extraSeconds: part4.extraSeconds ?? 0,
            closingPrompt: "Thank you.",
            images: [],
            questions: [question],
            helpScript
        };
    });
}

function lowercaseFirstLetter(text) {
    if (!text) return "";

    return text.charAt(0).toLowerCase() + text.slice(1);
}

/* CANDIDATE CHOICE */

function renderCandidateChoice() {
    candidateScreenTitle.textContent = `${currentTest.partTitle || ""} - ${currentTest.title || ""}`;
    candidateScreenSubtitle.textContent = "Choose which candidate role you want to practise.";
    candidateChoiceContainer.innerHTML = "";

    currentTest.candidateSets.forEach(candidateSet => {
        const button = document.createElement("button");
        button.className = "candidate-button";

        const candidateName = candidateSet.candidate || candidateSet.title || "Candidate";

        button.innerHTML = `
            <span>${candidateName}</span>
            <small>${candidateSet.description || "Speaking practice"}</small>
        `;

        button.addEventListener("click", () => {
            currentCandidate = candidateName;
            setupStages(candidateSet.stages || []);
            showScreen("practice");
        });

        candidateChoiceContainer.appendChild(button);
    });
}

/* STAGES */

function getStagesFromTest(test) {
    if (Array.isArray(test.stages) && test.stages.length > 0) {
        return test.stages;
    }

    return [
        {
            id: "single_stage",
            title: test.taskTitle || test.title || "Speaking practice",
            description: test.description || "",
            responseSeconds: test.responseSeconds ?? test.timeLimitSeconds ?? 60,
            extraSeconds: test.extraSeconds ?? DEFAULT_EXTRA_SECONDS,
            images: test.images || [],
            questions: test.questions || [],
            helpScript: test.helpScript || []
        }
    ];
}

function setupStages(stages) {
    stopEverything();

    currentStages = stages.map((stage, index) => normalizeStage(stage, index));
    currentStageIndex = 0;
    stageStates = {};

    currentStages.forEach(stage => {
        stageStates[stage.id] = {
            recordedBlob: null,
            recordedFile: null,
            recordedAudioUrl: null,
            transcription: ""
        };
    });

    continuousRecordingState = {
        recordedBlob: null,
        recordedFile: null,
        recordedAudioUrl: null,
        transcription: ""
    };

    candidate1Name = "Candidate 1";
    candidate2Name = "Candidate 2";
    candidate1NameInput.value = "";
    candidate2NameInput.value = "";

    attemptNumber = loadAttemptCount();

    practiceTitle.textContent = buildPracticeTitle();
    taskTitle.textContent = currentTest.taskTitle || currentTest.partTitle || "";

    if (fullPairSimulation) {
        pairSimulationPanel.classList.remove("hidden");
        stageNavigation.classList.add("hidden");
        previousStageButton.classList.add("hidden");
        nextStageButton.classList.add("hidden");

        timeInfoText.textContent = "Full pair simulation";
        timerNote.textContent = "The examiner voice controls the test automatically.";

        startRecordingButton.textContent = "Start full test";
        stopRecordingButton.textContent = "Stop full test";
        pauseResumeButton.textContent = "Pause";
        pauseResumeButton.disabled = true;
    } else {
        pairSimulationPanel.classList.add("hidden");
        stageNavigation.classList.remove("hidden");
        previousStageButton.classList.remove("hidden");
        nextStageButton.classList.remove("hidden");

        timeInfoText.textContent = "Practice mode";
        timerNote.textContent = "Timing loaded from JSON.";

        startRecordingButton.textContent = "Start recording";
        stopRecordingButton.textContent = "Stop recording";
        pauseResumeButton.textContent = "Pause";
        pauseResumeButton.disabled = true;
    }

    updateAttemptInfo();
    renderStageNavigation();
    renderCurrentStage();
    updateGlobalActionButtons();
}

function normalizeStage(stage, index) {
    return {
        id: stage.id || `stage_${index + 1}`,
        title: stage.title || `Stage ${index + 1}`,
        description: stage.description || "",
        speaker: stage.speaker || "",
        examinerPrompt: stage.examinerPrompt || "",
        closingPrompt: stage.closingPrompt || "",
        captureName: stage.captureName || "",
        responseSeconds: Number(stage.responseSeconds ?? stage.timeLimitSeconds ?? 60),
        extraSeconds: Number(stage.extraSeconds ?? DEFAULT_EXTRA_SECONDS),
        images: stage.images || [],
        questions: stage.questions || [],
        helpScript: stage.helpScript || []
    };
}

function buildPracticeTitle() {
    let title = `${currentTest.partTitle || currentPartInfo?.title || ""} - ${currentTest.title || ""}`;

    if (currentCandidate) {
        title += ` - ${currentCandidate}`;
    }

    return title.trim();
}

function renderStageNavigation() {
    stageNavigation.innerHTML = "";

    currentStages.forEach((stage, index) => {
        const button = document.createElement("button");
        button.className = "stage-nav-button";
        button.textContent = `${index + 1}. ${replaceNames(stage.title)}`;

        if (index === currentStageIndex) {
            button.classList.add("active-stage");
        }

        button.addEventListener("click", () => {
            goToStage(index);
        });

        stageNavigation.appendChild(button);
    });
}

function goToStage(index) {
    if (index < 0 || index >= currentStages.length) {
        return;
    }

    if (isCurrentlyRecording() || isFullPairRunning) {
        alert("You cannot change stage while the recording is running.");
        return;
    }

    saveCurrentTranscription();
    stopPlayerIfNeeded();

    currentStageIndex = index;
    renderStageNavigation();
    renderCurrentStage();
}

function autoGoToStage(index) {
    if (index < 0 || index >= currentStages.length) {
        return;
    }

    currentStageIndex = index;
    renderStageNavigation();
    renderCurrentStage();
}

function renderCurrentStage() {
    const stage = getCurrentStage();

    if (!stage) {
        return;
    }

    resetAudioProgress();
    resetTranscriptionStatus();

    refreshTextOnly();

    imagesContainer.innerHTML = "";

    stage.images.forEach(imageUrl => {
        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = "Speaking test image";
        imagesContainer.appendChild(img);
    });

    secondsRemaining = getTotalPracticeTime(stage);
    updateTimerDisplay();

    if (fullPairSimulation) {
        transcriptionInput.value = continuousRecordingState?.transcription || "";
    } else {
        const state = getCurrentStageState();
        transcriptionInput.value = state?.transcription || "";
    }

    startRecordingButton.disabled = false;
    stopRecordingButton.disabled = true;

    const hasAudio = fullPairSimulation
        ? Boolean(continuousRecordingState?.recordedAudioUrl)
        : Boolean(getCurrentStageState()?.recordedAudioUrl);

    playRecordingButton.disabled = !hasAudio;
    downloadButton.disabled = !hasAudio;

    if (hasAudio) {
        prepareAudioPlayerForCurrentContext();
    }

    previousStageButton.disabled = currentStageIndex === 0;
    nextStageButton.disabled = currentStageIndex === currentStages.length - 1;

    updateGlobalActionButtons();
}

function refreshTextOnly() {
    const stage = getCurrentStage();

    if (!stage) return;

    stageCounter.textContent = `Stage ${currentStageIndex + 1} of ${currentStages.length}`;
    stageTitle.textContent = replaceNames(stage.title);
    stageDescription.textContent = replaceNames(stage.description);

    const prompt = replaceNames(stage.examinerPrompt);
    examinerPromptText.textContent = prompt;

    if (prompt) {
        examinerPromptBox.classList.remove("hidden");
    } else {
        examinerPromptBox.classList.add("hidden");
    }

    const speaker = replaceNames(stage.speaker);

    if (speaker) {
        speakerText.textContent = `Speaker: ${speaker}`;
        speakerBox.classList.remove("hidden");
    } else {
        speakerBox.classList.add("hidden");
    }

    questionsContainer.innerHTML = "";

    stage.questions.forEach(question => {
        const div = document.createElement("div");
        div.className = "question-item";
        div.textContent = replaceNames(question);
        questionsContainer.appendChild(div);
    });

    helpContainer.innerHTML = "";

    stage.helpScript.forEach(sentence => {
        const li = document.createElement("li");
        li.textContent = replaceNames(sentence);
        helpContainer.appendChild(li);
    });
}

function getCurrentStage() {
    return currentStages[currentStageIndex];
}

function getCurrentStageState() {
    const stage = getCurrentStage();

    if (!stage) return null;

    return stageStates[stage.id];
}

function saveCurrentTranscription() {
    if (fullPairSimulation && continuousRecordingState) {
        continuousRecordingState.transcription = transcriptionInput.value;
        return;
    }

    const state = getCurrentStageState();

    if (state) {
        state.transcription = transcriptionInput.value;
    }
}

function getTotalPracticeTime(stage) {
    return Number(stage.responseSeconds || 0) + Number(stage.extraSeconds || 0);
}

function replaceNames(text) {
    return String(text || "")
        .replaceAll("{{candidate1}}", candidate1Name || "Candidate 1")
        .replaceAll("{{candidate2}}", candidate2Name || "Candidate 2");
}

/* NORMAL RECORDING */

async function startNormalRecording() {
    const stage = getCurrentStage();
    const state = getCurrentStageState();

    if (!stage || !state) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Your browser does not support audio recording.");
        return;
    }

    try {
        stopPlayerIfNeeded();

        activeRecordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recordedChunks = [];

        mediaRecorder = new MediaRecorder(activeRecordingStream);
        const stageId = stage.id;

        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const finishedState = stageStates[stageId];

            if (!finishedState) return;

            const recordedBlob = new Blob(recordedChunks, { type: "audio/webm" });
            const fileName = buildAudioFileName(stageId);
            const recordedFile = new File([recordedBlob], fileName, { type: "audio/webm" });

            if (finishedState.recordedAudioUrl) {
                URL.revokeObjectURL(finishedState.recordedAudioUrl);
            }

            finishedState.recordedBlob = recordedBlob;
            finishedState.recordedFile = recordedFile;
            finishedState.recordedAudioUrl = URL.createObjectURL(recordedBlob);
            finishedState.transcription = transcriptionInput.value;

            stopActiveStream();

            if (getCurrentStage()?.id === stageId) {
                prepareAudioPlayerForCurrentContext();
                playRecordingButton.disabled = false;
                downloadButton.disabled = false;
            }

            updateGlobalActionButtons();
        };

        mediaRecorder.start();
        startSpeechRecognition();

        secondsRemaining = getTotalPracticeTime(stage);
        updateTimerDisplay();
        startTimer();

        startRecordingButton.disabled = true;
        stopRecordingButton.disabled = false;
        playRecordingButton.disabled = true;
        downloadButton.disabled = true;

        setStageNavigationEnabled(false);
    } catch (error) {
        console.error(error);
        alert("Microphone permission was not granted or recording could not start.");
    }
}

function stopNormalRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }

    stopSpeechRecognition();
    stopTimer();

    startRecordingButton.disabled = false;
    stopRecordingButton.disabled = true;

    setStageNavigationEnabled(true);
}

/* FULL PAIR SIMULATION */

async function startFullPairSimulation() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Your browser does not support audio recording.");
        return;
    }

    try {
        stopEverything();
        resetFullPairAudio();

        fullPairRunToken++;
        const token = fullPairRunToken;

        attemptNumber = incrementAttemptCount();
        updateAttemptInfo();

        candidate1Name = "Candidate 1";
        candidate2Name = "Candidate 2";
        candidate1NameInput.value = "";
        candidate2NameInput.value = "";

        currentStageIndex = 0;
        recordedChunks = [];
        transcriptionInput.value = "";

        continuousRecordingState = {
            recordedBlob: null,
            recordedFile: null,
            recordedAudioUrl: null,
            transcription: ""
        };

        autoGoToStage(0);

        activeRecordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(activeRecordingStream);

        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const recordedBlob = new Blob(recordedChunks, { type: "audio/webm" });
            const fileName = buildAudioFileName(`complete_full_test_attempt_${attemptNumber}`);
            const recordedFile = new File([recordedBlob], fileName, { type: "audio/webm" });

            if (continuousRecordingState.recordedAudioUrl) {
                URL.revokeObjectURL(continuousRecordingState.recordedAudioUrl);
            }

            continuousRecordingState.recordedBlob = recordedBlob;
            continuousRecordingState.recordedFile = recordedFile;
            continuousRecordingState.recordedAudioUrl = URL.createObjectURL(recordedBlob);
            continuousRecordingState.transcription = transcriptionInput.value;

            stopActiveStream();
            prepareAudioPlayerForCurrentContext();

            playRecordingButton.disabled = false;
            downloadButton.disabled = false;
            repeatAttemptButton.disabled = false;

            updateGlobalActionButtons();
        };

        mediaRecorder.start();
        startSpeechRecognition();

        isFullPairRunning = true;
        isFullPairPaused = false;

        startRecordingButton.disabled = true;
        pauseResumeButton.disabled = false;
        pauseResumeButton.textContent = "Pause";
        stopRecordingButton.disabled = false;
        playRecordingButton.disabled = true;
        downloadButton.disabled = true;
        shareButton.disabled = true;
        emailButton.disabled = true;
        repeatAttemptButton.disabled = true;

        setStageNavigationEnabled(false);

        await runFullPairStages(token);
    } catch (error) {
        console.error(error);
        alert("Microphone permission was not granted or full test could not start.");
        stopEverything();
    }
}

async function runFullPairStages(token) {
    for (let i = 0; i < currentStages.length; i++) {
        if (!isFullPairRunning || token !== fullPairRunToken) return;

        autoGoToStage(i);

        const stage = getCurrentStage();

        if (!stage) return;

        await waitWhilePaused(token);

        const prompt = replaceNames(stage.examinerPrompt);

        if (prompt) {
            await speakText(prompt, token);
        }

        if (!isFullPairRunning || token !== fullPairRunToken) return;

        activeNameCapture = stage.captureName || "";

        const responseSeconds = getTotalPracticeTime(stage);

        if (responseSeconds > 0) {
            await runCountdown(responseSeconds, token);
        }

        activeNameCapture = "";

        if (!isFullPairRunning || token !== fullPairRunToken) return;

        await waitWhilePaused(token);

        const closingPrompt = replaceNames(stage.closingPrompt);

        if (closingPrompt) {
            await speakText(closingPrompt, token);
        }
    }

    finishFullPairSimulation();
}

function runCountdown(totalSeconds, token) {
    return new Promise(resolve => {
        secondsRemaining = totalSeconds;
        updateTimerDisplay();

        clearInterval(fullPairTimer);

        fullPairTimer = setInterval(() => {
            if (!isFullPairRunning || token !== fullPairRunToken) {
                clearInterval(fullPairTimer);
                resolve();
                return;
            }

            if (isFullPairPaused) {
                return;
            }

            secondsRemaining--;
            updateTimerDisplay();

            if (secondsRemaining <= 0) {
                clearInterval(fullPairTimer);
                resolve();
            }
        }, 1000);
    });
}

function waitWhilePaused(token) {
    return new Promise(resolve => {
        const check = () => {
            if (!isFullPairRunning || token !== fullPairRunToken) {
                resolve();
                return;
            }

            if (!isFullPairPaused) {
                resolve();
                return;
            }

            setTimeout(check, 200);
        };

        check();
    });
}

function toggleFullPairPause() {
    if (!isFullPairRunning) return;

    if (!isFullPairPaused) {
        isFullPairPaused = true;
        pauseResumeButton.textContent = "Resume";

        try {
            if (mediaRecorder && mediaRecorder.state === "recording" && mediaRecorder.pause) {
                mediaRecorder.pause();
            }
        } catch (error) {
            console.error(error);
        }

        try {
            window.speechSynthesis?.pause();
        } catch (error) {
            console.error(error);
        }

        stopSpeechRecognition();
    } else {
        isFullPairPaused = false;
        pauseResumeButton.textContent = "Pause";

        try {
            if (mediaRecorder && mediaRecorder.state === "paused" && mediaRecorder.resume) {
                mediaRecorder.resume();
            }
        } catch (error) {
            console.error(error);
        }

        try {
            window.speechSynthesis?.resume();
        } catch (error) {
            console.error(error);
        }

        startSpeechRecognition();
    }
}

function finishFullPairSimulation() {
    clearInterval(fullPairTimer);
    fullPairTimer = null;

    isFullPairRunning = false;
    isFullPairPaused = false;
    activeNameCapture = "";

    stopSpeechRecognition();

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }

    startRecordingButton.disabled = false;
    pauseResumeButton.disabled = true;
    pauseResumeButton.textContent = "Pause";
    stopRecordingButton.disabled = true;

    setStageNavigationEnabled(true);

    alert("Full speaking test finished. Recording saved.");
}

function stopFullPairSimulationManually() {
    const confirmStop = confirm("Do you want to stop the full test now?");

    if (!confirmStop) return;

    clearInterval(fullPairTimer);
    fullPairTimer = null;

    fullPairRunToken++;
    isFullPairRunning = false;
    isFullPairPaused = false;
    activeNameCapture = "";

    try {
        window.speechSynthesis?.cancel();
    } catch (error) {
        console.error(error);
    }

    stopSpeechRecognition();

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        try {
            mediaRecorder.stop();
        } catch (error) {
            console.error(error);
        }
    }

    startRecordingButton.disabled = false;
    pauseResumeButton.disabled = true;
    pauseResumeButton.textContent = "Pause";
    stopRecordingButton.disabled = true;

    setStageNavigationEnabled(true);
}

function repeatAttempt() {
    if (isCurrentlyRecording() || isFullPairRunning) {
        alert("Stop the current recording before repeating the attempt.");
        return;
    }

    const confirmRepeat = confirm("Do you want to repeat the full test? The previous audio will be replaced when you start a new attempt.");

    if (!confirmRepeat) return;

    resetFullPairAudio();

    currentStageIndex = 0;
    candidate1Name = "Candidate 1";
    candidate2Name = "Candidate 2";
    candidate1NameInput.value = "";
    candidate2NameInput.value = "";
    transcriptionInput.value = "";

    autoGoToStage(0);

    startRecordingButton.disabled = false;
    pauseResumeButton.disabled = true;
    stopRecordingButton.disabled = true;
    repeatAttemptButton.disabled = true;
}

function resetFullPairAudio() {
    if (continuousRecordingState && continuousRecordingState.recordedAudioUrl) {
        URL.revokeObjectURL(continuousRecordingState.recordedAudioUrl);
    }

    continuousRecordingState = {
        recordedBlob: null,
        recordedFile: null,
        recordedAudioUrl: null,
        transcription: ""
    };

    resetAudioProgress();

    playRecordingButton.disabled = true;
    downloadButton.disabled = true;
    shareButton.disabled = true;
    emailButton.disabled = true;
}

/* EXAMINER VOICE */

function speakText(text, token) {
    return new Promise(resolve => {
        if (!text || !window.speechSynthesis) {
            resolve();
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-GB";
        utterance.rate = 0.95;
        utterance.pitch = 1;

        let finished = false;

        const done = () => {
            if (finished) return;

            finished = true;
            resolve();
        };

        utterance.onend = done;
        utterance.onerror = done;

        const fallbackTime = Math.max(1800, text.split(/\s+/).length * 430);

        setTimeout(() => {
            if (token !== fullPairRunToken) {
                done();
                return;
            }

            done();
        }, fallbackTime);

        window.speechSynthesis.speak(utterance);
    });
}

/* AUDIO PLAYER */

function prepareAudioPlayerForCurrentContext() {
    stopPlayerIfNeeded();

    const audioUrl = fullPairSimulation
        ? continuousRecordingState?.recordedAudioUrl
        : getCurrentStageState()?.recordedAudioUrl;

    if (!audioUrl) return;

    audioPlayer = new Audio(audioUrl);
    audioProgressBox.classList.remove("hidden");

    back10Button.disabled = false;
    playPauseAudioButton.disabled = false;
    forward10Button.disabled = false;

    playPauseAudioButton.textContent = "▶ Play";
    playRecordingButton.textContent = "Listen";

    audioPlayer.addEventListener("loadedmetadata", () => {
        audioProgress.max = Math.floor(audioPlayer.duration || 0);
        audioDuration.textContent = formatTime(audioPlayer.duration || 0);
        audioCurrentTime.textContent = "00:00";
        audioProgress.value = 0;
    });

    audioPlayer.addEventListener("timeupdate", () => {
        audioProgress.value = Math.floor(audioPlayer.currentTime || 0);
        audioCurrentTime.textContent = formatTime(audioPlayer.currentTime || 0);
    });

    audioPlayer.addEventListener("play", () => {
        playPauseAudioButton.textContent = "⏸ Pause";
        playRecordingButton.textContent = "Pause";
    });

    audioPlayer.addEventListener("pause", () => {
        playPauseAudioButton.textContent = "▶ Play";
        playRecordingButton.textContent = "Listen";
    });

    audioPlayer.addEventListener("ended", () => {
        audioProgress.value = Math.floor(audioPlayer.duration || 0);
        audioCurrentTime.textContent = formatTime(audioPlayer.duration || 0);
        playPauseAudioButton.textContent = "▶ Play";
        playRecordingButton.textContent = "Listen";
    });
}

function toggleAudioPlayback() {
    const audioUrl = fullPairSimulation
        ? continuousRecordingState?.recordedAudioUrl
        : getCurrentStageState()?.recordedAudioUrl;

    if (!audioUrl) {
        alert("There is no recording yet.");
        return;
    }

    if (!audioPlayer) {
        prepareAudioPlayerForCurrentContext();
    }

    if (audioPlayer.paused) {
        audioPlayer.play();
    } else {
        audioPlayer.pause();
    }
}

function seekAudio() {
    if (!audioPlayer) return;

    audioPlayer.currentTime = Number(audioProgress.value);
}

function seekAudioBySeconds(seconds) {
    if (!audioPlayer) return;

    const duration = audioPlayer.duration || 0;
    const newTime = Math.min(Math.max(audioPlayer.currentTime + seconds, 0), duration);

    audioPlayer.currentTime = newTime;
    audioProgress.value = Math.floor(newTime);
    audioCurrentTime.textContent = formatTime(newTime);
}

/* TIMER */

function startTimer() {
    stopTimer();

    timerInterval = setInterval(() => {
        secondsRemaining--;
        updateTimerDisplay();

        if (secondsRemaining <= 0) {
            stopNormalRecording();
            alert("Time is over. Recording stopped.");
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;

    timerDisplay.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    if (secondsRemaining <= WARNING_TIME_SECONDS && secondsRemaining > 0) {
        timerDisplay.classList.add("warning-time");
    } else {
        timerDisplay.classList.remove("warning-time");
    }
}

function formatTime(totalSeconds) {
    const safeSeconds = Math.floor(totalSeconds || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function resetAudioProgress() {
    audioProgressBox.classList.add("hidden");
    audioProgress.value = 0;
    audioProgress.max = 100;
    audioCurrentTime.textContent = "00:00";
    audioDuration.textContent = "00:00";

    back10Button.disabled = true;
    playPauseAudioButton.disabled = true;
    forward10Button.disabled = true;
    playPauseAudioButton.textContent = "▶ Play";
    playRecordingButton.textContent = "Listen";
}

function resetTranscriptionStatus() {
    recognitionFinalText = "";
    recognitionBaseText = "";
    transcriptionStatus.textContent = "The app will try to transcribe automatically while recording.";
    transcriptionStatus.className = "small-note";
}

/* SPEECH RECOGNITION */

function startSpeechRecognition() {
    const SpeechRecognitionConstructor =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
        transcriptionStatus.textContent =
            "Automatic transcription is not available in this browser. The student can write notes manually.";
        transcriptionStatus.className = "small-note transcription-warning";
        return;
    }

    recognitionFinalText = "";
    recognitionBaseText = transcriptionInput.value.trim();

    speechRecognition = new SpeechRecognitionConstructor();
    speechRecognition.lang = "en-GB";
    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;

    speechRecognition.onstart = () => {
        isSpeechRecognitionRunning = true;
        transcriptionStatus.textContent = "Automatic transcription is active while recording.";
        transcriptionStatus.className = "small-note transcription-active";
    };

    speechRecognition.onresult = event => {
        let interimText = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
                recognitionFinalText += transcript + " ";
                handlePossibleNameTranscript(transcript);
            } else {
                interimText += transcript;
                handlePossibleNameTranscript(transcript);
            }
        }

        const parts = [];

        if (recognitionBaseText) {
            parts.push(recognitionBaseText);
        }

        if (recognitionFinalText.trim()) {
            parts.push(recognitionFinalText.trim());
        }

        if (interimText.trim()) {
            parts.push(interimText.trim());
        }

        transcriptionInput.value = parts.join("\n\n");
        saveCurrentTranscription();
    };

    speechRecognition.onerror = event => {
        transcriptionStatus.textContent =
            "Automatic transcription stopped or could not continue. The audio will still be saved.";
        transcriptionStatus.className = "small-note transcription-warning";
        console.error("Speech recognition error:", event.error);
    };

    speechRecognition.onend = () => {
        isSpeechRecognitionRunning = false;

        if ((isCurrentlyRecording() || isFullPairRunning) && !isFullPairPaused) {
            try {
                speechRecognition.start();
            } catch (error) {
                console.error("Could not restart speech recognition:", error);
            }
        }
    };

    try {
        speechRecognition.start();
    } catch (error) {
        transcriptionStatus.textContent =
            "Automatic transcription could not start. The student can write notes manually.";
        transcriptionStatus.className = "small-note transcription-warning";
        console.error(error);
    }
}

function handlePossibleNameTranscript(transcript) {
    if (!activeNameCapture) return;

    const detectedName = extractName(transcript);

    if (!detectedName) return;

    if (activeNameCapture === "candidate1") {
        candidate1Name = detectedName;
        candidate1NameInput.value = detectedName;
    }

    if (activeNameCapture === "candidate2") {
        candidate2Name = detectedName;
        candidate2NameInput.value = detectedName;
    }

    refreshTextOnly();
}

function extractName(text) {
    let cleaned = String(text || "")
        .toLowerCase()
        .replace(/[.,!?¿¡]/g, "")
        .trim();

    if (!cleaned) return "";

    if (cleaned.includes("what") && cleaned.includes("name")) return "";
    if (cleaned.includes("candidate")) return "";

    cleaned = cleaned
        .replace(/^my name is /, "")
        .replace(/^my names /, "")
        .replace(/^i am /, "")
        .replace(/^i'm /, "")
        .replace(/^im /, "")
        .replace(/^it is /, "")
        .replace(/^it's /, "")
        .trim();

    const words = cleaned.split(/\s+/).filter(Boolean);

    if (words.length === 0) return "";

    const blockedWords = ["yes", "no", "thank", "thanks", "hello", "hi"];

    if (blockedWords.includes(words[0])) return "";

    return words
        .slice(0, 2)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function stopSpeechRecognition() {
    if (speechRecognition && isSpeechRecognitionRunning) {
        try {
            speechRecognition.stop();
        } catch (error) {
            console.error("Could not stop speech recognition:", error);
        }
    }

    isSpeechRecognitionRunning = false;
}

/* SHARE / EMAIL / DOWNLOAD */

function buildAudioFileName(stageId) {
    const sessionName = getStudentName()
        .replaceAll(" ", "_")
        .replace(/[^\w-]/g, "");

    const testId = currentTest?.id || "speaking_test";

    return `${sessionName}_${testId}_${stageId}_${Date.now()}.webm`;
}

function getStudentName() {
    return localStorage.getItem("studentName") || "Student";
}

function buildEmailSubject() {
    return `FCE Speaking - ${currentTest?.partTitle || currentPartInfo?.title || ""} - ${currentTest?.title || ""} - ${getStudentName()}`;
}

function buildEmailBody() {
    saveCurrentTranscription();

    let body = "";

    body += `Session: ${getStudentName()}\n`;
    body += `Part: ${currentTest?.partTitle || currentPartInfo?.title || ""}\n`;
    body += `Test: ${currentTest?.title || ""}\n`;

    if (fullPairSimulation) {
        body += `Mode: Full pair simulation\n`;
        body += `Attempt number: ${attemptNumber}\n`;
        body += `Candidate 1: ${candidate1Name}\n`;
        body += `Candidate 2: ${candidate2Name}\n`;
    } else {
        body += `Mode: Stage-by-stage practice\n`;

        if (currentCandidate) {
            body += `Candidate role: ${currentCandidate}\n`;
        }
    }

    body += "\n";

    currentStages.forEach((stage, index) => {
        body += `====================================\n`;
        body += `Stage ${index + 1}: ${replaceNames(stage.title)}\n`;

        if (stage.speaker) {
            body += `Speaker: ${replaceNames(stage.speaker)}\n`;
        }

        body += `Time: ${formatTime(getTotalPracticeTime(stage))}\n\n`;

        if (stage.examinerPrompt) {
            body += `Examiner prompt:\n${replaceNames(stage.examinerPrompt)}\n\n`;
        }

        body += "Questions:\n";

        stage.questions.forEach(question => {
            body += `- ${replaceNames(question)}\n`;
        });

        body += "\n";
    });

    body += "====================================\n";
    body += "Transcription / Notes:\n\n";

    if (fullPairSimulation) {
        body += continuousRecordingState?.transcription?.trim()
            ? continuousRecordingState.transcription.trim()
            : "No transcription added yet.";
    } else {
        currentStages.forEach((stage, index) => {
            const state = stageStates[stage.id];

            body += `Stage ${index + 1}: ${replaceNames(stage.title)}\n`;

            if (state && state.transcription && state.transcription.trim()) {
                body += `${state.transcription.trim()}\n\n`;
            } else {
                body += "No transcription added yet.\n\n";
            }
        });
    }

    body += "\n\nAudio file:\n";

    const files = getRecordedFiles();

    if (files.length > 0) {
        files.forEach(file => {
            body += `${file.name}\n`;
        });
    } else {
        body += "No audio recorded.\n";
    }

    body += "\nImportant: Gmail web may not attach the audio automatically. Please attach the audio manually if needed.\n";

    return body;
}

function getRecordedFiles() {
    saveCurrentTranscription();

    if (fullPairSimulation) {
        return continuousRecordingState && continuousRecordingState.recordedFile
            ? [continuousRecordingState.recordedFile]
            : [];
    }

    return currentStages
        .map(stage => stageStates[stage.id])
        .filter(state => state && state.recordedFile)
        .map(state => state.recordedFile);
}

function updateGlobalActionButtons() {
    const recordedFiles = getRecordedFiles();

    let canSend = recordedFiles.length > 0;

    const shouldRequireAllStages =
        !fullPairSimulation &&
        (currentPart === "part2" || currentPart === "part3") &&
        currentStages.length > 1;

    if (shouldRequireAllStages) {
        canSend = currentStages.every(stage => {
            const state = stageStates[stage.id];
            return state && state.recordedFile;
        });
    }

    shareButton.disabled = !canSend;
    emailButton.disabled = !canSend;
    repeatAttemptButton.disabled = !canSend || !fullPairSimulation;
}

async function shareRecordings() {
    const recordedFiles = getRecordedFiles();

    if (recordedFiles.length === 0) {
        alert("Record first.");
        return;
    }

    const textFile = new File(
        [buildEmailBody()],
        "speaking_transcription.txt",
        { type: "text/plain" }
    );

    const filesToShare = [...recordedFiles, textFile];

    if (navigator.canShare && navigator.canShare({ files: filesToShare })) {
        try {
            await navigator.share({
                title: buildEmailSubject(),
                text: buildEmailBody(),
                files: filesToShare
            });
        } catch (error) {
            console.error(error);
        }
    } else {
        alert("This device does not support sharing files from the browser. Download the audio and send it by email manually.");
    }
}

function openGmailDraft() {
    const subject = encodeURIComponent(buildEmailSubject());
    const body = encodeURIComponent(buildEmailBody());

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;

    const newWindow = window.open(gmailUrl, "_blank");

    if (!newWindow) {
        window.location.href = gmailUrl;
    }
}

function downloadCurrentRecording() {
    let audioUrl = null;
    let fileName = "";

    if (fullPairSimulation) {
        audioUrl = continuousRecordingState?.recordedAudioUrl;
        fileName = continuousRecordingState?.recordedFile?.name || buildAudioFileName("complete_full_test");
    } else {
        const state = getCurrentStageState();
        audioUrl = state?.recordedAudioUrl;
        fileName = state?.recordedFile?.name || buildAudioFileName(getCurrentStage()?.id || "stage");
    }

    if (!audioUrl) {
        alert("Record first.");
        return;
    }

    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/* ATTEMPTS */

function getAttemptKey() {
    return `attempts_${getStudentName()}_${currentTest?.id || "test"}`;
}

function loadAttemptCount() {
    return Number(localStorage.getItem(getAttemptKey()) || "0");
}

function incrementAttemptCount() {
    const newAttempt = loadAttemptCount() + 1;
    localStorage.setItem(getAttemptKey(), String(newAttempt));
    return newAttempt;
}

function updateAttemptInfo() {
    attemptInfo.textContent = `Attempt ${attemptNumber}`;
}

/* HELPERS */

function isCurrentlyRecording() {
    return mediaRecorder && mediaRecorder.state === "recording";
}

function setStageNavigationEnabled(enabled) {
    const buttons = stageNavigation.querySelectorAll("button");

    buttons.forEach(button => {
        button.disabled = !enabled || fullPairSimulation;
    });

    previousStageButton.disabled = !enabled || fullPairSimulation || currentStageIndex === 0;
    nextStageButton.disabled = !enabled || fullPairSimulation || currentStageIndex === currentStages.length - 1;
    backToTestsButton.disabled = !enabled;
}

function stopPlayerIfNeeded() {
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer = null;
    }
}

function stopActiveStream() {
    if (activeRecordingStream) {
        activeRecordingStream.getTracks().forEach(track => track.stop());
        activeRecordingStream = null;
    }
}

function stopEverything() {
    stopTimer();

    clearInterval(fullPairTimer);
    fullPairTimer = null;

    fullPairRunToken++;
    isFullPairRunning = false;
    isFullPairPaused = false;
    activeNameCapture = "";

    try {
        window.speechSynthesis?.cancel();
    } catch (error) {
        console.error(error);
    }

    stopSpeechRecognition();

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        try {
            mediaRecorder.stop();
        } catch (error) {
            console.error(error);
        }
    }

    stopActiveStream();
    stopPlayerIfNeeded();
}

function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("service-worker.js").catch(error => {
            console.error("Service worker registration failed:", error);
        });
    }
}
