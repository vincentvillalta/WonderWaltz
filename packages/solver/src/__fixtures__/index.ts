/**
 * Barrel export for all 6 canonical solver fixtures (SOLV-12).
 * Each fixture exports { name: string, input: SolverInput }.
 */

import { singleDayMkToddler } from './single-day-mk-toddler.js';
import { threeDayAllParks } from './three-day-all-parks.js';
import { adultThrillDay } from './adult-thrill-day.js';
import { mobilityConstrained } from './mobility-constrained.js';
import { ecvDas } from './ecv-das.js';
import { fiveDayRoyal } from './five-day-royal.js';

export const fixtures = [
  singleDayMkToddler,
  threeDayAllParks,
  adultThrillDay,
  mobilityConstrained,
  ecvDas,
  fiveDayRoyal,
] as const;

export {
  singleDayMkToddler,
  threeDayAllParks,
  adultThrillDay,
  mobilityConstrained,
  ecvDas,
  fiveDayRoyal,
};
