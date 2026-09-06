/**
 * Testy jednostkowe silnika obliczeniowego Kalkulatora ECTS
 */

import { calculateSemesterStats, calculateOverallStats, simulateTargetAverage, getGradeInfo } from '../js/calculator.js';
import { parsePastedText } from '../js/parser.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('--- TEST 1: Rozpoznawanie ocen ---');
assert(getGradeInfo('5.0').numeric === 5.0, 'Grade 5.0 is numeric 5.0');
assert(getGradeInfo('4.5').isPassing === true, 'Grade 4.5 is passing');
assert(getGradeInfo('2.0').isPassing === false, 'Grade 2.0 is failing');
assert(getGradeInfo('ZAL').isPassing === true, 'Grade ZAL is passing without numeric');
assert(getGradeInfo('ZAL').numeric === null, 'Grade ZAL numeric is null');

console.log('\n--- TEST 2: Obliczenia semestru ---');
const testSubjects = [
  { name: 'Matematyka', ects: 6, grade: '5.0', countInAverage: true },  // 5 * 6 = 30
  { name: 'Fizyka', ects: 4, grade: '4.0', countInAverage: true },       // 4 * 4 = 16
  { name: 'WF', ects: 1, grade: 'ZAL', countInAverage: false },          // no grade, 1 ects
  { name: 'BHP', ects: 1, grade: '2.0', countInAverage: true }          // 2 * 1 = 2, failed
];
// Weighted sum: 30 + 16 + 2 = 48
// Weighted ECTS: 6 + 4 + 1 = 11
// Weighted average: 48 / 11 = 4.3636... -> 4.364
// Earned ECTS: 6 + 4 + 1 = 11 ECTS (Matma + Fizyka + WF)
// Failed ECTS: 1 ECTS (BHP)
// Total ECTS: 12

const semStats = calculateSemesterStats(testSubjects, 30);
assert(semStats.totalEcts === 12, `Total ECTS is 12 (got ${semStats.totalEcts})`);
assert(semStats.earnedEcts === 11, `Earned ECTS is 11 (got ${semStats.earnedEcts})`);
assert(semStats.failedEcts === 1, `Failed ECTS is 1 (got ${semStats.failedEcts})`);
assert(semStats.weightedAverage === 4.364, `Weighted average is 4.364 (got ${semStats.weightedAverage})`);
assert(semStats.deficitEcts === 19, `Semester deficit against 30 is 19 (got ${semStats.deficitEcts})`);

console.log('\n--- TEST 3: Podsumowanie całościowe studiów ---');
const testSemesters = [
  { id: 's1', name: 'Sem 1', nominalEcts: 30, subjects: testSubjects },
  { id: 's2', name: 'Sem 2', nominalEcts: 30, subjects: [
    { name: 'Programowanie', ects: 6, grade: '5.0', countInAverage: true } // 5 * 6 = 30
  ]}
];
// S1: sum=48, ects=11. S2: sum=30, ects=6. Total sum=78, Total ects=17. Avg = 78/17 = 4.588
const overall = calculateOverallStats(testSemesters);
assert(overall.overallWeightedAverage === 4.588, `Overall average is 4.588 (got ${overall.overallWeightedAverage})`);
assert(overall.earnedEcts === 17, `Overall earned ECTS is 17 (got ${overall.earnedEcts})`);
assert(overall.overallDeficitEcts === 1, `Overall deficit is 1 (got ${overall.overallDeficitEcts})`);

console.log('\n--- TEST 4: Symulator stypendium / celu ---');
// Student ma średnią 4.0 z 30 ECTS (suma = 120). Chce mieć 4.50 po kolejnych 30 ECTS.
// Docelowo: 60 ECTS * 4.5 = 270. Brakująca suma = 270 - 120 = 150.
// Wymagana średnia = 150 / 30 = 5.00
const sim1 = simulateTargetAverage(120, 30, 4.50, 30);
assert(sim1.possible === true, 'Simulation 1 is possible');
assert(sim1.requiredAverage === 5.0, `Required average is 5.0 (got ${sim1.requiredAverage})`);

// Cel niemożliwy: student ma średnią 3.0 z 100 ECTS (suma=300). Chce mieć 5.0 po kolejnych 10 ECTS.
// Docelowo: 110 * 5.0 = 550. Brakująca suma = 250. Wymagana średnia = 250/10 = 25.0 (> 5.5)
const sim2 = simulateTargetAverage(300, 100, 5.00, 10);
assert(sim2.possible === false, 'Simulation 2 is impossible');
assert(sim2.status === 'impossible_high', 'Status is impossible_high');

console.log('\n--- TEST 5: Parser wklejania USOS / TSV / Tabeli ---');
const sampleUsos = `
Analiza Matematyczna 1\t6\t4.5
Algebra Liniowa\t5\t4.0
Wstęp do Informatyki\t6\t5.0
Wychowanie Fizyczne\t1\tZAL
`;
const parsed = parsePastedText(sampleUsos);
assert(parsed.length === 4, `Parsed 4 subjects (got ${parsed.length})`);
assert(parsed[0].name === 'Analiza Matematyczna 1', `Subject 1 name is correct`);
assert(parsed[0].ects === 6, `Subject 1 ECTS is 6`);
assert(parsed[0].grade === '4.5', `Subject 1 grade is 4.5`);
assert(parsed[3].grade === 'ZAL', `Subject 4 grade is ZAL`);
assert(parsed[3].countInAverage === false, `Subject 4 countInAverage is false`);

console.log('\n🎉 ALL CALCULATOR & PARSER TESTS PASSED SUCCESSFULLY!');
