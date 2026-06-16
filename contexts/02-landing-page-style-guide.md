# DermatoAI Landing Page Style Guide

## Kierunek wizualny

Landing page ma wyglądać jak naturalne rozszerzenie prezentacji AI Forum 2026:
jasny, medyczny, miękki, przyjazny i turkusowy. Celem nie jest surowy SaaS ani
ciemny dashboard, tylko lekka strona-wizytówka, którą można bez wahania pokazać
przy plakacie lub na telefonie.

## Źródło inspiracji

Punkt odniesienia: slajd tytułowy `DermatoAI - przenieść tu zdjęcia`.

Charakterystyczne elementy:

- duży turkusowy panel z mocno zaokrąglonymi rogami;
- białe tło z jasnoturkusowymi organicznymi kształtami w narożnikach;
- medyczne ikonki: EKG, stetoskop, serce, lekarz;
- miękka, zaokrąglona typografia;
- prosty, pogodny styl edukacyjny.

## Paleta kolorów

Kolor dominujący:

- `#5fb7b9` / `#5eb7b9` - główny turkus paneli, CTA i akcentów.

Kolory wspierające:

- `#a9dada` - jasny aqua dla dekoracyjnych narożników i tła sekcji;
- `#eef8f8` - bardzo jasny aqua dla kart i pól pomocniczych;
- `#0b7975` - ciemniejszy turkus dla logo, nagłówków pomocniczych i tekstu na jasnym tle;
- `#0d4a48` - główny ciemny tekst;
- `#4c7372` - tekst drugorzędny;
- `#ffffff` - karty, kontrast w panelach i tło wewnętrznych elementów.

Akcent opcjonalny:

- `#9b5cff` - mały fioletowy akcent, tylko w detalach typu ramka EKG albo punkt w ikonie.

## Typografia

Font główny: `Quicksand`.

Zasady:

- nagłówki: `font-bold`, duże, miękkie, z krótkimi liniami;
- tekst opisowy: `font-medium` lub normalny, z dużym line-height;
- unikać ciężkiego technicznego wyglądu typu terminal/enterprise;
- nie używać ciemnego, ostrego kontrastu na całej stronie, tylko przyjazny ciemny turkus.

## Kształty i layout

Podstawowy motyw: duże zaokrąglenia.

- Hero powinien mieć centralny, szeroki, turkusowy panel z `rounded-[2rem]` lub większym.
- Karty powinny mieć `rounded-3xl` / `rounded-[2rem]`.
- Sekcje powinny oddychać, mieć dużo whitespace i proste siatki.
- Tło może mieć organiczne plamy w rogach, inspirowane slajdem.
- Unikać ostrych prostokątów i ciężkich borderów.

## Dekoracje

Dozwolone dodatki:

- EKG jako mały SVG w górnej części hero;
- stetoskop z sercem jako SVG;
- ilustracja lekarza po lewej/dolnej stronie hero;
- miękkie turkusowe blob-shapes w narożnikach;
- subtelne cienie z turkusowym tintem.

Zasady:

- dekoracje mają wspierać styl prezentacji, nie dominować nad CTA;
- ikony powinny być proste, płaskie, medyczne i przyjazne;
- unikamy generycznych stockowych ikon i „AI purple gradient” estetyki.

## CTA

Główne CTA:

- biały przycisk na turkusowym panelu;
- tekst w ciemnym turkusie;
- pill shape, mocno zaokrąglony;
- delikatny cień i mały hover lift.

Drugie CTA:

- przezroczyste lub outline na panelu;
- biała ramka i biały tekst;
- bez agresywnego koloru.

## Ton komunikacji

Język: polski.

Ton:

- edukacyjny;
- prosty;
- bez przesadnego marketingu;
- jasne ograniczenie: demo nie diagnozuje i nie zastępuje lekarza.

## Czego unikać

- ciemnego motywu;
- czarno-białego, surowego dashboard looku;
- fioletowo-granatowego generycznego AI/SaaS stylu;
- zbyt technicznych hero grafik;
- ostrych prostokątnych kart;
- losowych kolorów klas modelu jako dominującej palety landing page;
- obietnic diagnostycznych lub klinicznych.

## Zastosowanie w kodzie

Aktualne miejsca wdrożenia:

- `app/page.tsx` - struktura landing page, SVG dekoracje, hero i sekcje;
- `app/layout.tsx` - font `Quicksand`;
- `app/globals.css` - jasny turkusowy zestaw tokenów UI.

Każda kolejna zmiana landing page powinna najpierw sprawdzić zgodność z tym
style guide.
