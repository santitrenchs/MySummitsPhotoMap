export type RarityId = "daisy" | "gentian" | "edelweiss" | "saxifrage" | "cinquefoil" | "snow_lotus";

export type Rarity = {
  id: RarityId;
  label: string;
  color: string;
  colorSoft: string;
  ep: number;
};

export const RARITIES: Rarity[] = [
  { id: "daisy",      label: "Daisy",      color: "#00995C", colorSoft: "#E6F4EF", ep: 8    },
  { id: "gentian",    label: "Gentian",    color: "#7B5BA6", colorSoft: "#F2ECFA", ep: 16   },
  { id: "edelweiss",  label: "Edelweiss",  color: "#F97316", colorSoft: "#FFF0E8", ep: 20   },
  { id: "saxifrage",  label: "Saxifrage",  color: "#EAB308", colorSoft: "#FFF8DB", ep: 100  },
  { id: "cinquefoil", label: "Cinquefoil", color: "#DC2626", colorSoft: "#FEF2F2", ep: 500  },
  { id: "snow_lotus", label: "Snow Lotus", color: "#6b7280", colorSoft: "#F9FAFB", ep: 1000 },
];

export function getRarityById(id: RarityId): Rarity {
  return RARITIES.find((r) => r.id === id)!;
}
