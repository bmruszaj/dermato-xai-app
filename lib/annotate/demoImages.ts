export interface DemoImage {
  id: string;
  title: string;
  src: string;
  description: string;
  credit: string;
}

export const DEMO_IMAGES: DemoImage[] = [
  {
    id: "isic-68-0021681",
    title: "ISIC 68",
    src: "/demo-images/ISIC_68_0021681.jpg",
    description: "Obraz dermoskopowy do szybkiego testu adnotacji.",
    credit: "Eksport projektu Label Studio.",
  },
  {
    id: "isic-85-0021817",
    title: "ISIC 85",
    src: "/demo-images/ISIC_85_0021817.jpg",
    description: "Obraz dermoskopowy z zestawu przykładów demo.",
    credit: "Eksport projektu Label Studio.",
  },
  {
    id: "isic-688-9721167",
    title: "ISIC 688",
    src: "/demo-images/ISIC_688_9721167.jpg",
    description: "Obraz dermoskopowy do sprawdzenia porównania z modelem.",
    credit: "Eksport projektu Label Studio.",
  },
  {
    id: "uuid-c5d34fa2",
    title: "Przykład 4",
    src: "/demo-images/c5d34fa2-1a24-4ec9-be9f-109b80a8dd7e.jpg",
    description: "Dodatkowy obraz dermoskopowy do prezentacji przepływu demo.",
    credit: "Eksport projektu Label Studio.",
  },
  {
    id: "uuid-3ae58bd9",
    title: "Przykład 5",
    src: "/demo-images/3ae58bd9-ae4e-42eb-9383-0581d7cf6bb2.jpg",
    description: "Dodatkowy obraz dermoskopowy do testowania adnotacji.",
    credit: "Eksport projektu Label Studio.",
  },
];
