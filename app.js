
const KEY = 'quranStudyWorkspace.v1';

let state = {
  ayahs: [],
  individualNotes: {},
  groupNote: ''
};

let quranData = null;
let surahMap = new Map();

const $ = id => document.getElementById(id);

function setStatus(message) {
  const el = $('saveStatus');
  if (el) el.textContent = message;
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(state));
  setStatus('সংরক্ষিত');
}

// নতুন Quran JSON-এর ডেটাকে অ্যাপের উপযোগী করা
function normalizeQuranData(raw) {
  const source = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.surahs)
      ? raw.surahs
      : null;

  if (!source || source.length !== 114) {
    throw new Error('JSON-এ ১১৪টি সূরা পাওয়া যায়নি।');
  }

  const surahs = source.map(surah => {
    const verses = surah.verses || surah.ayahs || [];

    return {
      index: Number(surah.id ?? surah.index),
      name: surah.transliteration || surah.name || '',
      arabicName: surah.name || '',
      translation: surah.translation || '',
      totalVerses: Number(surah.total_verses ?? verses.length),

      ayahs: verses.map(verse => ({
        index: Number(verse.id ?? verse.index),
        text: verse.text || '',
        translation: verse.translation || '',
        transliteration: verse.transliteration || ''
      }))
    };
  });

  return { surahs };
}

function getAyah(surah, ayah) {
  const surahData = surahMap.get(Number(surah));
  if (!surahData) return null;

  return surahData.ayahs.find(
    item => item.index === Number(ayah)
  ) || null;
}

function populateSurahs() {
  const select = $('surah');
  select.innerHTML = '';

  quranData.surahs.forEach(surah => {
    const option = document.createElement('option');

    option.value = String(surah.index);
    option.textContent =
      `${surah.name} — ${surah.translation} (${surah.index})`;

    select.appendChild(option);
  });

  select.value = '1';
  updateAyahLimit();
}

function updateAyahLimit() {
  const surahNumber = Number($('surah').value);
  const surahData = surahMap.get(surahNumber);
  const ayahInput = $('ayah');

  if (!surahData) return;

  ayahInput.min = '1';
  ayahInput.max = String(surahData.ayahs.length);
  ayahInput.value = '1';
}

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

  state.ayahs.forEach((item, index) => {
    const tr = document.createElement('tr');

    const reference = document.createElement('td');
    reference.textContent = `${item.surah}:${item.ayah}`;

    const arabic = document.createElement('td');
    arabic.className = 'arabic';
    arabic.dir = 'rtl';

    const ayahData = getAyah(item.surah, item.ayah);

    arabic.textContent = ayahData
      ? ayahData.text
      : 'এই আয়াতের আরবি পাঠ পাওয়া যায়নি।';

    const translation = document.createElement('td');

    translation.textContent = ayahData
      ? ayahData.translation
      : 'এই আয়াতের বাংলা অনুবাদ পাওয়া যায়নি।';

    const action = document.createElement('td');

    const removeButton = document.createElement('button');
    removeButton.className = 'secondary';
    removeButton.type = 'button';
    removeButton.dataset.remove = String(index);
    removeButton.textContent = 'বাদ দিন';

    action.appendChild(removeButton);
    tr.append(reference, arabic, translation, action);
    body.appendChild(tr);
  });

  const noteSelect = $('noteAyah');
  const previousValue = noteSelect.value;

  noteSelect.innerHTML = '';

  if (!state.ayahs.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'প্রথমে আয়াত যোগ করুন';
    noteSelect.appendChild(option);
  } else {
    state.ayahs.forEach(item => {
      const option = document.createElement('option');

      option.value = `${item.surah}:${item.ayah}`;
      option.textContent =
        `সূরা ${item.surah}, আয়াত ${item.ayah}`;

      noteSelect.appendChild(option);
    });

    if (
      state.ayahs.some(
        item => `${item.surah}:${item.ayah}` === previousValue
      )
    ) {
      noteSelect.value = previousValue;
    }
  }

  $('groupNote').value = state.groupNote || '';
  loadIndividual();
}

function loadIndividual() {
  const key = $('noteAyah').value;
  $('individualNote').value =
    state.individualNotes[key] || '';
}

function loadSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));

    if (saved && typeof saved === 'object') {
      state = { ...state, ...saved };
    }
  } catch (error) {
    console.warn('Saved workspace could not be read.', error);
  }
}

async function initialize() {
  try {
    const response = await fetch('./data/quran_bn.json');

    if (!response.ok) {
      throw new Error(
        `JSON file load failed: ${response.status}`
      );
    }

    const rawData = await response.json();

    quranData = normalizeQuranData(rawData);

    surahMap = new Map(
      quranData.surahs.map(
        surah => [surah.index, surah]
      )
    );

    loadSavedState();
    populateSurahs();
    render();

    const notice = document.querySelector('.notice');

    if (notice) {
      notice.textContent =
        'আরবি আয়াত ও মুহিউদ্দীন খান-এর বাংলা অনুবাদ ডেটাসেট থেকে লোড করা হচ্ছে।';
    }

    setStatus('আরবি ও বাংলা ডেটা লোড হয়েছে');

  } catch (error) {
    console.error(error);

    setStatus('ডেটা লোড হয়নি');

    alert(
      'কুরআনের ডেটা লোড করা যায়নি। ' +
      'data/quran_bn.json ফাইলের অবস্থান ও JSON কাঠামো পরীক্ষা করুন।'
    );
  }
}

$('surah').addEventListener('change', updateAyahLimit);

$('addAyah').addEventListener('click', () => {
  const surah = Number($('surah').value);
  const ayah = Number($('ayah').value);

  const surahData = surahMap.get(surah);

  if (
    !surahData ||
    !Number.isInteger(ayah) ||
    ayah < 1 ||
    ayah > surahData.ayahs.length
  ) {
    alert('এই সূরার জন্য সঠিক আয়াত নম্বর দিন।');
    return;
  }

  const key = `${surah}:${ayah}`;

  if (
    state.ayahs.some(
      item => `${item.surah}:${item.ayah}` === key
    )
  ) {
    alert('এই আয়াতটি আগে যোগ করা হয়েছে।');
    return;
  }

  state.ayahs.push({ surah, ayah });

  persist();
  render();
});

$('ayahRows').addEventListener('click', event => {
  const index = event.target.dataset.remove;

  if (index !== undefined) {
    state.ayahs.splice(Number(index), 1);

    persist();
    render();
  }
});

$('noteAyah').addEventListener('change', loadIndividual);

$('saveNotes').addEventListener('click', () => {
  const key = $('noteAyah').value;

  if (key) {
    state.individualNotes[key] =
      $('individualNote').value;
  }

  state.groupNote = $('groupNote').value;

  persist();

  alert('নোট এই ডিভাইসে সংরক্ষণ করা হয়েছে। Backup রাখুন।');
});

$('groupNote').addEventListener('input', () => {
  state.groupNote = $('groupNote').value;
  persist();
});

$('individualNote').addEventListener('input', () => {
  const key = $('noteAyah').value;

  if (key) {
    state.individualNotes[key] =
      $('individualNote').value;

    persist();
  }
});

$('clearAll').addEventListener('click', () => {
  if (confirm('সব নির্বাচিত আয়াত মুছবেন?')) {
    state.ayahs = [];

    persist();
    render();
  }
});

$('exportNotes').addEventListener('click', () => {
  state.groupNote = $('groupNote').value;

  const blob = new Blob(
    [JSON.stringify(state, null, 2)],
    { type: 'application/json' }
  );

  const link = document.createElement('a');

  link.href = URL.createObjectURL(blob);
  link.download = 'quran-study-backup.json';

  link.click();

  URL.revokeObjectURL(link.href);
});

$('importNotes').addEventListener('change', async event => {
  try {
    const file = event.target.files[0];
    if (!file) return;

    const imported = JSON.parse(await file.text());

    if (!Array.isArray(imported.ayahs)) {
      throw new Error('Invalid backup');
    }

    state = { ...state, ...imported };

    persist();
    render();

    alert('Backup Import হয়েছে।');

  } catch (error) {
    alert('Backup ফাইলটি সঠিক নয়।');

  } finally {
    event.target.value = '';
  }
});

$('printPage').addEventListener('click', () => {
  window.print();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .catch(error => {
        console.warn(
          'Service worker registration failed:',
          error
        );
      });
  });
}

initialize();
