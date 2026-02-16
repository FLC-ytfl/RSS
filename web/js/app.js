/* RSS-AI 前端公共逻辑：主题、日期工具、数据读取 */

const THEME_STORAGE_KEY = 'rss-ai-theme';

let cachedDataBaseUrl = null;
let cachedIndex = null;

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '');
}

function detectGitHubPagesRepo() {
  const hostMatch = window.location.hostname.match(/^([^.]+)\.github\.io$/);
  if (!hostMatch) return null;
  const owner = hostMatch[1];
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  return { owner, repo: parts[0] };
}

function getCandidateDataBases() {
  const bases = [];

  const configured = window.RSS_AI_CONFIG?.dataBaseUrl || window.RSS_AI_DATA_BASE;
  if (configured) bases.push(normalizeBaseUrl(configured));

  bases.push('data');
  if (window.location.pathname.includes('/web/')) {
    bases.push('../output');
  }

  const gh = detectGitHubPagesRepo();
  if (gh) {
    bases.push(`https://raw.githubusercontent.com/${gh.owner}/${gh.repo}/data`);
  }

  return [...new Set(bases.filter(Boolean))];
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${url}`);
  }
  return res.json();
}

async function fetchIndex(options = {}) {
  const { force = false } = options;
  if (cachedIndex && !force) return cachedIndex;

  if (cachedDataBaseUrl) {
    cachedIndex = await fetchJson(`${cachedDataBaseUrl}/index.json`);
    return cachedIndex;
  }

  let lastError = null;
  for (const base of getCandidateDataBases()) {
    try {
      const index = await fetchJson(`${normalizeBaseUrl(base)}/index.json`);
      cachedDataBaseUrl = normalizeBaseUrl(base);
      cachedIndex = index;
      return index;
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error('Failed to load index.json');
}

async function fetchDailyReport(date) {
  await fetchIndex();
  return fetchJson(`${cachedDataBaseUrl}/daily/${date}.json`);
}

async function fetchWeeklyReport(weekId) {
  await fetchIndex();
  return fetchJson(`${cachedDataBaseUrl}/weekly/${weekId}.json`);
}

function getAvailableDailyDates(index) {
  const list = index?.daily_reports || index?.reports || [];
  return list
    .map(r => (typeof r === 'string' ? r : r?.date))
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));
}

function getAvailableWeeklyIds(index) {
  const list = index?.weekly_reports || [];
  return list
    .map(r => r?.week_id)
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));
}

function getLatestDailyDate(index) {
  return getAvailableDailyDates(index)[0] || new Date().toISOString().split('T')[0];
}

function getLatestWeekId(index) {
  return getAvailableWeeklyIds(index)[0] || null;
}

function addDays(dateStr, days) {
  const [year, month, day] = String(dateStr).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

function parseDateInput(dateStr) {
  const s = String(dateStr || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T00:00:00Z`);
  }
  return new Date(s);
}

function formatDate(dateStr, withWeekday = false) {
  const date = parseDateInput(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(withWeekday ? { weekday: 'long' } : {})
  });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = parseDateInput(dateStr);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  document.documentElement.setAttribute('data-theme', saved);

  const toggle = document.getElementById('themeToggle');
  if (toggle && !toggle.dataset.bound) {
    toggle.addEventListener('click', toggleTheme);
    toggle.dataset.bound = 'true';
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_STORAGE_KEY, next);
}

window.RSS_AI = {
  fetchIndex,
  fetchDailyReport,
  fetchWeeklyReport,
  getAvailableDailyDates,
  getAvailableWeeklyIds,
  getLatestDailyDate,
  getLatestWeekId,
  addDays,
  formatDate,
  formatTime,
  escapeHtml,
  initTheme,
  toggleTheme
};
