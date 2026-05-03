export function getLevelInfo(user) {
  const reputation = Math.max(0, Math.round(Number(user?.reputation) || 0));
  const fallbackLevel = Math.floor(reputation / 100) + 1;
  const backendLevel = user?.level || {};
  const level = Number(backendLevel.level || user?.levelNumber || fallbackLevel);
  const progress = Number.isFinite(Number(backendLevel.progress))
    ? Math.min(100, Math.max(0, Number(backendLevel.progress)))
    : Math.min(100, Math.round((reputation % 100)));

  return {
    level,
    title: backendLevel.title || `Level ${level}`,
    progress,
    pointsToNext: Number.isFinite(Number(backendLevel.pointsToNext))
      ? Number(backendLevel.pointsToNext)
      : Math.max(0, (level * 100) - reputation),
  };
}
