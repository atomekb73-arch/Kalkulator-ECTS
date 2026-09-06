/**
 * Moduł zarządzania pamięcią lokalną (localStorage) oraz importu/eksportu danych
 */

const STORAGE_KEY = 'kalkulator_ects_data_v1';
const THEME_KEY = 'kalkulator_ects_theme';

export const DEFAULT_DATA = {
  activeTab: 'semesters',
  degreeType: 'bachelor', // 'bachelor' (180 ECTS) | 'engineering' (210 ECTS) | 'master' (120 ECTS) | 'custom'
  customTargetEcts: 180,
  maxAllowedDeficit: 12,
  semesters: [
    {
      id: 'sem-1',
      name: 'Semestr 1 (Zimowy)',
      nominalEcts: 30,
      subjects: [
        { id: 'sub-1-1', name: 'Analiza Matematyczna 1', ects: 6, grade: '4.5', countInAverage: true },
        { id: 'sub-1-2', name: 'Algebra Liniowa z Geometrią', ects: 5, grade: '4.0', countInAverage: true },
        { id: 'sub-1-3', name: 'Wstęp do Programowania', ects: 6, grade: '5.0', countInAverage: true },
        { id: 'sub-1-4', name: 'Fizyka Ogólna', ects: 5, grade: '3.5', countInAverage: true },
        { id: 'sub-1-5', name: 'Język Obcy B2', ects: 2, grade: '5.0', countInAverage: true },
        { id: 'sub-1-6', name: 'Wychowanie Fizyczne', ects: 1, grade: 'ZAL', countInAverage: false },
        { id: 'sub-1-7', name: 'BHP i Ochrona Własności Intelektualnej', ects: 1, grade: 'ZAL', countInAverage: false }
      ]
    },
    {
      id: 'sem-2',
      name: 'Semestr 2 (Letni)',
      nominalEcts: 30,
      subjects: [
        { id: 'sub-2-1', name: 'Analiza Matematyczna 2', ects: 6, grade: '4.0', countInAverage: true },
        { id: 'sub-2-2', name: 'Algorytmy i Struktury Danych', ects: 6, grade: '5.0', countInAverage: true },
        { id: 'sub-2-3', name: 'Architektura Systemów Komputerowych', ects: 5, grade: '4.5', countInAverage: true },
        { id: 'sub-2-4', name: 'Bazy Danych', ects: 5, grade: '4.5', countInAverage: true },
        { id: 'sub-2-5', name: 'Matematyka Dyskretna', ects: 4, grade: '3.5', countInAverage: true },
        { id: 'sub-2-6', name: 'Wychowanie Fizyczne 2', ects: 1, grade: 'ZAL', countInAverage: false }
      ]
    }
  ]
};

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveData(DEFAULT_DATA);
      return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    const parsed = JSON.parse(raw);
    if (!parsed.semesters || !Array.isArray(parsed.semesters)) {
      return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    return parsed;
  } catch (e) {
    console.error('Błąd podczas odczytu danych z localStorage:', e);
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Błąd podczas zapisu do localStorage:', e);
  }
}

export function loadTheme() {
  return localStorage.getItem(THEME_KEY) || 'system';
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

export function exportToJson(data) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kalkulator-ects-dane-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToCsv(data) {
  let csv = 'Semestr;Nazwa przedmiotu;ECTS;Ocena;Liczone do sredniej\n';

  data.semesters.forEach(sem => {
    sem.subjects.forEach(sub => {
      const name = `"${(sub.name || '').replace(/"/g, '""')}"`;
      const ects = sub.ects || 0;
      const grade = sub.grade || '';
      const countInAvg = sub.countInAverage !== false ? 'TAK' : 'NIE';
      csv += `"${sem.name}";${name};${ects};${grade};${countInAvg}\n`;
    });
  });

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kalkulator-ects-dane-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importFromJson(jsonString) {
  const parsed = JSON.parse(jsonString);
  if (!parsed.semesters || !Array.isArray(parsed.semesters)) {
    throw new Error('Nieprawidłowy format pliku JSON. Brak tablicy semestrów.');
  }
  return parsed;
}
