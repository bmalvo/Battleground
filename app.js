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

function pollinationsUrl(f1, f2) {
  const prompt = `${f1} on the left side, ${f2} on the right side, facing each other, character portrait art, digital illustration, vibrant colors, epic style, white background, versus composition, split screen`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;
}

function setLoading(loading) {
  if (loading) {
    show(loader);
    hide(result);
    hide(errorMsg);
    hide(rateLimitMsg);
    fightBtn.disabled = true;
    fightBtn.textContent = 'FIGHTING...';
  } else {
    hide(loader);
    fightBtn.disabled = false;
    fightBtn.textContent = 'FIGHT!';
  }
}

function startCooldown(seconds) {
  let remaining = seconds;
  fightBtn.disabled = true;

  const tick = () => {
    if (remaining <= 0) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
      fightBtn.disabled = false;
      fightBtn.textContent = 'FIGHT!';
      return;
    }
    fightBtn.textContent = `Wait ${remaining}s...`;
    remaining--;
  };

  tick();
  cooldownTimer = setInterval(tick, 1000);
}

async function submitBattle(f1, f2) {
  setLoading(true);

  try {
    const res = await fetch('/api/battle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fighter1: f1, fighter2: f2 })
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after') || 60;
      show(rateLimitMsg);
      rateLimitMsg.textContent = `Too many battles. Try again in ${retryAfter} seconds.`;
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
    errorMsg.textContent = 'Something went wrong. Please try again.';
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
  imgEl.style.display = 'none';

  const retryBtn = document.createElement('button');
  retryBtn.className = 'retry-img';
  retryBtn.textContent = 'Retry image';
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
    retryBtn.textContent = 'Retrying in 45s...';
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
  const dex = JSON.parse(localStorage.getItem('battledex') || '[]');
  battledexList.innerHTML = '';

  if (dex.length === 0) {
    battledexList.innerHTML = '<p style="color:var(--muted)">No saved battles yet.</p>';
  } else {
    dex.forEach((entry) => {
      const div = document.createElement('div');
      div.className = 'dex-entry';
      div.innerHTML = `
        <span>
          <strong>${escapeHtml(entry.fighter1)}</strong> vs <strong>${escapeHtml(entry.fighter2)}</strong><br>
          <em style="color:var(--muted); font-size:0.85rem">${new Date(entry.timestamp).toLocaleDateString()}</em>
        </span>
        <button class="refight" data-f1="${escapeHtml(entry.fighter1)}" data-f2="${escapeHtml(entry.fighter2)}">Refight</button>
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
  const f1 = name1El.textContent;
  const f2 = name2El.textContent;
  const verdict = verdictEl.textContent;
  saveBattle(f1, f2, verdict);

  const original = saveBtn.textContent;
  saveBtn.textContent = 'Saved!';
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
  if (confirm('Clear BattleDex?')) {
    localStorage.removeItem('battledex');
    renderBattleDex();
  }
});

renderBattleDex();