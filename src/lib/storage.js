export function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readString(key, fallback = '') {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeString(key, value) {
  window.localStorage.setItem(key, value);
}

export function clearAppStorage() {
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith('se_'))
    .forEach((key) => window.localStorage.removeItem(key));
}
