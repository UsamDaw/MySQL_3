// ========== AUTENTISERING OG BRUKER-RELATERTE FUNKSJONER ==========

async function loggInn() {
  const brukernavn = document.getElementById('brukernavn').value;
  const passord = document.getElementById('passord').value;

  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brukernavn, passord })
  });

  const data = await res.json();

  if (res.ok) {
    localStorage.setItem('bruker', JSON.stringify(data.bruker));
    window.location.href = 'dashboard.html';
  } else {
    document.getElementById('feilmelding').textContent = data.message || 'Feil ved innlogging';
  }
}

function loggUt() {
  localStorage.removeItem('bruker');
  localStorage.removeItem('aktivQuiz');
  localStorage.removeItem('besvarelseId');
  window.location.href = 'index.html';
}

function hentBruker() {
  const bruker = JSON.parse(localStorage.getItem('bruker'));
  if (!bruker) {
    window.location.href = 'index.html';
    return null;
  }
  return bruker;
}

// ========== DASHBOARD-FUNKSJONALITET ==========

document.addEventListener('DOMContentLoaded', () => {
  // Sjekk hvilken side vi er p
  const currentPage = window.location.pathname.split('/').pop();
  
  if (currentPage === 'dashboard.html') {
    initDashboard();
  } else if (currentPage === 'quiz.html') {
    initQuizSide();
  } else if (currentPage === 'resultater.html') {
    initResultaterSide();
  }
});

function initDashboard() {
  const bruker = hentBruker();
  if (!bruker) return;

  document.getElementById('velkommen').textContent = `Velkommen, ${bruker.brukernavn} (${bruker.rolle})`;

  if (bruker.rolle === 'lrer') {
    document.getElementById('innhold').innerHTML = `
      <h3>Quiz-administrasjon</h3>
      <button onclick="window.location.href='quiz.html'">Opprett ny quiz</button>
      <button onclick="window.location.href='resultater.html'">Se resultater</button>
    `;
  } else {
    document.getElementById('innhold').innerHTML = `
      <h3>Velg en quiz  ta:</h3>
      <ul id="quizliste"></ul>
    `;
    hentTilgjengeligeQuizer();
  }
}

async function hentTilgjengeligeQuizer() {
  const res = await fetch('http://localhost:3000/api/quiz');
  const quizer = await res.json();
  const liste = document.getElementById('quizliste');

  quizer.forEach(q => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="quiz.html?id=${q.id}">${q.quiz_navn}</a>`;
    liste.appendChild(li);
  });
}

// ========== QUIZ-FUNKSJONALITET ==========

function initQuizSide() {
  const bruker = hentBruker();
  if (!bruker) return;

  // Sjekk om vi skal vise lrer- eller elev-visning
  if (bruker.rolle === 'lrer') {
    document.getElementById('lrer-visning').style.display = 'block';
    
    // Sjekk om vi jobber med en eksisterende quiz
    const aktivQuiz = JSON.parse(localStorage.getItem('aktivQuiz'));
    if (aktivQuiz) {
      visSprsmlsForm(aktivQuiz);
    }
  } else {
    document.getElementById('elev-visning').style.display = 'block';
    
    // Sjekk om eleven skal ta en quiz
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('id');
    
    if (quizId) {
      startQuiz(quizId);
    } else {
      window.location.href = 'dashboard.html';
    }
  }
}

// ========== LRER: QUIZ-OPPRETTELSE ==========

async function opprettQuiz() {
  const bruker = hentBruker();
  const quizNavn = document.getElementById('quiz-navn').value;
  const tidsgrense = document.getElementById('tidsgrense').value || 0;
  if (!quizNavn) {
    alert('Vennligst angi et quiz-navn');
    return;
  }
  try {
    const res = await fetch('http://localhost:3000/api/quiz/opprett', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        lrer_id: bruker.id, 
        quiz_navn: quizNavn,
        tidsgrense_minutter: parseInt(tidsgrense)
      })
    });
    const data = await res.json();
    if (res.ok) {
      const aktivQuiz = {
        id: data.quizId, // 💡 Burada id'nin kesinlikle sayı olduğundan emin olduk
        navn: quizNavn,
        tidsgrense: parseInt(tidsgrense)
      };
      localStorage.setItem('aktivQuiz', JSON.stringify(aktivQuiz));
      visSprsmlsForm(aktivQuiz);
    } else {
      alert('Feil ved opprettelse av quiz: ' + data.message);
    }
  } catch (err) {
    console.error('Feil ved API-kall:', err);
    alert('En feil oppstod. Prv igjen senere.');
  }
}

function visSprsmlsForm(quizInfo) {
  document.getElementById('opprett-quiz').style.display = 'none';
  document.getElementById('legg-til-sprsml').style.display = 'block';
  document.getElementById('valgt-quiz-navn').textContent = `Quiz: ${quizInfo.navn} ${quizInfo.tidsgrense > 0 ? `(Tidsgrense: ${quizInfo.tidsgrense} minutter)` : ''}`;

  // Sett opp skjema for  legge til sprsml
  document.getElementById('sprsml-form').addEventListener('submit', function(e) {
    e.preventDefault();
    leggTilSprsml();
  });

  // Last inn eksisterende sprsml hvis vi jobber med en eksisterende quiz
  hentSprsmlForQuiz(quizInfo.id);
}

async function leggTilSprsml() {
  const aktivQuiz = JSON.parse(localStorage.getItem('aktivQuiz'));
 
  if (!aktivQuiz || !aktivQuiz.id) {
    alert("Ingen aktiv quiz funnet. Prv  opprette en ny.");
    return;
  }
 
  const sprsmlData = {
    quiz_id: aktivQuiz.id,
    sprsmlstekst: document.getElementById('sprsmlstekst').value,
    riktig_svar: document.getElementById('riktig-svar').value,
    feil_svar_1: document.getElementById('feil-svar-1').value,
    feil_svar_2: document.getElementById('feil-svar-2').value,
    feil_svar_3: document.getElementById('feil-svar-3').value
  };
 
  try {
    const res = await fetch('http://localhost:3000/api/quiz/sprsml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sprsmlData)
    });
 
    const data = await res.json();
    console.log(data);
    
    if (res.ok) {
      document.getElementById('sprsml-form').reset();
      hentSprsmlForQuiz(aktivQuiz.id);
      alert('Sprsml lagt til!');
    } else {
      alert('Feil ved lagring av sprsml: ' + data.message);
    }
  } catch (err) {
    console.error('Feil ved API-kall:', err);
    alert('En feil oppstod. Prv igjen senere.');
  }
}

async function hentSprsmlForQuiz(quizId) {
  if (!quizId || isNaN(quizId)) {
    console.error("Ugyldig quizId:", quizId);
    return;
  }
 
  try {
    const res = await fetch(`http://localhost:3000/api/quiz/${quizId}/sprsml`);
    if (!res.ok) {
      const tekst = await res.text();
      throw new Error(`Feil: ${res.status} - ${tekst}`);
    }
 
    const data = await res.json();
    const sprsmlListe = document.getElementById('sprsml-oversikt');
    sprsmlListe.innerHTML = '';
 
    if (data.sprsml && data.sprsml.length > 0) {
      data.sprsml.forEach((sp, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
<strong>Sprsml ${index + 1}:</strong> ${sp.sprsmlstekst}<br>
<em>Riktig svar:</em> ${sp.riktig_svar}
        `;
        sprsmlListe.appendChild(li);
      });
    } else {
      sprsmlListe.innerHTML = '<li>Ingen sprsml lagt til enn.</li>';
    }
  } catch (err) {
    console.error('Feil ved henting av sprsml:', err);
  }
}

function ferdigMedQuiz() {
  localStorage.removeItem('aktivQuiz');
  alert('Quiz er ferdig opprettet!');
  window.location.href = 'dashboard.html';
}

// ========== ELEV: QUIZ-BESVARELSE ==========
let currentQuizData = {
  sprsml: [],
  aktivtSprsmlIndex: 0,
  svar: [],
  tidBegynt: null,
  tidsgrense: 0,
  timer: null,
  besvarelseId: null
};

async function startQuiz(quizId) {
  try {
    const res = await fetch(`http://localhost:3000/api/quiz/${quizId}/sprsml`);
    const data = await res.json();
    
    if (!data.sprsml || data.sprsml.length === 0) {
      alert('Denne quizen har ingen sprsml enn.');
      window.location.href = 'dashboard.html';
      return;
    }
    
    // Opprett en besvarelse
    const bruker = hentBruker();
    const besvarelseRes = await fetch('http://localhost:3000/api/quiz/besvarelse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ elev_id: bruker.id, quiz_id: quizId })
    });
    
    const besvarelseData = await besvarelseRes.json();
    
    if (besvarelseRes.ok) {
      // Sett opp quiz-data
      currentQuizData = {
        sprsml: data.sprsml,
        aktivtSprsmlIndex: 0,
        svar: Array(data.sprsml.length).fill(null),
        tidBegynt: new Date(),
        tidsgrense: data.tidsgrense || 0,
        timer: null,
        besvarelseId: besvarelseData.besvarelseId
      };
      
      // Lagre besvarelseId i localStorage
      localStorage.setItem('besvarelseId', besvarelseData.besvarelseId);
      
      // Last inn frste sprsml
      visAktivtSprsml();
      
      // Sett opp timer hvis tidsgrense er satt
      if (currentQuizData.tidsgrense > 0) {
        startTidtaker();
      } else {
        document.getElementById('tid-gjenstr').style.display = 'none';
      }
      
    // Hent quiznavn
    const quizRes = await fetch(`http://localhost:3000/api/quiz`);
    const quizData = await quizRes.json();
    const currentQuiz = quizData.find(q => q.id == quizId);
    
    if (currentQuiz) {
      document.getElementById('quiz-tittel').textContent = currentQuiz.quiz_navn;
    }
  } else {
    alert('Feil ved start av quiz: ' + besvarelseData.message);
    window.location.href = 'dashboard.html';
  }
} catch (err) {
  console.error('Feil ved API-kall:', err);
  alert('En feil oppstod. Prv igjen senere.');
  window.location.href = 'dashboard.html';
}
}

function startTidtaker() {
const sluttTid = new Date(currentQuizData.tidBegynt.getTime() + currentQuizData.tidsgrense * 60000);

function oppdaterTid() {
  const n = new Date();
  const differanse = sluttTid - n;
  
  if (differanse <= 0) {
    clearInterval(currentQuizData.timer);
    document.getElementById('tid-gjenstr').textContent = 'Tiden er ute!';
    fullfrQuiz(true);
    return;
  }
  
  const minutter = Math.floor(differanse / 60000);
  const sekunder = Math.floor((differanse % 60000) / 1000);
  document.getElementById('tid-gjenstr').textContent = `Tid gjenstr: ${minutter}m ${sekunder}s`;
}

oppdaterTid(); // Kjr umiddelbart
currentQuizData.timer = setInterval(oppdaterTid, 1000);
}

function visAktivtSprsml() {
const sprsmlIndex = currentQuizData.aktivtSprsmlIndex;
const sprsml = currentQuizData.sprsml[sprsmlIndex];
const container = document.getElementById('sprsml-container');

// Opprett liste med svaralternativer i tilfeldig rekkeflge
const svaralternativer = [
  { tekst: sprsml.riktig_svar, erRiktig: true },
  { tekst: sprsml.feil_svar_1, erRiktig: false },
  { tekst: sprsml.feil_svar_2, erRiktig: false },
  { tekst: sprsml.feil_svar_3, erRiktig: false }
];

// Bland svaralternativene
for (let i = svaralternativer.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [svaralternativer[i], svaralternativer[j]] = [svaralternativer[j], svaralternativer[i]];
}

// Bygg HTML for sprsmlet
let html = `
  <div class="sprsml" data-id="${sprsml.id}">
    <h3>Sprsml ${sprsmlIndex + 1} av ${currentQuizData.sprsml.length}</h3>
    <p>${sprsml.sprsmlstekst}</p>
    <ul class="svaralternativer">
`;

svaralternativer.forEach((alt, i) => {
  html += `
    <li class="svaralternativ ${currentQuizData.svar[sprsmlIndex] === alt.tekst ? 'valgt' : ''}" 
        onclick="velgSvar(${sprsmlIndex}, '${alt.tekst}', '${sprsml.riktig_svar}')">
      ${alt.tekst}
    </li>
  `;
});

html += `
    </ul>
  </div>
`;

container.innerHTML = html;

// Oppdater navigasjonsknapper
document.getElementById('forrige-knapp').disabled = sprsmlIndex === 0;
document.getElementById('neste-knapp').style.display = sprsmlIndex === currentQuizData.sprsml.length - 1 ? 'none' : 'block';
document.getElementById('fullfr-knapp').style.display = sprsmlIndex === currentQuizData.sprsml.length - 1 ? 'block' : 'none';
}

async function velgSvar(sprsmlIndex, valgtSvar, riktigSvar) {
// Oppdater svar i currentQuizData
currentQuizData.svar[sprsmlIndex] = valgtSvar;

// Oppdater visuell indikator
const svaralternativer = document.querySelectorAll('.svaralternativ');
svaralternativer.forEach(alt => {
  alt.classList.remove('valgt');
  if (alt.textContent.trim() === valgtSvar) {
    alt.classList.add('valgt');
  }
});

// Lagre svaret i databasen
try {
  const sprsmlId = currentQuizData.sprsml[sprsmlIndex].id;
  
  await fetch('http://localhost:3000/api/quiz/svar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      besvarelse_id: currentQuizData.besvarelseId,
      sprsml_id: sprsmlId,
      gitt_svar: valgtSvar,
      riktig_svar: riktigSvar
    })
  });
} catch (err) {
  console.error('Feil ved lagring av svar:', err);
}
}

function navigerTilForrigeSprsml() {
if (currentQuizData.aktivtSprsmlIndex > 0) {
  currentQuizData.aktivtSprsmlIndex--;
  visAktivtSprsml();
}
}

function navigerTilNesteSprsml() {
if (currentQuizData.aktivtSprsmlIndex < currentQuizData.sprsml.length - 1) {
  currentQuizData.aktivtSprsmlIndex++;
  visAktivtSprsml();
}
}

async function fullfrQuiz(tidUtlpt = false) {
// Stopp tidtakeren hvis den kjrer
if (currentQuizData.timer) {
  clearInterval(currentQuizData.timer);
}

// Sjekk om alle sprsml er besvart
const ubesvarte = currentQuizData.svar.filter(s => s === null).length;

if (!tidUtlpt && ubesvarte > 0) {
  const bekreft = confirm(`Du har ${ubesvarte} ubesvarte sprsml. Er du sikker p at du vil fullfre quizen?`);
  if (!bekreft) return;
}

try {
  // Vurder quizen
  const vurderRes = await fetch('http://localhost:3000/api/quiz/vurder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      besvarelse_id: currentQuizData.besvarelseId
    })
  });
  
  const resultatData = await vurderRes.json();
  
  if (vurderRes.ok) {
    // Vis resultat
    document.getElementById('ta-quiz').style.display = 'none';
    document.getElementById('quiz-resultat').style.display = 'block';
    
    const antallRiktige = resultatData.poengsum;
    const totalAntall = currentQuizData.sprsml.length;
    const prosentRiktig = Math.round((antallRiktige / totalAntall) * 100);
    
    document.getElementById('poengsum').innerHTML = `
      Du fikk <strong>${antallRiktige} av ${totalAntall}</strong> sprsml riktig (${prosentRiktig}%).
    `;
    
    // Vis detaljert resultat
    let detaljerHTML = '<h3>Detaljert resultat</h3><ul>';
    
    currentQuizData.sprsml.forEach((sp, i) => {
      const svar = currentQuizData.svar[i];
      const erRiktig = svar === sp.riktig_svar;
      
      detaljerHTML += `
        <li style="margin-bottom: 15px; ${erRiktig ? 'color: green;' : 'color: red;'}">
          <strong>Sprsml ${i + 1}:</strong> ${sp.sprsmlstekst}<br>
          <strong>Ditt svar:</strong> ${svar || 'Ikke besvart'}<br>
          <strong>Riktig svar:</strong> ${sp.riktig_svar}
        </li>
      `;
    });
    
    detaljerHTML += '</ul>';
    document.getElementById('resultat-detaljer').innerHTML = detaljerHTML;
  } else {
    alert('Feil ved vurdering av quiz: ' + resultatData.message);
  }
} catch (err) {
  console.error('Feil ved API-kall:', err);
  alert('En feil oppstod ved vurdering av quizen. Prv igjen senere.');
}
}

// ========== RESULTATER-SIDE FUNKSJONALITET ==========

function initResultaterSide() {
const bruker = hentBruker();
if (!bruker) return;

if (bruker.rolle === 'lrer') {
  document.getElementById('lrer-resultater').style.display = 'block';
  lastQuizVelger();
} else {
  document.getElementById('elev-resultater').style.display = 'block';
  hentElevProgresjon(bruker.id);
}
}

async function lastQuizVelger() {
try {
  const res = await fetch('http://localhost:3000/api/quiz');
  const quizer = await res.json();
  
  const velger = document.getElementById('quiz-velger');
  velger.innerHTML = '<option value="">Velg quiz</option>';
  
  quizer.forEach(q => {
    const option = document.createElement('option');
    option.value = q.id;
    option.textContent = q.quiz_navn;
    velger.appendChild(option);
  });
} catch (err) {
  console.error('Feil ved henting av quizer:', err);
}
}

async function hentResultaterForQuiz() {
const quizId = document.getElementById('quiz-velger').value;

if (!quizId) return;

try {
  const res = await fetch(`http://localhost:3000/api/quiz/resultater/${quizId}`);
  const resultater = await res.json();
  
  const resultatTabell = document.getElementById('resultat-data');
  resultatTabell.innerHTML = '';
  
  if (resultater.length === 0) {
    resultatTabell.innerHTML = '<tr><td colspan="4">Ingen resultater for denne quizen enn.</td></tr>';
    document.getElementById('statistikk-oversikt').style.display = 'none';
    return;
  }
  
  let totalPoengsum = 0;
  let hyesteScore = 0;
  let lavesteScore = Number.MAX_VALUE;
  
  resultater.forEach((r) => {
    const tr = document.createElement('tr');
    
    // Formater dato
    const dato = new Date(r.fullfrt_dato);
    const formatertDato = dato.toLocaleDateString('no-NO', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    tr.innerHTML = `
      <td>${r.brukernavn}</td>
      <td>${r.poengsum}</td>
      <td>${formatertDato || 'Ukjent'}</td>
      <td><button onclick="visDetaljer(${r.besvarelse_id})">Vis detaljer</button></td>
    `;
    
    resultatTabell.appendChild(tr);
    
    // Oppdater statistikk
    totalPoengsum += r.poengsum;
    hyesteScore = Math.max(hyesteScore, r.poengsum);
    lavesteScore = Math.min(lavesteScore, r.poengsum);
  });
  
  // Vis statistikk
  document.getElementById('statistikk-oversikt').style.display = 'block';
  
  const gjennomsnitt = totalPoengsum / resultater.length;
  document.getElementById('gjennomsnitt').textContent = `Gjennomsnittlig poengsum: ${gjennomsnitt.toFixed(1)}`;
  document.getElementById('hyeste-score').textContent = `Hyeste score: ${hyesteScore}`;
  document.getElementById('laveste-score').textContent = `Laveste score: ${lavesteScore}`;
  
  // Her kan du implementere en graf hvis du nsker, f.eks. med Chart.js
  
} catch (err) {
  console.error('Feil ved henting av resultater:', err);
}
}

function visDetaljer(besvarelseId) {
// Dette kan implementeres senere for  vise detaljerte svar for en besvarelse
alert('Detaljvisning kommer snart!');
}

async function hentElevProgresjon(elevId) {
try {
  const res = await fetch(`http://localhost:3000/api/quiz/progresjon/${elevId}`);
  const progresjon = await res.json();
  
  const progresjonTabell = document.getElementById('progresjon-data');
  progresjonTabell.innerHTML = '';
  
  if (progresjon.length === 0) {
    progresjonTabell.innerHTML = '<tr><td colspan="3">Du har ikke tatt noen quizer enn.</td></tr>';
    document.getElementById('progresjon-graf').style.display = 'none';
    return;
  }
  
  progresjon.forEach((p) => {
    const tr = document.createElement('tr');
    
    // Formater dato
    const dato = new Date(p.fullfrt_dato);
    const formatertDato = dato.toLocaleDateString('no-NO', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
    
    tr.innerHTML = `
      <td>${p.quiz_navn}</td>
      <td>${p.poengsum}</td>
      <td>${formatertDato || 'Ukjent'}</td>
    `;
    
    progresjonTabell.appendChild(tr);
  });
  
  // Her kan du implementere en graf for  vise progresjonen over tid
  
} catch (err) {
  console.error('Feil ved henting av progresjon:', err);
}
}

function registrer() {
  window.location.href = "register.html";
}
