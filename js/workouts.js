const Routines = (() => {
  function createId(prefix = "id") {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function find(routines, routineId) {
    return routines.find((routine) => routine.id === routineId) || routines[0] || null;
  }

  function expandSteps(routine) {
    if (!routine) return [];

    return routine.exercises.flatMap((exercise) => {
      if (exercise.repeat === "bothSides") {
        return [
          { ...exercise, side: "left", stepId: `${exercise.id}-left` },
          { ...exercise, side: "right", stepId: `${exercise.id}-right` }
        ];
      }

      return [{ ...exercise, side: "both", stepId: `${exercise.id}-both` }];
    });
  }

  function getRoutineDuration(routine) {
    return expandSteps(routine).reduce((total, step) => total + Number(step.duration || 0), 0);
  }

  function getStats(history) {
    const today = new Date().toISOString().slice(0, 10);
    const weekStart = getWeekStart(new Date());
    const completedToday = history.filter((entry) => entry.date === today).length;
    const completedThisWeek = history.filter((entry) => new Date(`${entry.date}T00:00:00`) >= weekStart).length;
    const totalMinutes = Math.round(history.reduce((total, entry) => total + entry.duration, 0) / 60);
    const counts = history.reduce((acc, entry) => {
      acc[entry.routineName] = (acc[entry.routineName] || 0) + 1;
      return acc;
    }, {});
    const mostUsedRoutine = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    return {
      completedToday,
      completedThisWeek,
      mostUsedRoutine,
      totalMinutes
    };
  }

  function getWeekStart(date) {
    const result = new Date(date);
    const day = result.getDay();
    const diff = day === 0 ? 6 : day - 1;
    result.setHours(0, 0, 0, 0);
    result.setDate(result.getDate() - diff);
    return result;
  }

  function addRoutine(routines, draft) {
    const routine = {
      id: createId("routine"),
      name: draft.name.trim(),
      icon: draft.icon || "ST",
      color: draft.color || "#2f7d68",
      exercises: draft.exercises.map((exercise) => ({
        id: createId("exercise"),
        name: exercise.name.trim(),
        duration: Number(exercise.duration),
        repeat: exercise.repeat,
        notes: exercise.notes?.trim() || ""
      }))
    };

    return [...routines, routine];
  }

  function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return minutes > 0 ? `${minutes}m ${String(rest).padStart(2, "0")}s` : `${rest}s`;
  }

  function formatClock(seconds) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  return {
    addRoutine,
    createId,
    expandSteps,
    find,
    formatClock,
    formatDuration,
    getRoutineDuration,
    getStats
  };
})();
