import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../css/activity-partner-gauge-matrix.css";

const ACTIVITY_COLORS = [
  "#265b7d",
  "#678ca4",
  "#a8bdcb",
  "#1d4964",
  "#8aa8ba",
  "#3d718f",
  "#5d89a3",
  "#9bb5c4",
];

const ACTIVITY_BULGE_INTENSITY = 0.35;
const PARTNER_BULGE_INTENSITY = 0.25;

/*
 * Réglages des sous-colonnes internes, par exemple Auditions > Longues / Courtes.
 *
 * MIN_SUBACTIVITY_COLUMN_WIDTH est la largeur minimale souhaitée pour chaque
 * colonne interne. Elle n'écrase pas la logique principale : la largeur des
 * activités reste d'abord basée sur activity.volume * widthPerVolumeUnit.
 * Le minimum intervient seulement si l'activité découpée devient trop étroite
 * pour afficher correctement ses colonnes internes.
 */
const MIN_SUBACTIVITY_COLUMN_WIDTH = 70;
const SUBACTIVITY_PADDING_X = 22;
const SUBACTIVITY_GAP = 38;
const SUBACTIVITY_FRAME_PADDING_X = 10;
const SUBACTIVITY_CONTENT_PADDING_TOP = 8;
const SUBACTIVITY_CONTENT_PADDING_BOTTOM = 10;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

function easeInOutCubic(value) {
  const safe = clamp(value, 0, 1);

  return safe < 0.5
    ? 4 * safe * safe * safe
    : 1 - Math.pow(-2 * safe + 2, 3) / 2;
}

function getAnimatedProgressAtElapsed(elapsed, duration) {
  const safeDuration = Math.max(1, duration);
  const rawProgress = clamp(elapsed / safeDuration, 0, 1);

  const pingPongProgress =
    rawProgress <= 0.5 ? rawProgress * 2 : (1 - rawProgress) * 2;

  return easeInOutCubic(pingPongProgress) * 2;
}

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function parseNames(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumbers(value, expectedLength = 0) {
  const values = String(value || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item >= 0);

  while (values.length < expectedLength) {
    values.push(0);
  }

  return expectedLength > 0 ? values.slice(0, expectedLength) : values;
}

function formatNumber(value, decimals = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  const factor = 10 ** decimals;
  const roundedValue = Math.round(number * factor) / factor;
  const shouldHideDecimals = Number.isInteger(roundedValue);

  return roundedValue.toLocaleString("fr-CH", {
    minimumFractionDigits: shouldHideDecimals ? 0 : decimals,
    maximumFractionDigits: decimals,
  });
}

function parseFlexibleNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const normalized = String(value ?? "")
    .replace(/[’']/g, "")
    .replace(/\s+/g, "")
    .replace(",", ".");

  const number = Number(normalized);

  return Number.isFinite(number) ? number : fallback;
}

function getGaugePeriodValues(filters = {}) {
  return {
    past: parseFlexibleNumber(filters.gaugePastValue, 20000),
    current: parseFlexibleNumber(filters.gaugeCurrentValue, 24000),
    future: parseFlexibleNumber(filters.gaugeFutureValue, 16000),
  };
}

function getInterpolatedGaugeValue(filters, progress) {
  const values = getGaugePeriodValues(filters);
  const safeProgress = clamp(Number(progress) || 0, 0, 2);

  if (safeProgress <= 1) {
    return lerp(values.past, values.current, easeInOutCubic(safeProgress));
  }

  return lerp(values.current, values.future, easeInOutCubic(safeProgress - 1));
}

function getGaugeStageIndex(progress) {
  const safeProgress = clamp(Number(progress) || 0, 0, 2);

  if (safeProgress < 0.5) {
    return 0;
  }

  if (safeProgress < 1.5) {
    return 1;
  }

  return 2;
}

function buildDemandGaugeLayout({ svgWidth, top = 38 }) {
  const width = clamp(svgWidth * 0.78, 700, Math.max(700, svgWidth - 170));
  const trackHeight = 28;
  const x = (svgWidth - width) / 2;
  const y = top + 34;

  return {
    x,
    y,
    width,
    trackHeight,
    radius: trackHeight / 2,
    centerY: y + trackHeight / 2,
    labelY: y - 24,
    scaleY: y + trackHeight + 28,
  };
}

function getGaugePercent(value, min, max) {
  const safeMin = Number.isFinite(Number(min)) ? Number(min) : 0;
  const safeMax = Math.max(
    safeMin + 1,
    Number.isFinite(Number(max)) ? Number(max) : safeMin + 1
  );
  const safeValue = clamp(Number(value) || 0, safeMin, safeMax);

  return ((safeValue - safeMin) / (safeMax - safeMin)) * 100;
}

function getMatrixProgressFromGaugeValue(filters, value) {
  const values = getGaugePeriodValues(filters);
  const highNeedValue = Math.max(values.current, values.future + 1);
  const lowNeedValue = Math.min(values.future, values.current - 1);

  if (highNeedValue <= lowNeedValue) {
    return 1;
  }

  const ratioToFuture = clamp(
    (highNeedValue - Number(value || 0)) / (highNeedValue - lowNeedValue),
    0,
    1
  );

  /*
   * En mode manuel, on fait réagir le tableau au niveau de besoin :
   * - besoin élevé  -> état actuel, priorité sur l'asile ;
   * - besoin faible -> état futur, ouverture vers l'admin / séjour.
   */
  return 1 + ratioToFuture;
}

function getActivityColor(name, fallbackIndex, activityOrderIds) {
  const orderIndex = activityOrderIds.indexOf(normalizeId(name));
  const colorIndex = orderIndex >= 0 ? orderIndex : fallbackIndex;

  return ACTIVITY_COLORS[colorIndex % ACTIVITY_COLORS.length];
}

function sortActivitiesByOrder(activities, activityOrderIds) {
  return [...activities].sort((activityA, activityB) => {
    const orderA = activityOrderIds.indexOf(activityA.id);
    const orderB = activityOrderIds.indexOf(activityB.id);

    if (orderA >= 0 && orderB >= 0) {
      return orderA - orderB;
    }

    if (orderA >= 0) {
      return -1;
    }

    if (orderB >= 0) {
      return 1;
    }

    return activityA.originalOrder - activityB.originalOrder;
  });
}

function parsePartnerLabel(rawName, fallbackIndex) {
  const fallbackName = `Partenaire ${fallbackIndex + 1}`;
  const label = String(rawName || fallbackName).trim();

  const bracketMatch = label.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);

  if (bracketMatch) {
    const fullName = bracketMatch[1].trim() || fallbackName;
    const shortName = bracketMatch[2].trim() || fullName;

    return {
      id: normalizeId(shortName || fullName),
      name: fullName,
      shortName,
      isPlaceholder: false,
    };
  }

  return {
    id: normalizeId(label),
    name: label,
    shortName: label,
    isPlaceholder: false,
  };
}

function parseDivisionValues(rawValues) {
  return String(rawValues || "")
    .split(",")
    .map((item, index) => {
      const trimmedItem = item.trim();

      if (!trimmedItem) {
        return null;
      }

      const separatorIndex = trimmedItem.lastIndexOf(":");

      const rawName =
        separatorIndex >= 0
          ? trimmedItem.slice(0, separatorIndex).trim()
          : `Partenaire ${index + 1}`;

      const rawValue =
        separatorIndex >= 0
          ? trimmedItem.slice(separatorIndex + 1).trim()
          : trimmedItem;

      const partner = parsePartnerLabel(rawName, index);
      const number = Number(rawValue);

      return {
        id: partner.id,
        name: partner.name,
        shortName: partner.shortName,
        value: Number.isFinite(number) ? number : 0,
        index,
        isPlaceholder: partner.isPlaceholder,
      };
    })
    .filter(Boolean);
}

function parseDivisionDetails(value) {
  const detailsByActivity = new Map();

  String(value || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const separatorIndex = entry.indexOf("|");

      if (separatorIndex < 0) {
        return;
      }

      const targetText = entry.slice(0, separatorIndex).trim();
      const valuesText = entry.slice(separatorIndex + 1).trim();

      const targetParts = targetText
        .split(">")
        .map((item) => item.trim())
        .filter(Boolean);

      const activityName = targetParts[0];

      if (!activityName) {
        return;
      }

      const activityId = normalizeId(activityName);
      const hasSubActivity = targetParts.length > 1;
      const subActivityName = hasSubActivity ? targetParts[1] : activityName;
      const subActivityId = hasSubActivity
        ? normalizeId(subActivityName)
        : "__main__";

      if (!detailsByActivity.has(activityId)) {
        detailsByActivity.set(activityId, {
          id: activityId,
          name: activityName,
          subActivities: [],
        });
      }

      const activityDetails = detailsByActivity.get(activityId);
      const divisionValues = parseDivisionValues(valuesText);

      activityDetails.subActivities.push({
        id: subActivityId,
        name: subActivityName,
        isMain: !hasSubActivity,
        divisionValues,
        partnerCount: divisionValues.length,
      });
    });

  return detailsByActivity;
}

function getSubActivityTotal(subActivity) {
  return (subActivity?.divisionValues || []).reduce((sum, division) => {
    return sum + Number(division.value || 0);
  }, 0);
}

function getActivityDetailsTotal(activityDetails) {
  return (activityDetails?.subActivities || []).reduce((sum, subActivity) => {
    return sum + getSubActivityTotal(subActivity);
  }, 0);
}

function createPartnerCatalogFromCount(partnerCount) {
  return Array.from({ length: partnerCount }, (_, index) => ({
    id: `partner-${index + 1}`,
    name: `Partenaire ${index + 1}`,
    shortName: `P${index + 1}`,
    index,
    isPlaceholder: true,
  }));
}

function isPlaceholderPartner(partner) {
  return (
    Boolean(partner?.isPlaceholder) ||
    /^partner-\d+$/.test(String(partner?.id || "")) ||
    /^Partenaire \d+$/.test(String(partner?.name || ""))
  );
}

function buildPartnerCatalog(activities, minimumPartnerCount) {
  const partnersById = new Map();

  activities.forEach((activity) => {
    activity.subActivities.forEach((subActivity) => {
      subActivity.divisionValues.forEach((division) => {
        const id =
          division.id ||
          normalizeId(division.shortName || division.name || division.index);

        if (!partnersById.has(id)) {
          partnersById.set(id, {
            id,
            name: division.name || `Partenaire ${partnersById.size + 1}`,
            shortName:
              division.shortName ||
              division.name ||
              `P${partnersById.size + 1}`,
            isPlaceholder: Boolean(division.isPlaceholder),
          });
        }
      });
    });
  });

  while (partnersById.size < minimumPartnerCount) {
    const index = partnersById.size;
    const id = `partner-${index + 1}`;

    partnersById.set(id, {
      id,
      name: `Partenaire ${index + 1}`,
      shortName: `P${index + 1}`,
      isPlaceholder: true,
    });
  }

  return Array.from(partnersById.values()).map((partner, index) => ({
    ...partner,
    index,
  }));
}

function resolvePartnerCatalog(partnerCatalogOrCount) {
  if (Array.isArray(partnerCatalogOrCount)) {
    return partnerCatalogOrCount.map((partner, index) => ({
      ...partner,
      index,
    }));
  }

  return createPartnerCatalogFromCount(
    Math.max(0, Math.round(Number(partnerCatalogOrCount) || 0))
  );
}

function mergePartnerCatalogs(...catalogs) {
  const normalizedCatalogs = catalogs
    .filter(Boolean)
    .map((catalog) => resolvePartnerCatalog(catalog));

  const maxLength = Math.max(
    ...normalizedCatalogs.map((catalog) => catalog.length),
    1
  );

  const mergedPartners = [];
  const usedIds = new Set();

  for (let index = 0; index < maxLength; index += 1) {
    const candidates = normalizedCatalogs
      .map((catalog) => catalog[index])
      .filter(Boolean);

    const preferredPartner =
      candidates.find((partner) => !isPlaceholderPartner(partner)) ||
      candidates[0];

    if (preferredPartner && !usedIds.has(preferredPartner.id)) {
      mergedPartners.push(preferredPartner);
      usedIds.add(preferredPartner.id);
    }
  }

  normalizedCatalogs.forEach((catalog) => {
    catalog.forEach((partner) => {
      if (!usedIds.has(partner.id) && !isPlaceholderPartner(partner)) {
        mergedPartners.push(partner);
        usedIds.add(partner.id);
      }
    });
  });

  while (mergedPartners.length < maxLength) {
    const index = mergedPartners.length;
    const id = `partner-${index + 1}`;

    if (!usedIds.has(id)) {
      mergedPartners.push({
        id,
        name: `Partenaire ${index + 1}`,
        shortName: `P${index + 1}`,
        isPlaceholder: true,
      });

      usedIds.add(id);
    }
  }

  return mergedPartners.map((partner, index) => ({
    ...partner,
    index,
  }));
}

function createZeroDivisionValues(partnerCatalogOrCount) {
  const partnerCatalog = resolvePartnerCatalog(partnerCatalogOrCount);

  return partnerCatalog.map((partner, index) => ({
    id: partner.id,
    name: partner.name,
    shortName: partner.shortName,
    value: 0,
    index,
    isPlaceholder: Boolean(partner.isPlaceholder),
    isGeneratedZero: true,
  }));
}

function padDivisionValues(divisionValues, partnerCatalogOrCount) {
  const partnerCatalog = resolvePartnerCatalog(partnerCatalogOrCount);
  const valuesById = new Map();

  (divisionValues || []).forEach((division) => {
    const id =
      division.id ||
      normalizeId(division.shortName || division.name || division.index);

    valuesById.set(id, division);
  });

  return partnerCatalog.map((partner, index) => {
    const existingDivision = valuesById.get(partner.id);

    if (!existingDivision) {
      return {
        id: partner.id,
        name: partner.name,
        shortName: partner.shortName,
        value: 0,
        index,
        isPlaceholder: Boolean(partner.isPlaceholder),
        isGeneratedZero: true,
      };
    }

    const number = Number(existingDivision.value);

    return {
      id: partner.id,
      name: partner.name || existingDivision.name,
      shortName:
        partner.shortName ||
        existingDivision.shortName ||
        partner.name ||
        `P${index + 1}`,
      value: Number.isFinite(number) ? number : 0,
      index,
      isPlaceholder: Boolean(partner.isPlaceholder),
      isGeneratedZero: Boolean(existingDivision.isGeneratedZero),
    };
  });
}

function buildStage({
  label,
  date,
  namesText,
  volumesText,
  partnerCount,
  divisionDetailsText,
  activityOrderText,
}) {
  const activityOrderIds = parseNames(activityOrderText).map(normalizeId);
  const names = parseNames(namesText);
  const volumes = parseNumbers(volumesText, names.length);
  const partnerCountNumber = Math.max(1, Math.round(Number(partnerCount) || 1));
  const divisionDetails = parseDivisionDetails(divisionDetailsText);

  const activityMap = new Map();

  names.forEach((name, index) => {
    const id = normalizeId(name);
    const volume = volumes[index] || 0;
    const details = divisionDetails.get(id);

    activityMap.set(id, {
      id,
      name,
      volume,
      color: getActivityColor(name, index, activityOrderIds),
      originalOrder: index,
      subActivities:
        details?.subActivities?.length > 0 ? details.subActivities : [],
    });
  });

  divisionDetails.forEach((details, id) => {
    if (activityMap.has(id)) {
      return;
    }

    const originalOrder = activityMap.size;
    const detailTotal = getActivityDetailsTotal(details);

    activityMap.set(id, {
      id,
      name: details.name,
      volume: detailTotal,
      color: getActivityColor(details.name, originalOrder, activityOrderIds),
      originalOrder,
      subActivities: details.subActivities,
    });
  });

  let activities = sortActivitiesByOrder(
    Array.from(activityMap.values()),
    activityOrderIds
  );

  const stagePartnerCatalog = buildPartnerCatalog(
    activities,
    partnerCountNumber
  );

  const stagePartnerCount = stagePartnerCatalog.length;

  activities = activities.map((activity) => ({
    ...activity,
    subActivities:
      activity.subActivities.length > 0
        ? activity.subActivities.map((subActivity) => ({
            ...subActivity,
            divisionValues: padDivisionValues(
              subActivity.divisionValues,
              stagePartnerCatalog
            ),
            partnerCount: stagePartnerCount,
          }))
        : [
            {
              id: "__main__",
              name: activity.name,
              isMain: true,
              divisionValues: createZeroDivisionValues(stagePartnerCatalog),
              partnerCount: stagePartnerCount,
            },
          ],
  }));

  return {
    label,
    date,
    partnerCount: stagePartnerCount,
    partnerCatalog: stagePartnerCatalog,
    activities,
    totalVolume: activities.reduce((sum, activity) => {
      return sum + activity.volume;
    }, 0),
    maxDivisionCount: stagePartnerCount,
  };
}

function getActivityVolume(stage, activityId) {
  return (
    stage.activities.find((activity) => activity.id === activityId)?.volume || 0
  );
}

function getActivityById(stage, activityId) {
  return stage.activities.find((activity) => activity.id === activityId);
}

function getMergedActivities(stageA, stageB, activityOrderIds) {
  const activityMap = new Map();

  [...stageA.activities, ...stageB.activities].forEach((activity, index) => {
    if (!activityMap.has(activity.id)) {
      activityMap.set(activity.id, {
        id: activity.id,
        name: activity.name,
        color:
          activity.color || ACTIVITY_COLORS[index % ACTIVITY_COLORS.length],
        originalOrder: index,
      });
    }
  });

  return sortActivitiesByOrder(
    Array.from(activityMap.values()),
    activityOrderIds
  );
}

function getDivisionName(subActivity, index) {
  return (
    subActivity?.divisionValues?.find((division) => division.index === index)
      ?.name || `Partenaire ${index + 1}`
  );
}

function getDivisionShortName(subActivity, index) {
  const division = subActivity?.divisionValues?.find((item) => {
    return item.index === index;
  });

  return division?.shortName || division?.name || `P${index + 1}`;
}

function getDivisionValue(subActivity, index) {
  return (
    subActivity?.divisionValues?.find((division) => division.index === index)
      ?.value || 0
  );
}

function splitMainSubActivity(mainSubActivity, targetSubActivities) {
  if (!mainSubActivity || targetSubActivities.length === 0) {
    return [];
  }

  const totals = targetSubActivities.map(getSubActivityTotal);
  const total = totals.reduce((sum, value) => sum + value, 0);

  return targetSubActivities.map((targetSubActivity, index) => {
    const ratio =
      total > 0 ? totals[index] / total : 1 / targetSubActivities.length;

    return {
      id: targetSubActivity.id,
      name: targetSubActivity.name,
      isMain: targetSubActivity.isMain,
      divisionValues: mainSubActivity.divisionValues.map((division) => ({
        ...division,
        value: division.value * ratio,
      })),
      partnerCount: mainSubActivity.partnerCount,
    };
  });
}

function alignSubActivities(fromActivity, toActivity) {
  let fromSubActivities = fromActivity?.subActivities || [];
  let toSubActivities = toActivity?.subActivities || [];

  const fromIsSingleMain =
    fromSubActivities.length === 1 && fromSubActivities[0].isMain;
  const toIsSingleMain =
    toSubActivities.length === 1 && toSubActivities[0].isMain;

  if (fromIsSingleMain && toSubActivities.length > 1) {
    fromSubActivities = splitMainSubActivity(
      fromSubActivities[0],
      toSubActivities
    );
  }

  if (toIsSingleMain && fromSubActivities.length > 1) {
    toSubActivities = splitMainSubActivity(
      toSubActivities[0],
      fromSubActivities
    );
  }

  const subActivityMap = new Map();

  [...fromSubActivities, ...toSubActivities].forEach((subActivity, index) => {
    if (!subActivityMap.has(subActivity.id)) {
      subActivityMap.set(subActivity.id, {
        id: subActivity.id,
        name: subActivity.name,
        isMain: subActivity.isMain,
        originalOrder: index,
      });
    }
  });

  return Array.from(subActivityMap.values()).sort((a, b) => {
    return a.originalOrder - b.originalOrder;
  });
}

function createEmptySubActivity(reference, partnerCatalogOrCount = 0) {
  const partnerCatalog = resolvePartnerCatalog(partnerCatalogOrCount);

  return {
    id: reference.id,
    name: reference.name,
    isMain: reference.isMain,
    divisionValues: createZeroDivisionValues(partnerCatalog),
    partnerCount: partnerCatalog.length,
  };
}

function interpolateSubActivity({
  reference,
  fromSubActivity,
  toSubActivity,
  progress,
  partnerCatalog,
}) {
  const safePartnerCatalog = resolvePartnerCatalog(partnerCatalog);

  const safeFrom = fromSubActivity
    ? {
        ...fromSubActivity,
        divisionValues: padDivisionValues(
          fromSubActivity.divisionValues,
          safePartnerCatalog
        ),
      }
    : createEmptySubActivity(reference, safePartnerCatalog);

  const safeTo = toSubActivity
    ? {
        ...toSubActivity,
        divisionValues: padDivisionValues(
          toSubActivity.divisionValues,
          safePartnerCatalog
        ),
      }
    : createEmptySubActivity(reference, safePartnerCatalog);

    const divisionValues = safePartnerCatalog.map((partner, index) => {
      const fromDivision = safeFrom.divisionValues?.find((item) => {
        return item.index === index;
      });
    
      const toDivision = safeTo.divisionValues?.find((item) => {
        return item.index === index;
      });
    
      const fromValue = getDivisionValue(safeFrom, index);
      const toValue = getDivisionValue(safeTo, index);
      const value = lerp(fromValue, toValue, progress);
    
      const isGeneratedZero =
        Boolean(fromDivision?.isGeneratedZero) &&
        Boolean(toDivision?.isGeneratedZero) &&
        Math.abs(value) < 0.05;
    
      return {
        id: partner.id,
        name: partner.name,
        shortName: partner.shortName,
        value,
        index,
        isPlaceholder: Boolean(partner.isPlaceholder),
        isGeneratedZero,
      };
    });

  return {
    id: reference.id,
    name: reference.name,
    isMain: reference.isMain,
    divisionValues,
    partnerCount: safePartnerCatalog.length,
  };
}

function interpolateStage(stageA, stageB, progress, activityOrderIds) {
  const partnerCatalog = mergePartnerCatalogs(
    stageA.partnerCatalog,
    stageB.partnerCatalog
  );

  const divisionCount = Math.max(
    partnerCatalog.length,
    stageA.maxDivisionCount,
    stageB.maxDivisionCount,
    Math.round(stageA.partnerCount),
    Math.round(stageB.partnerCount),
    1
  );

  const safePartnerCatalog =
    partnerCatalog.length >= divisionCount
      ? partnerCatalog
      : mergePartnerCatalogs(
          partnerCatalog,
          createPartnerCatalogFromCount(divisionCount)
        );

  const activities = getMergedActivities(stageA, stageB, activityOrderIds)
    .map((activityReference) => {
      const fromActivity = getActivityById(stageA, activityReference.id);
      const toActivity = getActivityById(stageB, activityReference.id);

      const subActivityReferences = alignSubActivities(
        fromActivity,
        toActivity
      );

      const subActivities = subActivityReferences.map((subReference) => {
        const fromSubActivity = fromActivity?.subActivities?.find(
          (subActivity) => subActivity.id === subReference.id
        );

        const toSubActivity = toActivity?.subActivities?.find(
          (subActivity) => subActivity.id === subReference.id
        );

        return interpolateSubActivity({
          reference: subReference,
          fromSubActivity,
          toSubActivity,
          progress,
          partnerCatalog: safePartnerCatalog,
        });
      });

      const volume = lerp(
        getActivityVolume(stageA, activityReference.id),
        getActivityVolume(stageB, activityReference.id),
        progress
      );

      return {
        ...activityReference,
        volume,
        subActivities,
      };
    })
    .filter((activity) => {
      const subActivityTotal = activity.subActivities.reduce(
        (sum, subActivity) => sum + getSubActivityTotal(subActivity),
        0
      );

      return activity.volume > 0.05 || subActivityTotal > 0.05;
    });

  const partnerCount = lerp(stageA.partnerCount, stageB.partnerCount, progress);

  return {
    label: progress < 0.5 ? stageA.label : stageB.label,
    partnerCount,
    partnerCatalog: safePartnerCatalog,
    activities,
    totalVolume: activities.reduce((sum, activity) => sum + activity.volume, 0),
    maxDivisionCount: safePartnerCatalog.length,
  };
}

function buildInterpolatedState(stages, progress, activityOrderIds) {
  if (progress <= 0) {
    return stages[0];
  }

  if (Math.abs(progress - 1) < 0.0001) {
    return stages[1];
  }

  if (progress >= 2) {
    return stages[2];
  }

  if (progress < 1) {
    return interpolateStage(stages[0], stages[1], progress, activityOrderIds);
  }

  return interpolateStage(stages[1], stages[2], progress - 1, activityOrderIds);
}

function useElementSize() {
  const elementRef = useRef(null);

  const [size, setSize] = useState({
    width: 1000,
    height: 700,
  });

  useEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return undefined;
    }

    function updateSize() {
      const rect = element.getBoundingClientRect();

      setSize({
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
      });
    }

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return [elementRef, size];
}

function getTransitionSegmentIndex(progress, progressDirection) {
  if (progress < 1) {
    return 0;
  }

  if (progress > 1) {
    return 1;
  }

  return progressDirection >= 0 ? 1 : 0;
}

function getSegmentLocalProgress(progress, segmentIndex) {
  return segmentIndex === 0 ? clamp(progress, 0, 1) : clamp(progress - 1, 0, 1);
}

function createBulgedActivityPath({
  x,
  y,
  width,
  height,
  radius = 24,
  horizontalBulge = 0,
  verticalBulge = 0,
}) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);

  const right = x + safeWidth;
  const bottom = y + safeHeight;

  const safeRadius = Math.min(radius, safeWidth / 2, safeHeight / 2);

  const innerLeft = x + safeRadius;
  const innerRight = right - safeRadius;
  const innerTop = y + safeRadius;
  const innerBottom = bottom - safeRadius;

  const midX = x + safeWidth / 2;
  const midY = y + safeHeight / 2;

  const maxHorizontalBulge = Math.min(12, safeWidth * 0.1);
  const safeHorizontalBulge = clamp(
    horizontalBulge,
    -maxHorizontalBulge,
    maxHorizontalBulge
  );

  const maxVerticalBulge = Math.min(10, safeHeight * 0.05);
  const safeVerticalBulge = clamp(
    verticalBulge,
    -maxVerticalBulge,
    maxVerticalBulge
  );

  const topMidY = y - safeVerticalBulge;
  const bottomMidY = bottom + safeVerticalBulge;
  const leftMidX = x - safeHorizontalBulge;
  const rightMidX = right + safeHorizontalBulge;

  const topLeftControlX = innerLeft + (innerRight - innerLeft) * 0.24;
  const topRightControlX = innerLeft + (innerRight - innerLeft) * 0.76;

  const sideTopControlY = innerTop + (innerBottom - innerTop) * 0.24;
  const sideBottomControlY = innerTop + (innerBottom - innerTop) * 0.76;

  return `
    M ${innerLeft} ${y}

    C ${topLeftControlX} ${y}
      ${topLeftControlX} ${topMidY}
      ${midX} ${topMidY}

    C ${topRightControlX} ${topMidY}
      ${topRightControlX} ${y}
      ${innerRight} ${y}

    A ${safeRadius} ${safeRadius} 0 0 1 ${right} ${innerTop}

    C ${right} ${sideTopControlY}
      ${rightMidX} ${sideTopControlY}
      ${rightMidX} ${midY}

    C ${rightMidX} ${sideBottomControlY}
      ${right} ${sideBottomControlY}
      ${right} ${innerBottom}

    A ${safeRadius} ${safeRadius} 0 0 1 ${innerRight} ${bottom}

    C ${topRightControlX} ${bottom}
      ${topRightControlX} ${bottomMidY}
      ${midX} ${bottomMidY}

    C ${topLeftControlX} ${bottomMidY}
      ${topLeftControlX} ${bottom}
      ${innerLeft} ${bottom}

    A ${safeRadius} ${safeRadius} 0 0 1 ${x} ${innerBottom}

    C ${x} ${sideBottomControlY}
      ${leftMidX} ${sideBottomControlY}
      ${leftMidX} ${midY}

    C ${leftMidX} ${sideTopControlY}
      ${x} ${sideTopControlY}
      ${x} ${innerTop}

    A ${safeRadius} ${safeRadius} 0 0 1 ${innerLeft} ${y}
    Z
  `;
}

function getActivityBulge({
  activity,
  stages,
  progress,
  progressDirection,
  activityGap,
}) {
  const segmentIndex = getTransitionSegmentIndex(progress, progressDirection);
  const fromStage = stages[segmentIndex];
  const toStage = stages[segmentIndex + 1];

  if (!fromStage || !toStage) {
    return 0;
  }

  const fromVolume = getActivityVolume(fromStage, activity.id);
  const toVolume = getActivityVolume(toStage, activity.id);

  const naturalDelta = toVolume - fromVolume;
  const visibleDelta = naturalDelta * progressDirection;

  if (Math.abs(visibleDelta) < 0.01) {
    return 0;
  }

  const localProgress = getSegmentLocalProgress(progress, segmentIndex);
  const transitionIntensity = Math.sin(localProgress * Math.PI);

  const maxBulge = Math.min(
    12,
    Math.max(4, activityGap * 0.2),
    Math.max(1, activity.width * 0.1)
  );

  return visibleDelta > 0
    ? maxBulge * transitionIntensity * ACTIVITY_BULGE_INTENSITY
    : -maxBulge * transitionIntensity * ACTIVITY_BULGE_INTENSITY;
}

function getPartnerBulge({
  stages,
  progress,
  progressDirection,
  matrixHeight,
}) {
  const segmentIndex = getTransitionSegmentIndex(progress, progressDirection);
  const fromStage = stages[segmentIndex];
  const toStage = stages[segmentIndex + 1];

  if (!fromStage || !toStage) {
    return 0;
  }

  const naturalDelta = toStage.partnerCount - fromStage.partnerCount;
  const visibleDelta = naturalDelta * progressDirection;

  if (Math.abs(visibleDelta) < 0.01) {
    return 0;
  }

  const localProgress = getSegmentLocalProgress(progress, segmentIndex);
  const transitionIntensity = Math.sin(localProgress * Math.PI);

  const maxBulge = Math.min(10, Math.max(4, matrixHeight * 0.03));

  return visibleDelta > 0
    ? maxBulge * transitionIntensity * PARTNER_BULGE_INTENSITY
    : -maxBulge * transitionIntensity * PARTNER_BULGE_INTENSITY;
}

function resolveWidthsWithMinimum(totals, availableWidth, minimumWidth) {
  const count = totals.length;

  if (count === 0) {
    return [];
  }

  if (availableWidth <= 0) {
    return Array.from({ length: count }, () => 0);
  }

  const safeMinimumWidth = Math.min(minimumWidth, availableWidth / count);

  const rawWeights = totals.map((value) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  });

  const hasPositiveWeight = rawWeights.some((value) => value > 0);

  const weights = hasPositiveWeight
    ? rawWeights
    : Array.from({ length: count }, () => 1);

  const lockedWidths = new Map();
  const remainingIndexes = new Set(
    Array.from({ length: count }, (_, index) => index)
  );

  let remainingWidth = availableWidth;

  while (remainingIndexes.size > 0) {
    const remainingWeight = Array.from(remainingIndexes).reduce(
      (sum, index) => sum + weights[index],
      0
    );

    if (remainingWeight <= 0) {
      const equalWidth = remainingWidth / remainingIndexes.size;

      remainingIndexes.forEach((index) => {
        lockedWidths.set(index, equalWidth);
      });

      remainingIndexes.clear();
      break;
    }

    const indexesToLock = [];

    remainingIndexes.forEach((index) => {
      const proportionalWidth =
        remainingWidth * (weights[index] / remainingWeight);

      if (proportionalWidth < safeMinimumWidth) {
        indexesToLock.push(index);
      }
    });

    if (indexesToLock.length === 0) {
      break;
    }

    indexesToLock.forEach((index) => {
      lockedWidths.set(index, safeMinimumWidth);
      remainingIndexes.delete(index);
      remainingWidth -= safeMinimumWidth;
    });
  }

  const remainingWeight = Array.from(remainingIndexes).reduce((sum, index) => {
    return sum + weights[index];
  }, 0);

  return Array.from({ length: count }, (_, index) => {
    if (lockedWidths.has(index)) {
      return lockedWidths.get(index);
    }

    if (remainingWeight <= 0) {
      return remainingWidth / Math.max(1, remainingIndexes.size);
    }

    return remainingWidth * (weights[index] / remainingWeight);
  });
}

function getSubActivityColumns(activity, sharedSubActivityHeaderHeight = 0) {
  const subActivities =
    activity.subActivities?.length > 0
      ? activity.subActivities
      : [
          {
            id: "__main__",
            name: activity.name,
            isMain: true,
            divisionValues: [],
          },
        ];

  const hasMultipleSubActivities = subActivities.length > 1;

  const paddingX = hasMultipleSubActivities ? SUBACTIVITY_PADDING_X : 0;
  const gap = hasMultipleSubActivities ? SUBACTIVITY_GAP : 0;

  const subActivityHeaderHeight = sharedSubActivityHeaderHeight;

  const contentPaddingTop = sharedSubActivityHeaderHeight > 0
    ? SUBACTIVITY_CONTENT_PADDING_TOP
    : 0;
  const contentPaddingBottom = sharedSubActivityHeaderHeight > 0
    ? SUBACTIVITY_CONTENT_PADDING_BOTTOM
    : 0;

  const contentY = activity.y + subActivityHeaderHeight + contentPaddingTop;

  const contentHeight = Math.max(
    1,
    activity.height -
      subActivityHeaderHeight -
      contentPaddingTop -
      contentPaddingBottom
  );

  const availableWidth = Math.max(
    1,
    activity.width - paddingX * 2 - Math.max(0, subActivities.length - 1) * gap
  );

  const totals = subActivities.map(getSubActivityTotal);

  const subActivityWidths = hasMultipleSubActivities
    ? resolveWidthsWithMinimum(
        totals,
        availableWidth,
        MIN_SUBACTIVITY_COLUMN_WIDTH
      )
    : [availableWidth];

  let runningX = activity.x + paddingX;

  return subActivities.map((subActivity, index) => {
    const width = subActivityWidths[index] || 0;

    const subActivityFramePaddingX = hasMultipleSubActivities
      ? SUBACTIVITY_FRAME_PADDING_X
      : 0;
    const subActivityFrameTopPadding = 4;
    const subActivityFrameBottomPadding = 4;

    const column = {
      ...subActivity,
      x: runningX,
      y: contentY,
      width,
      height: contentHeight,
      centerX: runningX + width / 2,
      centerY: contentY + contentHeight / 2,
      total: totals[index],
      hasMultipleSubActivities,

      headerY: activity.y + subActivityHeaderHeight * 0.8,
      headerHeight: subActivityHeaderHeight,

      innerPaddingX: hasMultipleSubActivities ? 16 : 14,

      frameX: runningX - subActivityFramePaddingX,
      frameY: activity.y + subActivityFrameTopPadding,
      frameWidth: width + subActivityFramePaddingX * 2,
      frameHeight:
        activity.height -
        subActivityFrameTopPadding +
        subActivityFrameBottomPadding,
    };

    runningX += width + gap;

    return column;
  });
}

function getSubActivityHeaderLabelLayout(subColumnWidth, headerHeight) {
  if (headerHeight <= 0) {
    return {
      isVisible: false,
      fontSize: 0,
    };
  }

  const safeWidth = Math.max(1, subColumnWidth);
  const safeHeaderHeight = Math.max(1, headerHeight);

  return {
    isVisible: true,
    fontSize: clamp(Math.min(safeWidth * 0.13, safeHeaderHeight * 1.1), 6, 11),
  };
}

function getSubActivityDisplayName(name, width) {
  const label = String(name || "").trim();

  if (!label) {
    return "";
  }

  const lowerLabel = label.toLowerCase();

  if (lowerLabel.includes("longue")) {
    return width >= 44 ? "Longues" : "Lng";
  }

  if (lowerLabel.includes("courte")) {
    return width >= 44 ? "Courtes" : "Crt";
  }

  if (width >= 80 || label.length <= 7) {
    return label;
  }

  return width >= 48 ? `${label.slice(0, 5)}.` : label.slice(0, 4);
}

function getValueByFlexibleKey(object, key) {
  if (!object || typeof object !== "object") {
    return undefined;
  }

  const directValue = object[key];

  if (directValue !== undefined) {
    return directValue;
  }

  const normalizedKey = normalizeId(key);

  const matchingKey = Object.keys(object).find((candidateKey) => {
    return normalizeId(candidateKey) === normalizedKey;
  });

  return matchingKey ? object[matchingKey] : undefined;
}

function readTooltipDescription(tooltipEntry) {
  if (!tooltipEntry) {
    return "";
  }

  if (typeof tooltipEntry === "string") {
    return tooltipEntry.trim();
  }

  if (typeof tooltipEntry.description === "string") {
    return tooltipEntry.description.trim();
  }

  return "";
}

function getTooltipDescription(tooltips, activityName, subActivityName) {
  const activityTooltip = getValueByFlexibleKey(tooltips, activityName);

  if (!activityTooltip) {
    return "";
  }

  if (subActivityName) {
    const subActivityTooltip = getValueByFlexibleKey(
      activityTooltip,
      subActivityName
    );

    const subActivityDescription = readTooltipDescription(subActivityTooltip);

    if (subActivityDescription) {
      return subActivityDescription;
    }
  }

  return readTooltipDescription(activityTooltip);
}

function shouldDisplayDivisionRow(division) {
  const value = Number(division?.value || 0);

  return !(division?.isGeneratedZero && Math.abs(value) < 0.05);
}

function getDivisionRows(subColumn, partnerProgress) {
  const displayDivisionValues = (subColumn.divisionValues || []).filter(
    shouldDisplayDivisionRow
  );

  if (displayDivisionValues.length === 0) {
    return [];
  }

  const requestedPartnerProgress = Math.max(1, Number(partnerProgress) || 1);

  const safePartnerProgress = Math.min(
    requestedPartnerProgress,
    displayDivisionValues.length
  );

  const fullPartnerCount = Math.floor(safePartnerProgress);
  const partialPartnerProgress = safePartnerProgress - fullPartnerCount;

  const visiblePartnerCount = Math.min(
    displayDivisionValues.length,
    partialPartnerProgress > 0.001 ? fullPartnerCount + 1 : fullPartnerCount
  );

  const baseRowHeight = subColumn.height / safePartnerProgress;

  let runningY = subColumn.y;

  return Array.from({ length: visiblePartnerCount }, (_, index) => {
    const division = displayDivisionValues[index];

    const isPartialRow =
      index === fullPartnerCount && partialPartnerProgress > 0;

    const rowProgress = isPartialRow ? partialPartnerProgress : 1;
    const rowHeight = baseRowHeight * rowProgress;

    const row = {
      id: division.id || `division-${index + 1}`,
      name: division.name || `Partenaire ${index + 1}`,
      shortName: division.shortName || division.name || `P${index + 1}`,
      value: Number(division.value || 0),
      index: division.index ?? index,
      y: runningY,
      height: rowHeight,
      centerY: runningY + rowHeight / 2,
      opacity: clamp(rowProgress, 0, 1),
      isPartial: isPartialRow,
    };

    runningY += rowHeight;

    return row;
  });
}

function getDivisionTextLayout(subColumnWidth, rowHeight) {
  if (subColumnWidth >= 105 && rowHeight >= 42) {
    return {
      mode: "two-lines",
      labelFontSize: 9.5,
      valueFontSize: 15,
      labelOffsetY: -8,
      valueOffsetY: 8,
      fullDivisionLabel: true,
    };
  }

  if (subColumnWidth >= 50 && rowHeight >= 24) {
    return {
      mode: "two-lines",
      labelFontSize: 7,
      valueFontSize: 12,
      labelOffsetY: -6,
      valueOffsetY: 7,
      fullDivisionLabel: false,
    };
  }

  if (subColumnWidth >= 34 && rowHeight >= 18) {
    return {
      mode: "value-only",
      valueFontSize: 11,
    };
  }

  if (subColumnWidth >= 28 && rowHeight >= 14) {
    return {
      mode: "value-only",
      valueFontSize: 9.5,
    };
  }

  return {
    mode: "hidden",
  };
}

function getDivisionLabel(divisionRow, fullDivisionLabel) {
  if (fullDivisionLabel) {
    return divisionRow.name || `Partenaire ${divisionRow.index + 1}`;
  }

  return (
    divisionRow.shortName || divisionRow.name || `P${divisionRow.index + 1}`
  );
}

function getMinimumActivityWidthForSubActivities(activity) {
  const subActivityCount = activity.subActivities?.length || 0;

  if (subActivityCount <= 1) {
    return 0;
  }

  return (
    SUBACTIVITY_PADDING_X * 2 +
    SUBACTIVITY_GAP * Math.max(0, subActivityCount - 1) +
    MIN_SUBACTIVITY_COLUMN_WIDTH * subActivityCount
  );
}

export default function ActivityPartnerGaugeMatrixRenderer({
  filters,
  isAnimating,
}) {
  const [progress, setProgress] = useState(0);
  const [gaugeProgress, setGaugeProgress] = useState(0);
  const [manualGaugeValue, setManualGaugeValue] = useState(null);
  const [progressDirection, setProgressDirection] = useState(1);

  const progressRef = useRef(0);
  const animationFrameRef = useRef(null);
  const manualTransitionRef = useRef(null);
  const matrixReactionTimeoutRef = useRef(null);

  const [stageRef, stageSize] = useElementSize();

  const commitProgress = useCallback((nextProgress) => {
    const safeProgress = clamp(Number(nextProgress), 0, 2);
    const previousProgress = progressRef.current;
    const delta = safeProgress - previousProgress;

    if (Math.abs(delta) > 0.0001) {
      setProgressDirection(delta > 0 ? 1 : -1);
    }

    progressRef.current = safeProgress;
    setProgress(safeProgress);
  }, []);

  const commitGaugeProgress = useCallback((nextProgress) => {
    const safeProgress = clamp(Number(nextProgress), 0, 2);

    setGaugeProgress(safeProgress);
  }, []);

  const stopRunningAnimations = useCallback(() => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (manualTransitionRef.current) {
      window.cancelAnimationFrame(manualTransitionRef.current);
      manualTransitionRef.current = null;
    }

    if (matrixReactionTimeoutRef.current) {
      window.clearTimeout(matrixReactionTimeoutRef.current);
      matrixReactionTimeoutRef.current = null;
    }
  }, []);

  const animateMatrixToProgress = useCallback(
    (targetProgress) => {
      const safeTargetProgress = clamp(Number(targetProgress), 0, 2);
      const startProgress = progressRef.current;
      const duration = Math.max(
        400,
        Number(filters.matrixManualTransitionDurationMs) || 1100
      );

      if (manualTransitionRef.current) {
        window.cancelAnimationFrame(manualTransitionRef.current);
        manualTransitionRef.current = null;
      }

      let startTime = null;

      function animate(timestamp) {
        if (startTime === null) {
          startTime = timestamp;
        }

        const elapsed = timestamp - startTime;
        const localProgress = clamp(elapsed / duration, 0, 1);
        const easedProgress = easeInOutCubic(localProgress);
        const nextMatrixProgress = lerp(
          startProgress,
          safeTargetProgress,
          easedProgress
        );

        commitProgress(nextMatrixProgress);

        if (localProgress < 1) {
          manualTransitionRef.current = window.requestAnimationFrame(animate);
        } else {
          commitProgress(safeTargetProgress);
          manualTransitionRef.current = null;
        }
      }

      manualTransitionRef.current = window.requestAnimationFrame(animate);
    },
    [commitProgress, filters.matrixManualTransitionDurationMs]
  );

  const applyManualGaugeValue = useCallback(
    (rawValue) => {
      const gaugeMinValue = parseFlexibleNumber(filters.gaugeMinValue, 0);
      const gaugeMaxValue = parseFlexibleNumber(filters.gaugeMaxValue, 30000);
      const safeGaugeMaxValue = Math.max(gaugeMinValue + 1, gaugeMaxValue);
      const nextGaugeValue = clamp(
        parseFlexibleNumber(rawValue, gaugeMinValue),
        gaugeMinValue,
        safeGaugeMaxValue
      );
      const targetMatrixProgress = getMatrixProgressFromGaugeValue(
        filters,
        nextGaugeValue
      );

      stopRunningAnimations();
      setManualGaugeValue(nextGaugeValue);
      commitGaugeProgress(targetMatrixProgress);

      const matrixReactionDelayMs = Math.max(
        0,
        Number(filters.matrixReactionDelayMs) || 1000
      );

      matrixReactionTimeoutRef.current = window.setTimeout(() => {
        matrixReactionTimeoutRef.current = null;
        animateMatrixToProgress(targetMatrixProgress);
      }, matrixReactionDelayMs);
    },
    [
      animateMatrixToProgress,
      commitGaugeProgress,
      filters,
      stopRunningAnimations,
    ]
  );

  const handleGaugeSliderChange = useCallback(
    (event) => {
      applyManualGaugeValue(event.target.value);
    },
    [applyManualGaugeValue]
  );

  const handleGaugePointerChange = useCallback(
    (event) => {
      const gaugeMinValue = parseFlexibleNumber(filters.gaugeMinValue, 0);
      const gaugeMaxValue = parseFlexibleNumber(filters.gaugeMaxValue, 30000);
      const safeGaugeMaxValue = Math.max(gaugeMinValue + 1, gaugeMaxValue);
      const bounds = event.currentTarget.getBoundingClientRect();

      if (!bounds.width) {
        return;
      }

      const relativeX = clamp(event.clientX - bounds.left, 0, bounds.width);
      const ratio = relativeX / bounds.width;
      const rawValue = gaugeMinValue + (safeGaugeMaxValue - gaugeMinValue) * ratio;
      const steppedValue = Math.round(rawValue / 100) * 100;

      applyManualGaugeValue(steppedValue);
    },
    [applyManualGaugeValue, filters.gaugeMaxValue, filters.gaugeMinValue]
  );

  const handleGaugePointerDown = useCallback(
    (event) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      handleGaugePointerChange(event);
    },
    [handleGaugePointerChange]
  );

  const handleGaugePointerMove = useCallback(
    (event) => {
      if (event.buttons !== 1) {
        return;
      }

      handleGaugePointerChange(event);
    },
    [handleGaugePointerChange]
  );

  const handleGaugeKeyDown = useCallback(
    (event) => {
      const gaugeMinValue = parseFlexibleNumber(filters.gaugeMinValue, 0);
      const gaugeMaxValue = parseFlexibleNumber(filters.gaugeMaxValue, 30000);
      const safeGaugeMaxValue = Math.max(gaugeMinValue + 1, gaugeMaxValue);
      const currentGaugeValue = manualGaugeValue ?? getInterpolatedGaugeValue(filters, gaugeProgress);
      const largeStep = 1000;
      const smallStep = 100;
      let nextValue = null;

      if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        nextValue = currentGaugeValue + smallStep;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        nextValue = currentGaugeValue - smallStep;
      }

      if (event.key === "PageUp") {
        nextValue = currentGaugeValue + largeStep;
      }

      if (event.key === "PageDown") {
        nextValue = currentGaugeValue - largeStep;
      }

      if (event.key === "Home") {
        nextValue = gaugeMinValue;
      }

      if (event.key === "End") {
        nextValue = safeGaugeMaxValue;
      }

      if (nextValue === null) {
        return;
      }

      event.preventDefault();
      applyManualGaugeValue(clamp(nextValue, gaugeMinValue, safeGaugeMaxValue));
    },
    [applyManualGaugeValue, filters, gaugeProgress, manualGaugeValue]
  );

  const activityOrderIds = useMemo(() => {
    return parseNames(filters.matrixActivityOrder).map(normalizeId);
  }, [filters.matrixActivityOrder]);

  const stages = useMemo(() => {
    return [
      buildStage({
        label: filters.matrixPastLabel || "État passé",
        date: filters.matrixPastDate,
        namesText: filters.matrixPastActivityNames,
        volumesText: filters.matrixPastActivityVolumes,
        partnerCount: filters.matrixPastPartnerCount,
        divisionDetailsText: filters.matrixPastDivisionValues,
        activityOrderText: filters.matrixActivityOrder,
      }),
      buildStage({
        label: filters.matrixCurrentLabel || "État actuel",
        date: filters.matrixCurrentDate || filters.matrixCurrenttDate,
        namesText: filters.matrixCurrentActivityNames,
        volumesText: filters.matrixCurrentActivityVolumes,
        partnerCount: filters.matrixCurrentPartnerCount,
        divisionDetailsText: filters.matrixCurrentDivisionValues,
        activityOrderText: filters.matrixActivityOrder,
      }),
      buildStage({
        label: filters.matrixFutureLabel || "État futur",
        date: filters.matrixFutureDate || filters.matrixFuturDate,
        namesText: filters.matrixFutureActivityNames,
        volumesText: filters.matrixFutureActivityVolumes,
        partnerCount: filters.matrixFuturePartnerCount,
        divisionDetailsText: filters.matrixFutureDivisionValues,
        activityOrderText: filters.matrixActivityOrder,
      }),
    ];
  }, [
    filters.matrixPastLabel,
    filters.matrixPastDate,
    filters.matrixPastActivityNames,
    filters.matrixPastActivityVolumes,
    filters.matrixPastPartnerCount,
    filters.matrixPastDivisionValues,
    filters.matrixCurrentLabel,
    filters.matrixCurrentDate,
    filters.matrixCurrenttDate,
    filters.matrixCurrentActivityNames,
    filters.matrixCurrentActivityVolumes,
    filters.matrixCurrentPartnerCount,
    filters.matrixCurrentDivisionValues,
    filters.matrixFutureLabel,
    filters.matrixFutureDate,
    filters.matrixFuturDate,
    filters.matrixFutureActivityNames,
    filters.matrixFutureActivityVolumes,
    filters.matrixFuturePartnerCount,
    filters.matrixFutureDivisionValues,
    filters.matrixActivityOrder,
  ]);

  const currentState = useMemo(() => {
    return buildInterpolatedState(stages, progress, activityOrderIds);
  }, [stages, progress, activityOrderIds]);

  const maxPartnerCount = Math.max(
    ...stages.map((stage) => stage.partnerCount),
    1
  );

  const maxTotalVolume = Math.max(
    ...stages.map((stage) => stage.totalVolume),
    1
  );

  useEffect(() => {
    if (!isAnimating) {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      commitGaugeProgress(progressRef.current);

      return undefined;
    }

    stopRunningAnimations();

    setManualGaugeValue(null);
    commitGaugeProgress(0);
    commitProgress(0);

    const totalDuration = Math.max(
      6000,
      Number(filters.matrixTransitionDurationMs) || 20000
    );

    const matrixReactionDelayMs = Math.max(
      0,
      Number(filters.matrixReactionDelayMs) || 1000
    );

    const fullDuration = totalDuration + matrixReactionDelayMs;

    let startTime = null;

    function animate(timestamp) {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;

      const nextGaugeProgress = getAnimatedProgressAtElapsed(
        Math.min(elapsed, totalDuration),
        totalDuration
      );

      const delayedElapsed = Math.max(0, elapsed - matrixReactionDelayMs);
      const nextMatrixProgress = getAnimatedProgressAtElapsed(
        Math.min(delayedElapsed, totalDuration),
        totalDuration
      );

      commitGaugeProgress(nextGaugeProgress);
      commitProgress(nextMatrixProgress);

      if (elapsed < fullDuration) {
        animationFrameRef.current = window.requestAnimationFrame(animate);
      } else {
        commitGaugeProgress(0);
        commitProgress(0);
        animationFrameRef.current = null;
      }
    }

    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [
    isAnimating,
    filters.matrixTransitionDurationMs,
    filters.matrixReactionDelayMs,
    commitGaugeProgress,
    commitProgress,
    stopRunningAnimations,
  ]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (manualTransitionRef.current) {
        window.cancelAnimationFrame(manualTransitionRef.current);
        manualTransitionRef.current = null;
      }

      if (matrixReactionTimeoutRef.current) {
        window.clearTimeout(matrixReactionTimeoutRef.current);
        matrixReactionTimeoutRef.current = null;
      }
    };
  }, []);

  const svgWidth = stageSize.width;
  const svgHeight = stageSize.height;

  const gaugeTopSpace = 142;
  const topLabelSpace = 60 + gaugeTopSpace;
  const bottomSafetySpace = 24;

  const usableMatrixHeight = Math.max(
    1,
    svgHeight - topLabelSpace - bottomSafetySpace
  );

  const activityFramePaddingX = 18;
  const activityFrameTopPadding = 50;
  const activityFrameBottomPadding = 16;

  const outerPaddingX = clamp(svgWidth * 0.055, 36, 58);
  const frameHorizontalOverflow = activityFramePaddingX * 2;

  const maxMatrixWidth = Math.max(
    1,
    svgWidth - outerPaddingX * 2 - frameHorizontalOverflow
  );

  const maxMatrixHeight = Math.min(svgHeight * 0.82, usableMatrixHeight);

  const partnerRatio = clamp(
    currentState.partnerCount / maxPartnerCount,
    0.18,
    1
  );

  const matrixHeight = maxMatrixHeight * partnerRatio;

  const activityGap = 52;

  const maxActivityCount = Math.max(
    ...stages.map((stage) => stage.activities.length),
    1
  );

  const maxTotalActivityGap = Math.max(0, maxActivityCount - 1) * activityGap;

  const maxAvailableActivityWidth = Math.max(
    1,
    maxMatrixWidth - maxTotalActivityGap
  );

  const widthPerVolumeUnit = maxAvailableActivityWidth / maxTotalVolume;

  const rawActivityColumns = currentState.activities.map((activity) => {
    const proportionalWidth = Math.max(0, activity.volume * widthPerVolumeUnit);
    const minimumReadableWidth =
      getMinimumActivityWidthForSubActivities(activity);

    return {
      ...activity,

      /*
       * La largeur reste proportionnelle à la valeur.
       * Le minimum n'est appliqué qu'aux activités découpées,
       * comme exception pour garder Longues / Courtes lisibles.
       */
      width: Math.max(proportionalWidth, minimumReadableWidth),
    };
  });

  const totalActivityGap =
    Math.max(0, rawActivityColumns.length - 1) * activityGap;

  const matrixWidth =
    rawActivityColumns.reduce((sum, activity) => {
      return sum + activity.width;
    }, 0) + totalActivityGap;

  const matrixX = (svgWidth - matrixWidth) / 2;
  const matrixY = topLabelSpace + (usableMatrixHeight - matrixHeight) / 2;

  const displayedPartnerProgress = clamp(
    Number(currentState.partnerCount) || 1,
    1,
    maxPartnerCount
  );

  let runningX = matrixX;

  const activityColumns = rawActivityColumns.map((activity) => {
    const column = {
      ...activity,
      x: runningX,
      y: matrixY,
      height: matrixHeight,
      centerX: runningX + activity.width / 2,
      centerY: matrixY + matrixHeight / 2,
    };

    runningX += activity.width + activityGap;

    return column;
  });

  const activityFrameY = matrixY - activityFrameTopPadding;
  const activityFrameHeight =
    matrixHeight + activityFrameTopPadding + activityFrameBottomPadding;

  const partnerBulge = getPartnerBulge({
    stages,
    progress,
    progressDirection,
    matrixHeight,
  });

  const hasAnySubActivitySplit = stages.some((stage) =>
    stage.activities.some((activity) => activity.subActivities.length > 1)
  );

  const sharedSubActivityHeaderHeight = hasAnySubActivitySplit
    ? clamp(matrixHeight * 0.1, 24, 36)
    : 0;

  const gaugeMinValue = parseFlexibleNumber(filters.gaugeMinValue, 0);
  const gaugeMaxValue = parseFlexibleNumber(filters.gaugeMaxValue, 30000);
  const gaugeThresholdValue = parseFlexibleNumber(filters.gaugeThresholdValue, 5000);
  const animatedGaugeValue = getInterpolatedGaugeValue(filters, gaugeProgress);
  const gaugeValue = manualGaugeValue ?? animatedGaugeValue;
  const gaugeStageLabel = filters.matrixCurrentLabel;
  const gaugeLayout = buildDemandGaugeLayout({
    svgWidth,
    top: 38,
  });
  const gaugeValuePercent = getGaugePercent(
    gaugeValue,
    gaugeMinValue,
    gaugeMaxValue
  );
  const gaugeThresholdPercent = getGaugePercent(
    gaugeThresholdValue,
    gaugeMinValue,
    gaugeMaxValue
  );
  const gaugeCursorX =
    gaugeLayout.x + gaugeLayout.width * (gaugeValuePercent / 100);
  const gaugeThresholdX =
    gaugeLayout.x + gaugeLayout.width * (gaugeThresholdPercent / 100);

  return (
    <div className="apdm-renderer">
      <div className="apdm-header">
        <div>
          <h3>Matrice activités / divisions</h3>

          <p>
            Les activités sont détaillées par division partenaire et peuvent
            être découpées en sous-activités.
          </p>
        </div>
      </div>

      <div className="apdm-stage" ref={stageRef}>
        <svg
          className="apdm-svg"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          role="img"
          aria-label="Matrice détaillée des activités et divisions partenaires"
        >
          <g>
            {activityColumns.map((activity) => (
              <rect
                key={`activity-frame-${activity.id}`}
                className="apdm-activity-frame"
                x={activity.x - activityFramePaddingX}
                y={activityFrameY}
                width={activity.width + activityFramePaddingX * 2}
                height={activityFrameHeight}
                rx="28"
              />
            ))}

            {activityColumns.map((activity) => {
              const subColumns = getSubActivityColumns(
                activity,
                sharedSubActivityHeaderHeight
              );

              if (subColumns.length <= 1) {
                return null;
              }

              return subColumns.map((subColumn) => (
                <rect
                  key={`${activity.id}-${subColumn.id}-frame`}
                  className="apdm-subactivity-frame"
                  x={subColumn.frameX}
                  y={subColumn.frameY}
                  width={subColumn.frameWidth}
                  height={subColumn.frameHeight}
                  rx="22"
                />
              ));
            })}

            {activityColumns.map((activity) => {
              const subColumns = getSubActivityColumns(
                activity,
                sharedSubActivityHeaderHeight
              );

              const hasMultipleSubActivities = subColumns.length > 1;

              const activityBulge = getActivityBulge({
                activity,
                stages,
                progress,
                progressDirection,
                activityGap,
              });

              return subColumns.map((subColumn) => {
                const tooltipDescription = getTooltipDescription(
                  filters.tooltips,
                  activity.name,
                  hasMultipleSubActivities ? subColumn.name : null
                );

                const tooltipTitle = `${activity.name}${
                  hasMultipleSubActivities ? ` · ${subColumn.name}` : ""
                }`;

                return (
                  <path
                    key={`${activity.id}-${subColumn.id}-zone`}
                    className={
                      hasMultipleSubActivities
                        ? "apdm-activity-zone apdm-subactivity-zone"
                        : "apdm-activity-zone"
                    }
                    d={createBulgedActivityPath({
                      x: subColumn.x,
                      y: subColumn.y,
                      width: subColumn.width,
                      height: subColumn.height,
                      radius: hasMultipleSubActivities ? 22 : 24,
                      horizontalBulge: hasMultipleSubActivities
                        ? activityBulge * 0.55
                        : activityBulge,
                      verticalBulge: partnerBulge,
                    })}
                    fill={activity.color}
                  >
                    {tooltipDescription && (
                      <title>{`${tooltipTitle}\n${tooltipDescription}`}</title>
                    )}
                  </path>
                );
              });
            })}

            {activityColumns.map((activity) => {
              const subColumns = getSubActivityColumns(
                activity,
                sharedSubActivityHeaderHeight
              );

              if (subColumns.length <= 1) {
                return null;
              }

              return subColumns.map((subColumn) => {
                const labelLayout = getSubActivityHeaderLabelLayout(
                  subColumn.width,
                  subColumn.headerHeight
                );

                if (!labelLayout.isVisible) {
                  return null;
                }

                const displayName = getSubActivityDisplayName(
                  subColumn.name,
                  subColumn.width
                );

                return (
                  <text
                    key={`${activity.id}-${subColumn.id}-header-label`}
                    className="apdm-subactivity-label-top"
                    x={subColumn.centerX}
                    y={subColumn.headerY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontSize: labelLayout.fontSize,
                    }}
                  >
                    <title>{subColumn.name}</title>
                    {displayName}
                  </text>
                );
              });
            })}

            {activityColumns.map((activity) => {
              const subColumns = getSubActivityColumns(
                activity,
                sharedSubActivityHeaderHeight
              );

              return subColumns.flatMap((subColumn) => {
                const divisionRows = getDivisionRows(
                  subColumn,
                  displayedPartnerProgress
                );

                return divisionRows.slice(0, -1).map((row, index) => {
                  const y = row.y + row.height;

                  const linePaddingX = Math.min(
                    subColumn.innerPaddingX ?? 12,
                    subColumn.width * 0.2
                  );

                  return (
                    <line
                      key={`${activity.id}-${subColumn.id}-row-${index}`}
                      className="apdm-division-row-line"
                      x1={subColumn.x + linePaddingX}
                      x2={subColumn.x + subColumn.width - linePaddingX}
                      y1={y}
                      y2={y}
                      opacity={row.opacity}
                    />
                  );
                });
              });
            })}

            {activityColumns.map((activity) => {
              const subColumns = getSubActivityColumns(
                activity,
                sharedSubActivityHeaderHeight
              );

              const hasMultipleSubActivities = subColumns.length > 1;

              return subColumns.map((subColumn) => (
                <g
                  key={`${activity.id}-${subColumn.id}`}
                  className="apdm-subactivity-group"
                >
                  {getDivisionRows(subColumn, displayedPartnerProgress).map(
                    (divisionRow) => {
                      const divisionLayout = getDivisionTextLayout(
                        subColumn.width,
                        divisionRow.height
                      );

                      if (divisionLayout.mode === "hidden") {
                        return null;
                      }

                      const divisionLabel = getDivisionLabel(
                        divisionRow,
                        divisionLayout.fullDivisionLabel
                      );

                      const titleText = `${activity.name}${
                        hasMultipleSubActivities ? ` · ${subColumn.name}` : ""
                      } · ${divisionRow.name} : ${formatNumber(
                        divisionRow.value
                      )}`;

                      if (divisionLayout.mode === "value-only") {
                        return (
                          <text
                            key={`${subColumn.id}-division-${divisionRow.index}`}
                            className="apdm-division-value"
                            x={subColumn.centerX}
                            y={divisionRow.centerY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            opacity={divisionRow.opacity}
                            style={{
                              fontSize: divisionLayout.valueFontSize,
                            }}
                          >
                            <title>{titleText}</title>
                            {formatNumber(divisionRow.value)}
                          </text>
                        );
                      }

                      return (
                        <g
                          key={`${subColumn.id}-division-${divisionRow.index}`}
                          className="apdm-division-cell"
                          opacity={divisionRow.opacity}
                        >
                          <title>{titleText}</title>

                          <text
                            className="apdm-division-label"
                            x={subColumn.centerX}
                            y={
                              divisionRow.centerY + divisionLayout.labelOffsetY
                            }
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{
                              fontSize: divisionLayout.labelFontSize,
                            }}
                          >
                            {divisionLabel}
                          </text>

                          <text
                            className="apdm-division-value"
                            x={subColumn.centerX}
                            y={
                              divisionRow.centerY + divisionLayout.valueOffsetY
                            }
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{
                              fontSize: divisionLayout.valueFontSize,
                            }}
                          >
                            {formatNumber(divisionRow.value)}
                          </text>
                        </g>
                      );
                    }
                  )}
                </g>
              ));
            })}
          </g>

          {activityColumns.map((activity) => {
            const titleY = matrixY - 32;
            const valueY = matrixY - 11;

            return (
              <g key={`activity-label-${activity.id}`}>
                <text
                  className="apdm-activity-label-top"
                  x={activity.centerX}
                  y={titleY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {activity.name}
                </text>

                <text
                  className="apdm-activity-value-top"
                  x={activity.centerX}
                  y={valueY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {formatNumber(activity.volume)}
                </text>
              </g>
            );
          })}

          <defs>
            <linearGradient
              id="apgm-demand-gauge-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#d8ebf6" />
              <stop offset="22%" stopColor="#a8bdcb" />
              <stop offset="48%" stopColor="#678ca4" />
              <stop offset="74%" stopColor="#f2a65a" />
              <stop offset="100%" stopColor="#ef233c" />
            </linearGradient>
          </defs>

          <g className="apgm-demand-gauge-layer">
            <text
              className="apgm-demand-gauge-title"
              x={gaugeLayout.x}
              y={gaugeLayout.labelY}
              textAnchor="start"
            >
              {filters.gaugeTitle || "Évolution du besoin sur la période"}
            </text>

            <rect
              className="apgm-demand-gauge-track"
              x={gaugeLayout.x}
              y={gaugeLayout.y}
              width={gaugeLayout.width}
              height={gaugeLayout.trackHeight}
              rx={gaugeLayout.radius}
              ry={gaugeLayout.radius}
              fill="url(#apgm-demand-gauge-gradient)"
            />

            <line
              className="apgm-demand-gauge-threshold-line"
              x1={gaugeThresholdX}
              x2={gaugeThresholdX}
              y1={gaugeLayout.y - 8}
              y2={gaugeLayout.y + gaugeLayout.trackHeight + 8}
            />

            <text
              className="apgm-demand-gauge-threshold-label"
              x={gaugeThresholdX}
              y={gaugeLayout.scaleY}
              textAnchor="middle"
            >
              {`Seuil ${formatNumber(gaugeThresholdValue)} ${gaugeStageLabel}`}
            </text>

            <g
              className="apgm-demand-gauge-cursor"
              transform={`translate(${gaugeCursorX}, ${gaugeLayout.centerY})`}
            >
              <line
                className="apgm-demand-gauge-cursor-line"
                x1="0"
                x2="0"
                y1="-27"
                y2="27"
              />

              <circle
                className="apgm-demand-gauge-cursor-dot"
                cx="0"
                cy="0"
                r="8"
              />

              <rect
                className="apgm-demand-gauge-cursor-label-bg"
                x="-65"
                y="-55"
                width="130"
                height="26"
                rx="13"
                ry="13"
              />

              <text
                className="apgm-demand-gauge-cursor-label"
                x="0"
                y="-41"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {`${formatNumber(gaugeValue)} ${gaugeStageLabel}`}
              </text>
            </g>

            <text
              className="apgm-demand-gauge-scale-label"
              x={gaugeLayout.x}
              y={gaugeLayout.scaleY}
              textAnchor="start"
            >
              {`${formatNumber(gaugeMinValue)} ${gaugeStageLabel}`}
            </text>

            <text
              className="apgm-demand-gauge-scale-label"
              x={gaugeLayout.x + gaugeLayout.width}
              y={gaugeLayout.scaleY}
              textAnchor="end"
            >
              {`${formatNumber(gaugeMaxValue)} ${gaugeStageLabel}`}
            </text>

            <rect
              className="apgm-demand-gauge-hit-area"
              x={gaugeLayout.x}
              y={gaugeLayout.y - 26}
              width={gaugeLayout.width}
              height={gaugeLayout.trackHeight + 64}
              rx="16"
              ry="16"
              tabIndex="0"
              role="slider"
              aria-label="Modifier manuellement la valeur du besoin global"
              aria-valuemin={gaugeMinValue}
              aria-valuemax={gaugeMaxValue}
              aria-valuenow={Math.round(gaugeValue)}
              onPointerDown={handleGaugePointerDown}
              onPointerMove={handleGaugePointerMove}
              onKeyDown={handleGaugeKeyDown}
            />
          </g>
        </svg>
      </div>

    </div>
  );
}
