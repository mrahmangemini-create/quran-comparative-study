const KEY='quranStudyWorkspace.v1';let state={ayahs:[],individualNotes:{},groupNote:''};
const $=id=>document.getElementById(id);
function persist(){localStorage.setItem(KEY,JSON.stringify(state));$('saveStatus').textContent='সংরক্ষিত';}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s)state={...state,...s};}catch(e){} render();}
function render(){const body=$('ayahRows');body.innerHTML='';if(!state.ayahs.length)body.innerHTML='<tr class="empty"><td colspan="4">এখনো কোনো আয়াত যোগ করা হয়নি।</td></tr>';state.ayahs.forEach((a,i)=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${a.surah}:${a.ayah}</td><td class="arabic" dir="rtl">আরবি মূল ডেটা সংযুক্তির অপেক্ষায়</td><td>Greentech বাংলা অনুবাদ সংযুক্তির অপেক্ষায়</td><td><button class="secondary" data-remove="${i}">বাদ দিন</button></td>`;body.appendChild(tr);});const sel=$('noteAyah');sel.innerHTML=state.ayahs.length?'':'<option value="">প্রথমে আয়াত যোগ করুন</option>';state.ayahs.forEach(a=>{const o=document.createElement('option');o.value=`${a.surah}:${a.ayah}`;o.textContent=`সূরা ${a.surah}, আয়াত ${a.ayah}`;sel.appendChild(o)});$('groupNote').value=state.groupNote||'';loadIndividual();}
function loadIndividual(){const k=$('noteAyah').value;$('individualNote').value=state.individualNotes[k]||'';}
$('addAyah').addEventListener('click',()=>{const s=Number($('surah').value),a=Number($('ayah').value);if(!a||a<1)return alert('সঠিক আয়াত নম্বর দিন।');const key=`${s}:${a}`;if(state.ayahs.some(x=>`${x.surah}:${x.ayah}`===key))return alert('এই আয়াতটি আগে যোগ করা হয়েছে।');state.ayahs.push({surah:s,ayah:a});persist();render();});
$('ayahRows').addEventListener('click',e=>{const i=e.target.dataset.remove;if(i!==undefined){state.ayahs.splice(Number(i),1);persist();render();}});
$('noteAyah').addEventListener('change',loadIndividual);
$('saveNotes').addEventListener('click',()=>{const k=$('noteAyah').value;if(k)state.individualNotes[k]=$('individualNote').value;state.groupNote=$('groupNote').value;persist();alert('নোট এই ডিভাইসে সংরক্ষণ করা হয়েছে। Backup রাখুন।');});
$('groupNote').addEventListener('input',()=>{state.groupNote=$('groupNote').value;persist()});
$('individualNote').addEventListener('input',()=>{const k=$('noteAyah').value;if(k){state.individualNotes[k]=$('individualNote').value;persist()}});
$('clearAll').addEventListener('click',()=>{if(confirm('সব নির্বাচিত আয়াত মুছবেন?')){state.ayahs=[];persist();render()}});
$('exportNotes').addEventListener('click',()=>{state.groupNote=$('groupNote').value;const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='quran-study-backup.json';a.click();URL.revokeObjectURL(a.href)});
$('importNotes').addEventListener('change',async e=>{try{const f=e.target.files[0];if(!f)return;const data=JSON.parse(await f.text());if(!Array.isArray(data.ayahs))throw Error();state={...state,...data};persist();render();alert('Backup Import হয়েছে।')}catch(err){alert('Backup ফাইলটি সঠিক নয়।')}});
$('printPage').addEventListener('click',()=>window.print());
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
load();
