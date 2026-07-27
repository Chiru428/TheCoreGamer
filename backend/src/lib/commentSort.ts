/** Computes a "best"-sort score: vote balance with a small recency boost so newer comments aren't buried under old ones with similar scores. */
export function computeSortScore(upvotes: number, downvotes: number, createdAt: Date): number {
  const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  return (upvotes - downvotes) - ageHours * 0.01;
}
