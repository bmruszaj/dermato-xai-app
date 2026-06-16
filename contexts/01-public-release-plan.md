# Plan przygotowania strony Dermato XAI do upublicznienia

## Context

- Źródło wymagań: PDF `AI Forum 2026 - sem 3 - końcowe`.
- Projekt występuje na AI Forum jako grupa G02 z tematem `Dermatoskopia wyjaśnialna`.
- Strona ma pełnić dwie funkcje:
  - wizytówka projektu linkowana QR-em z plakatu;
  - publiczne demo działającej funkcjonalności.
- Docelowi odbiorcy to osoby techniczne i nietechniczne. Strona musi szybko wyjaśniać problem, motywację, rozwiązanie, rezultaty i sposób użycia demo.
- Strona powinna być prosta, publiczna i możliwie bezobsługowa po wydarzeniu.
- Nie chcemy zbierać informacji o użytkownikach. Każdy odwiedzający ma móc wejść, przeczytać opis i uruchomić demo bez konta.

## Current State

- `/` przekierowuje bezpośrednio do `/annotate`, więc brakuje publicznej strony-wizytówki.
- `/annotate` jest właściwym demem:
  - upload obrazu dermoskopowego;
  - ręczne rysowanie bboxów dla pięciu klas;
  - predykcje modelu RF-DETR przez `/api/predict`;
  - porównanie adnotacji użytkownika z predykcjami;
  - feedback tekstowy przez `/api/feedback`.
- Logowanie jest głęboko wpięte:
  - `proxy.ts` chroni `/`, `/annotate` i `/api/:path*`;
  - `app/(annotate)/annotate/page.tsx` używa `useSession` i `signOut`;
  - `/api/predict` i `/api/feedback` wywołują `verifySession`;
  - root layout owija aplikację w `SessionProvider`;
  - istnieją strony `/login` i `/register`.
- Motyw jest przełączalny/systemowy:
  - `ThemeProvider` z `next-themes`;
  - zmienne `.dark` w `app/globals.css`;
  - skrypt aktualizujący `theme-color` zależnie od klasy `dark`.
- Nie ma przykładowych obrazów w `public/`; `UploadZone` obsługuje tylko upload pliku użytkownika.
- README i część testów są nadal pochodną szablonu chatbota/auth.

## Product Target

- Język strony: polski, chyba że zespół zdecyduje inaczej przed publikacją.
- Publiczny URL z QR-kodu prowadzi do landing page, nie bezpośrednio do formularza uploadu.
- Landing page ma mieć jasne CTA do demo i krótkie sekcje:
  - tytuł projektu;
  - problem i motywacja kliniczna;
  - co robi system;
  - jak działa demo;
  - najważniejsze rezultaty lub przykładowe efekty;
  - ograniczenia i disclaimer, że narzędzie nie jest wyrobem medycznym ani diagnozą;
  - zespół/opiekunowie;
  - linki do plakatu, prezentacji, repozytorium, materiałów dodatkowych.
- Demo ma działać bez logowania:
  - użytkownik wybiera przykładowy obraz albo wgrywa własny;
  - aplikacja nie zapisuje obrazu ani danych użytkownika po stronie projektu;
  - wynik pokazuje porównanie adnotacji użytkownika z modelem oraz feedback.

## Plan

1. Ustalić finalną treść wizytówki
   - Przygotować krótkie teksty do sekcji landing page: problem, rozwiązanie, demo, rezultaty, ograniczenia, zespół.
   - Dodać uczciwy opis zakresu modelu: model porównuje głównie klasę `Yellow globules (ulcer)`, a pozostałe klasy służą jako kontekst adnotacji.
   - Dodać disclaimer prywatności i medyczny: demo edukacyjne/badawcze, nie diagnozuje, nie zastępuje konsultacji lekarskiej, nie należy przesyłać danych identyfikujących pacjenta.

2. Zmienić `/` z redirectu na publiczną wizytówkę
   - Zastąpić `app/page.tsx` pełnym landing page.
   - Dodać CTA `Wypróbuj demo`, kierujące do `/annotate`.
   - Zachować prostą strukturę bez konieczności utrzymania backendu treści.
   - Ustawić metadane SEO/OpenGraph pod Dermato XAI i AI Forum.

3. Usunąć logowanie z publicznego przepływu
   - Usunąć auth-gating z `proxy.ts` albo całkowicie usunąć proxy, jeśli zostanie tylko `/ping`.
   - Usunąć `verifySession()` z `/api/predict` i `/api/feedback`.
   - Usunąć `useSession`, `signOut` i blok użytkownika z `app/(annotate)/annotate/page.tsx`.
   - Usunąć `SessionProvider` z `app/layout.tsx`.
   - Zdecydować, czy fizycznie usuwamy segment `app/(auth)` i komponenty `components/auth`, czy zostawiamy je tymczasowo nieużywane. Preferowane: usunąć, jeśli nie ma planu powrotu do logowania.
   - Po usunięciu auth sprawdzić `.env.example`, README i zależności pod kątem martwych wymagań auth/database.

4. Zabezpieczyć publiczne API bez zbierania użytkowników
   - Dodać walidację rozmiaru payloadu i typu obrazu przed wysłaniem do Modala.
   - Ustalić maksymalny rozmiar uploadu dla demo, np. 5-10 MB.
   - Dodać przyjazny komunikat, gdy model/CLARIN jest niedostępny lub zimny start trwa długo.
   - Rozważyć prosty rate limit lub BotID na endpointach publicznych, aby demo nie zostało przypadkowo przeciążone.
   - Nie zapisywać przesyłanych obrazów, adresów email, sesji ani historii adnotacji.

5. Wymusić white mode only
   - Usunąć `ThemeProvider` i zależność od `next-themes`, jeśli nie będzie już używana.
   - Usunąć skrypt `THEME_COLOR_SCRIPT` i ustawić stały `theme-color` na jasny.
   - Usunąć lub zneutralizować `.dark` z `app/globals.css`.
   - Przejrzeć klasy `dark:*` w komponentach i zostawić jednolite jasne warianty.
   - Ustawić `html lang="pl"` w `app/layout.tsx`, jeśli strona zostaje po polsku.

6. Dodać przykładowe obrazy do demo
   - Dodać obrazy do `public/demo-images/`.
   - Dodać manifest, np. `lib/annotate/demoImages.ts`, z polami: `id`, `title`, `src`, `description`, opcjonalnie `credit`.
   - Rozszerzyć `UploadZone` o dwa wejścia:
     - wybór przykładowego obrazu;
     - upload własnego obrazu.
   - Po wyborze przykładowego obrazu przekonwertować go do formatu oczekiwanego przez istniejący `/api/predict` albo dostosować endpoint do przyjmowania URL-a z `public`.
   - Dodać krótką podpowiedź, że przykładowe obrazy są bezpieczną ścieżką do szybkiego przetestowania demo przy plakacie.

7. Uporządkować demo pod publiczny odbiór
   - Dopisać instrukcję krok po kroku nad demo: wybierz obraz, zaznacz zmiany, zatwierdź, porównaj z modelem.
   - Wyjaśnić kolory i linie: kolor = klasa, linia ciągła = użytkownik, linia przerywana = model.
   - Uprościć słownictwo w UI tam, gdzie jest zbyt techniczne.
   - Dodać stan pusty dla feedbacku, jeśli CLARIN nie odpowie: pokazać samo porównanie i statystyki.
   - Poprawić literówki w etykiecie `Yellow globlues` w warstwie prezentacyjnej, zachowując kompatybilność z backendową nazwą klasy, jeśli model jej wymaga.

8. Zaktualizować testy
   - Usunąć lub przepisać `tests/e2e/auth.test.ts`.
   - Dodać test, że `/` renderuje wizytówkę i CTA do demo.
   - Dodać test, że `/annotate` jest dostępne bez logowania.
   - Dodać test wyboru przykładowego obrazu, przejścia do canvasu i widoczności instrukcji.
   - Dostosować testy API do publicznych endpointów i faktycznego kształtu `ComparisonResult`.
   - Uruchomić `pnpm check`, `pnpm build` i sensowny subset Playwright przed publikacją.

9. Uporządkować materiały publikacyjne
   - Przepisać `README.md` z opisu chatbota na opis Dermato XAI.
   - Zaktualizować `.env.example` pod realnie potrzebne zmienne: `MODAL_RFDETR_URL`, `CLARIN_API_KEY`, ewentualnie ustawienia antyspamowe/rate limit.
   - Dodać linki do prezentacji, plakatu i repozytorium, kiedy będą gotowe.
   - Przygotować finalny URL do QR-kodu i sprawdzić go na telefonie.
   - Dodać favicon/preview image, jeśli czas pozwoli.

10. Publikacja i smoke test
   - Wybrać docelowy hosting. Obecny projekt jest przystosowany do Vercel i korzysta z endpointów backendowych, więc Vercel jest praktyczniejszy niż statyczny GitHub Pages.
   - Skonfigurować env vars na hostingu.
   - Wykonać smoke test:
     - wejście z publicznego URL-a;
     - kliknięcie CTA;
     - wybór domyślnego obrazu;
     - ręczna adnotacja;
     - predykcja modelu;
     - feedback lub fallback bez feedbacku;
     - test na telefonie przez QR.

## Suggested Implementation Order

1. Najpierw usunąć auth-gating i przepisać testy dostępu publicznego.
2. Następnie wymusić jasny motyw i oczyścić layout.
3. Potem dodać landing page.
4. Następnie dodać przykładowe obrazy i UI wyboru obrazu.
5. Na końcu dopracować treści, README, metadane, testy i deployment.

## Acceptance Criteria

- Użytkownik z nowej przeglądarki może wejść na `/` bez konta.
- `/` jest wizytówką projektu i zawiera CTA do demo.
- `/annotate` działa bez sesji i bez przycisku wylogowania.
- `/api/predict` i `/api/feedback` nie wymagają auth, ale walidują dane wejściowe.
- Aplikacja jest tylko w jasnym motywie, bez przełączania i bez zależności od systemowego dark mode.
- Demo pozwala wybrać obraz przykładowy lub wgrać własny.
- Strona nie deklaruje diagnostyki medycznej i jasno komunikuje ograniczenia.
- `pnpm check` i `pnpm build` przechodzą przed publikacją.

## Open Decisions

- Czy strona ma być w 100% po polsku, czy dwujęzyczna PL/EN?
- Jakie dokładnie przykładowe obrazy można legalnie opublikować i z jaką atrybucją?
- Czy publiczny endpoint Modala wytrzyma ruch z AI Forum, czy potrzebny jest cache/fallback dla domyślnych obrazów?
- Czy feedback CLARIN ma być wymagany do udanego demo, czy porównanie bboxów wystarczy jako tryb awaryjny?
- Czy usuwamy zależności database/auth od razu, czy zostawiamy je na osobny cleanup po publikacji?
