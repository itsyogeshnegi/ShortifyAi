import fs from 'fs';
import path from 'path';

const MAX_LOGS = 5;
const logFilePath = path.resolve('.data/system_logs.json');

function loadLogsFromDisk() {
  try {
    if (fs.existsSync(logFilePath)) {
      const data = fs.readFileSync(logFilePath, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed.slice(0, MAX_LOGS);
    }
  } catch {}
  return [];
}

const bugLogs = loadLogsFromDisk();

function saveLogsToDisk() {
  try {
    const dir = path.dirname(logFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(logFilePath, JSON.stringify(bugLogs, null, 2), 'utf8');
  } catch {}
}

export function recordBug({ source = 'System', message, stack, metadata = {} }) {
  if (!message) return;

  const entry = {
    id: `bug-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    formattedTime: new Date().toLocaleString(),
    source,
    message: String(message || 'Unknown error'),
    stack: stack ? String(stack) : null,
    metadata: metadata || {}
  };

  bugLogs.unshift(entry);
  if (bugLogs.length > MAX_LOGS) {
    bugLogs.splice(MAX_LOGS);
  }

  saveLogsToDisk();
  return entry;
}

export function getLatestBugs() {
  return [...bugLogs];
}

export function clearBugLogs() {
  bugLogs.length = 0;
  saveLogsToDisk();
  return true;
}
