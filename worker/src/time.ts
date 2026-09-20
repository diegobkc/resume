export function secondsUntilUtcMidnight(now: Date): number {
  const midnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0),
  )
  return Math.floor((midnight.getTime() - now.getTime()) / 1000)
}
