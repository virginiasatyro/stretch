const UI = (() => {
  function render(state, actions) {
    toggleViews(state.view);
    renderStats(state.history);
    renderRoutines(state.routines, actions);
    renderSettings(state.settings, actions);
    renderBuilder(state.builderExercises, actions);
    renderPlayer(state, actions);
  }

  function toggleViews(view) {
    document.getElementById("home-view").classList.toggle("is-hidden", view !== "home");
    document.getElementById("builder-view").classList.toggle("is-hidden", view !== "builder");
    document.getElementById("player-view").classList.toggle("is-hidden", view !== "player");
  }

  function renderStats(history) {
    const stats = Routines.getStats(history);
    const container = document.getElementById("stats");
    container.innerHTML = `
      <article><span>Completed Today</span><strong>${stats.completedToday}</strong></article>
      <article><span>This Week</span><strong>${stats.completedThisWeek}</strong></article>
      <article><span>Total Minutes</span><strong>${stats.totalMinutes}</strong></article>
      <article><span>Most Used</span><strong>${escapeHtml(stats.mostUsedRoutine)}</strong></article>
    `;
  }

  function renderRoutines(routines, actions) {
    const container = document.getElementById("routine-list");
    container.innerHTML = "";

    routines.forEach((routine) => {
      const duration = Routines.getRoutineDuration(routine);
      const card = document.createElement("article");
      card.className = "routine-card";
      card.style.setProperty("--routine-color", routine.color);
      card.innerHTML = `
        <div class="routine-mark">${escapeHtml(routine.icon)}</div>
        <div>
          <h3>${escapeHtml(routine.name)}</h3>
          <p>${routine.exercises.length} exercises &middot; ${Routines.formatDuration(duration)}</p>
        </div>
        <button class="primary-button" type="button">Start</button>
      `;
      card.querySelector("button").addEventListener("click", () => actions.startRoutine(routine.id));
      container.appendChild(card);
    });
  }

  function renderSettings(settings, actions) {
    const container = document.getElementById("settings-list");
    const options = [
      ["sound", "Sound"],
      ["vibration", "Vibration"],
      ["countdown", "Countdown 3...2...1"],
      ["autoplay", "Autoplay"],
      ["keepAwake", "Keep Screen Awake"]
    ];

    container.innerHTML = "";

    options.forEach(([key, label]) => {
      const item = document.createElement("label");
      item.className = "setting-toggle";
      item.innerHTML = `
        <span>${label}</span>
        <input type="checkbox"${settings[key] ? " checked" : ""}>
      `;
      item.querySelector("input").addEventListener("change", (event) => {
        actions.updateSetting(key, event.target.checked);
      });
      container.appendChild(item);
    });
  }

  function renderBuilder(exercises, actions) {
    const container = document.getElementById("builder-exercises");
    container.innerHTML = "";

    exercises.forEach((exercise, index) => {
      const item = document.createElement("article");
      item.className = "builder-exercise";
      item.draggable = true;
      item.dataset.index = String(index);
      item.innerHTML = `
        <button class="drag-handle" type="button" aria-label="Reordenar" title="Reordenar">&#9776;</button>
        <label>
          <span>Name</span>
          <input type="text" value="${escapeAttribute(exercise.name)}" placeholder="Hamstring Stretch" data-field="name">
        </label>
        <label>
          <span>Duration</span>
          <input type="number" min="5" step="5" value="${exercise.duration}" data-field="duration">
        </label>
        <label>
          <span>Repeat</span>
          <select data-field="repeat">
            <option value="both"${exercise.repeat === "both" ? " selected" : ""}>Both</option>
            <option value="bothSides"${exercise.repeat === "bothSides" ? " selected" : ""}>Left/Right</option>
          </select>
        </label>
        <label class="notes-field">
          <span>Notes</span>
          <input type="text" value="${escapeAttribute(exercise.notes || "")}" placeholder="Optional" data-field="notes">
        </label>
        <button class="icon-button danger" type="button" aria-label="Remover" title="Remover" data-remove>&times;</button>
      `;

      item.querySelectorAll("[data-field]").forEach((field) => {
        field.addEventListener("input", () => actions.updateBuilderExercise(index, field.dataset.field, field.value));
      });
      item.querySelector("[data-remove]").addEventListener("click", () => actions.removeBuilderExercise(index));
      item.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text/plain", String(index));
      });
      item.addEventListener("dragover", (event) => event.preventDefault());
      item.addEventListener("drop", (event) => {
        event.preventDefault();
        const from = Number(event.dataTransfer.getData("text/plain"));
        actions.moveBuilderExercise(from, index);
      });

      container.appendChild(item);
    });
  }

  function renderPlayer(state, actions) {
    const container = document.getElementById("player");
    if (state.view !== "player") {
      container.innerHTML = "";
      return;
    }

    const routine = Routines.find(state.routines, state.player.routineId);
    const steps = Routines.expandSteps(routine);
    const step = steps[state.player.stepIndex];

    if (!routine || !step) {
      container.innerHTML = "";
      return;
    }

    const progress = step.duration > 0 ? ((step.duration - state.player.remaining) / step.duration) * 100 : 0;
    const totalProgress = steps.length > 1 ? (state.player.stepIndex / (steps.length - 1)) * 100 : 100;
    const next = steps[state.player.stepIndex + 1];

    container.innerHTML = `
      <div class="player-top">
        <button class="ghost-button" type="button" data-action="backHome">Close</button>
        <span>Exercise ${state.player.stepIndex + 1} / ${steps.length}</span>
      </div>
      <article class="player-panel" style="--routine-color: ${routine.color}">
        <div class="player-routine">${escapeHtml(routine.name)}</div>
        <h2>${escapeHtml(step.name)}</h2>
        <div class="side-label">${formatSide(step.side)}</div>
        <div class="timer-display">${Routines.formatClock(state.player.remaining)}</div>
        <div class="progress-bar" aria-label="Exercise progress"><span style="width: ${progress}%"></span></div>
        <div class="progress-bar routine-progress" aria-label="Routine progress"><span style="width: ${totalProgress}%"></span></div>
        <p class="next-label">Next: ${next ? `${escapeHtml(next.name)} &middot; ${formatSide(next.side)}` : "Finish"}</p>
        <div class="player-actions">
          <button class="ghost-button" type="button" data-action="previousStep">Previous</button>
          <button class="primary-button" type="button" data-action="togglePlayer">${state.player.running ? "Pause" : "Start"}</button>
          <button class="ghost-button" type="button" data-action="nextStep">Next</button>
        </div>
      </article>
    `;

    container.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", () => actions[button.dataset.action]());
    });
  }

  function formatSide(side) {
    if (side === "left") return "LEFT";
    if (side === "right") return "RIGHT";
    return "BOTH";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }

  return {
    render
  };
})();
