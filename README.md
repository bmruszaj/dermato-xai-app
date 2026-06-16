# Dermato XAI

Publiczna wizytówka i demo projektu `Dermatoskopia wyjaśnialna` przygotowane na AI Forum 2026.

Strona ma dwa cele:

- krótko wyjaśnić problem, rozwiązanie i efekt projektu;
- pozwolić każdemu uruchomić demo adnotacji dermoskopowych bez logowania.

## Demo

Demo pozwala:

- wybrać syntetyczny obraz przykładowy albo wgrać własny obraz PNG/JPG/WEBP;
- narysować bounding boxy dla dostępnych struktur dermoskopowych;
- porównać adnotacje użytkownika z detekcjami modeli RF-DETR + SAHI uruchamianych na Modal;
- zobaczyć nakładkę, statystyki i edukacyjny feedback tekstowy.

To narzędzie badawczo-edukacyjne. Nie stawia diagnozy i nie zastępuje konsultacji lekarskiej.

## Konfiguracja

Skopiuj `.env.example` do `.env.local` i uzupełnij:

```bash
CLARIN_API_KEY=...
# opcjonalnie, domyślnie: llama3.3
CLARIN_MODEL=llama3.3
MODAL_RFDETR_URL=https://szafraniecszymon--dermoscopy-rfdetr-sahi-inference-infer-05a6e2.modal.run
```

Opcjonalnie można ograniczyć zestaw struktur pokazywanych użytkownikowi:

```bash
# brak wartości: wszystkie 5 struktur
ANNOTATION_STRUCTURE_SET=1 # Yellow globules + Blue-gray globules
ANNOTATION_STRUCTURE_SET=2 # tylko Yellow globules
```

## Uruchomienie lokalne

```bash
pnpm install
pnpm dev
```

Aplikacja będzie dostępna pod [localhost:3000](http://localhost:3000).

## Weryfikacja

```bash
pnpm exec tsc --noEmit
pnpm build
pnpm test
```

`pnpm check` uruchamia Ultracite/Biome i wymaga poprawnej konfiguracji `biome.jsonc`.

## Contributing / Local Development

Prerequisites:

- Node.js 20+
- pnpm

Setup:

```bash
pnpm install
cp .env.example .env.local
```

Fill in `.env.local` with the required API keys. For the full demo you need
`CLARIN_API_KEY` and `MODAL_RFDETR_URL`. `CLARIN_MODEL` is optional and defaults
to `llama3.3`.

Run the app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The public demo is
available at `/annotate`.

Before opening a pull request, run:

```bash
pnpm exec tsc --noEmit
pnpm check
pnpm build
```
