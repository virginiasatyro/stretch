const UI = (() => {
  let timers = {};

  function render(state, actions) {
    const activeWorkout = Workouts.getActive(state.workouts);
    document.getElementById("active-workout-name").textContent = activeWorkout.name;

    renderTabs(activeWorkout, state.selectedDayId, actions);
    renderCurrentDay(activeWorkout, state.selectedDayId, actions);
    renderOldWorkouts(Workouts.getOld(state.workouts));
  }

  function renderTabs(activeWorkout, selectedDayId, actions) {
    const tabs = document.getElementById("day-tabs");
    tabs.innerHTML = "";

    activeWorkout.workouts.forEach((day) => {
      const button = document.createElement("button");
      button.className = `day-tab day-${day.id.toLowerCase()}${day.id === selectedDayId ? " is-active" : ""}`;
      button.type = "button";
      button.textContent = day.id;
      button.setAttribute("aria-label", day.name);
      button.addEventListener("click", () => actions.selectDay(day.id));
      tabs.appendChild(button);
    });
  }

  function renderCurrentDay(activeWorkout, selectedDayId, actions) {
    const container = document.getElementById("current-day");
    const day = Workouts.findDay(activeWorkout, selectedDayId);

    container.innerHTML = "";

    const title = document.createElement("h2");
    title.className = "workout-title";
    title.textContent = day.name;
    container.appendChild(title);

    const list = document.createElement("div");
    list.className = "exercise-list";

    day.exercises.forEach((exercise) => {
      list.appendChild(renderExercise(activeWorkout.id, day.id, exercise, false, actions));
    });

    container.appendChild(list);
  }

  function renderExercise(workoutId, dayId, exercise, readonly, actions) {
    const card = document.createElement("article");
    card.className = "exercise-card";

    const lastWeight = Workouts.getLastWeight(exercise);
    const historyId = `history-${workoutId}-${dayId}-${exercise.id}`;
    const timerId = `timer-${workoutId}-${dayId}-${exercise.id}`;

    card.innerHTML = `
      <div class="exercise-header">
        <div>
          <h3 class="exercise-title">${escapeHtml(exercise.name)}</h3>
          <p class="exercise-meta">${exercise.sets}x${escapeHtml(exercise.reps)} · Descanso: ${exercise.rest} s</p>
        </div>
        <div class="last-weight">
          <span>Ultimo peso</span>
          <strong>${lastWeight === null ? "-" : `${lastWeight} kg`}</strong>
        </div>
      </div>
    `;

    if (!readonly) {
      const form = document.createElement("form");
      form.className = "weight-form";
      form.innerHTML = `
        <input class="weight-input" type="number" min="0" step="0.5" inputmode="decimal" placeholder="Novo peso">
        <button class="save-button" type="submit">Salvar</button>
      `;

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const input = form.querySelector("input");
        const value = Number(input.value);

        if (!Number.isFinite(value) || value <= 0) {
          input.focus();
          return;
        }

        actions.saveWeight(workoutId, dayId, exercise.id, value);
      });

      card.appendChild(form);
    } else {
      const note = document.createElement("p");
      note.className = "readonly-note";
      note.textContent = "Somente visualizacao.";
      card.appendChild(note);
    }

    const actionsRow = document.createElement("div");
    actionsRow.className = "exercise-actions";

    const historyButton = document.createElement("button");
    historyButton.className = "history-button";
    historyButton.type = "button";
    historyButton.textContent = "Historico";
    historyButton.addEventListener("click", () => {
      document.getElementById(historyId).classList.toggle("is-open");
    });
    actionsRow.appendChild(historyButton);

    // Descanso pausado por enquanto.
    // if (!readonly) {
    //   const timerButton = document.createElement("button");
    //   timerButton.className = "timer-button";
    //   timerButton.type = "button";
    //   timerButton.textContent = "Iniciar descanso";
    //   timerButton.addEventListener("click", () => startTimer(timerId, exercise.rest));
    //   actionsRow.appendChild(timerButton);
    // }

    card.appendChild(actionsRow);

    // const timerStatus = document.createElement("p");
    // timerStatus.className = "timer-status";
    // timerStatus.id = timerId;
    // card.appendChild(timerStatus);

    const history = document.createElement("div");
    history.className = "history";
    history.id = historyId;
    history.appendChild(renderHistory(exercise.history));
    card.appendChild(history);

    return card;
  }

  function renderHistory(history) {
    if (!history.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Nenhum peso registrado.";
      return empty;
    }

    const list = document.createElement("ul");
    list.className = "history-list";

    history.forEach((entry) => {
      const item = document.createElement("li");
      item.innerHTML = `<span>${Workouts.formatDate(entry.date)}</span><strong>${entry.weight} kg</strong>`;
      list.appendChild(item);
    });

    return list;
  }

  function renderOldWorkouts(oldWorkouts) {
    const container = document.getElementById("old-workouts");
    container.innerHTML = "";

    if (!oldWorkouts.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Nenhum treino antigo cadastrado.";
      container.appendChild(empty);
      return;
    }

    oldWorkouts.forEach((workout) => {
      const panel = document.createElement("article");
      panel.className = "old-workout-panel";

      const contentId = `old-${workout.id}`;
      const button = document.createElement("button");
      button.className = "old-button";
      button.type = "button";
      button.innerHTML = `<span>${escapeHtml(workout.name)}</span><span>Ver</span>`;
      button.addEventListener("click", () => {
        document.getElementById(contentId).classList.toggle("is-open");
      });

      const content = document.createElement("div");
      content.className = "old-content";
      content.id = contentId;

      workout.workouts.forEach((day) => {
        const dayBlock = document.createElement("section");
        dayBlock.className = "old-day";
        dayBlock.innerHTML = `<h3>${escapeHtml(day.name)}</h3>`;

        day.exercises.forEach((exercise) => {
          const item = document.createElement("div");
          item.className = "old-exercise";
          item.appendChild(renderExercise(workout.id, day.id, exercise, true, {}));
          dayBlock.appendChild(item);
        });

        content.appendChild(dayBlock);
      });

      panel.appendChild(button);
      panel.appendChild(content);
      container.appendChild(panel);
    });
  }

  function startTimer(timerId, seconds) {
    const element = document.getElementById(timerId);
    if (!element) return;

    clearInterval(timers[timerId]);

    let remaining = seconds;
    element.textContent = `${remaining} s`;

    timers[timerId] = setInterval(() => {
      remaining -= 1;

      if (remaining <= 0) {
        clearInterval(timers[timerId]);
        element.textContent = "Descanso finalizado!";
        return;
      }

      element.textContent = `${remaining} s`;
    }, 1000);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  return {
    render
  };
})();
