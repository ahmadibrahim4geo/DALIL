/* DALIL workspace reducer. No browser APIs: the service worker owns persistence. */
(function (root) {
  "use strict";
  const copy = (value) => value == null ? null : JSON.parse(JSON.stringify(value));
  const empty = () => ({ schemaVersion: 1, revision: 0, importedStudyArea: null,
    drawnStudyArea: null, activeAreaId: null, cells: [] });
  function normalize(value) {
    const state = { ...empty(), ...copy(value || {}) };
    state.schemaVersion = 1;
    state.revision = Number.isSafeInteger(state.revision) && state.revision >= 0 ? state.revision : 0;
    state.cells = Array.isArray(state.cells) ? state.cells : [];
    const areas = [state.importedStudyArea, state.drawnStudyArea].filter(Boolean);
    if (!areas.some(area => area.id === state.activeAreaId)) state.activeAreaId = areas.length ? areas[areas.length - 1].id : null;
    if (!state.activeAreaId) state.cells = [];
    return state;
  }
  function getActiveArea(value) {
    const state = normalize(value);
    return [state.importedStudyArea, state.drawnStudyArea].find(area => area && area.id === state.activeAreaId) || null;
  }
  function applyOperation(current, operation, snapshot) {
    let next = normalize(current);
    const revision = next.revision + 1;
    switch (operation) {
      case "SAVE_WORKSPACE": next = normalize(snapshot); break;
      case "REMOVE_IMPORTED": next.importedStudyArea = null; next.cells = []; break;
      case "REMOVE_DRAWING": next.drawnStudyArea = null; next.cells = []; break;
      case "CLEAR_GRID": next.cells = []; break;
      case "CLEAR_AREA": next.importedStudyArea=null;next.drawnStudyArea=null;next.activeAreaId=null;next.cells=[];break;
      case "RESET_WORKSPACE": next = empty(); break;
      default: throw new Error("Unsupported workspace operation: " + operation);
    }
    next = normalize(next);
    next.revision = revision;
    return next;
  }
  // Migrates the old single-area keys once; a saved empty workspace overrides them.
  function fromStorage(items) {
    if (items && items.workspaceState) return normalize(items.workspaceState);
    const area = copy(items && items.savedStudyArea);
    const state = empty();
    if (area) {
      area.id = area.id || "legacy-area";
      if (area.source && area.source.kind === "drawing" || area.type === "BBox") state.drawnStudyArea = area;
      else state.importedStudyArea = area;
      state.activeAreaId = area.id;
      state.cells = copy(items.savedCells) || [];
    }
    return normalize(state);
  }
  const api = { empty, normalize, getActiveArea, applyOperation, fromStorage };
  root.WorkspaceState = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : self);
