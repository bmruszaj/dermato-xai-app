import type { ComparisonResult } from "./types";
import { ANNOTATION_LABELS, MODEL_CLASS } from "./types";

/**
 * Counts user annotations by label.
 */
function countByLabel(result: ComparisonResult): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const label of ANNOTATION_LABELS) {
    counts[label] = 0;
  }

  // Yellow globules: matched + userOnly
  counts[MODEL_CLASS] =
    result.matched.length + result.userOnlyYellow.length;

  // Other classes
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
    (label) => `  - ${label}: ${counts[label]} adnotacje`,
  ).join("\n");

  const matchedLines =
    result.matched.length > 0
      ? result.matched
          .map(
            (m, i) =>
              `  ${i + 1}. Pole użytkownika pokrywa się z detekcją modelu (IoU = ${(m.iou * 100).toFixed(1)}%, pewność modelu = ${(m.modelBox.confidence * 100).toFixed(1)}%)`,
          )
          .join("\n")
      : "  Brak dopasowań.";

  const userOnlyLines =
    result.userOnlyYellow.length > 0
      ? result.userOnlyYellow
          .map(
            (_, i) =>
              `  ${i + 1}. Użytkownik zaznaczył "${MODEL_CLASS}", ale model nie wykrył tam zmiany.`,
          )
          .join("\n")
      : "  Brak.";

  const modelOnlyLines =
    result.modelOnlyYellow.length > 0
      ? result.modelOnlyYellow
          .map(
            (p, i) =>
              `  ${i + 1}. Model wykrył zmianę z pewnością ${(p.confidence * 100).toFixed(1)}%, ale użytkownik jej nie zaznaczył.`,
          )
          .join("\n")
      : "  Brak.";

  return `Jesteś asystentem edukacyjnym dla studentów dermatologii. Twoim zadaniem jest ocena adnotacji bounding-box wykonanych przez studenta na obrazie dermoskopowym i udzielenie konstruktywnego feedbacku edukacyjnego w języku polskim.

## Kontekst zadania

Student miał za zadanie zaznaczyć na obrazie dermoskopowym zmiany skórne przy użyciu bounding-boxów i przypisać im jedną z pięciu klas:
- Rosettes
- Milia-like-cyst
- Blue-gray globules
- MAY globules
- Yellow globlues (ulcer)

Model AI (RF-DETR) był trenowany wyłącznie na klasie "${MODEL_CLASS}". Porównanie dotyczy tylko tej klasy.

## Adnotacje studenta

Łączna liczba adnotacji: ${totalUser}
${labelLines}

## Wyniki porównania z modelem AI (tylko klasa "${MODEL_CLASS}")

Liczba detekcji modelu: ${totalModel}
Liczba adnotacji studenta dla tej klasy: ${result.matched.length + result.userOnlyYellow.length}

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
