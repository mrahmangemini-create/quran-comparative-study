
const KEY = 'quranStudyWorkspace.v1';

let state = {
  ayahs: [],
  individualNotes: {},
  groupNote: ''
};

let quranDB = null;

const $ = id => document.getElementById(id);

// SQLite লাইব্রেরি লোড
function loadSQLiteLibrary() {
  return new Promise((resolve, reject) => {
    if (window.initSqlJs) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/sql-wasm.js';

    script.onload = resolve;
    script.onerror = () => reject(
      new Error('SQLite লাইব্রেরি লোড করা যায়নি।')
    );

    document.head.appendChild(script);
  });
}

// ডেটাবেস লোড
async function loadDatabase() {
  try {
    await loadSQLiteLibrary();

    const SQL = await window.initSqlJs({
      locateFile: file =>
        `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/${file}`
    });

    const response = await fetch('./data/bn_mujibur.db');

    if (!response.ok) {
      throw new Error('ডেটাবেস ফাইল পাওয়া যায়নি।');
    }

    const buffer = await response.arrayBuffer();

    quranDB = new SQL.Database(new Uint8Array(buffer));

    const result = quranDB.exec(
      'SELECT COUNT(*) FROM verses_content'
    );

    const total = result[0].values[0][0];

    $('saveStatus').textContent =
      `বাংলা অনুবাদ প্রস্তুত: ${total} আয়াত`;

    render();

  } catch (error) {
    console.error(error);

    $('saveStatus').textContent =
      'ডেটাবেস লোড হয়নি';

    alert(
      'বাংলা অনুবাদ লোড করা যায়নি। ইন্টারনেট ও ডেটাবেসের পথ পরীক্ষা করুন।'
    );

    render();
  }
}

// নির্দিষ্ট আয়াতের বাংলা অনুবাদ
function getBengaliAyah(surah, ayah) {
  if (!quranDB) return 'ডেটাবেস লোড হওয়ার অপেক্ষায়...';

  const statement = quranDB.prepare(
    `SELECT c2text
     FROM verses_content
     WHERE c0sura = ? AND c1ayah = ?
     LIMIT 1`
  );

  try {
    statement.bind([surah, ayah]);

    if (statement.step()) {
      return statement.getAsObject().c2text || 'অনুবাদ পাওয়া যায়নি।';
    }

    return 'এই আয়াতের অনুবাদ পাওয়া যায়নি।';

  } finally {
    statement.free();
  }
}

// স্থানীয়ভাবে সংরক্ষণ
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    $('saveStatus').textContent = 'নোট সংরক্ষিত';
  } catch (error) {
    $('saveStatus').textContent = 'সংরক্ষণে সমস্যা হয়েছে';
  }
}

// নোট লোড
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));

    if (saved) {
      state = { ...state, ...saved };
    }
  } catch (error) {
    console.warn('পুরোনো নোট লোড করা যায়নি।');
  }

  render();
}

// আয়াতের টেবিল তৈরি
function render() {
  const body = $('ayahRows');
  body.innerHTML = '';

  if (!state.ayahs.length) {
    const tr = document.createElement('tr');
    tr.className = 'empty';

    const td = document.createElement('td');
    td.colSpan = 4;
    td.textContent = 'এখনো কোনো আয়াত যোগ করা হয়নি।';

    tr.appendChild(td);
    body.appendChild(tr);
  }

  state.ayahs.forEach((a, i) => {
    const tr = document.createElement('tr');

    const ref = document.createElement('td');
    ref.textContent = `${a.surah}:${a.ayah}`;

    const arabic = document.createElement('td');
    arabic.className = 'arabic';
    arabic.dir = 'rtl';
    arabic.textContent =
      'যাচাইকৃত আরবি ডেটা সংযুক্তির অপেক্ষায়';

    const bengali = document.createElement('td');
    bengali.textContent = getBengaliAyah(a.surah, a.ayah);

    const action = document.createElement('td');
    const remove = document.createElement('button');

    remove.className = 'secondary';
    remove.textContent = 'বাদ দিন';
    remove.dataset.remove = i;

    action.appendChild(remove);

    tr.append(ref, arabic, bengali, action);
    body.appendChild(tr);
  });

  // ব্যক্তিগত নোটের তালিকা
  const sel = $('noteAyah');
  sel.innerHTML = '';

  if (!state.ayahs.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'প্রথমে আয়াত যোগ করুন';
    sel.appendChild(option);
  }

  state.ayahs.forEach(a => {
    const option = document.createElement('option');

    option.value = `${a.surah}:${a.ayah}`;
    option.textContent = `সূরা ${a.surah}, আয়াত ${a.ayah}`;

    sel.appendChild(option);
  });

  $('groupNote').value = state.groupNote || '';

  loadIndividual();
}

// ব্যক্তিগত নোট লোড
function loadIndividual() {
  const key = $('noteAyah').value;
  $('individualNote').value =
    state.individualNotes[key] || '';
}

// আয়াত যোগ
$('addAyah').addEventListener('click', () => {
  const surah = Number($('surah').value);
  const ayah = Number($('ayah').value);

  if (!quranDB) {
    return alert('প্রথমে বাংলা ডেটাবেস লোড হতে দিন।');
  }

  if (!Number.isInteger(surah) || surah < 1 || surah > 114 ||
      !Number.isInteger(ayah) || ayah < 1) {
    return alert('সঠিক সূরা ও আয়াত নম্বর দিন।');
  }

  const translation = getBengaliAyah(surah, ayah);

  if (translation === 'এই আয়াতের অনুবাদ পাওয়া যায়নি।') {
    return alert('এই আয়াতের অনুবাদ ডেটাবেসে পাওয়া যায়নি।');
  }

  const key = `${surah}:${ayah}`;

  if (state.ayahs.some(a => `${a.surah}:${a.ayah}` === key)) {
    return alert('এই আয়াতটি আগে যোগ করা হয়েছে।');
  }

  state.ayahs.push({ surah, ayah });

  persist();
  render();
});

// আয়াত বাদ দেওয়া
$('ayahRows').addEventListener('click', event => {
  const index = event.target.dataset.remove;

  if (index !== undefined) {
    state.ayahs.splice(Number(index), 1);
    persist();
    render();
  }
});

// নোট নির্বাচন
$('noteAyah').addEventListener('change', loadIndividual);

// নোট সংরক্ষণ
$('saveNotes').addEventListener('click', () => {
  const key = $('noteAyah').value;

  if (key) {
    state.individualNotes[key] =
      $('individualNote').value;
  }

  state.groupNote = $('groupNote').value;

  persist();

  alert('নোট এই ডিভাইসে সংরক্ষণ করা হয়েছে।');
});

// সামগ্রিক নোট
$('groupNote').addEventListener('input', () => {
  state.groupNote = $('groupNote').value;
  persist();
});

// ব্যক্তিগত নোট
$('individualNote').addEventListener('input', () => {
  const key = $('noteAyah').value;

  if (key) {
    state.individualNotes[key] =
      $('individualNote').value;

    persist();
  }
});

// সব আয়াত মুছে ফেলা
$('clearAll').addEventListener('click', () => {
  if (confirm('সব নির্বাচিত আয়াত মুছবেন?')) {
    state.ayahs = [];
    persist();
    render();
  }
});

// JSON Backup
$('exportNotes').addEventListener('click', () => {
  state.groupNote = $('groupNote').value;

  const blob = new Blob(
    [JSON.stringify(state, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'quran-study-backup.json';
  link.click();

  URL.revokeObjectURL(url);
});

// Backup Import
$('importNotes').addEventListener('change', async event => {
  try {
    const file = event.target.files[0];
    if (!file) return;

    const data = JSON.parse(await file.text());

    if (!Array.isArray(data.ayahs)) {
      throw new Error('Invalid backup');
    }

    state = { ...state, ...data };

    persist();
    render();

    alert('Backup Import হয়েছে।');

  } catch (error) {
    alert('Backup ফাইলটি সঠিক নয়।');
  }

  event.target.value = '';
});

// A5 Print
$('printPage').addEventListener('click', () => {
  window.print();
});

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .catch(error => console.warn(error));
  });
}

// অ্যাপ চালু
load();
loadDatabase();
