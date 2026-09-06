/**
 * Inteligentny parser do importu danych wklejonych z USOS, Wirtualnego Dziekanatu, Excela i tabel
 */

export function parsePastedText(text) {
  if (!text || typeof text !== 'string') return [];

  const lines = text.trim().split(/\r?\n/);
  const parsedSubjects = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Próba podziału po tabulatorach (Excel / USOS copy-paste) lub średnikach / przecinkach
    let tokens = [];
    if (line.includes('\t')) {
      tokens = line.split('\t').map(t => t.trim()).filter(Boolean);
    } else if (line.includes(';')) {
      tokens = line.split(';').map(t => t.trim()).filter(Boolean);
    } else if (line.includes('|')) {
      tokens = line.split('|').map(t => t.trim()).filter(Boolean);
    } else {
      // Dzielenie spacjami, ale inteligentne
      tokens = [line];
    }

    // Sprawdźmy, czy linia to nagłówek tabeli
    const lowerLine = line.toLowerCase();
    if (
      (lowerLine.includes('nazwa') && (lowerLine.includes('ects') || lowerLine.includes('punkty'))) ||
      (lowerLine.includes('przedmiot') && lowerLine.includes('ocena')) ||
      lowerLine.startsWith('semestr') && !tokens.some(t => /^\d+(\.0|\.5)?$/.test(t))
    ) {
      continue; // Pomiń nagłówek
    }

    let subjectName = '';
    let ects = 0;
    let grade = 'BRAK';

    if (tokens.length >= 2) {
      // Szukamy ocen i punktów ECTS wśród tokenów
      let ectsIndex = -1;
      let gradeIndex = -1;

      for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i].trim();
        const normTok = tok.replace(',', '.').toUpperCase();

        // Wykrywanie oceny (2.0, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, ZAL, NZAL, 2, 3, 4, 5, db, bdb, dst)
        if (gradeIndex === -1) {
          if (/^(2\.0|2|3\.0|3|3\.5|3\+|4\.0|4|4\.5|4\+|5\.0|5|5\.5|5\+)$/.test(normTok)) {
            gradeIndex = i;
            let val = normTok;
            if (val === '2' || val === '3' || val === '4' || val === '5') val += '.0';
            if (val === '3+') val = '3.5';
            if (val === '4+') val = '4.5';
            if (val === '5+') val = '5.5';
            grade = val;
            continue;
          } else if (normTok === 'ZAL' || normTok === 'ZALICZENIE' || normTok === 'ZAL.' || normTok === 'ZALICZONE') {
            gradeIndex = i;
            grade = 'ZAL';
            continue;
          } else if (normTok === 'NZAL' || normTok === 'NZAL.' || normTok === 'NIEZAL' || normTok === 'NIEZALICZONE') {
            gradeIndex = i;
            grade = 'NZAL';
            continue;
          } else if (normTok === 'BDB') {
            gradeIndex = i;
            grade = '5.0';
            continue;
          } else if (normTok === 'DB+' || normTok === 'PDB') {
            gradeIndex = i;
            grade = '4.5';
            continue;
          } else if (normTok === 'DB') {
            gradeIndex = i;
            grade = '4.0';
            continue;
          } else if (normTok === 'DST+' || normTok === 'PDST') {
            gradeIndex = i;
            grade = '3.5';
            continue;
          } else if (normTok === 'DST') {
            gradeIndex = i;
            grade = '3.0';
            continue;
          } else if (normTok === 'NDST') {
            gradeIndex = i;
            grade = '2.0';
            continue;
          }
        }

        // Wykrywanie ECTS (zwykle mała liczba całkowita lub float 0.5 - 30)
        if (ectsIndex === -1 && i !== gradeIndex) {
          // Sprawdzamy czy to liczba ECTS (np. "6", "6.0", "6 ECTS", "6 pkt")
          const ectsMatch = tok.match(/^(\d+(?:[.,]\d+)?)\s*(?:ects|pkt|punktów|punkty)?$/i);
          if (ectsMatch) {
            const num = parseFloat(ectsMatch[1].replace(',', '.'));
            if (num > 0 && num <= 60) {
              ects = num;
              ectsIndex = i;
              continue;
            }
          }
        }
      }

      // Nazwa przedmiotu to tokeny, które nie są ECTS ani oceną
      const nameParts = [];
      for (let i = 0; i < tokens.length; i++) {
        if (i !== ectsIndex && i !== gradeIndex) {
          // Odrzucamy typowe kody USOS jeśli są osobnym tokenem, np. "1000-111XYZ" chyba że to jedyna nazwa
          nameParts.push(tokens[i]);
        }
      }
      subjectName = nameParts.join(' ').replace(/^["']|["']$/g, '').trim();
    } else {
      // Jedna długa linia - próba regexu np. "Analiza Matematyczna 1 6 4.5"
      const match = line.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(?:ects|pkt)?\s+([2-5](?:[.,][05])?|zal|nzal|bdb|db|dst)$/i);
      if (match) {
        subjectName = match[1].trim();
        ects = parseFloat(match[2].replace(',', '.'));
        const g = match[3].toUpperCase().replace(',', '.');
        if (g === 'ZAL' || g === 'NZAL') grade = g;
        else if (g === 'BDB') grade = '5.0';
        else if (g === 'DB') grade = '4.0';
        else if (g === 'DST') grade = '3.0';
        else grade = g;
      } else {
        // Zwykła nazwa
        subjectName = line;
      }
    }

    if (!subjectName && ects === 0) continue;

    parsedSubjects.push({
      id: 'sub-parsed-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      name: subjectName || 'Przedmiot bez nazwy',
      ects: ects > 0 ? ects : 3,
      grade: grade,
      countInAverage: grade !== 'ZAL' && grade !== 'NZAL'
    });
  }

  return parsedSubjects;
}
