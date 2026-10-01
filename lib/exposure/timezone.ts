import { TimezoneInference } from './types';

export function inferTimezone(timestamps: number[]): TimezoneInference | null {
  if (timestamps.length < 30) return null;

  const histogram = new Array(24).fill(0);
  for (const ts of timestamps) {
    const hour = new Date(ts * 1000).getUTCHours();
    histogram[hour]++;
  }

  const total = timestamps.length;
  const normalized = histogram.map(count => count / total);

  let minSum = Infinity;
  let sleepStart = 0;

  for (let start = 0; start < 24; start++) {
    let sum = 0;
    for (let i = 0; i < 5; i++) {
      sum += normalized[(start + i) % 24];
    }
    if (sum < minSum) {
      minSum = sum;
      sleepStart = start;
    }
  }

  const sleepMidpoint = (sleepStart + 2.5) % 24;
  // Sleep midpoint is typically ~3am local, so offset = sleepMidpoint - 3
  const rawOffset = sleepMidpoint - 3;
  const offset = rawOffset < -12 ? rawOffset + 24 : rawOffset > 12 ? rawOffset - 24 : rawOffset;

  const sleepEnd = (sleepStart + 5) % 24;
  const peakStart = (sleepEnd + 4) % 24;
  const peakEnd = (peakStart + 6) % 24;

  // Confidence based on how low activity is during sleep vs peak
  const sleepActivity = minSum;
  let peakSum = 0;
  for (let i = 0; i < 6; i++) {
    peakSum += normalized[(peakStart + i) % 24];
  }

  const ratio = sleepActivity > 0 ? peakSum / sleepActivity : 10;
  const confidence = Math.min(Math.max((ratio - 1) / 4, 0), 1);

  return {
    offset: Math.round(offset),
    confidence: Math.round(confidence * 100) / 100,
    peakHours: [peakStart, peakEnd],
    sleepWindow: [sleepStart, sleepEnd],
  };
}

export function offsetToTimezoneLabel(offset: number): string {
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  return `UTC${sign}${abs}`;
}

const TIMEZONE_REGIONS: Record<number, string[]> = {
  '-12': ['Baker Island'],
  '-11': ['Samoa'],
  '-10': ['Hawaii'],
  '-9': ['Alaska'],
  '-8': ['US Pacific', 'Los Angeles'],
  '-7': ['US Mountain', 'Denver'],
  '-6': ['US Central', 'Chicago', 'Mexico City'],
  '-5': ['US Eastern', 'New York', 'Bogota'],
  '-4': ['Atlantic', 'Santiago', 'Caracas'],
  '-3': ['Buenos Aires', 'Sao Paulo'],
  '-2': ['Mid-Atlantic'],
  '-1': ['Azores'],
  '0': ['London', 'Lisbon', 'Accra'],
  '1': ['Paris', 'Berlin', 'Lagos'],
  '2': ['Cairo', 'Johannesburg', 'Helsinki'],
  '3': ['Moscow', 'Istanbul', 'Nairobi'],
  '4': ['Dubai', 'Baku'],
  '5': ['Karachi', 'Tashkent'],
  '6': ['Dhaka', 'Almaty'],
  '7': ['Bangkok', 'Jakarta'],
  '8': ['Singapore', 'Hong Kong', 'Beijing'],
  '9': ['Tokyo', 'Seoul'],
  '10': ['Sydney', 'Melbourne'],
  '11': ['Solomon Islands'],
  '12': ['Auckland', 'Fiji'],
};

export function offsetToRegions(offset: number): string[] {
  return TIMEZONE_REGIONS[String(offset) as unknown as number] ?? [];
}
