import { describe, it, expect } from 'vitest';
import {
  PackingListService,
  type PackingListInput,
  type PackingGuest,
  type PackingWeatherDay,
  type PackingPlanItem,
  type PackingItem,
} from '../../src/packing-list/packing-list.service.js';

// ─── Helpers ────────────────────────────────────────────────────────────

function makeGuest(overrides: Partial<PackingGuest> = {}): PackingGuest {
  return {
    id: 'guest-1',
    ageBracket: '18+',
    mobility: 'none',
    ...overrides,
  };
}

function makeWeather(overrides: Partial<PackingWeatherDay> = {}): PackingWeatherDay {
  return {
    date: '2026-06-15',
    highF: 80,
    precipitationProbability: 0.1,
    ...overrides,
  };
}

function makePlanItem(overrides: Partial<PackingPlanItem> = {}): PackingPlanItem {
  return {
    name: 'Space Mountain',
    type: 'attraction',
    ...overrides,
  };
}

function makeInput(overrides: Partial<PackingListInput> = {}): PackingListInput {
  return {
    tripId: 'trip-1',
    planItems: [makePlanItem()],
    weatherByDate: [makeWeather()],
    guests: [makeGuest()],
    ...overrides,
  };
}

function itemNames(items: PackingItem[]): string[] {
  return items.map((i) => i.name);
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe('PackingListService', () => {
  const service = new PackingListService();

  describe('baseline items (every trip)', () => {
    it('always includes sunscreen, water bottle, phone charger, park map, and rain poncho', () => {
      const result = service.generate(makeInput());
      const names = itemNames(result);

      expect(names).toContain('Sunscreen SPF 50');
      expect(names).toContain('Refillable Water Bottle');
      expect(names).toContain('Portable Phone Charger');
      expect(names).toContain('Park Map (free at entrance)');
      expect(names).toContain('Rain Poncho');
    });
  });

  describe('weather rules', () => {
    it('includes cooling towel when any day has temp >= 85F', () => {
      const result = service.generate(makeInput({ weatherByDate: [makeWeather({ highF: 85 })] }));
      expect(itemNames(result)).toContain('Cooling Towel');
    });

    it('does NOT include cooling towel when all days < 85F', () => {
      const result = service.generate(makeInput({ weatherByDate: [makeWeather({ highF: 84 })] }));
      expect(itemNames(result)).not.toContain('Cooling Towel');
    });

    it('includes rain jacket when any day has precipitation >= 50%', () => {
      const result = service.generate(
        makeInput({ weatherByDate: [makeWeather({ precipitationProbability: 0.5 })] }),
      );
      expect(itemNames(result)).toContain('Rain Jacket');
    });

    it('does NOT include rain jacket when precipitation < 50%', () => {
      const result = service.generate(
        makeInput({ weatherByDate: [makeWeather({ precipitationProbability: 0.49 })] }),
      );
      expect(itemNames(result)).not.toContain('Rain Jacket');
    });

    it('hot day includes both cooling towel and sunscreen', () => {
      const result = service.generate(makeInput({ weatherByDate: [makeWeather({ highF: 95 })] }));
      const names = itemNames(result);
      expect(names).toContain('Cooling Towel');
      expect(names).toContain('Sunscreen SPF 50');
    });
  });

  describe('guest age rules', () => {
    it('includes stroller + baby snacks + hydration for toddler (0-2)', () => {
      const result = service.generate(makeInput({ guests: [makeGuest({ ageBracket: '0-2' })] }));
      const names = itemNames(result);
      expect(names).toContain('Stroller / Rental Guide');
      expect(names).toContain('Baby Snacks');
      expect(names).toContain('Extra Hydration (electrolyte packets)');
    });

    it('includes stroller + baby snacks + hydration for young child (3-6)', () => {
      const result = service.generate(makeInput({ guests: [makeGuest({ ageBracket: '3-6' })] }));
      const names = itemNames(result);
      expect(names).toContain('Stroller / Rental Guide');
      expect(names).toContain('Baby Snacks');
    });

    it('includes autograph book for guest age 3-6', () => {
      const result = service.generate(makeInput({ guests: [makeGuest({ ageBracket: '3-6' })] }));
      expect(itemNames(result)).toContain('Autograph Book + Thick Marker');
    });

    it('includes autograph book for guest age 7-9', () => {
      const result = service.generate(makeInput({ guests: [makeGuest({ ageBracket: '7-9' })] }));
      expect(itemNames(result)).toContain('Autograph Book + Thick Marker');
    });

    it('does NOT include autograph book for teen or adult', () => {
      const result = service.generate(makeInput({ guests: [makeGuest({ ageBracket: '14-17' })] }));
      expect(itemNames(result)).not.toContain('Autograph Book + Thick Marker');
    });
  });

  describe('mobility rules', () => {
    it('includes ECV backup note for ecv guest', () => {
      const result = service.generate(makeInput({ guests: [makeGuest({ mobility: 'ecv' })] }));
      expect(itemNames(result)).toContain('ECV Backup (rental contact + charger)');
    });

    it('does NOT include ECV backup for non-ecv guest', () => {
      const result = service.generate(makeInput({ guests: [makeGuest({ mobility: 'none' })] }));
      expect(itemNames(result)).not.toContain('ECV Backup (rental contact + charger)');
    });
  });

  describe('water ride rules', () => {
    it('includes quick-dry clothes + ziploc for Splash Mountain', () => {
      const result = service.generate(
        makeInput({ planItems: [makePlanItem({ name: 'Splash Mountain' })] }),
      );
      const names = itemNames(result);
      expect(names).toContain('Quick-Dry Clothes');
      expect(names).toContain('Ziploc Bags (for electronics)');
    });

    it('includes quick-dry clothes + ziploc for Kali River Rapids', () => {
      const result = service.generate(
        makeInput({ planItems: [makePlanItem({ name: 'Kali River Rapids' })] }),
      );
      expect(itemNames(result)).toContain('Quick-Dry Clothes');
    });

    it('does NOT include water ride items for non-water rides', () => {
      const result = service.generate(
        makeInput({ planItems: [makePlanItem({ name: 'Space Mountain' })] }),
      );
      expect(itemNames(result)).not.toContain('Quick-Dry Clothes');
      expect(itemNames(result)).not.toContain('Ziploc Bags (for electronics)');
    });
  });

  describe('combined superset', () => {
    it('returns all conditional items when all conditions met', () => {
      const result = service.generate(
        makeInput({
          weatherByDate: [makeWeather({ highF: 95, precipitationProbability: 0.7 })],
          guests: [
            makeGuest({ ageBracket: '0-2', mobility: 'ecv' }),
            makeGuest({ ageBracket: '7-9' }),
          ],
          planItems: [makePlanItem({ name: 'Kali River Rapids' })],
        }),
      );
      const names = itemNames(result);

      // Baseline
      expect(names).toContain('Sunscreen SPF 50');
      expect(names).toContain('Refillable Water Bottle');

      // Weather
      expect(names).toContain('Cooling Towel');
      expect(names).toContain('Rain Jacket');

      // Kids
      expect(names).toContain('Stroller / Rental Guide');
      expect(names).toContain('Baby Snacks');
      expect(names).toContain('Autograph Book + Thick Marker');

      // Mobility
      expect(names).toContain('ECV Backup (rental contact + charger)');

      // Water rides
      expect(names).toContain('Quick-Dry Clothes');
      expect(names).toContain('Ziploc Bags (for electronics)');
    });
  });

  describe('determinism', () => {
    it('produces identical ordered output across 10 runs', () => {
      const input = makeInput({
        weatherByDate: [makeWeather({ highF: 90, precipitationProbability: 0.6 })],
        guests: [
          makeGuest({ ageBracket: '3-6' }),
          makeGuest({ ageBracket: '18+', mobility: 'ecv' }),
        ],
        planItems: [makePlanItem({ name: 'Splash Mountain' })],
      });

      const firstRun = JSON.stringify(service.generate(input));
      for (let i = 0; i < 10; i++) {
        expect(JSON.stringify(service.generate(input))).toBe(firstRun);
      }
    });
  });
});
