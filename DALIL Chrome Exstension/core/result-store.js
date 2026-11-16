/* Durable record storage for large surveys: IndexedDB when available.
 * Falls back to the caller's chrome.storage.local path when IndexedDB is absent
 * (unit-test harnesses) so the service worker keeps one source of truth in memory. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ResultStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  const DB_NAME = 'dalil-state';
  const DB_VERSION = 1;
  const STORE = 'records';
  const KEY = 'results';
  let connection = null;

  function available() {
    return typeof root.indexedDB !== 'undefined' && !!root.indexedDB;
  }

  function open() {
    if (!available()) return Promise.resolve(null);
    if (connection) return connection;
    connection = new Promise(resolve => {
      let request;
      try {
        request = root.indexedDB.open(DB_NAME, DB_VERSION);
      } catch (_) {
        resolve(null);
        return;
      }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (db && !db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
    return connection;
  }

  async function save(records) {
    if (!Array.isArray(records)) return false;
    const db = await open();
    if (!db) return false;
    return new Promise(resolve => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(records, KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (_) {
        resolve(false);
      }
    });
  }

  async function load() {
    const db = await open();
    if (!db) return null;
    return new Promise(resolve => {
      try {
        const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
        request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : null);
        request.onerror = () => resolve(null);
      } catch (_) {
        resolve(null);
      }
    });
  }

  async function clear() {
    const db = await open();
    if (!db) return false;
    return new Promise(resolve => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (_) {
        resolve(false);
      }
    });
  }

  return { available, save, load, clear, DB_NAME, DB_VERSION, STORE, KEY };
});
