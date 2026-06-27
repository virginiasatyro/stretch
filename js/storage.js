const Storage = (() => {
  const routinesKey = "stretch-tracker-routines";
  const historyKey = "stretch-tracker-history";
  const settingsKey = "stretch-tracker-settings";
  const versionKey = "stretch-tracker-version";

  const defaultSettings = {
    sound: true,
    vibration: true,
    countdown: true,
    autoplay: true,
    keepAwake: false
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getCurrentVersion() {
    return window.DEFAULT_ROUTINES_VERSION || 1;
  }

  function loadRoutines() {
    const defaults = clone(window.DEFAULT_ROUTINES || []);
    const saved = localStorage.getItem(routinesKey);
    const savedVersion = localStorage.getItem(versionKey);
    const currentVersion = String(getCurrentVersion());

    if (!saved || savedVersion !== currentVersion) {
      saveRoutines(defaults);
      return defaults;
    }

    try {
      return JSON.parse(saved);
    } catch (error) {
      saveRoutines(defaults);
      return defaults;
    }
  }

  function saveRoutines(routines) {
    localStorage.setItem(routinesKey, JSON.stringify(routines));
    localStorage.setItem(versionKey, String(getCurrentVersion()));
  }

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(historyKey)) || [];
    } catch (error) {
      return [];
    }
  }

  function saveHistory(history) {
    localStorage.setItem(historyKey, JSON.stringify(history));
  }

  function loadSettings() {
    try {
      return {
        ...defaultSettings,
        ...(JSON.parse(localStorage.getItem(settingsKey)) || {})
      };
    } catch (error) {
      return { ...defaultSettings };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }

  return {
    loadHistory,
    loadRoutines,
    loadSettings,
    saveHistory,
    saveRoutines,
    saveSettings
  };
})();
