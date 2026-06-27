const App = (() => {
  const themeKey = "stretch-tracker-theme";
  let intervalId = null;
  let wakeLock = null;

  const state = {
    routines: Storage.loadRoutines(),
    history: Storage.loadHistory(),
    settings: Storage.loadSettings(),
    view: "home",
    builderExercises: [emptyBuilderExercise()],
    player: {
      routineId: null,
      stepIndex: 0,
      remaining: 0,
      running: false,
      startedAt: null
    }
  };

  function init() {
    bindStaticEvents();
    initTheme();
    render();
  }

  function bindStaticEvents() {
    document.getElementById("create-routine-button").addEventListener("click", openBuilder);
    document.querySelector("[data-action='cancel-builder']").addEventListener("click", backHome);
    document.getElementById("add-exercise-button").addEventListener("click", addBuilderExercise);
    document.getElementById("routine-form").addEventListener("submit", saveRoutine);
  }

  function render() {
    UI.render(state, {
      addBuilderExercise,
      backHome,
      moveBuilderExercise,
      nextStep,
      previousStep,
      removeBuilderExercise,
      startRoutine,
      togglePlayer,
      updateSetting,
      updateBuilderExercise
    });
  }

  function openBuilder() {
    state.view = "builder";
    state.builderExercises = [emptyBuilderExercise()];
    document.getElementById("routine-form").reset();
    document.getElementById("routine-color").value = "#2f7d68";
    render();
  }

  function backHome() {
    stopTimer();
    releaseWakeLock();
    state.view = "home";
    state.player.running = false;
    render();
  }

  function addBuilderExercise() {
    state.builderExercises.push(emptyBuilderExercise());
    render();
  }

  function updateBuilderExercise(index, field, value) {
    const exercise = state.builderExercises[index];
    if (!exercise) return;

    exercise[field] = field === "duration" ? Number(value) : value;
  }

  function removeBuilderExercise(index) {
    if (state.builderExercises.length === 1) return;
    state.builderExercises.splice(index, 1);
    render();
  }

  function moveBuilderExercise(from, to) {
    if (from === to || Number.isNaN(from) || Number.isNaN(to)) return;
    const [item] = state.builderExercises.splice(from, 1);
    state.builderExercises.splice(to, 0, item);
    render();
  }

  function saveRoutine(event) {
    event.preventDefault();

    const draft = {
      name: document.getElementById("routine-name").value,
      icon: document.getElementById("routine-icon").value.trim().toUpperCase() || "ST",
      color: document.getElementById("routine-color").value,
      exercises: state.builderExercises.filter((exercise) => {
        return exercise.name.trim() && Number(exercise.duration) > 0;
      })
    };

    if (!draft.name.trim() || draft.exercises.length === 0) return;

    state.routines = Routines.addRoutine(state.routines, draft);
    Storage.saveRoutines(state.routines);
    state.view = "home";
    render();
  }

  function updateSetting(key, value) {
    state.settings[key] = value;
    Storage.saveSettings(state.settings);

    if (key === "keepAwake" && value && state.view === "player") requestWakeLock();
    if (key === "keepAwake" && !value) releaseWakeLock();

    render();
  }

  function startRoutine(routineId) {
    const routine = Routines.find(state.routines, routineId);
    const firstStep = Routines.expandSteps(routine)[0];
    if (!routine || !firstStep) return;

    stopTimer();
    state.view = "player";
    state.player = {
      routineId,
      stepIndex: 0,
      remaining: firstStep.duration,
      running: state.settings.autoplay,
      startedAt: new Date().toISOString()
    };

    if (state.player.running) startTimer();
    requestWakeLock();
    render();
  }

  function togglePlayer() {
    state.player.running = !state.player.running;
    state.player.running ? startTimer() : stopTimer();
    render();
  }

  function startTimer() {
    stopTimer();
    intervalId = setInterval(tick, 1000);
  }

  function stopTimer() {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  }

  function tick() {
    if (!state.player.running) return;

    state.player.remaining -= 1;

    if (state.player.remaining <= 0) {
      beep();
      nextStep();
      return;
    }

    if (state.settings.countdown && state.player.remaining <= 3) {
      beep(520, 0.04);
    }

    render();
  }

  function nextStep() {
    const routine = Routines.find(state.routines, state.player.routineId);
    const steps = Routines.expandSteps(routine);
    const nextIndex = state.player.stepIndex + 1;

    if (nextIndex >= steps.length) {
      completeRoutine(routine);
      return;
    }

    state.player.stepIndex = nextIndex;
    state.player.remaining = steps[nextIndex].duration;
    if (state.player.running) startTimer();
    render();
  }

  function previousStep() {
    const routine = Routines.find(state.routines, state.player.routineId);
    const steps = Routines.expandSteps(routine);
    const previousIndex = Math.max(0, state.player.stepIndex - 1);

    state.player.stepIndex = previousIndex;
    state.player.remaining = steps[previousIndex].duration;
    if (state.player.running) startTimer();
    render();
  }

  function completeRoutine(routine) {
    stopTimer();
    beep(720, 0.18);
    state.history.unshift({
      id: Routines.createId("history"),
      date: new Date().toISOString().slice(0, 10),
      routineId: routine.id,
      routineName: routine.name,
      duration: Routines.getRoutineDuration(routine),
      completed: true,
      startedAt: state.player.startedAt,
      finishedAt: new Date().toISOString()
    });
    Storage.saveHistory(state.history);
    releaseWakeLock();
    state.view = "home";
    state.player.running = false;
    render();
  }

  function beep(frequency = 640, duration = 0.1) {
    if (state.settings.vibration && navigator.vibrate) {
      navigator.vibrate(80);
    }

    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!state.settings.sound || !AudioCtor) return;

    const audio = new AudioCtor();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    gain.connect(audio.destination);
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, audio.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }

  async function requestWakeLock() {
    if (!state.settings.keepAwake || !navigator.wakeLock) return;

    try {
      wakeLock = await navigator.wakeLock.request("screen");
    } catch (error) {
      wakeLock = null;
    }
  }

  async function releaseWakeLock() {
    if (!wakeLock) return;

    try {
      await wakeLock.release();
    } catch (error) {
      // Ignore unsupported release failures.
    }

    wakeLock = null;
  }

  function initTheme() {
    const savedTheme = localStorage.getItem(themeKey);
    setTheme(savedTheme === "dark");

    document.getElementById("theme-toggle").addEventListener("click", () => {
      const nextUseDark = !document.body.classList.contains("dark-theme");
      setTheme(nextUseDark);
      localStorage.setItem(themeKey, nextUseDark ? "dark" : "light");
    });
  }

  function setTheme(useDark) {
    document.body.classList.toggle("dark-theme", useDark);
  }

  function emptyBuilderExercise() {
    return {
      name: "",
      duration: 30,
      repeat: "bothSides",
      notes: ""
    };
  }

  return {
    init
  };
})();

document.addEventListener("DOMContentLoaded", App.init);
