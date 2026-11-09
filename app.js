const form = document.getElementById('battle-form');
const fighter1Input = document.getElementById('fighter1');
const fighter2Input = document.getElementById('fighter2');
const fightBtn = document.getElementById('fight-btn');

const loader = document.getElementById('loader');
const result = document.getElementById('battle-result');
const rateLimitMsg = document.getElementById('rate-limit');
const errorMsg = document.getElementById('error');

const name1El = document.getElementById('name1');
const name2El = document.getElementById('name2');
const art1El = document.getElementById('art1');
const art2El = document.getElementById('art2');
const verdictEl = document.getElementById('verdict-text');

const saveBtn = document.getElementById('save-btn');
const rematchBtn = document.getElementById('rematch-btn');

const battledexEl = document.getElementById('battledex');
const battledexList = document.getElementById('battledex-list');
const clearDexBtn = document.getElementById('clear-dex');

let cooldownTimer = null;

function hide(el) { el.classList.add('hidden'); }
function show(el) { el.classList.remove('hidden'); }

const translations = {
  en: {
    subtitle: 'Type two fighters. Get an AI verdict + character art.',
    labelFighter1: 'Fighter 1',
    labelFighter2: 'Fighter 2',
    placeholder1: 'e.g. Batman',
    placeholder2: 'e.g. Superman',
    fightBtn: 'FIGHT!',
    fightingBtn: 'FIGHTING...',
    cooldownBtn: (s) => `Wait ${s}s...`,
    loader: 'Computing the epic battle...',
    rateLimit: (s) => `Too many battles. Try again in ${s} seconds.`,
    error: 'Something went wrong. Please try again.',
    verdictHeading: 'The Verdict',
    saveBtn: 'Save to BattleDex',
    rematchBtn: 'Rematch',
    battledexHeading: 'BattleDex',
    battledexEmpty: 'No saved battles yet.',
    refightBtn: 'Refight',
    clearBtn: 'Clear BattleDex',
    clearConfirm: 'Clear BattleDex?',
    savedToast: 'Saved!',
    retryImg: 'Retry image',
    retryImgWait: (s) => `Retrying in ${s}s...`,
    geminiPrompt: (f1, f2) => `Who would win in a fight between ${f1} and ${f2}? Write a short, fun, dramatic verdict in 2-3 short paragraphs. Declare a clear winner. Keep it under 200 words.`
  },
  pl: {
    subtitle: 'Wpisz dwóch fighterów. Otrzymaj AI werdykt + sztukę postaci.',
    labelFighter1: 'Wojownik 1',
    labelFighter2: 'Wojownik 2',
    placeholder1: 'np. Batman',
    placeholder2: 'np. Superman',
    fightBtn: 'WALCZ!',
    fightingBtn: 'WALCZĘ...',
    cooldownBtn: (s) => `Czekaj ${s}s...`,
    loader: 'Obliczanie epickiej bitwy...',
    rateLimit: (s) => `Za dużo bitew. Spróbuj za ${s} sekund.`,
    error: 'Coś poszło nie tak. Spróbuj ponownie.',
    verdictHeading: 'Werdykt',
    saveBtn: 'Zapisz do BattleDex',
    rematchBtn: 'Rewanż',
    battledexHeading: 'BattleDex',
    battledexEmpty: 'Brak zapisanych bitew.',
    refightBtn: 'Rewanż',
    clearBtn: 'Wyczyść BattleDex',
    clearConfirm: 'Wyczyścić BattleDex?',
    savedToast: 'Zapisano!',
    retryImg: 'Ponów obraz',
    retryImgWait: (s) => `Ponawianie za ${s}s...`,
    geminiPrompt: (f1, f2) => `Kto wygrałby w walce między ${f1} a ${f2}? Napisz krótki, zabawny, dramatyczny werdykt w 2-3 krótkich akapitach. Oświadcz wyraźnego zwycięzcę. Zachowaj poniżej 200 słów. Odpowiedz po polsku.`
  }
};

let currentLang = localStorage.getItem('battlegroud-lang') || 'en';

function updateUILanguage() {
  const t = translations[currentLang];
  document.getElementById('subtitle').textContent = t.subtitle;
  document.getElementById('label-fighter1').textContent = t.labelFighter1;
  document.getElementById('label-fighter2').textContent = t.labelFighter2;
  document.getElementById('fighter1').placeholder = t.placeholder1;
  document.getElementById('fighter2').placeholder = t.placeholder2;
  document.getElementById('loader-text').textContent = t.loader;
  document.getElementById('verdict-heading').textContent = t.verdictHeading;
  document.getElementById('battledex-heading').textContent = t.battledexHeading;
  document.getElementById('lang-toggle').textContent = currentLang === 'en' ? 'PL' : 'EN';
  document.getElementById('lang-toggle').title = currentLang === 'en' ? 'Switch to Polish' : 'Przełącz na angielski';

  // Update fight button based on state
  const fightBtn = document.getElementById('fight-btn');
  if (fightBtn.disabled) {
    fightBtn.textContent = fightBtn.textContent.includes('WAIT') || fightBtn.textContent.includes('Czekaj') 
      ? fightBtn.textContent 
      : t.fightingBtn;
  } else {
    fightBtn.textContent = t.fightBtn;
  }

  // Update save button if it shows "Saved!"
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn.textContent === 'Saved!' || saveBtn.textContent === 'Zapisano!') {
    saveBtn.textContent = t.savedToast;
  }

  renderBattleDex();
}

function switchLanguage() {
  currentLang = currentLang === 'en' ? 'pl' : 'en';
  localStorage.setItem('battlegroud-lang', currentLang);
  updateUILanguage();
}

function pollinationsUrl(f1, f2) {
  const prompt = `${f1} on the left side, ${f2} on the right side, facing each other, character portrait art, digital illustration, vibrant colors, epic style, white background, versus composition, split screen`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;
}

function setLoading(loading) {
  const t = translations[currentLang];
  if (loading) {
    show(loader);
    hide(result);
    hide(errorMsg);
    hide(rateLimitMsg);
    fightBtn.disabled = true;
    fightBtn.textContent = t.fightingBtn;
  } else {
    hide(loader);
    fightBtn.disabled = false;
    fightBtn.textContent = t.fightBtn;
  }
}

function startCooldown(seconds) {
  const t = translations[currentLang];
  let remaining = seconds;
  fightBtn.disabled = true;

  const tick = () => {
    if (remaining <= 0) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
      fightBtn.disabled = false;
      fightBtn.textContent = t.fightBtn;
      return;
    }
    fightBtn.textContent = t.cooldownBtn(remaining);
    remaining--;
  };

  tick();
  cooldownTimer = setInterval(tick, 1000);
}

async function submitBattle(f1, f2) {
  const t = translations[currentLang];
  setLoading(true);

  try {
    const res = await fetch('/api/battle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fighter1: f1, fighter2: f2, lang: currentLang })
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after') || 60;
      show(rateLimitMsg);
      rateLimitMsg.textContent = t.rateLimit(retryAfter);
      startCooldown(parseInt(retryAfter, 10) || 60);
      setLoading(false);
      return;
    }

    if (!res.ok) {
      throw new Error(`Server error ${res.status}`);
    }

    const data = await res.json();
    renderResult(f1, f2, data.verdict);
    setLoading(false);
  } catch (err) {
    show(errorMsg);
    errorMsg.textContent = t.error;
    console.error(err);
    setLoading(false);
  }
}

function renderResult(f1, f2, verdict) {
  name1El.textContent = f1;
  name2El.textContent = f2;
  const artEl = document.getElementById('battle-art');
  artEl.src = pollinationsUrl(f1, f2);
  verdictEl.textContent = verdict;

  hide(errorMsg);
  hide(rateLimitMsg);
  show(result);

  // Handle Pollinations rate limits (1 image per 45s on free tier)
  artEl.onerror = () => handleImageError(artEl, f1, f2);
}

function handleImageError(imgEl, f1, f2) {
  const t = translations[currentLang];
  imgEl.style.display = 'none';

  const retryBtn = document.createElement('button');
  retryBtn.className = 'retry-img';
  retryBtn.textContent = t.retryImg;
  retryBtn.style.display = 'block';
  retryBtn.style.margin = '12px auto 0';
  retryBtn.style.padding = '8px 16px';
  retryBtn.style.fontSize = '0.9rem';
  retryBtn.style.background = '#334155';
  retryBtn.style.color = '#f8fafc';
  retryBtn.style.border = 'none';
  retryBtn.style.borderRadius = '6px';
  retryBtn.style.cursor = 'pointer';

  let waiting = false;
  retryBtn.addEventListener('click', () => {
    if (waiting) return;
    waiting = true;
    retryBtn.textContent = t.retryImgWait(45);
    retryBtn.disabled = true;

    setTimeout(() => {
      imgEl.style.display = '';
      imgEl.src = pollinationsUrl(f1, f2);
      retryBtn.remove();
      waiting = false;
    }, 45000);
  });

  imgEl.parentNode.appendChild(retryBtn);
}
function saveBattle(f1, f2, verdict) {
  const entry = {
    id: Date.now().toString(),
    fighter1: f1,
    fighter2: f2,
    verdict,
    timestamp: new Date().toISOString()
  };

  const dex = JSON.parse(localStorage.getItem('battledex') || '[]');
  dex.unshift(entry);
  localStorage.setItem('battledex', JSON.stringify(dex));
  renderBattleDex();
}

function renderBattleDex() {
  const t = translations[currentLang];
  const dex = JSON.parse(localStorage.getItem('battledex') || '[]');
  battledexList.innerHTML = '';

  if (dex.length === 0) {
    battledexList.innerHTML = `<p style="color:var(--muted)">${t.battledexEmpty}</p>`;
  } else {
    dex.forEach((entry) => {
      const div = document.createElement('div');
      div.className = 'dex-entry';
      div.innerHTML = `
        <span>
          <strong>${escapeHtml(entry.fighter1)}</strong> vs <strong>${escapeHtml(entry.fighter2)}</strong><br>
          <em style="color:var(--muted); font-size:0.85rem">${new Date(entry.timestamp).toLocaleDateString()}</em>
        </span>
        <button class="refight" data-f1="${escapeHtml(entry.fighter1)}" data-f2="${escapeHtml(entry.fighter2)}">${t.refightBtn}</button>
      `;
      battledexList.appendChild(div);
    });
  }

  show(battledexEl);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const f1 = fighter1Input.value.trim();
  const f2 = fighter2Input.value.trim();
  if (!f1 || !f2) return;
  submitBattle(f1, f2);
});

saveBtn.addEventListener('click', () => {
  const t = translations[currentLang];
  const f1 = name1El.textContent;
  const f2 = name2El.textContent;
  const verdict = verdictEl.textContent;
  saveBattle(f1, f2, verdict);

  const original = saveBtn.textContent;
  saveBtn.textContent = t.savedToast;
  setTimeout(() => { saveBtn.textContent = original; }, 1200);
});

rematchBtn.addEventListener('click', () => {
  fighter1Input.value = name1El.textContent;
  fighter2Input.value = name2El.textContent;
  hide(result);
  submitBattle(name1El.textContent, name2El.textContent);
});

battledexList.addEventListener('click', (e) => {
  if (e.target.classList.contains('refight')) {
    const f1 = e.target.dataset.f1;
    const f2 = e.target.dataset.f2;
    fighter1Input.value = f1;
    fighter2Input.value = f2;
    hide(result);
    submitBattle(f1, f2);
  }
});

clearDexBtn.addEventListener('click', () => {
  const t = translations[currentLang];
  if (confirm(t.clearConfirm)) {
    localStorage.removeItem('battledex');
    renderBattleDex();
  }
});

// Language toggle
document.getElementById('lang-toggle').addEventListener('click', switchLanguage);

// Initialize
updateUILanguage();
renderBattleDex();