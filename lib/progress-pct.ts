/**
 * Percentage label for a done/total progress bar.
 *
 * Rounds to an integer, but never to a number that contradicts the fraction next to it:
 * 521 of 522 is not "100%" while a peak is still missing, and 1 of 522 is not "0%" when
 * the user has already climbed something. Those two edges only show up on long
 * challenges (the FEEC list is 522), which is exactly where the bar is a plain fill and
 * the percentage is the only precise thing on screen.
 */
export function progressPct(done: number, total: number): number {
  if (total <= 0 || done <= 0) return 0;
  if (done >= total) return 100;
  const raw = (done / total) * 100;
  return Math.min(99, Math.max(1, Math.round(raw)));
}
