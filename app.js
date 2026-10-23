'use strict';

const K = {
  books: 'bc_books_v1',
  votes: 'bc_votes_v1',
  comments: 'bc_comments_v1',
  users: 'bc_users_v1',
  session: 'bc_session_v1'
};

const GENRES = ['Фантастика', 'Фэнтези', 'Детектив', 'Классика', 'Нон-фикшн', 'Приключения', 'Драма', 'Поэзия', 'Биография', 'Другое'];

const COVER_COLORS = ['#2f6f4f', '#3a5a9f', '#8a4b8f', '#a1522f', '#2f6f8a', '#7a6a2f', '#8f3a5a', '#4a6b2f'];

const el = id => document.getElementById(id);

const ui = {
  homeBtn: el('homeBtn'),
  authGuest: el('authGuest'),
  authUser: el('authUser'),
  authLogin: el('authLogin'),
  authPassword: el('authPassword'),
  authSubmit: el('authSubmit'),
  authError: el('authError'),
  authToggle: el('authToggle'),
  authName: el('authName'),
  profileBtn: el('profileBtn'),
  logoutBtn: el('logoutBtn'),
  profileModal: el('profileModal'),
  profileForm: el('profileForm'),
  profileLogin: el('profileLogin'),
  profileName: el('profileName'),
  profileCurPass: el('profileCurPass'),
  profileNewPass: el('profileNewPass'),
  profileError: el('profileError'),
  genreFilter: el('genreFilter'),
  pagesFilter: el('pagesFilter'),
  resetFilters: el('resetFilters'),
  clearCatalog: el('clearCatalog'),
  catalogMeta: el('catalogMeta'),
  catalog: el('catalog'),
  emptyState: el('emptyState'),
  emptyCta: el('emptyCta'),
  bookForm: el('bookForm'),
  bookTitle: el('bookTitle'),
  bookAuthor: el('bookAuthor'),
  bookGenre: el('bookGenre'),
  bookPages: el('bookPages'),
  bookProposer: el('bookProposer'),
  formError: el('formError'),
  votesTotal: el('votesTotal'),
  winner: el('winner'),
  rating: el('rating'),
  ratingEmpty: el('ratingEmpty'),
  profilePanel: el('profilePanel'),
  profileBody: el('profileBody'),
  toast: el('toast')
};

const state = {
  books: [],
  votes: [],
  comments: [],
  users: [],
  session: null,
  genre: 'all',
  pages: 'all',
  authMode: 'login',
  busy: false
};

let toastTimer = null;

/* ---------- хранилище ---------- */

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadState() {
  state.books = readJson(K.books, []);
  state.votes = readJson(K.votes, []);
  state.comments = readJson(K.comments, []);
  state.users = readJson(K.users, []);
  state.session = readJson(K.session, null);
}

function seedIfEmpty() {
  if (localStorage.getItem(K.books) !== null) return;
  const now = Date.now();
  const books = [
    { id: 'b1', title: 'Мартин Иден', author: 'Джек Лондон', genre: 'Приключения', pages: 416, proposer: 'Аня' },
    { id: 'b2', title: 'Убийство в «Восточном экспрессе»', author: 'Агата Кристи', genre: 'Детектив', pages: 320, proposer: 'Борис' },
    { id: 'b3', title: 'Дюна', author: 'Фрэнк Герберт', genre: 'Фантастика', pages: 704, proposer: 'Оля' },
    { id: 'b4', title: '1984', author: 'Джордж Оруэлл', genre: 'Классика', pages: 320, proposer: 'Костя' },
    { id: 'b5', title: 'Солярис', author: 'Станислав Лем', genre: 'Фантастика', pages: 224, proposer: 'Аня' },
    { id: 'b6', title: 'Sapiens. Краткая история человечества', author: 'Юваль Ной Харари', genre: 'Нон-фикшн', pages: 528, proposer: 'Марина' }
  ];
  const votes = [
    { bookId: 'b3', voterKey: 'аня', voterName: 'Аня', ts: now - 5000 },
    { bookId: 'b3', voterKey: 'борис', voterName: 'Борис', ts: now - 4000 },
    { bookId: 'b1', voterKey: 'оля', voterName: 'Оля', ts: now - 3000 },
    { bookId: 'b5', voterKey: 'костя', voterName: 'Костя', ts: now - 2000 }
  ];
  const comments = [
    { id: 'c1', bookId: 'b3', authorKey: 'аня', authorName: 'Аня', text: 'Читала два раза, каждая часть раскрывает мир заново.', ts: now - 1500 },
    { id: 'c2', bookId: 'b1', authorKey: 'оля', authorName: 'Оля', text: 'Классика приключений, отлично читается на одном дыхании.', ts: now - 1000 }
  ];
  writeJson(K.books, books);
  writeJson(K.votes, votes);
  writeJson(K.comments, comments);
}

/* ---------- участники ---------- */

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function displayName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

async function hashPassword(password) {
  const data = 'bookclub:' + password;
  if (window.crypto && crypto.subtle && crypto.subtle.digest) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381;
  for (let i = 0; i < data.length; i++) h = ((h << 5) + h + data.charCodeAt(i)) >>> 0;
  return 'fb' + h.toString(16);
}

function currentKey() {
  return state.session ? state.session.loginKey : '';
}

function currentLogin() {
  if (!state.session) return '';
  const user = state.users.find(u => u.loginKey === state.session.loginKey);
  return user ? (user.name || user.login) : state.session.login;
}

function setSession(login, loginKey) {
  state.session = { login, loginKey };
  writeJson(K.session, state.session);
}

async function registerUser(login, password) {
  const name = displayName(login);
  const key = normalizeName(name);
  if (name.length < 2) return 'Логин — минимум 2 символа.';
  if (password.length < 4) return 'Пароль — минимум 4 символа.';
  if (state.users.some(u => u.loginKey === key)) return 'Такой логин уже занят.';
  const user = {
    login: name,
    loginKey: key,
    name: name,
    passHash: await hashPassword(password),
    createdAt: Date.now()
  };
  state.users.push(user);
  writeJson(K.users, state.users);
  setSession(name, key);
  return null;
}

async function loginUser(login, password) {
  const key = normalizeName(login);
  if (!key) return 'Введите логин.';
  const user = state.users.find(u => u.loginKey === key);
  if (!user) return 'Аккаунт не найден. Зарегистрируйтесь.';
  const hash = await hashPassword(password);
  if (hash !== user.passHash) return 'Неверный пароль.';
  setSession(user.login, user.loginKey);
  return null;
}

function logout() {
  state.session = null;
  localStorage.removeItem(K.session);
  toast('Вы вышли из аккаунта.');
  render();
}

/* ---------- мой профиль ---------- */

function openProfileModal() {
  if (!state.session) { toast('Сначала войдите в аккаунт.'); return; }
  ui.profileLogin.value = state.session.login;
  ui.profileName.value = currentLogin();
  ui.profileCurPass.value = '';
  ui.profileNewPass.value = '';
  ui.profileError.hidden = true;
  ui.profileModal.hidden = false;
  ui.profileName.focus();
}

function closeProfileModal() {
  ui.profileModal.hidden = true;
}

async function submitProfile(event) {
  event.preventDefault();
  ui.profileError.hidden = true;
  const key = currentKey();
  const user = state.users.find(u => u.loginKey === key);
  if (!user) return;

  const newName = displayName(ui.profileName.value);
  if (newName.length < 2) {
    ui.profileError.textContent = 'Отображаемое имя — минимум 2 символа.';
    ui.profileError.hidden = false;
    return;
  }

  const newPass = ui.profileNewPass.value;
  if (newPass) {
    if (newPass.length < 4) {
      ui.profileError.textContent = 'Новый пароль — минимум 4 символа.';
      ui.profileError.hidden = false;
      return;
    }
    const hash = await hashPassword(ui.profileCurPass.value);
    if (hash !== user.passHash) {
      ui.profileError.textContent = 'Неверный текущий пароль.';
      ui.profileError.hidden = false;
      return;
    }
    user.passHash = await hashPassword(newPass);
  }

  if (newName !== (user.name || user.login)) {
    user.name = newName;
    state.votes.forEach(v => { if (v.voterKey === key) v.voterName = newName; });
    state.comments.forEach(c => { if (c.authorKey === key) c.authorName = newName; });
    writeJson(K.votes, state.votes);
    writeJson(K.comments, state.comments);
  }

  writeJson(K.users, state.users);
  closeProfileModal();
  toast('Профиль обновлён.');
  render();
}

/* ---------- правила голосования ---------- */

function findVote(voterKey) {
  return state.votes.find(v => v.voterKey === voterKey) || null;
}

function bookById(id) {
  return state.books.find(b => b.id === id) || null;
}

function voteCount(bookId) {
  if (!bookById(bookId)) return 0;
  return state.votes.filter(v => v.bookId === bookId).length;
}

function activeVotes() {
  return state.votes.filter(v => bookById(v.bookId));
}

function castVote(bookId) {
  if (state.busy) return;
  const key = currentKey();
  if (!key) {
    toast('Войдите или зарегистрируйтесь, чтобы голосовать.');
    ui.authLogin.focus();
    return;
  }
  const book = bookById(bookId);
  if (!book) return;

  state.busy = true;
  render();
  try {
    const votes = readJson(K.votes, []);
    const existing = votes.find(v => v.voterKey === key);

    if (existing && existing.bookId === bookId) {
      toast('Вы уже проголосовали за эту книгу.');
      return;
    }

    if (existing) {
      const prev = bookById(existing.bookId);
      const ok = confirm(
        'Вы уже голосовали' + (prev ? ' за «' + prev.title + '»' : '') +
        '.\nПеревести голос на «' + book.title + '»?\nИтог остаётся один голос на участника.'
      );
      if (!ok) return;
      existing.bookId = bookId;
      existing.voterName = currentLogin();
      existing.ts = Date.now();
    } else {
      votes.push({
        bookId,
        voterKey: key,
        voterName: currentLogin(),
        ts: Date.now()
      });
    }

    writeJson(K.votes, votes);
    state.votes = votes;
    toast('Голос за «' + book.title + '» учтён.');
  } finally {
    state.busy = false;
    render();
  }
}

/* ---------- комментарии ---------- */

function commentsFor(bookId) {
  return state.comments
    .filter(c => c.bookId === bookId && bookById(bookId))
    .sort((a, b) => a.ts - b.ts);
}

function addComment(bookId, text) {
  const key = currentKey();
  if (!key) { toast('Войдите, чтобы оставить комментарий.'); return; }
  const value = String(text || '').trim();
  if (!value) { toast('Комментарий пустой.'); return; }
  if (!bookById(bookId)) return;
  const comments = readJson(K.comments, []);
  comments.push({
    id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    bookId,
    authorKey: key,
    authorName: currentLogin(),
    text: value.slice(0, 500),
    ts: Date.now()
  });
  writeJson(K.comments, comments);
  state.comments = comments;
  toast('Комментарий добавлен.');
  render();
}

function deleteComment(commentId) {
  const key = currentKey();
  const comments = readJson(K.comments, []);
  const comment = comments.find(c => c.id === commentId);
  if (!comment || comment.authorKey !== key) return;
  if (!confirm('Удалить ваш комментарий?')) return;
  const next = comments.filter(c => c.id !== commentId);
  writeJson(K.comments, next);
  state.comments = next;
  toast('Комментарий удалён.');
  render();
}

/* ---------- каталог ---------- */

function uid() {
  return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function addBook(data) {
  const books = readJson(K.books, []);
  books.push({
    id: uid(),
    title: displayName(data.title),
    author: displayName(data.author),
    genre: data.genre,
    pages: data.pages,
    proposer: displayName(data.proposer)
  });
  writeJson(K.books, books);
  state.books = books;
}

function matchesFilters(book) {
  if (state.genre !== 'all' && book.genre !== state.genre) return false;
  const p = Number(book.pages) || 0;
  if (state.pages === 'short' && p > 300) return false;
  if (state.pages === 'mid' && (p <= 300 || p > 500)) return false;
  if (state.pages === 'long' && p <= 500) return false;
  return true;
}

function coverColor(title) {
  let sum = 0;
  for (let i = 0; i < title.length; i++) sum += title.charCodeAt(i);
  return COVER_COLORS[sum % COVER_COLORS.length];
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/* ---------- рейтинг ---------- */

function ratingRows() {
  const myKey = currentKey();
  return state.books
    .map(b => {
      const voters = state.votes.filter(v => v.bookId === b.id);
      return {
        book: b,
        votes: voters.length,
        voters: voters.map(v => v.voterName),
        mine: myKey ? voters.some(v => v.voterKey === myKey) : false
      };
    })
    .sort((a, b) => b.votes - a.votes || a.book.title.localeCompare(b.book.title, 'ru'));
}

/* ---------- отрисовка ---------- */

function renderAuth() {
  const loggedIn = !!state.session;
  ui.authGuest.hidden = loggedIn;
  ui.authUser.hidden = !loggedIn;
  ui.profileBtn.hidden = !loggedIn;
  if (loggedIn) {
    ui.authName.textContent = currentLogin();
    return;
  }
  const register = state.authMode === 'register';
  ui.authSubmit.textContent = register ? 'Зарегистрироваться' : 'Войти';
  ui.authToggle.textContent = register ? 'Уже есть аккаунт — войти' : 'Регистрация';
  ui.authPassword.autocomplete = register ? 'new-password' : 'current-password';
}

function renderProfile() {
  const key = currentKey();
  ui.profilePanel.hidden = !key;
  if (!key) { ui.profileBody.innerHTML = ''; return; }

  const vote = findVote(key);
  const myComments = state.comments
    .filter(c => c.authorKey === key && bookById(c.bookId))
    .sort((a, b) => b.ts - a.ts);

  let html = '<div class="profile-block">' +
    '<div class="profile-block__label">Мой голос (1 из 1)</div>';
  if (vote && bookById(vote.bookId)) {
    html += '<div class="profile-vote"><b>' + escapeHtml(bookById(vote.bookId).title) + '</b>' +
      '<span>Проголосовали ' + formatDate(vote.ts) + '</span></div>';
  } else {
    html += '<div class="profile-none">Вы ещё не голосовали.</div>';
  }
  html += '</div>';

  html += '<div class="profile-block">' +
    '<div class="profile-block__label">Мои комментарии (' + myComments.length + ')</div>';
  if (!myComments.length) {
    html += '<div class="profile-none">Комментариев пока нет — напишите отзыв под прочитанной книгой.</div>';
  } else {
    html += '<ul class="profile-list">' + myComments.map(c =>
      '<li><b>' + escapeHtml(bookById(c.bookId).title) + '</b>' +
      escapeHtml(c.text) + '<span>' + formatDate(c.ts) + '</span></li>'
    ).join('') + '</ul>';
  }
  html += '</div>';

  ui.profileBody.innerHTML = html;
}

function renderGenreOptions() {
  const present = [...new Set(state.books.map(b => b.genre))].sort((a, b) => a.localeCompare(b, 'ru'));
  const options = ['<option value="all">Все жанры</option>']
    .concat(present.map(g => '<option value="' + escapeHtml(g) + '">' + escapeHtml(g) + '</option>'));
  ui.genreFilter.innerHTML = options.join('');
  if (!present.includes(state.genre)) state.genre = 'all';
  ui.genreFilter.value = state.genre;
  ui.pagesFilter.value = state.pages;

  ui.bookGenre.innerHTML = GENRES.map(g => '<option value="' + escapeHtml(g) + '">' + escapeHtml(g) + '</option>').join('');
}

function renderComments(book) {
  const list = commentsFor(book.id);
  const key = currentKey();
  let html = '<div class="comments">' +
    '<div class="comments__head">Комментарии (' + list.length + ')</div>';
  if (list.length) {
    html += '<ul class="comments__list">' + list.map(c =>
      '<li><div class="comments__meta"><span>' + escapeHtml(c.authorName) + ' · ' + formatDate(c.ts) + '</span>' +
      (c.authorKey === key ? '<button class="comments__del" type="button" data-del-comment="' + escapeHtml(c.id) + '" title="Удалить">✕</button>' : '') +
      '</div>' + escapeHtml(c.text) + '</li>'
    ).join('') + '</ul>';
  }
  if (key) {
    html += '<form class="comments__form" data-comment-form="' + escapeHtml(book.id) + '">' +
      '<textarea class="input" maxlength="500" placeholder="Ваш отзыв после чтения"></textarea>' +
      '<button class="btn btn--primary btn--small" type="submit">Отправить</button>' +
      '</form>';
  } else {
    html += '<div class="comments__hint">Войдите, чтобы оставить комментарий.</div>';
  }
  return html + '</div>';
}

function renderCatalog() {
  const visible = state.books.filter(matchesFilters);
  const myKey = currentKey();
  const myVote = myKey ? findVote(myKey) : null;
  const filtersOn = state.genre !== 'all' || state.pages !== 'all';

  ui.emptyState.hidden = state.books.length !== 0;
  ui.catalog.hidden = state.books.length === 0;

  ui.catalogMeta.textContent = state.books.length === 0
    ? ''
    : 'Показано ' + visible.length + ' из ' + state.books.length +
      (filtersOn ? ' · фильтр активен' : '');

  if (state.books.length > 0 && visible.length === 0) {
    ui.catalog.innerHTML = '<div class="empty" style="grid-column:1/-1">' +
      '<div class="empty__title">Ничего не найдено</div>' +
      '<div class="empty__text">По этим фильтрам кандидатов нет.</div>' +
      '<button class="btn btn--primary" type="button" data-action="reset">Сбросить фильтры</button></div>';
    return;
  }

  ui.catalog.innerHTML = visible.map(b => {
    const count = voteCount(b.id);
    const isMine = myVote && myVote.bookId === b.id;
    const votedOther = myVote && myVote.bookId !== b.id;
    let label = 'Голосовать';
    let cls = 'btn btn--primary btn--small';
    if (isMine) { label = '✓ Ваш голос'; cls = 'btn btn--voted btn--small'; }
    else if (votedOther) { label = 'Перевести голос'; }
    if (!myKey) label = 'Войдите, чтобы голосовать';

    return '<article class="card' + (isMine ? ' is-voted' : '') + '">' +
      '<div class="cover" style="background:' + coverColor(b.title) + '">' +
        escapeHtml((b.title || '?').trim().charAt(0)) +
        (b.pages ? '<span class="cover__pages">' + escapeHtml(b.pages) + ' стр.</span>' : '') +
      '</div>' +
      '<div class="card__body">' +
        '<h3 class="card__title">' + escapeHtml(b.title) + '</h3>' +
        (b.author ? '<div class="card__author">' + escapeHtml(b.author) + '</div>' : '') +
        '<div class="card__tags">' +
          '<span class="tag">' + escapeHtml(b.genre) + '</span>' +
          (b.pages ? '<span class="tag tag--plain">' + escapeHtml(b.pages) + ' стр.</span>' : '') +
        '</div>' +
        (b.proposer ? '<div class="card__proposer">Предложил: ' + escapeHtml(b.proposer) + '</div>' : '') +
      '</div>' +
      '<div class="card__vote">' +
        '<span class="vote-count"><b>' + count + '</b> ' + plural(count, 'голос', 'голоса', 'голосов') + '</span>' +
        '<button class="' + cls + '" type="button" data-vote="' + escapeHtml(b.id) + '"' +
          (!myKey && !isMine ? ' disabled' : '') + (state.busy ? ' disabled' : '') + '>' + label + '</button>' +
      '</div>' +
      renderComments(b) +
    '</article>';
  }).join('');
}

function plural(n, one, few, many) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function renderRating() {
  const rows = ratingRows();
  const total = activeVotes().length;
  const max = rows.reduce((m, r) => Math.max(m, r.votes), 0);

  ui.votesTotal.textContent = total + ' ' + plural(total, 'голос', 'голоса', 'голосов');
  ui.ratingEmpty.hidden = total > 0;

  const leader = rows.find(r => r.votes > 0);
  const leaders = rows.filter(r => r.votes > 0 && r.votes === leader.votes);
  if (!leader || total === 0) {
    ui.winner.hidden = true;
  } else if (leaders.length > 1) {
    ui.winner.hidden = false;
    ui.winner.innerHTML = '<b>Ничья на первом месте</b><span>' +
      escapeHtml(leaders.map(r => r.book.title).join(' + ')) + '</span>';
  } else {
    ui.winner.hidden = false;
    ui.winner.innerHTML = '<b>Пока лидирует: ' + escapeHtml(leader.book.title) + '</b>' +
      '<span>' + leader.votes + ' ' + plural(leader.votes, 'голос', 'голоса', 'голосов') +
      ' · ' + Math.round(leader.votes / total * 100) + '%</span>';
  }

  ui.rating.innerHTML = rows.map((r, i) => {
    const cls = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const pct = total ? Math.round(r.votes / total * 100) : 0;
    const width = max ? Math.round(r.votes / max * 100) : 0;
    return '<div class="rank' + (r.mine ? ' is-mine' : '') + '">' +
      '<div class="rank__top">' +
        '<span class="rank__no ' + cls + '">' + (i + 1) + '</span>' +
        '<span class="rank__name">' +
          '<span class="rank__title">' + escapeHtml(r.book.title) + '</span>' +
          '<span class="rank__author">' + escapeHtml(r.book.author || r.book.genre) + '</span>' +
        '</span>' +
        '<span class="rank__votes"><b>' + r.votes + '</b><span>' + pct + '%</span></span>' +
      '</div>' +
      '<div class="rank__bar"><i style="width:' + width + '%"></i></div>' +
      (r.voters.length ? '<div class="rank__voters">' + escapeHtml(r.voters.join(', ')) + '</div>' : '') +
    '</div>';
  }).join('');
}

function render() {
  renderAuth();
  renderProfile();
  renderGenreOptions();
  renderCatalog();
  renderRating();
  ui.resetFilters.classList.toggle('is-active', state.genre !== 'all' || state.pages !== 'all');
  if (currentLogin()) ui.bookProposer.value = currentLogin();
  else if (!ui.bookProposer.value) ui.bookProposer.placeholder = 'Имя участника';
}

function toast(message) {
  ui.toast.textContent = message;
  ui.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { ui.toast.hidden = true; }, 3200);
}

/* ---------- события: авторизация ---------- */

ui.authToggle.addEventListener('click', () => {
  state.authMode = state.authMode === 'login' ? 'register' : 'login';
  ui.authError.hidden = true;
  renderAuth();
  ui.authLogin.focus();
});

ui.authSubmit.addEventListener('click', async () => {
  ui.authError.hidden = true;
  const login = ui.authLogin.value;
  const password = ui.authPassword.value;
  const error = state.authMode === 'register'
    ? await registerUser(login, password)
    : await loginUser(login, password);
  if (error) {
    ui.authError.textContent = error;
    ui.authError.hidden = false;
    return;
  }
  ui.authPassword.value = '';
  toast(state.authMode === 'register'
    ? 'Добро пожаловать, ' + currentLogin() + '!'
    : 'С возвращением, ' + currentLogin() + '!');
  state.authMode = 'login';
  render();
});

[ui.authLogin, ui.authPassword].forEach(input => {
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); ui.authSubmit.click(); }
  });
});

ui.logoutBtn.addEventListener('click', logout);

ui.profileBtn.addEventListener('click', openProfileModal);
ui.profileForm.addEventListener('submit', submitProfile);
ui.profileModal.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) closeProfileModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !ui.profileModal.hidden) closeProfileModal();
});

ui.homeBtn.addEventListener('click', () => {
  state.genre = 'all';
  state.pages = 'all';
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ---------- события: каталог ---------- */

ui.genreFilter.addEventListener('change', () => {
  state.genre = ui.genreFilter.value;
  render();
});

ui.pagesFilter.addEventListener('change', () => {
  state.pages = ui.pagesFilter.value;
  render();
});

ui.resetFilters.addEventListener('click', () => {
  state.genre = 'all';
  state.pages = 'all';
  render();
});

ui.clearCatalog.addEventListener('click', () => {
  if (!state.books.length) { toast('Каталог уже пуст.'); return; }
  if (!confirm('Очистить каталог? Голоса и комментарии будут удалены.')) return;
  writeJson(K.books, []);
  writeJson(K.votes, []);
  writeJson(K.comments, []);
  state.books = [];
  state.votes = [];
  state.comments = [];
  state.genre = 'all';
  state.pages = 'all';
  toast('Каталог очищен.');
  render();
});

ui.emptyCta.addEventListener('click', () => {
  ui.bookTitle.focus();
  ui.bookTitle.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

ui.catalog.addEventListener('click', e => {
  const voteBtn = e.target.closest('[data-vote]');
  if (voteBtn) { castVote(voteBtn.dataset.vote); return; }
  const delBtn = e.target.closest('[data-del-comment]');
  if (delBtn) { deleteComment(delBtn.getAttribute('data-del-comment')); return; }
  if (e.target.closest('[data-action="reset"]')) {
    state.genre = 'all';
    state.pages = 'all';
    render();
  }
});

ui.catalog.addEventListener('submit', e => {
  const form = e.target.closest('[data-comment-form]');
  if (!form) return;
  e.preventDefault();
  const textarea = form.querySelector('textarea');
  addComment(form.getAttribute('data-comment-form'), textarea.value);
});

/* ---------- события: предложить книгу ---------- */

ui.bookForm.addEventListener('submit', e => {
  e.preventDefault();
  const title = displayName(ui.bookTitle.value);
  ui.formError.hidden = true;
  ui.bookTitle.classList.remove('is-invalid');

  if (!title) {
    ui.bookTitle.classList.add('is-invalid');
    ui.formError.textContent = 'Нельзя добавить книгу без названия.';
    ui.formError.hidden = false;
    ui.bookTitle.focus();
    return;
  }

  const pagesRaw = ui.bookPages.value.trim();
  let pages = '';
  if (pagesRaw !== '') {
    const n = Number(pagesRaw);
    if (!Number.isFinite(n) || n < 1 || n > 9999 || !Number.isInteger(n)) {
      ui.bookPages.classList.add('is-invalid');
      ui.formError.textContent = 'Число страниц должно быть от 1 до 9999.';
      ui.formError.hidden = false;
      ui.bookPages.focus();
      return;
    }
    pages = n;
  }
  ui.bookPages.classList.remove('is-invalid');

  addBook({
    title,
    author: ui.bookAuthor.value,
    genre: ui.bookGenre.value || GENRES[0],
    pages,
    proposer: ui.bookProposer.value || currentLogin()
  });

  ui.bookForm.reset();
  render();
  toast('«' + title + '» добавлена в каталог.');
  ui.bookTitle.focus();
});

window.addEventListener('storage', e => {
  if (e.key === null || Object.values(K).includes(e.key)) {
    loadState();
    render();
  }
});

/* ---------- старт ---------- */

seedIfEmpty();
loadState();
render();
