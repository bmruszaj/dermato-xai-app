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
    (label) => `  - ${label}: ${counts[label]} anotacje`
  ).join("\n");

  const matchedLines =
    result.matched.length > 0
      ? result.matched
          .map(
            (m, i) =>
              `  ${i + 1}. "${m.userBox.label}": anotacja użytkownika pokrywa się z detekcją modelu (IoU = ${(m.iou * 100).toFixed(1)}%, pewność modelu = ${(m.modelBox.confidence * 100).toFixed(1)}%)`
          )
          .join("\n")
      : "  Brak dopasowań.";

  const userOnlyLines =
    result.userOnlyYellow.length > 0
      ? result.userOnlyYellow
          .map(
            (box, i) =>
              `  ${i + 1}. Użytkownik zaznaczył "${box.label}", ale nie ma tam dopasowanej detekcji modelu.`
          )
          .join("\n")
      : "  Brak.";

  const modelOnlyLines =
    result.modelOnlyYellow.length > 0
      ? result.modelOnlyYellow
          .map(
            (p, i) =>
              `  ${i + 1}. Model wykrył "${p.label}" z pewnością ${(p.confidence * 100).toFixed(1)}%, bez dopasowanej anotacji użytkownika.`
          )
          .join("\n")
      : "  Brak.";

  return `Jesteś asystentem edukacyjnym wspierającym naukę anotacji obrazów dermoskopowych. Twoim zadaniem jest przygotowanie krótkiej informacji zwrotnej w języku polskim na podstawie porównania anotacji użytkownika z wynikiem modelu detekcyjnego.

Nie traktuj wyniku modelu jako pewnej prawdy klinicznej. Model jest punktem odniesienia w demonstracji i może popełniać błędy. Nie stawiaj diagnozy i nie sugeruj decyzji klinicznych.

## Kontekst zadania

Użytkownik zaznaczał struktury dermoskopowe przy użyciu prostokątów bounding-box i przypisywał im jedną z dostępnych etykiet:
${ANNOTATION_LABELS.map((label) => `- ${label}`).join("\n")}

Model detekcyjny RF-DETR + SAHI zwraca detekcje dla aktualnie udostępnionych klas. Porównanie dotyczy tylko par o tej samej etykiecie i IoU powyżej przyjętego progu.

## Anotacje użytkownika

Łączna liczba anotacji: ${totalUser}
${labelLines}

## Porównanie z modelem

Liczba detekcji modelu: ${totalModel}
Liczba porównywanych anotacji użytkownika: ${result.matched.length + result.userOnlyYellow.length}

### Zgodne z wynikiem modelu
${matchedLines}

### Zaznaczone tylko przez użytkownika
${userOnlyLines}

### Wykryte tylko przez model
${modelOnlyLines}

## Zadanie dla asystenta

Na podstawie powyższych danych napisz zwięzłą informację zwrotną w języku polskim. Podziel odpowiedź na trzy sekcje:

1. **Zgodność z modelem** — podsumuj, które anotacje pokrywają się z wynikiem modelu. Podaj liczby, ale nie przedstawiaj modelu jako pewnej prawdy klinicznej.
2. **Różnice względem modelu** — wskaż anotacje obecne tylko po stronie użytkownika oraz detekcje obecne tylko po stronie modelu. Opisz je neutralnie.
3. **Wskazówki do dalszej pracy** — podaj 2–3 konkretne wskazówki dotyczące dokładności zaznaczania struktur dermoskopowych.

Styl: prosty, rzeczowy i akademicki. Unikaj przesadnych pochwał, ocen klinicznych, diagnoz oraz informacji niezwiązanych z dermoskopią.`;
}
