import { Transform } from 'class-transformer';

import { toIsoDate } from '../utils/iso-date.js';

export function IsoDate(): PropertyDecorator {
  return Transform(({ value }) => {
    if (value === null || value === undefined) {
      return value;
    }

    return toIsoDate(value);
  });
}
