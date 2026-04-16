import { Injectable, Logger } from '@nestjs/common';

// ─── Types ──────────────────────────────────────────────────────────────

export interface PackingGuest {
  id: string;
  ageBracket: '0-2' | '3-6' | '7-9' | '10-13' | '14-17' | '18+';
  mobility: 'none' | 'reduced' | 'ecv';
}

export interface PackingWeatherDay {
  date: string; // YYYY-MM-DD
  highF: number;
  precipitationProbability: number; // 0..1
  uvIndex?: number;
}

export interface PackingPlanItem {
  name: string;
  type: string; // 'attraction' | 'dining' | 'show' | etc.
  refId?: string;
}

export interface PackingListInput {
  tripId: string;
  planItems: PackingPlanItem[];
  weatherByDate: PackingWeatherDay[];
  guests: PackingGuest[];
}

export interface PackingItem {
  name: string;
  category: string;
  recommendedAmazonUrl?: string;
}

// ─── Known water rides (by lowercase name) ─────────────────────────────

const WATER_RIDES = new Set([
  'splash mountain',
  'kali river rapids',
  "tiana's bayou adventure",
  'pirates of the caribbean',
  'jurassic world river adventure',
]);

// ─── Service ────────────────────────────────────────────────────────────

@Injectable()
export class PackingListService {
  private readonly logger = new Logger(PackingListService.name);

  /**
   * Generate a deterministic packing list from solver output, weather, and guest data.
   * Same input always produces the same ordered list.
   */
  generate(input: PackingListInput): PackingItem[] {
    const items: PackingItem[] = [];

    // ── Baseline items (every trip) ──
    items.push({
      name: 'Sunscreen SPF 50',
      category: 'essentials',
      recommendedAmazonUrl: 'https://www.amazon.com/dp/B0BX4NQFNQ',
    });
    items.push({
      name: 'Refillable Water Bottle',
      category: 'essentials',
      recommendedAmazonUrl: 'https://www.amazon.com/dp/B09N3GNQNF',
    });
    items.push({
      name: 'Portable Phone Charger',
      category: 'essentials',
      recommendedAmazonUrl: 'https://www.amazon.com/dp/B0B9MJ4VBL',
    });
    items.push({
      name: 'Park Map (free at entrance)',
      category: 'essentials',
    });
    items.push({
      name: 'Rain Poncho',
      category: 'weather',
      recommendedAmazonUrl: 'https://www.amazon.com/dp/B07D3Y3C6X',
    });

    // ── Weather-based rules ──

    const anyHotDay = input.weatherByDate.some((d) => d.highF >= 85);
    if (anyHotDay) {
      items.push({
        name: 'Cooling Towel',
        category: 'weather',
        recommendedAmazonUrl: 'https://www.amazon.com/dp/B0CHMDGYKR',
      });
    }

    const anyRainyDay = input.weatherByDate.some((d) => d.precipitationProbability >= 0.5);
    if (anyRainyDay) {
      items.push({
        name: 'Rain Jacket',
        category: 'weather',
        recommendedAmazonUrl: 'https://www.amazon.com/dp/B07YBZQ3ZR',
      });
    }

    // ── Guest age-based rules ──

    const hasYoungChild = input.guests.some(
      (g) => g.ageBracket === '0-2' || g.ageBracket === '3-6',
    );
    if (hasYoungChild) {
      items.push({
        name: 'Stroller / Rental Guide',
        category: 'kids',
        recommendedAmazonUrl: 'https://www.amazon.com/dp/B09KGFRMKJ',
      });
      items.push({
        name: 'Baby Snacks',
        category: 'kids',
        recommendedAmazonUrl: 'https://www.amazon.com/dp/B0787Z2JDL',
      });
      items.push({
        name: 'Extra Hydration (electrolyte packets)',
        category: 'kids',
        recommendedAmazonUrl: 'https://www.amazon.com/dp/B08JGG8P1H',
      });
    }

    const hasAutographAge = input.guests.some(
      (g) => g.ageBracket === '3-6' || g.ageBracket === '7-9',
    );
    if (hasAutographAge) {
      items.push({
        name: 'Autograph Book + Thick Marker',
        category: 'kids',
        recommendedAmazonUrl: 'https://www.amazon.com/dp/B08GKWKWX7',
      });
    }

    // ── Mobility rules ──

    const hasEcv = input.guests.some((g) => g.mobility === 'ecv');
    if (hasEcv) {
      items.push({
        name: 'ECV Backup (rental contact + charger)',
        category: 'mobility',
      });
    }

    // ── Water ride rules ──

    const hasWaterRide = input.planItems.some((item) => WATER_RIDES.has(item.name.toLowerCase()));
    if (hasWaterRide) {
      items.push({
        name: 'Quick-Dry Clothes',
        category: 'water-rides',
        recommendedAmazonUrl: 'https://www.amazon.com/dp/B07BFNPJHM',
      });
      items.push({
        name: 'Ziploc Bags (for electronics)',
        category: 'water-rides',
        recommendedAmazonUrl: 'https://www.amazon.com/dp/B07D4JQ2VS',
      });
    }

    return items;
  }
}
