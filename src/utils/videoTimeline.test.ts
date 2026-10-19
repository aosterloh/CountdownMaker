import { describe, it, expect } from 'vitest';
import { extractTimestampFromUri, getLatestSlotVideoTimestamp } from './videoTimeline';
import { CountdownSlot } from '../types';

describe('videoTimeline', () => {
  describe('extractTimestampFromUri', () => {
    it('extracts epoch timestamp from Veo clip URI', () => {
      const uri = 'https://storage.googleapis.com/test-bucket/jobs/bmw/slot_8_veo_fast_720p_1789809419147.mp4';
      expect(extractTimestampFromUri(uri)).toBe(1789809419147);
    });

    it('extracts epoch timestamp from master countdown URI', () => {
      const uri = '/output/master_countdown_10shots_720p_1789651962885.mp4';
      expect(extractTimestampFromUri(uri)).toBe(1789651962885);
    });

    it('extracts epoch timestamp from extended master countdown URI', () => {
      const uri = 'https://storage.googleapis.com/test/extended_master_countdown_1789651962900.mp4';
      expect(extractTimestampFromUri(uri)).toBe(1789651962900);
    });

    it('returns 0 for undefined, null, or empty string', () => {
      expect(extractTimestampFromUri(undefined)).toBe(0);
      expect(extractTimestampFromUri(null)).toBe(0);
      expect(extractTimestampFromUri('')).toBe(0);
    });

    it('returns 0 for URIs without a timestamp pattern', () => {
      expect(extractTimestampFromUri('https://storage.googleapis.com/test/master.mp4')).toBe(0);
    });
  });

  describe('getLatestSlotVideoTimestamp', () => {
    it('returns the maximum timestamp between rawVideoUri and processedVideoUri across all slots', () => {
      const slots = [
        {
          index: 0,
          diegeticNumber: 10,
          rawVideoUri: 'slot_10_veo_fast_720p_1789650000000.mp4',
        },
        {
          index: 1,
          diegeticNumber: 9,
          rawVideoUri: 'slot_9_veo_fast_720p_1789650000000.mp4',
          processedVideoUri: 'slot_9_processed_fast_720p_1789651000000.mp4',
        },
        {
          index: 2,
          diegeticNumber: 8,
          // Newly regenerated take in Step 5:
          rawVideoUri: 'slot_8_veo_fast_720p_1789809419147.mp4',
        },
      ] as CountdownSlot[];

      expect(getLatestSlotVideoTimestamp(slots)).toBe(1789809419147);
    });

    it('correctly determines that takes are newer than master video', () => {
      const masterUri = '/output/master_countdown_10shots_720p_1789651962885.mp4';
      const slots = [
        {
          index: 2,
          diegeticNumber: 8,
          rawVideoUri: 'slot_8_veo_fast_720p_1789809419147.mp4',
        },
      ] as CountdownSlot[];

      const masterTs = extractTimestampFromUri(masterUri);
      const takesTs = getLatestSlotVideoTimestamp(slots);

      expect(takesTs).toBeGreaterThan(masterTs);
    });

    it('returns 0 when slots list is empty', () => {
      expect(getLatestSlotVideoTimestamp([])).toBe(0);
    });
  });
});
