export function parseList(value, expectedLength, fallbackPrefix = "Ressource") {
  const parsed = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  while (parsed.length < expectedLength) {
    parsed.push(`${fallbackPrefix} ${parsed.length + 1}`);
  }

  return parsed.slice(0, expectedLength);
}

export function parseWeights(value, expectedLength, fallbackValue = 1) {
  const parsed = String(value || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .map((item) => (Number.isFinite(item) && item > 0 ? item : fallbackValue));

  while (parsed.length < expectedLength) {
    parsed.push(fallbackValue);
  }

  return parsed.slice(0, expectedLength);
}

export function getDefaultValues(weights) {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  if (totalWeight === 0) {
    return weights.map(() => 0);
  }

  return weights.map((weight) => (weight / totalWeight) * 100);
}

export function rebalanceValues(
  currentValues,
  weights,
  changedIndex,
  changedValue
) {
  const nextValues = [...currentValues];

  const safeChangedValue = Math.max(
    0,
    Math.min(100, Number(changedValue) || 0)
  );
  nextValues[changedIndex] = safeChangedValue;

  const remainingCapacity = 100 - safeChangedValue;

  const otherIndexes = nextValues
    .map((_, index) => index)
    .filter((index) => index !== changedIndex);

  const otherTotalWeight = otherIndexes.reduce((sum, index) => {
    return sum + (weights[index] || 0);
  }, 0);

  otherIndexes.forEach((index) => {
    nextValues[index] =
      otherTotalWeight === 0
        ? 0
        : (remainingCapacity / otherTotalWeight) * (weights[index] || 0);
  });

  return nextValues;
}

export function buildResourceItems({
  names,
  weights,
  values,
  totalResources,
  colors,
}) {
  return names.map((name, index) => {
    const percent = values[index] ?? 0;
    const resources = (percent / 100) * totalResources;
    const weight = weights[index] ?? 1;

    return {
      name,
      percent,
      resources,
      weight,
      color: colors[index % colors.length],
    };
  });
}

export function getResourceInputs(filters, colors) {
  const resourceCount = Math.max(1, Number(filters.resourceCount) || 1);
  const totalResources = Number(filters.totalResources) || 0;

  const names = parseList(filters.activityNames, resourceCount);
  const weights = parseWeights(filters.weightsQ1, names.length, 1);
  const defaultValues = getDefaultValues(weights);

  return {
    resourceCount,
    totalResources,
    names,
    weights,
    defaultValues,
    colors,
  };
}
