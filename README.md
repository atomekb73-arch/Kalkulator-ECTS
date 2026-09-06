# Kalkulator ECTS 🎓

Nowoczesna, intuicyjna i w pełni responsywna aplikacja webowa dla studentów polskich uczelni (Politechniki, Uniwersytety, AGH, itp.) do obliczania średniej ważonej punktami ECTS, śledzenia toku studiów, kontroli deficytu punktowego oraz symulacji celu stypendialnego.

---

## ✨ Główne Funkcje

1. **Obliczanie Średniej Ważonej ECTS**:
   $$\text{Średnia} = \frac{\sum (\text{Ocena}_i \times \text{ECTS}_i)}{\sum \text{ECTS}_i}$$
   - Obsługa pełnej polskiej skali ocen: `2.0`, `3.0`, `3.5`, `4.0`, `4.5`, `5.0`, `5.5` (celujący / 5+).
   - Obsługa przedmiotów bez oceny liczbowej: `ZAL` (zaliczone, punkty ECTS dodawane do dorobku, pomijane w średniej ważonej) i `NZAL` (niezaliczone).
   - Możliwość ręcznego włączenia/wyłączenia dowolnego przedmiotu z obliczania średniej.

2. **Podział na Semestry**:
   - Dynamiczne dodawanie, usuwanie i zmiana kolejności semestrów.
   - Osobne statystyki dla każdego semestru (średnia semestralna, suma ECTS, przedmioty niezaliczone) oraz całościowe podsumowanie toku studiów.

3. **Kontrola Deficytu ECTS (Długu Punktowego)**:
   - Śledzenie punktów ECTS z niezaliczonych przedmiotów (ocena 2.0 / NZAL).
   - Wizualne ostrzeżenie przy przekroczeniu dopuszczalnego progu deficytu.

4. **Symulator Celu i Stypendium Rektora**:
   - Wyliczanie, jakiej średniej potrzebujesz z pozostałych punktów ECTS, aby osiągnąć założony cel (np. próg stypendialny 4.50).

5. **Inteligentny Import z USOS / Wirtualnego Dziekanatu**:
   - Możliwość bezpośredniego skopiowania tabeli ocen z systemów USOSweb, Moja PG, Wirtualny Dziekanat lub arkusza Excel i wklejenia jednym kliknięciem.

6. **Wykresy i Statystyki**:
   - Interaktywny wykres kołowy rozkładu ocen (Doughnut chart).
   - Wykres słupkowy trendu średniej w poszczególnych semestrach.

7. **Zapis i Eksport Danych**:
   - Automatyczny zapis w pamięci przeglądarki (`localStorage`) – Twoje oceny nie znikną po zamknięciu strony.
   - Eksport / import kopii zapasowej do pliku **JSON**.
   - Eksport zestawienia do arkusza **CSV** (kompatybilnego z MS Excel i Google Sheets).
   - Gotowy widok do druku i zapisu jako **PDF** (`Ctrl + P`).

8. **Wygodny Design i Motywy**:
   - Tryb ciemny (Dark Mode) oraz jasny (Light Mode).
   - Nowoczesny, minimalistyczny interfejs zoptymalizowany pod urządzenia mobilne i komputery.

---

## 🚀 Jak Uruchomić Aplikację

Aplikacja jest w 100% samowystarczalna (Single Page App) i nie wymaga instalacji żadnych serwerów ani baz danych.

### Opcja 1: Bezpośrednio w przeglądarce
Wystarczy dwukrotnie kliknąć plik `index.html` lub otworzyć go w dowolnej przeglądarce internetowej (Chrome, Edge, Firefox, Safari).

### Opcja 2: Poprzez lokalny serwer HTTP
Jeśli posiadasz Node.js lub Pythona:
```bash
# Python
python -m http.server 8000

# Node.js (npx)
npx serve .
```
Następnie otwórz w przeglądarce adres: `http://localhost:8000`.

---

## 🧪 Testy Jednostkowe

Silnik obliczeniowy posiada zestaw testów weryfikujących poprawność wzorów matematycznych, wag ocen, deficytów i parsera:
```bash
node tests/test_calculator.js
```
