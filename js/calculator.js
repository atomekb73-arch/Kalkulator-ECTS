/**
 * Moduł obliczeniowy Kalkulatora ECTS
 */

export const GRADES = [
  { value: '5.5', label: '5.5 (Celujący / 5+)', numeric: 5.5, isPassing: true },
  { value: '5.0', label: '5.0 (Bardzo dobry)', numeric: 5.0, isPassing: true },
  { value: '4.5', label: '4.5 (Dobry plus / 4+)', numeric: 4.5, isPassing: true },
  { value: '4.0', label: '4.0 (Dobry)', numeric: 4.0, isPassing: true },
  { value: '3.5', label: '3.5 (Dostateczny plus / 3+)', numeric: 3.5, isPassing: true },
  { value: '3.0', label: '3.0 (Dostateczny)', numeric: 3.0, isPassing: true },
  { value: '2.0', label: '2.0 (Niedostateczny)', numeric: 2.0, isPassing: false },
  { value: 'ZAL', label: 'ZAL (Zaliczone bez oceny)', numeric: null, isPassing: true },
  { value: 'NZAL', label: 'NZAL (Niezaliczone)', numeric: null, isPassing: false },
  { value: 'BRAK', label: 'Brak oceny (w toku)', numeric: null, isPassing: null }
];

export function getGradeInfo(gradeValue) {
  if (typeof gradeValue === 'number') {
    gradeValue = gradeValue.toFixed(1);
  }
  const found = GRADES.find(g => g.value === String(gradeValue).trim().toUpperCase());
  if (found) return found;

  const num = parseFloat(gradeValue);
  if (!isNaN(num)) {
    return {
      value: String(num),
      label: String(num),
      numeric: num,
      isPassing: num >= 3.0
    };
  }
  return {
    value: gradeValue,
    label: gradeValue,
    numeric: null,
    isPassing: false
  };
}

/**
 * Oblicza statystyki dla pojedynczego semestru lub listy przedmiotów
 * @param {Array} subjects - Lista obiektów { name, ects, grade, countInAverage }
 * @param {number} nominalEcts - Wymagana nominalna liczba ECTS (domyślnie 30)
 */
export function calculateSemesterStats(subjects = [], nominalEcts = 30) {
  let totalEcts = 0;           // Całkowita liczba zadeklarowanych ECTS
  let earnedEcts = 0;          // Zdobyte punkty ECTS (zaliczone: ocena >= 3.0 lub ZAL)
  let failedEcts = 0;          // Niezaliczone punkty ECTS (ocena 2.0 lub NZAL)
  let pendingEcts = 0;         // Przedmioty w toku (brak oceny)
  
  let weightedSum = 0;         // Suma (ocena * ects) dla przedmiotów liczonych do średniej
  let weightedEctsSum = 0;     // Suma ECTS dla przedmiotów liczonych do średniej
  
  let arithmeticSum = 0;       // Suma ocen do średniej arytmetycznej
  let gradedCount = 0;         // Liczba ocenionych przedmiotów
  
  const gradeDistribution = {
    '5.5': 0,
    '5.0': 0,
    '4.5': 0,
    '4.0': 0,
    '3.5': 0,
    '3.0': 0,
    '2.0': 0,
    'ZAL': 0,
    'NZAL': 0,
    'BRAK': 0
  };

  subjects.forEach(sub => {
    const ects = parseFloat(sub.ects) || 0;
    const gradeInfo = getGradeInfo(sub.grade);
    const isPractice = 
      (sub.category && (sub.category.trim().toLowerCase() === "praktyki" || sub.category.trim().toLowerCase().includes("praktyk"))) ||
      (sub.name && sub.name.toLowerCase().includes("praktyk"));
    const countInAvg = sub.countInAverage !== false && !isPractice; // Domyślnie wliczany do średniej, o ile nie jest praktyką

    totalEcts += ects;

    if (gradeInfo.value in gradeDistribution) {
      gradeDistribution[gradeInfo.value]++;
    }

    if (gradeInfo.isPassing === true) {
      earnedEcts += ects;
    } else if (gradeInfo.isPassing === false) {
      failedEcts += ects;
    } else {
      pendingEcts += ects;
    }

    // Obliczanie średniej (tylko oceny numeryczne i włączone do średniej, z wykluczeniem praktyk)
    if (gradeInfo.numeric !== null && countInAvg) {
      weightedSum += gradeInfo.numeric * ects;
      weightedEctsSum += ects;
      arithmeticSum += gradeInfo.numeric;
      gradedCount++;
    }
  });

  const weightedAverage = weightedEctsSum > 0 ? (weightedSum / weightedEctsSum) : null;
  const arithmeticAverage = gradedCount > 0 ? (arithmeticSum / gradedCount) : null;
  const deficitEcts = Math.max(0, nominalEcts - earnedEcts);

  return {
    totalEcts,
    earnedEcts,
    failedEcts,
    pendingEcts,
    weightedSum,
    weightedEctsSum,
    weightedAverage: weightedAverage !== null ? Number(weightedAverage.toFixed(3)) : null,
    arithmeticAverage: arithmeticAverage !== null ? Number(arithmeticAverage.toFixed(3)) : null,
    gradedCount,
    deficitEcts,
    nominalEcts,
    gradeDistribution
  };
}

/**
 * Oblicza całościowe podsumowanie dla wszystkich semestrów
 * @param {Array} semesters - Tablica semestrów [{ id, name, nominalEcts, subjects }]
 */
export function calculateOverallStats(semesters = []) {
  let totalEcts = 0;
  let earnedEcts = 0;
  let failedEcts = 0;
  let pendingEcts = 0;
  let totalNominalEcts = 0;

  let totalWeightedSum = 0;
  let totalWeightedEctsSum = 0;

  let totalArithmeticSum = 0;
  let totalGradedCount = 0;

  const totalGradeDistribution = {
    '5.5': 0,
    '5.0': 0,
    '4.5': 0,
    '4.0': 0,
    '3.5': 0,
    '3.0': 0,
    '2.0': 0,
    'ZAL': 0,
    'NZAL': 0,
    'BRAK': 0
  };

  const semesterSummaries = semesters.map(sem => {
    const stats = calculateSemesterStats(sem.subjects, sem.nominalEcts || 30);
    
    totalEcts += stats.totalEcts;
    earnedEcts += stats.earnedEcts;
    failedEcts += stats.failedEcts;
    pendingEcts += stats.pendingEcts;
    totalNominalEcts += stats.nominalEcts;

    totalWeightedSum += stats.weightedSum;
    totalWeightedEctsSum += stats.weightedEctsSum;

    if (stats.arithmeticAverage !== null) {
      totalArithmeticSum += stats.arithmeticAverage * stats.gradedCount;
      totalGradedCount += stats.gradedCount;
    }

    for (const [key, count] of Object.entries(stats.gradeDistribution)) {
      totalGradeDistribution[key] = (totalGradeDistribution[key] || 0) + count;
    }

    return {
      semesterId: sem.id,
      semesterName: sem.name,
      ...stats
    };
  });

  const overallWeightedAverage = totalWeightedEctsSum > 0 ? (totalWeightedSum / totalWeightedEctsSum) : null;
  const overallArithmeticAverage = totalGradedCount > 0 ? (totalArithmeticSum / totalGradedCount) : null;
  const overallDeficitEcts = failedEcts; // Dług punktowy to suma niezaliczonych ECTS

  return {
    totalEcts,
    earnedEcts,
    failedEcts,
    pendingEcts,
    totalNominalEcts,
    overallWeightedAverage: overallWeightedAverage !== null ? Number(overallWeightedAverage.toFixed(3)) : null,
    overallArithmeticAverage: overallArithmeticAverage !== null ? Number(overallArithmeticAverage.toFixed(3)) : null,
    totalWeightedSum,
    totalWeightedEctsSum,
    totalGradedCount,
    overallDeficitEcts,
    totalGradeDistribution,
    semesters: semesterSummaries
  };
}

/**
 * Symulator celu średniej (Target GPA Simulator)
 * Oblicza, jakiej średniej z pozostałych punktów ECTS potrzebuje student, aby osiągnąć cel.
 *
 * @param {number} currentWeightedSum - Aktualna suma (ocena * ects)
 * @param {number} currentWeightedEcts - Aktualna suma punktów ECTS z oceną
 * @param {number} targetAverage - Docelowa średnia ważona (np. 4.50)
 * @param {number} remainingEcts - Liczba pozostałych punktów ECTS z oceną
 */
export function simulateTargetAverage(currentWeightedSum, currentWeightedEcts, targetAverage, remainingEcts) {
  if (remainingEcts <= 0) {
    return {
      possible: false,
      message: 'Liczba pozostałych punktów ECTS musi być większa od zera.'
    };
  }

  const targetTotalEcts = currentWeightedEcts + remainingEcts;
  const requiredTotalSum = targetAverage * targetTotalEcts;
  const requiredRemainingSum = requiredTotalSum - currentWeightedSum;
  const requiredAverage = requiredRemainingSum / remainingEcts;

  const minPossibleGrade = 2.0;
  const maxPossibleGrade = 5.5;

  let possible = true;
  let status = 'achievable';
  let message = '';

  if (requiredAverage > maxPossibleGrade) {
    possible = false;
    status = 'impossible_high';
    message = `Osiągnięcie celu jest niemożliwe (wymagana średnia ${requiredAverage.toFixed(2)} przekracza maksymalną ocenę 5.50).`;
  } else if (requiredAverage < minPossibleGrade) {
    status = 'already_secured';
    message = `Twój cel jest już zabezpieczony! Nawet przy samych ocenach 2.0 osiągniesz średnią ${targetAverage.toFixed(2)}.`;
  } else {
    message = `Musisz uzyskać średnią co najmniej ${requiredAverage.toFixed(2)} z pozostałych ${remainingEcts} punktów ECTS.`;
  }

  return {
    possible,
    status,
    requiredAverage: Number(requiredAverage.toFixed(3)),
    targetAverage,
    remainingEcts,
    message
  };
}
