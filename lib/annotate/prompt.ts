import type { ComparisonResult } from "./types";
import { ANNOTATION_LABELS } from "./types";

/**
 * Counts user annotations by label.
 */
function countByLabel(result: ComparisonResult): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const label of ANNOTATION_LABELS) {
    counts[label] = 0;
  }

  for (const { userBox } of result.matched) {
    if (userBox.label in counts) {
      counts[userBox.label]++;
    }
  }

  for (const box of result.userOnlyYellow) {
    if (box.label in counts) {
      counts[box.label]++;
    }
  }

  for (const box of result.otherUserAnnotations) {
    if (box.label in counts) {
      counts[box.label]++;
    }
  }

  return counts;
}

/**
 * Build a Polish-language educational feedback prompt from the comparison result.
 * Sent to Clarin LLM (llama3.1) as a single user message.
 */
export function buildFeedbackPrompt(result: ComparisonResult): string {
  const counts = countByLabel(result);
  const totalUser =
    result.matched.length +
    result.userOnlyYellow.length +
    result.otherUserAnnotations.length;
  const totalModel = result.matched.length + result.modelOnlyYellow.length;

  const labelLines = ANNOTATION_LABELS.map(
    (label) => `  - ${label}: ${counts[label]} adnotacje`
  ).join("\n");

  const matchedLines =
    result.matched.length > 0
      ? result.matched
          .map(
            (m, i) =>
              `  ${i + 1}. "${m.userBox.label}": pole użytkownika pokrywa się z detekcją modelu (IoU = ${(m.iou * 100).toFixed(1)}%, pewność modelu = ${(m.modelBox.confidence * 100).toFixed(1)}%)`
          )
          .join("\n")
      : "  Brak dopasowań.";

  const userOnlyLines =
    result.userOnlyYellow.length > 0
      ? result.userOnlyYellow
          .map(
            (box, i) =>
              `  ${i + 1}. Użytkownik zaznaczył "${box.label}", ale model nie wykrył tam zmiany.`
          )
          .join("\n")
      : "  Brak.";

  const modelOnlyLines =
    result.modelOnlyYellow.length > 0
      ? result.modelOnlyYellow
          .map(
            (p, i) =>
              `  ${i + 1}. Model wykrył "${p.label}" z pewnością ${(p.confidence * 100).toFixed(1)}%, ale użytkownik jej nie zaznaczył.`
          )
          .join("\n")
      : "  Brak.";

  return `Jesteś asystentem edukacyjnym dla studentów dermatologii. Twoim zadaniem jest ocena adnotacji bounding-box wykonanych przez studenta na obrazie dermoskopowym i udzielenie konstruktywnego feedbacku edukacyjnego w języku polskim.

## Kontekst zadania

Student miał za zadanie zaznaczyć na obrazie dermoskopowym zmiany skórne przy użyciu bounding-boxów i przypisać im jedną z dostępnych klas:
${ANNOTATION_LABELS.map((label) => `- ${label}`).join("\n")}

Model AI (RF-DETR + SAHI) zwraca detekcje dla aktualnie udostępnionych klas. Porównanie dotyczy par o tej samej etykiecie.

## Adnotacje studenta

Łączna liczba adnotacji: ${totalUser}
${labelLines}

## Wyniki porównania z modelem AI

Liczba detekcji modelu: ${totalModel}
Liczba porównywanych adnotacji studenta: ${result.matched.length + result.userOnlyYellow.length}

### ✅ Poprawnie zidentyfikowane (pokrywają się z modelem):
${matchedLines}

### ❌ Zaznaczone przez studenta, ale NIE wykryte przez model (możliwe fałszywe pozytywy):
${userOnlyLines}

### ⚠️ Wykryte przez model, ale POMINIĘTE przez studenta (możliwe pominięcia):
${modelOnlyLines}

## Zadanie dla asystenta

Na podstawie powyższych danych wygeneruj edukacyjny feedback w języku polskim podzielony na trzy sekcje:

1. **Co zostało wykonane poprawnie** — pochwal studenta za trafne adnotacje, podaj konkretne liczby.
2. **Co wymaga poprawy** — wskaż pominięcia i możliwe błędy, wyjaśnij dlaczego są ważne klinicznie.
3. **Wskazówki na przyszłość** — daj 2-3 konkretne porady jak poprawić umiejętności adnotacji dermoskopowej.

Bądź konkretny, edukacyjny i wspierający. Nie podawaj informacji niezwiązanych z dermoskopią.`;
}
