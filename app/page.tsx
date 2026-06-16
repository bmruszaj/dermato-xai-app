import Image from "next/image";
import Link from "next/link";
import { DEMO_IMAGES } from "@/lib/annotate/demoImages";

// Design direction: presentation-inspired medical teal, soft organic shapes,
// rounded Quicksand typography, friendly education-first copy.

const projectFacts = [
  { label: "AI Forum", value: "2026" },
  { label: "Grupa", value: "G02" },
  { label: "Tryb", value: "Publiczne demo" },
];

const demoSteps = [
  "Wybierz przykładowe zdjęcie albo wgraj własny obraz dermoskopowy.",
  "Zaznacz struktury dermoskopowe prostokątami i przypisz etykiety.",
  "Porównaj swoje adnotacje z detekcjami modeli RF-DETR + SAHI.",
  "Przeczytaj edukacyjny feedback i przejrzyj różnice na nakładce.",
];

const results = [
  "Działający przepływ adnotacji obrazów dermoskopowych w przeglądarce.",
  "Integracja z wieloklasowymi modelami detekcji uruchamianymi przez Modal.",
  "Interaktywne porównanie: kolor oznacza strukturę, linia ciągła człowieka, linia przerywana model.",
];

const benefits = [
  {
    icon: "01",
    title: "Szybki start przy plakacie",
    text: "Gotowe obrazy przykładowe pozwalają przejść demo bez szukania własnego materiału.",
  },
  {
    icon: "02",
    title: "Czytelne porównanie",
    text: "Nakładka rozdziela adnotacje człowieka i detekcje modelu, więc różnice są widoczne od razu.",
  },
  {
    icon: "03",
    title: "Bez kont i zbierania danych",
    text: "Demo działa publicznie, bez logowania i bez budowania profilu użytkownika.",
  },
];

const faqs = [
  {
    question: "Czy to narzędzie stawia diagnozę?",
    answer:
      "Nie. To demo edukacyjno-badawcze pokazujące porównanie adnotacji z modelem AI. Nie zastępuje lekarza ani decyzji klinicznych.",
  },
  {
    question: "Czy muszę się logować?",
    answer:
      "Nie. Publiczna wersja działa bez konta, żeby każdy mógł wejść z QR-kodu i od razu zobaczyć demo.",
  },
  {
    question: "Czy mogę użyć własnego zdjęcia?",
    answer:
      "Tak, ale nie przesyłaj obrazów zawierających dane identyfikujące pacjenta. Najbezpieczniejsza ścieżka na prezentacji to obrazy przykładowe.",
  },
  {
    question: "Jakie struktury obsługuje demo?",
    answer:
      "Zestaw struktur jest konfigurowalny. Domyślnie aplikacja pokazuje pięć klas używanych w projekcie.",
  },
];

const teamMembers = [
  {
    linkedin: "https://www.linkedin.com/in/marcel-masiukiewicz-51350b295/",
    name: "Marcel Masiukiewicz",
  },
  {
    linkedin: "https://www.linkedin.com/in/szymon-szafraniec-436829309/",
    name: "Szymon Szafraniec",
  },
  {
    linkedin: "https://www.linkedin.com/in/bmruszaj/",
    name: "Bartłomiej Ruszaj",
  },
  {
    linkedin: "https://www.linkedin.com/in/marcin-tkocz/",
    name: "Marcin Tkocz",
  },
];

const doctorPhotos = [
  {
    alt: "Ilustracja dwóch lekarzy w białych fartuchach",
    className: "lg:translate-y-8 lg:rotate-[-3deg]",
    height: 280,
    src: "/landing/doctors-pair-1.png",
    width: 430,
  },
  {
    alt: "Ilustracja lekarki i lekarza w białych fartuchach",
    className: "lg:-translate-y-4 lg:rotate-[3deg]",
    height: 320,
    src: "/landing/doctors-pair-2.png",
    width: 430,
  },
];

const scientificAdvisors = [
  {
    linkedin: "https://www.linkedin.com/in/przemys%C5%82aw-dolata-56a6261b0/",
    name: "Przemysław Dolata",
    role: "Opiekun w zakresie analizy i przetwarzania obrazów",
  },
];

const clinicalTechnicalAdvisors = [
  {
    linkedin: "https://www.linkedin.com/in/piotrgiedziun/",
    name: "Piotr Giedziun",
    role: "Opiekun techniczny z kliniki",
  },
];

const clinicalPartners = [
  {
    image: "/landing/jacek-calik.png",
    imageAlt: "Dr hab. n. med. Jacek Calik",
    link: "https://oldtownclinic.pl/",
    name: "Dr hab. n. med. Jacek Calik",
    role: "Współpraca kliniczna i wsparcie merytoryczne",
  },
  {
    image: "/landing/karolina-gowans.png",
    imageAlt: "Lek. Karolina Gowans",
    name: "Lek. Karolina Gowans",
    role: "Adnotacje dermoskopowe i wsparcie przy oznaczaniu zdjęć",
  },
];

const collaborationSupport = [
  "udostępnienie i konsultacja zbioru obrazów dermoskopowych",
  "oznaczone przykłady struktur wykorzystane w demonstracji",
  "wsparcie medyczne przy interpretacji i opisie ograniczeń projektu",
];

function EcgIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-20 w-32 text-[#07807c]"
      fill="none"
      viewBox="0 0 160 96"
    >
      <rect
        className="text-[#9b5cff]"
        height="84"
        rx="0"
        stroke="currentColor"
        strokeWidth="3"
        width="148"
        x="6"
        y="6"
      />
      <path
        d="M12 44h30l14 31 18-62 22 71 16-40h42"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
      />
    </svg>
  );
}

function StethoscopeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-28 w-28 text-[#276f91]"
      fill="none"
      viewBox="0 0 160 160"
    >
      <path
        d="M44 21v15c0 35 20 61 45 61s45-26 45-61V21"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="8"
      />
      <path
        d="M89 97v12c0 22 14 36 34 36 17 0 29-11 29-27"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="8"
      />
      <path
        className="fill-[#0f908a] stroke-[#276f91]"
        d="M132 53c16-15 40-1 35 22-3 15-18 28-34 37-16-9-31-22-34-37-5-23 19-37 33-22Z"
        strokeLinejoin="round"
        strokeWidth="5"
      />
      <circle
        className="fill-white stroke-[#276f91]"
        cx="152"
        cy="118"
        r="14"
        strokeWidth="6"
      />
      <circle className="fill-[#9b5cff]" cx="152" cy="118" r="5" />
      <path
        d="M34 17h20M124 17h20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="8"
      />
    </svg>
  );
}

function DecorativeBlob({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute bg-[#a9dada]/80 ${className}`}
    />
  );
}

function LinkedInIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M20.45 20.45h-3.56v-5.58c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.95v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.32 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.02H3.54V9H7.1v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0Z" />
    </svg>
  );
}

export default function RootPage() {
  return (
    <main className="min-h-screen bg-[#f7f6fb] text-[#0d4a48]">
      <section className="relative min-h-screen overflow-hidden bg-white px-5 py-8 shadow-[0_24px_80px_rgba(36,94,104,0.12)] sm:px-10 lg:px-12 xl:px-16">
        <DecorativeBlob className="-left-16 -top-24 h-56 w-96 rounded-[45%_0_70%_50%]" />
        <DecorativeBlob className="-right-16 -top-20 h-60 w-96 rounded-[0_45%_50%_70%]" />
        <DecorativeBlob className="-bottom-24 -left-14 h-48 w-72 rounded-[55%_65%_0_0]" />
        <DecorativeBlob className="-bottom-28 -right-14 h-56 w-80 rounded-[65%_55%_0_0]" />

        <header className="relative z-10 mx-auto flex max-w-[1440px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#5fb7b9] font-bold text-white shadow-[0_10px_30px_rgba(95,183,185,0.35)]">
              DAI
            </div>
            <div>
              <p className="font-bold text-[#0b7975]">DermatoAI</p>
              <p className="font-medium text-[#4c7b7a] text-sm">
                AI Forum 2026 · grupa G02
              </p>
            </div>
          </div>
          <Link
            className="hidden rounded-full bg-[#5fb7b9] px-5 py-2.5 font-bold text-sm text-white shadow-[0_12px_30px_rgba(95,183,185,0.35)] transition-transform hover:-translate-y-0.5 sm:inline-flex"
            href="/annotate"
          >
            Wypróbuj demo
          </Link>
        </header>

        <div className="relative z-10 mx-auto grid min-h-[78vh] max-w-[1440px] items-center gap-6 py-12 lg:grid-cols-[0.82fr_1.4fr_0.82fr] xl:gap-8">
          <div className="order-2 flex justify-center lg:order-1 lg:justify-start">
            <div
              className={`overflow-hidden rounded-[2rem] bg-white p-4 shadow-[0_24px_70px_rgba(69,151,153,0.18)] ${doctorPhotos[0].className}`}
            >
              <Image
                alt={doctorPhotos[0].alt}
                className="h-auto w-full max-w-[330px] object-contain"
                height={doctorPhotos[0].height}
                priority
                src={doctorPhotos[0].src}
                width={doctorPhotos[0].width}
              />
            </div>
          </div>

          <div className="order-1 space-y-7 lg:order-2">
            <div className="relative">
              <div className="-top-24 left-2 absolute hidden xl:block">
                <EcgIcon />
              </div>
              <div className="-right-8 -top-14 absolute hidden xl:block">
                <StethoscopeIcon />
              </div>

              <div className="rounded-[2.4rem] bg-[#5fb7b9] px-7 py-10 text-center text-white shadow-[0_24px_70px_rgba(69,151,153,0.35)] sm:px-10 lg:px-12 xl:px-16 xl:py-16">
                <p className="font-bold text-white/85 text-sm uppercase tracking-[0.22em]">
                  DermatoAI · przenieś tu zdjęcia
                </p>
                <h1 className="mx-auto mt-5 max-w-5xl text-balance font-bold text-4xl leading-tight sm:text-5xl xl:text-7xl">
                  Wyjaśnialne wsparcie adnotacji obrazów dermoskopowych
                </h1>
                <p className="mx-auto mt-5 max-w-3xl font-medium text-lg text-white/90 leading-8">
                  Publiczna wizytówka projektu oraz demo, w którym zaznaczasz
                  struktury dermoskopowe i porównujesz je z odpowiedzią modelu
                  AI.
                </p>

                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    className="inline-flex min-w-48 items-center justify-center rounded-full bg-white px-7 py-3.5 font-bold text-[#0b7975] shadow-[0_12px_30px_rgba(13,74,72,0.18)] transition-transform hover:-translate-y-0.5"
                    href="/annotate"
                  >
                    Wypróbuj demo
                  </Link>
                  <a
                    className="inline-flex min-w-48 items-center justify-center rounded-full border-2 border-white/80 px-7 py-3.5 font-bold text-white transition-colors hover:bg-white/15"
                    href="#o-projekcie"
                  >
                    O projekcie
                  </a>
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-3">
                  {projectFacts.map((fact) => (
                    <div
                      className="rounded-3xl bg-white/18 p-4 backdrop-blur"
                      key={fact.label}
                    >
                      <p className="font-semibold text-white/75 text-xs uppercase tracking-wide">
                        {fact.label}
                      </p>
                      <p className="mt-1 font-bold text-xl">{fact.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 text-center sm:grid-cols-2 xl:grid-cols-4">
              {teamMembers.map((person) => (
                <a
                  aria-label={`LinkedIn: ${person.name}`}
                  className="inline-flex items-center justify-center gap-2 rounded-3xl bg-[#eef8f8] px-4 py-3 font-semibold text-[#0d4a48] shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-[#dff3f3]"
                  href={person.linkedin}
                  key={person.name}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span>{person.name}</span>
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#0b7975] text-white">
                    <LinkedInIcon />
                  </span>
                </a>
              ))}
            </div>

            <a
              className="mx-auto inline-flex items-center justify-center gap-3 rounded-3xl bg-[#eef8f8] px-5 py-3 font-semibold text-[#0d4a48] text-lg shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-[#dff3f3]"
              href="https://www.linkedin.com/in/grzegorz-chodak-24b4426/"
              rel="noreferrer"
              target="_blank"
            >
              <span>Opiekun naukowy: dr hab. inż. Grzegorz Chodak</span>
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#0b7975] text-white">
                <LinkedInIcon />
              </span>
            </a>
            <div className="mx-auto grid max-w-2xl gap-3">
              {scientificAdvisors.map((advisor) => (
                <a
                  className="inline-flex items-center justify-center gap-3 rounded-3xl bg-[#eef8f8] px-4 py-3 font-semibold text-[#0d4a48] shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-[#dff3f3]"
                  href={advisor.linkedin}
                  key={advisor.name}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span>
                    {advisor.name}
                    <span className="block font-medium text-[#4c7372] text-sm">
                      {advisor.role}
                    </span>
                  </span>
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#0b7975] text-white">
                    <LinkedInIcon />
                  </span>
                </a>
              ))}
            </div>
          </div>

          <div className="order-3 flex justify-center lg:justify-end">
            <div
              className={`overflow-hidden rounded-[2rem] bg-white p-4 shadow-[0_24px_70px_rgba(69,151,153,0.18)] ${doctorPhotos[1].className}`}
            >
              <Image
                alt={doctorPhotos[1].alt}
                className="h-auto w-full max-w-[330px] object-contain"
                height={doctorPhotos[1].height}
                priority
                src={doctorPhotos[1].src}
                width={doctorPhotos[1].width}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7ffff] px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-bold text-[#5fb7b9] text-sm">
              Podgląd materiału
            </p>
            <h2 className="mt-3 max-w-xl font-bold text-3xl tracking-tight">
              Realne przykłady są już w demo
            </h2>
            <p className="mt-4 text-[#4c7372] leading-7">
              Użytkownik może zacząć od obrazów z eksportu projektu albo wgrać
              własny plik. To skraca ścieżkę przy stoisku i pozwala od razu
              pokazać porównanie z modelem.
            </p>
            <Link
              className="mt-6 inline-flex rounded-full bg-[#5fb7b9] px-6 py-3 font-bold text-white shadow-[0_12px_30px_rgba(95,183,185,0.3)] transition-transform hover:-translate-y-0.5"
              href="/annotate"
            >
              Otwórz wybór obrazów
            </Link>
          </div>

          <div className="relative min-h-[360px]">
            {DEMO_IMAGES.slice(0, 3).map((image, index) => (
              <div
                className={[
                  "absolute overflow-hidden rounded-[2rem] border-8 border-white bg-white shadow-[0_24px_70px_rgba(69,151,153,0.22)]",
                  index === 0 ? "left-0 top-8 z-20 w-[62%] rotate-[-3deg]" : "",
                  index === 1 ? "right-0 top-0 z-10 w-[50%] rotate-[4deg]" : "",
                  index === 2
                    ? "bottom-0 right-[18%] z-30 w-[46%] rotate-[2deg]"
                    : "",
                ].join(" ")}
                key={image.id}
              >
                <Image
                  alt={image.description}
                  className="aspect-[4/3] object-cover"
                  height={360}
                  src={image.src}
                  width={480}
                />
                <div className="absolute inset-x-0 bottom-0 bg-white/88 px-4 py-3 backdrop-blur">
                  <p className="font-bold text-[#0d4a48] text-sm">
                    {image.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f1fbfb] px-5 py-16 sm:px-8" id="o-projekcie">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
          <article className="rounded-[2rem] border border-[#b9e2e1] bg-white p-7 shadow-[0_14px_40px_rgba(69,151,153,0.12)]">
            <p className="font-bold text-[#5fb7b9] text-sm">Problem</p>
            <h2 className="mt-3 font-bold text-2xl text-[#0d4a48]">
              Dermoskopia wymaga precyzyjnej interpretacji struktur
            </h2>
            <p className="mt-4 text-[#4c7372] leading-7">
              W obrazach dermoskopowych drobne wzorce mogą mieć znaczenie
              diagnostyczne, ale ich ręczna anotacja jest czasochłonna i wymaga
              doświadczenia. Projekt bada, jak modele detekcji mogą wspierać
              edukację i przegląd takich adnotacji.
            </p>
          </article>

          <article className="rounded-[2rem] border border-[#b9e2e1] bg-white p-7 shadow-[0_14px_40px_rgba(69,151,153,0.12)]">
            <p className="font-bold text-[#5fb7b9] text-sm">Rozwiązanie</p>
            <h2 className="mt-3 font-bold text-2xl text-[#0d4a48]">
              Człowiek rysuje, model porównuje
            </h2>
            <p className="mt-4 text-[#4c7372] leading-7">
              Użytkownik zaznacza struktury na obrazie, a aplikacja zestawia je
              z detekcjami modeli RF-DETR + SAHI. Wynik jest pokazany jako
              nakładka, porównanie źródeł oraz krótkie wskazówki edukacyjne.
            </p>
          </article>

          <article className="rounded-[2rem] border border-[#b9e2e1] bg-white p-7 shadow-[0_14px_40px_rgba(69,151,153,0.12)]">
            <p className="font-bold text-[#5fb7b9] text-sm">
              Ważne ograniczenie
            </p>
            <h2 className="mt-3 font-bold text-2xl text-[#0d4a48]">
              To nie jest narzędzie diagnostyczne
            </h2>
            <p className="mt-4 text-[#4c7372] leading-7">
              Demo ma charakter badawczo-edukacyjny. Nie stawia diagnozy, nie
              zastępuje konsultacji lekarskiej i nie powinno być używane do
              podejmowania decyzji klinicznych.
            </p>
          </article>
        </div>
      </section>

      <section className="bg-white px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="font-bold text-[#5fb7b9] text-sm">
                Współpraca i opieka nad projektem
              </p>
              <h2 className="mt-3 max-w-2xl font-bold text-3xl tracking-tight">
                Dane, adnotacje i konsultacje powstały dzięki współpracy
                ekspertów
              </h2>
              <p className="mt-4 text-[#4c7372] leading-7">
                Projekt łączy kompetencje techniczne, przetwarzanie obrazów
                medycznych oraz praktyczną wiedzę kliniczną. Dzięki tej
                współpracy demo pokazuje realny przepływ pracy na obrazach
                dermoskopowych, a nie tylko abstrakcyjny przykład algorytmu.
              </p>
            </div>

            <a
              className="group rounded-[2rem] border border-[#b9e2e1] bg-[#f7ffff] p-6 shadow-[0_14px_40px_rgba(69,151,153,0.12)] transition-transform hover:-translate-y-1"
              href="https://oldtownclinic.pl/"
              rel="noreferrer"
              target="_blank"
            >
              <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
                <div className="flex size-28 shrink-0 items-center justify-center rounded-[1.5rem] bg-white p-4 shadow-sm">
                  <Image
                    alt="Logo Old Town Clinic"
                    className="h-auto w-full object-contain"
                    height={180}
                    src="/landing/old-town-clinic-logo.png"
                    width={180}
                  />
                </div>
                <div>
                  <p className="font-bold text-[#0b7975] text-sm uppercase tracking-[0.18em]">
                    Old Town Clinic
                  </p>
                  <h3 className="mt-2 font-bold text-2xl text-[#0d4a48]">
                    Współpracująca klinika
                  </h3>
                  <p className="mt-2 text-[#4c7372] leading-7">
                    Zespół kliniki wspierał nas wiedzą medyczną, dostępem do
                    materiału oraz oznaczaniem obrazów potrzebnych do projektu.
                  </p>
                  <span className="mt-4 inline-flex rounded-full bg-[#5fb7b9] px-4 py-2 font-bold text-sm text-white transition-transform group-hover:-translate-y-0.5">
                    Przejdź do strony kliniki
                  </span>
                </div>
              </div>
            </a>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {collaborationSupport.map((item, index) => (
              <div
                className="rounded-[1.5rem] border border-[#b9e2e1] bg-[#eef8f8] p-5"
                key={item}
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-[#5fb7b9] font-bold text-sm text-white">
                  {index + 1}
                </span>
                <p className="mt-4 font-semibold text-[#0d4a48] leading-7">
                  {item}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {clinicalPartners.map((partner) => {
              const content = (
                <>
                  <div className="overflow-hidden rounded-[1.75rem] bg-[#eef8f8]">
                    <Image
                      alt={partner.imageAlt}
                      className="aspect-[4/3] h-full w-full object-cover"
                      height={360}
                      src={partner.image}
                      width={480}
                    />
                  </div>
                  <div className="p-6">
                    <p className="font-bold text-[#5fb7b9] text-sm">
                      Współpraca kliniczna
                    </p>
                    <h3 className="mt-2 font-bold text-2xl text-[#0d4a48]">
                      {partner.name}
                    </h3>
                    <p className="mt-2 text-[#4c7372] leading-7">
                      {partner.role}
                    </p>
                    {partner.link ? (
                      <span className="mt-4 inline-flex rounded-full bg-[#0b7975] px-4 py-2 font-bold text-sm text-white">
                        Klinika i zespół
                      </span>
                    ) : null}
                  </div>
                </>
              );

              return partner.link ? (
                <a
                  className="overflow-hidden rounded-[2rem] border border-[#b9e2e1] bg-white shadow-[0_14px_40px_rgba(69,151,153,0.12)] transition-transform hover:-translate-y-1"
                  href={partner.link}
                  key={partner.name}
                  rel="noreferrer"
                  target="_blank"
                >
                  {content}
                </a>
              ) : (
                <article
                  className="overflow-hidden rounded-[2rem] border border-[#b9e2e1] bg-white shadow-[0_14px_40px_rgba(69,151,153,0.12)]"
                  key={partner.name}
                >
                  {content}
                </article>
              );
            })}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {clinicalTechnicalAdvisors.map((advisor) => (
              <a
                className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-[#b9e2e1] bg-[#f7ffff] p-5 shadow-sm transition-transform hover:-translate-y-0.5"
                href={advisor.linkedin}
                key={advisor.name}
                rel="noreferrer"
                target="_blank"
              >
                <div>
                  <p className="font-bold text-[#0d4a48]">{advisor.name}</p>
                  <p className="mt-1 text-[#4c7372] text-sm leading-6">
                    {advisor.role}
                  </p>
                </div>
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0b7975] text-white">
                  <LinkedInIcon />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f7ffff] px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="font-bold text-[#5fb7b9] text-sm">
              Najważniejsze korzyści
            </p>
            <h2 className="mt-3 font-bold text-3xl tracking-tight">
              Demo ma być zrozumiałe w kilka minut
            </h2>
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <article
                className="rounded-[2rem] border border-[#b9e2e1] bg-white p-7 shadow-[0_14px_40px_rgba(69,151,153,0.12)] transition-transform hover:-translate-y-1"
                key={benefit.title}
              >
                <div className="flex size-14 items-center justify-center rounded-2xl bg-[#5fb7b9] font-bold text-white">
                  {benefit.icon}
                </div>
                <h3 className="mt-5 font-bold text-2xl text-[#0d4a48]">
                  {benefit.title}
                </h3>
                <p className="mt-3 text-[#4c7372] leading-7">{benefit.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1fr]">
          <div>
            <p className="font-bold text-[#5fb7b9] text-sm">Jak działa demo</p>
            <h2 className="mt-3 font-bold text-3xl tracking-tight">
              Cztery kroki przy plakacie albo po wydarzeniu
            </h2>
            <p className="mt-4 text-[#4c7372] leading-7">
              Demo jest publiczne i nie wymaga konta. Można użyć przykładowego
              obrazu albo własnego zdjęcia bez podawania danych osobowych.
            </p>
          </div>
          <ol className="grid gap-3">
            {demoSteps.map((step, index) => (
              <li
                className="flex gap-4 rounded-3xl border border-[#b9e2e1] bg-[#f7ffff] p-4 shadow-sm"
                key={step}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#5fb7b9] font-bold text-sm text-white">
                  {index + 1}
                </span>
                <span className="font-medium text-[#4c7372] leading-7">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[#e4f5f5] px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="font-bold text-[#0b7975] text-sm">Co pokazujemy</p>
            <h2 className="mt-3 font-bold text-3xl tracking-tight">
              Namacalny efekt projektu
            </h2>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {results.map((item) => (
              <div
                className="rounded-[2rem] bg-white p-6 shadow-[0_14px_40px_rgba(69,151,153,0.12)]"
                key={item}
              >
                <p className="font-medium text-[#4c7372] leading-7">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-[2rem] border border-[#5fb7b9] bg-white p-6 text-[#0d4a48]">
            <p className="font-bold">Prywatność w demo</p>
            <p className="mt-2 leading-7">
              Aplikacja nie wymaga logowania i nie zapisuje kont użytkowników.
              Nie przesyłaj obrazów zawierających dane pozwalające
              zidentyfikować pacjenta.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="font-bold text-[#5fb7b9] text-sm">FAQ</p>
            <h2 className="mt-3 font-bold text-3xl tracking-tight">
              Najczęstsze pytania przed uruchomieniem demo
            </h2>
            <p className="mt-4 text-[#4c7372] leading-7">
              Krótkie odpowiedzi pomagają osobom technicznym i nietechnicznym
              szybko zrozumieć zakres projektu.
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                className="group rounded-[1.5rem] border border-[#b9e2e1] bg-[#f7ffff] p-5 shadow-sm"
                key={faq.question}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-[#0d4a48]">
                  {faq.question}
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[#5fb7b9] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[#4c7372] leading-7">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#5fb7b9] px-5 py-16 text-white sm:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/35 bg-white/14 p-8 text-center shadow-[0_24px_70px_rgba(13,74,72,0.18)] backdrop-blur sm:p-12">
          <p className="font-bold text-white/80 text-sm uppercase tracking-[0.22em]">
            Gotowe do pokazania przy plakacie
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl font-bold text-4xl tracking-tight">
            Uruchom demo i sprawdź własne adnotacje
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-medium text-white/90 leading-8">
            Najszybsza ścieżka: wybierz obraz przykładowy, zaznacz struktury i
            porównaj wynik z modelem.
          </p>
          <Link
            className="mt-8 inline-flex rounded-full bg-white px-8 py-4 font-bold text-[#0b7975] shadow-[0_12px_30px_rgba(13,74,72,0.2)] transition-transform hover:-translate-y-0.5"
            href="/annotate"
          >
            Przejdź do demo
          </Link>
        </div>
      </section>

      <footer className="bg-[#0d4a48] px-5 py-10 text-white sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <p className="font-bold text-xl">DermatoAI</p>
            <p className="mt-3 max-w-md text-white/75 leading-7">
              Publiczna wizytówka i demo projektu Dermatoskopia wyjaśnialna na
              AI Forum 2026.
            </p>
          </div>
          <div>
            <p className="font-bold">Projekt</p>
            <ul className="mt-3 space-y-2 text-white/75">
              <li>Grupa G02</li>
              <li>Politechnika Wrocławska</li>
              <li>Opiekun naukowy: dr hab. inż. Grzegorz Chodak</li>
              <li>Współpraca kliniczna: Old Town Clinic</li>
            </ul>
          </div>
          <div>
            <p className="font-bold">Linki</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link className="text-white/75 hover:text-white" href="/">
                  Wizytówka
                </Link>
              </li>
              <li>
                <Link
                  className="text-white/75 hover:text-white"
                  href="/annotate"
                >
                  Demo
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </main>
  );
}
