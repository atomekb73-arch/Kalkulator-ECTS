/**
 * Główny kontroler aplikacji Kalkulator ECTS
 */

import { GRADES, getGradeInfo, calculateSemesterStats, calculateOverallStats, simulateTargetAverage } from './calculator.js';
import { loadData, saveData, loadTheme, saveTheme, exportToJson, exportToCsv, importFromJson, DEFAULT_DATA } from './storage.js';
import { parsePastedText } from './parser.js';

// Stan aplikacji
let appData = loadData();
let gradeChartInstance = null;
let semesterChartInstance = null;

// Inicjalizacja po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderSemesters();
  updateCalculations();
  setupEventListeners();
  initIcons();
});

function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Obsługa motywów (Jasny / Ciemny)
 */
function initTheme() {
  const currentTheme = loadTheme();
  if (currentTheme === 'dark' || (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  updateThemeIcon();
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  if (newTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  saveTheme(newTheme);
  updateThemeIcon();
  updateCharts();
}

function updateThemeIcon() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    initIcons();
  }
}

/**
 * Główna funkcja aktualizacji obliczeń i interfejsu
 */
export function updateCalculations() {
  const overall = calculateOverallStats(appData.semesters);

  // Aktualizacja KPI
  const kpiWeighted = document.getElementById('kpi-weighted-avg');
  const kpiWeightedSub = document.getElementById('kpi-weighted-subtext');
  const kpiEctsProgress = document.getElementById('kpi-ects-progress');
  const kpiEctsBar = document.getElementById('kpi-ects-bar');
  const kpiEctsSubtext = document.getElementById('kpi-ects-subtext');
  const kpiArith = document.getElementById('kpi-arithmetic-avg');
  const kpiArithSub = document.getElementById('kpi-arithmetic-subtext');
  const kpiDeficitVal = document.getElementById('kpi-deficit-val');
  const kpiDeficitSub = document.getElementById('kpi-deficit-subtext');
  const kpiDeficitCard = document.getElementById('kpi-deficit-card');

  if (kpiWeighted) {
    kpiWeighted.textContent = overall.overallWeightedAverage !== null ? overall.overallWeightedAverage.toFixed(2) : '-';
  }
  if (kpiWeightedSub) {
    kpiWeightedSub.textContent = `${overall.totalWeightedEctsSum} ECTS wliczonych do średniej`;
  }

  const targetDegreeEcts = appData.customTargetEcts || 180;
  if (kpiEctsProgress) {
    kpiEctsProgress.innerHTML = `${overall.earnedEcts} <span style="font-size: 1.1rem; font-weight: 500; color: var(--text-muted);">/ ${targetDegreeEcts}</span>`;
  }
  const progressPct = Math.min(100, Math.round((overall.earnedEcts / targetDegreeEcts) * 100));
  if (kpiEctsBar) {
    kpiEctsBar.style.width = `${progressPct}%`;
  }
  if (kpiEctsSubtext) {
    kpiEctsSubtext.textContent = `Postęp: ${progressPct}% toku studiów (${overall.earnedEcts}/${targetDegreeEcts} ECTS)`;
  }

  if (kpiArith) {
    kpiArith.textContent = overall.overallArithmeticAverage !== null ? overall.overallArithmeticAverage.toFixed(2) : '-';
  }
  if (kpiArithSub) {
    kpiArithSub.textContent = `${overall.totalGradedCount} ocenianych przedmiotów`;
  }

  if (kpiDeficitVal) {
    kpiDeficitVal.textContent = overall.overallDeficitEcts;
  }
  if (kpiDeficitSub && kpiDeficitCard) {
    if (overall.overallDeficitEcts === 0) {
      kpiDeficitSub.textContent = 'Stan prawidłowy (brak deficytu)';
      kpiDeficitCard.style.borderColor = 'var(--border-color)';
    } else if (overall.overallDeficitEcts <= (appData.maxAllowedDeficit || 12)) {
      kpiDeficitSub.textContent = `Dopuszczalny deficyt (maks. ${appData.maxAllowedDeficit || 12} ECTS)`;
      kpiDeficitCard.style.borderColor = 'var(--warning-border)';
    } else {
      kpiDeficitSub.textContent = `UWAGA: Przekroczono limit deficytu (${overall.overallDeficitEcts} > ${appData.maxAllowedDeficit || 12})!`;
      kpiDeficitCard.style.borderColor = 'var(--danger-border)';
    }
  }

  // Aktualizacja nagłówków semestralnych
  overall.semesters.forEach(semStat => {
    const semCard = document.getElementById(`semester-card-${semStat.semesterId}`);
    if (semCard) {
      const avgPill = semCard.querySelector('.metric-sem-avg');
      const ectsPill = semCard.querySelector('.metric-sem-ects');
      const deficitPill = semCard.querySelector('.metric-sem-deficit');

      if (avgPill) {
        avgPill.innerHTML = `Średnia: <strong>${semStat.weightedAverage !== null ? semStat.weightedAverage.toFixed(2) : '-'}</strong>`;
      }
      if (ectsPill) {
        ectsPill.innerHTML = `ECTS: <strong>${semStat.earnedEcts}/${semStat.totalEcts}</strong>`;
      }
      if (deficitPill) {
        if (semStat.failedEcts > 0) {
          deficitPill.className = 'metric-pill danger metric-sem-deficit';
          deficitPill.innerHTML = `Niezaliczone: <strong>${semStat.failedEcts} ECTS</strong>`;
          deficitPill.style.display = 'inline-block';
        } else {
          deficitPill.style.display = 'none';
        }
      }
    }
  });

  saveData(appData);
  updateCharts();
}

/**
 * Renderowanie listy semestrów
 */
function renderSemesters() {
  const container = document.getElementById('semesters-container');
  if (!container) return;

  if (appData.semesters.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i data-lucide="folder-plus"></i></div>
        <h3>Brak dodanych semestrów</h3>
        <p style="color: var(--text-secondary); margin-bottom: 1rem;">Kliknij poniższy przycisk, aby rozpocząć wprowadzanie ocen.</p>
        <button id="btn-empty-add-sem" class="btn btn-primary"><i data-lucide="plus"></i> Dodaj Pierwszy Semestr</button>
      </div>
    `;
    document.getElementById('btn-empty-add-sem')?.addEventListener('click', addSemester);
    initIcons();
    return;
  }

  container.innerHTML = appData.semesters.map((sem, semIndex) => `
    <div class="semester-card" id="semester-card-${sem.id}" data-sem-id="${sem.id}">
      <div class="semester-header">
        <div class="semester-title-group">
          <input type="text" class="semester-name-input" value="${escapeHtml(sem.name)}" data-sem-id="${sem.id}" title="Kliknij, aby zmienić nazwę semestru">
        </div>

        <div class="semester-metrics">
          <span class="metric-pill metric-sem-avg">Średnia: <strong>-</strong></span>
          <span class="metric-pill metric-sem-ects">ECTS: <strong>0/0</strong></span>
          <span class="metric-pill metric-sem-deficit" style="display: none;">Niezaliczone: <strong>0 ECTS</strong></span>
        </div>

        <div class="semester-menu-actions">
          <button class="btn btn-ghost btn-sm btn-icon-only btn-move-sem-up" data-sem-index="${semIndex}" title="Przesuń semestr w górę" ${semIndex === 0 ? 'disabled style="opacity:0.3"' : ''}>
            <i data-lucide="chevron-up"></i>
          </button>
          <button class="btn btn-ghost btn-sm btn-icon-only btn-move-sem-down" data-sem-index="${semIndex}" title="Przesuń semestr w dół" ${semIndex === appData.semesters.length - 1 ? 'disabled style="opacity:0.3"' : ''}>
            <i data-lucide="chevron-down"></i>
          </button>
          <button class="btn btn-danger-ghost btn-sm btn-icon-only btn-delete-sem" data-sem-id="${sem.id}" title="Usuń cały semestr">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="subjects-table">
          <thead>
            <tr>
              <th style="width: 44%;">Nazwa Przedmiotu</th>
              <th style="width: 15%; text-align: center;">Punkty ECTS</th>
              <th style="width: 20%;">Ocena</th>
              <th style="width: 13%; text-align: center;" title="Czy przedmiot wlicza się do średniej ważonej">Do średniej</th>
              <th style="width: 8%; text-align: right;">Akcja</th>
            </tr>
          </thead>
          <tbody id="tbody-${sem.id}">
            ${renderSubjectsRows(sem.subjects, sem.id)}
          </tbody>
        </table>
      </div>

      <div class="semester-footer">
        <button class="btn btn-secondary btn-sm btn-add-subject" data-sem-id="${sem.id}">
          <i data-lucide="plus"></i> Dodaj Przedmiot
        </button>
        <button class="btn btn-ghost btn-sm btn-paste-sem-usos" data-sem-id="${sem.id}">
          <i data-lucide="clipboard"></i> Wklej do tego semestru
        </button>
      </div>
    </div>
  `).join('');

  initIcons();
  attachTableEventListeners();
}

function renderSubjectsRows(subjects, semId) {
  if (!subjects || subjects.length === 0) {
    return `
      <tr class="empty-row">
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
          Brak przedmiotów w tym semestrze. Kliknij „Dodaj Przedmiot” poniżej.
        </td>
      </tr>
    `;
  }

  return subjects.map(sub => `
    <tr id="row-${sub.id}" data-sub-id="${sub.id}" data-sem-id="${semId}">
      <td>
        <input type="text" class="input-subject-name" value="${escapeHtml(sub.name)}" placeholder="Nazwa przedmiotu..." data-sub-id="${sub.id}" data-sem-id="${semId}">
      </td>
      <td style="text-align: center;">
        <input type="number" class="input-ects" min="0" max="60" step="0.5" value="${sub.ects}" data-sub-id="${sub.id}" data-sem-id="${semId}">
      </td>
      <td>
        <select class="select-grade" data-sub-id="${sub.id}" data-sem-id="${semId}">
          ${GRADES.map(g => `
            <option value="${g.value}" ${String(sub.grade) === g.value ? 'selected' : ''}>
              ${g.label}
            </option>
          `).join('')}
        </select>
      </td>
      <td style="text-align: center;">
        <label class="checkbox-custom">
          <input type="checkbox" class="checkbox-count-avg" ${sub.countInAverage !== false && sub.grade !== 'ZAL' && sub.grade !== 'NZAL' ? 'checked' : ''} data-sub-id="${sub.id}" data-sem-id="${semId}">
        </label>
      </td>
      <td style="text-align: right;">
        <button class="btn btn-danger-ghost btn-sm btn-icon-only btn-delete-subject" data-sub-id="${sub.id}" data-sem-id="${semId}" title="Usuń przedmiot">
          <i data-lucide="trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function attachTableEventListeners() {
  // Zmiana nazwy semestru
  document.querySelectorAll('.semester-name-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const semId = e.target.getAttribute('data-sem-id');
      const sem = appData.semesters.find(s => s.id === semId);
      if (sem) {
        sem.name = e.target.value.trim() || 'Semestr bez nazwy';
        saveData(appData);
        showToast('Zaktualizowano nazwę semestru');
      }
    });
  });

  // Zmiana nazwy przedmiotu
  document.querySelectorAll('.input-subject-name').forEach(input => {
    input.addEventListener('change', (e) => {
      const semId = e.target.getAttribute('data-sem-id');
      const subId = e.target.getAttribute('data-sub-id');
      const sem = appData.semesters.find(s => s.id === semId);
      if (sem) {
        const sub = sem.subjects.find(s => s.id === subId);
        if (sub) {
          sub.name = e.target.value;
          saveData(appData);
        }
      }
    });
  });

  // Zmiana ECTS
  document.querySelectorAll('.input-ects').forEach(input => {
    input.addEventListener('input', (e) => {
      const semId = e.target.getAttribute('data-sem-id');
      const subId = e.target.getAttribute('data-sub-id');
      const sem = appData.semesters.find(s => s.id === semId);
      if (sem) {
        const sub = sem.subjects.find(s => s.id === subId);
        if (sub) {
          sub.ects = parseFloat(e.target.value) || 0;
          updateCalculations();
        }
      }
    });
  });

  // Zmiana oceny
  document.querySelectorAll('.select-grade').forEach(select => {
    select.addEventListener('change', (e) => {
      const semId = e.target.getAttribute('data-sem-id');
      const subId = e.target.getAttribute('data-sub-id');
      const sem = appData.semesters.find(s => s.id === semId);
      if (sem) {
        const sub = sem.subjects.find(s => s.id === subId);
        if (sub) {
          sub.grade = e.target.value;
          // Jeśli wybrano ZAL / NZAL, automatycznie odznacz wliczanie do średniej
          if (sub.grade === 'ZAL' || sub.grade === 'NZAL') {
            sub.countInAverage = false;
            const checkbox = document.querySelector(`.checkbox-count-avg[data-sub-id="${subId}"]`);
            if (checkbox) checkbox.checked = false;
          } else if (sub.grade !== 'BRAK') {
            sub.countInAverage = true;
            const checkbox = document.querySelector(`.checkbox-count-avg[data-sub-id="${subId}"]`);
            if (checkbox) checkbox.checked = true;
          }
          updateCalculations();
        }
      }
    });
  });

  // Zmiana wliczania do średniej
  document.querySelectorAll('.checkbox-count-avg').forEach(box => {
    box.addEventListener('change', (e) => {
      const semId = e.target.getAttribute('data-sem-id');
      const subId = e.target.getAttribute('data-sub-id');
      const sem = appData.semesters.find(s => s.id === semId);
      if (sem) {
        const sub = sem.subjects.find(s => s.id === subId);
        if (sub) {
          sub.countInAverage = e.target.checked;
          updateCalculations();
        }
      }
    });
  });

  // Usuwanie przedmiotu
  document.querySelectorAll('.btn-delete-subject').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget;
      const semId = target.getAttribute('data-sem-id');
      const subId = target.getAttribute('data-sub-id');
      deleteSubject(semId, subId);
    });
  });

  // Dodawanie przedmiotu
  document.querySelectorAll('.btn-add-subject').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const semId = e.currentTarget.getAttribute('data-sem-id');
      addSubject(semId);
    });
  });

  // Przesuwanie i usuwanie semestru
  document.querySelectorAll('.btn-delete-sem').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const semId = e.currentTarget.getAttribute('data-sem-id');
      if (confirm('Czy na pewno chcesz usunąć ten semestr wraz ze wszystkimi przedmiotami?')) {
        deleteSemester(semId);
      }
    });
  });

  document.querySelectorAll('.btn-move-sem-up').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-sem-index'));
      if (idx > 0) {
        const temp = appData.semesters[idx];
        appData.semesters[idx] = appData.semesters[idx - 1];
        appData.semesters[idx - 1] = temp;
        renderSemesters();
        updateCalculations();
      }
    });
  });

  document.querySelectorAll('.btn-move-sem-down').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-sem-index'));
      if (idx < appData.semesters.length - 1) {
        const temp = appData.semesters[idx];
        appData.semesters[idx] = appData.semesters[idx + 1];
        appData.semesters[idx + 1] = temp;
        renderSemesters();
        updateCalculations();
      }
    });
  });

  // Wklejanie do konkretnego semestru
  document.querySelectorAll('.btn-paste-sem-usos').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const semId = e.currentTarget.getAttribute('data-sem-id');
      openUsosModal(semId);
    });
  });
}

function addSubject(semId) {
  const sem = appData.semesters.find(s => s.id === semId);
  if (!sem) return;

  const newSub = {
    id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    name: '',
    ects: 4,
    grade: '5.0',
    countInAverage: true
  };
  sem.subjects.push(newSub);
  renderSemesters();
  updateCalculations();

  // Focus na nowo dodany input
  setTimeout(() => {
    const input = document.querySelector(`.input-subject-name[data-sub-id="${newSub.id}"]`);
    if (input) input.focus();
  }, 50);
}

function deleteSubject(semId, subId) {
  const sem = appData.semesters.find(s => s.id === semId);
  if (!sem) return;
  sem.subjects = sem.subjects.filter(s => s.id !== subId);
  renderSemesters();
  updateCalculations();
  showToast('Usunięto przedmiot');
}

function addSemester() {
  const nextNum = appData.semesters.length + 1;
  const isSummer = nextNum % 2 === 0;
  const newSem = {
    id: 'sem-' + Date.now(),
    name: `Semestr ${nextNum} (${isSummer ? 'Letni' : 'Zimowy'})`,
    nominalEcts: 30,
    subjects: [
      { id: 'sub-' + Date.now() + '-1', name: 'Nowy przedmiot 1', ects: 6, grade: '5.0', countInAverage: true },
      { id: 'sub-' + Date.now() + '-2', name: 'Nowy przedmiot 2', ects: 5, grade: '4.5', countInAverage: true }
    ]
  };
  appData.semesters.push(newSem);
  renderSemesters();
  updateCalculations();
  showToast(`Dodano ${newSem.name}`);
}

function deleteSemester(semId) {
  appData.semesters = appData.semesters.filter(s => s.id !== semId);
  renderSemesters();
  updateCalculations();
  showToast('Usunięto semestr');
}

/**
 * Konfiguracja i aktualizacja wykresów Chart.js
 */
function updateCharts() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  const overall = calculateOverallStats(appData.semesters);

  // 1. Wykres rozkładu ocen (Doughnut)
  const gradeCanvas = document.getElementById('chart-grades');
  if (gradeCanvas && window.Chart) {
    const labels = ['5.5', '5.0', '4.5', '4.0', '3.5', '3.0', '2.0', 'ZAL'];
    const data = labels.map(l => overall.totalGradeDistribution[l] || 0);
    const bgColors = [
      '#7c3aed', '#2563eb', '#0284c7', '#0d9488',
      '#ca8a04', '#d97706', '#dc2626', '#16a34a'
    ];

    if (gradeChartInstance) {
      gradeChartInstance.destroy();
    }

    gradeChartInstance = new window.Chart(gradeCanvas, {
      type: 'doughnut',
      data: {
        labels: labels.map(l => `Ocena ${l}`),
        datasets: [{
          data: data,
          backgroundColor: bgColors,
          borderWidth: 2,
          borderColor: isDark ? '#131b2e' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: textColor, font: { family: 'Inter', size: 12 } }
          }
        }
      }
    });
  }

  // 2. Wykres średnich semestralnych (Bar / Line)
  const semCanvas = document.getElementById('chart-semesters');
  if (semCanvas && window.Chart) {
    const semLabels = overall.semesters.map(s => s.semesterName);
    const semAverages = overall.semesters.map(s => s.weightedAverage || 0);

    if (semesterChartInstance) {
      semesterChartInstance.destroy();
    }

    semesterChartInstance = new window.Chart(semCanvas, {
      type: 'bar',
      data: {
        labels: semLabels,
        datasets: [{
          label: 'Średnia ważona ECTS',
          data: semAverages,
          backgroundColor: 'rgba(37, 99, 235, 0.7)',
          borderColor: '#2563eb',
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 2.0,
            max: 5.5,
            grid: { color: gridColor },
            ticks: { color: textColor, stepSize: 0.5 }
          },
          x: {
            grid: { display: false },
            ticks: { color: textColor }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

/**
 * Logika Symulatora Celu
 */
function handleSimulation() {
  const targetAvg = parseFloat(document.getElementById('sim-target-avg').value) || 4.5;
  const remainingEcts = parseFloat(document.getElementById('sim-remaining-ects').value) || 30;

  const overall = calculateOverallStats(appData.semesters);
  const result = simulateTargetAverage(
    overall.totalWeightedSum,
    overall.totalWeightedEctsSum,
    targetAvg,
    remainingEcts
  );

  const valEl = document.getElementById('sim-result-value');
  const descEl = document.getElementById('sim-result-desc');

  if (result.possible) {
    valEl.textContent = result.requiredAverage.toFixed(2);
    valEl.style.color = result.status === 'already_secured' ? 'var(--badge-zal)' : 'var(--accent-primary)';
  } else {
    valEl.textContent = 'Niewykonalne';
    valEl.style.color = 'var(--badge-20)';
  }
  descEl.textContent = result.message;
}

/**
 * Obsługa Modali i Zdarzeń
 */
function setupEventListeners() {
  // Motyw
  document.getElementById('btn-theme-toggle')?.addEventListener('click', toggleTheme);

  // Zakładki
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-view').forEach(v => v.style.display = 'none');
      const activeView = document.getElementById(`tab-content-${target}`);
      if (activeView) activeView.style.display = 'block';

      if (target === 'statistics') {
        updateCharts();
      }
    });
  });

  // Dodawanie semestru z paska
  document.getElementById('btn-add-semester')?.addEventListener('click', addSemester);

  // Symulator
  document.getElementById('btn-calc-simulation')?.addEventListener('click', handleSimulation);

  // Druk / PDF
  document.getElementById('btn-print')?.addEventListener('click', () => {
    window.print();
  });

  // Eksport
  document.getElementById('btn-export-dropdown')?.addEventListener('click', () => {
    const choice = confirm('Kliknij OK, aby pobrać kopię w formacie JSON (kompletny zapis),\nlub Anuluj, aby pobrać arkusz CSV (do Excela).');
    if (choice) {
      exportToJson(appData);
      showToast('Pobrano plik JSON');
    } else {
      exportToCsv(appData);
      showToast('Pobrano plik CSV');
    }
  });

  // Import modal
  document.getElementById('btn-import-open')?.addEventListener('click', () => {
    document.getElementById('modal-import-file')?.classList.add('active');
  });

  document.getElementById('input-file-json')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        appData = importFromJson(event.target.result);
        renderSemesters();
        updateCalculations();
        document.getElementById('modal-import-file')?.classList.remove('active');
        showToast('Pomyślnie zaimportowano dane z pliku!');
      } catch (err) {
        alert('Błąd podczas importu pliku: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  // Wklejanie USOS Modal
  document.getElementById('btn-paste-usos')?.addEventListener('click', () => {
    openUsosModal();
  });

  document.getElementById('btn-usos-apply')?.addEventListener('click', () => {
    const text = document.getElementById('modal-usos-text').value;
    const targetSemId = document.getElementById('modal-usos-target-semester').value;
    if (!text.trim()) {
      alert('Wklej najpierw tekst z USOS lub tabeli.');
      return;
    }

    const parsedSubjects = parsePastedText(text);
    if (parsedSubjects.length === 0) {
      alert('Nie udało się rozpoznać przedmiotów. Upewnij się, że wklejony tekst zawiera nazwy przedmiotów, oceny lub ECTS.');
      return;
    }

    let sem = appData.semesters.find(s => s.id === targetSemId);
    if (!sem) {
      // Jeśli brak wybranego semestru, dodaj nowy
      addSemester();
      sem = appData.semesters[appData.semesters.length - 1];
    }

    sem.subjects.push(...parsedSubjects);
    renderSemesters();
    updateCalculations();
    document.getElementById('modal-usos')?.classList.remove('active');
    document.getElementById('modal-usos-text').value = '';
    showToast(`Zaimportowano ${parsedSubjects.length} przedmiotów!`);
  });

  // Zamykanie modali
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });
}

function openUsosModal(preselectedSemId = null) {
  const select = document.getElementById('modal-usos-target-semester');
  if (select) {
    select.innerHTML = appData.semesters.map(s => `
      <option value="${s.id}" ${s.id === preselectedSemId ? 'selected' : ''}>${escapeHtml(s.name)}</option>
    `).join('');
  }
  document.getElementById('modal-usos')?.classList.add('active');
}

/**
 * Wyświetlanie powiadomień Toast
 */
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i data-lucide="check-circle" style="color: var(--accent-primary); width: 16px; height: 16px;"></i> ${escapeHtml(message)}`;
  container.appendChild(toast);
  initIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
