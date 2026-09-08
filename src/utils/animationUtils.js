export function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function interpolate(from, to, progress) {
  const easedProgress = easeInOutSine(progress);
  return from + (to - from) * easedProgress;
}

export function getAnimatedValue(progress, defaultValue) {
  if (progress < 1 / 3) {
    return interpolate(defaultValue, 80, progress * 3);
  }

  if (progress < 2 / 3) {
    return interpolate(80, 20, (progress - 1 / 3) * 3);
  }

  return interpolate(20, defaultValue, (progress - 2 / 3) * 3);
}
