import { CountdownSlot } from '../types';

/**
 * Extracts a numeric timestamp (epoch ms) from a video or asset URI.
 * Handles filenames like:
 * - slot_8_veo_fast_720p_1789809419147.mp4
 * - slot_8_processed_fast_720p_1789809419147.mp4
 * - master_countdown_10shots_720p_1789651962885.mp4
 * - extended_master_countdown_1789651962885.mp4
 */
export function extractTimestampFromUri(uri?: string | null): number {
  if (!uri) return 0;
  const match = uri.match(/_(\d{10,14})\.mp4/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Finds the latest timestamp among active scene takes in slots.
 * Checks both rawVideoUri and processedVideoUri across all available slots.
 */
export function getLatestSlotVideoTimestamp(slots: CountdownSlot[] = []): number {
  let maxTs = 0;
  for (const s of slots) {
    const rawTs = extractTimestampFromUri(s.rawVideoUri);
    const procTs = extractTimestampFromUri(s.processedVideoUri);
    const highest = Math.max(rawTs, procTs);
    if (highest > maxTs) {
      maxTs = highest;
    }
  }
  return maxTs;
}
