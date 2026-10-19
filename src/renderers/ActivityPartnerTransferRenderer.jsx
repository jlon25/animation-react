import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../css/activity-partner-transfer.css";

const ACTIVITY_COLORS = [
  "#265b7d",
  "#678ca4",
  "#a8bdcb",
  "#1d4964",
  "#8aa8ba",
  "#3d718f",
];

const GAUGE_VIEWBOX_WIDTH = 1400;
const GAUGE_VIEWBOX_HEIGHT = 156;

const GAUGE_TRACK_WIDTH_RATIO = 0.95;
const GAUGE_TRACK_WIDTH = GAUGE_VIEWBOX_WIDTH * GAUGE_TRACK_WIDTH_RATIO;
const GAUGE_TRACK_X = (GAUGE_VIEWBOX_WIDTH - GAUGE_TRACK_WIDTH) / 2;

const GAUGE_TRACK_Y = 64;
const GAUGE_TRACK_HEIGHT = 28;

const GAUGE_CENTER_X = GAUGE_TRACK_X + GAUGE_TRACK_WIDTH / 2;
const GAUGE_HALF_WIDTH = GAUGE_TRACK_WIDTH / 2;

const GAUGE_LEFT_DOMAIN_LABEL_X = GAUGE_TRACK_X;
const GAUGE_RIGHT_DOMAIN_LABEL_X = GAUGE_TRACK_X + GAUGE_TRACK_WIDTH;

const GAUGE_TITLE_Y = 18;
const GAUGE_ZERO_LINE_TOP = GAUGE_TRACK_Y - 5;
const GAUGE_ZERO_LINE_BOTTOM = GAUGE_TRACK_Y + GAUGE_TRACK_HEIGHT + 5;
const GAUGE_THRESHOLD_LINE_TOP = GAUGE_TRACK_Y - 9;
const GAUGE_THRESHOLD_LINE_BOTTOM = GAUGE_TRACK_Y + GAUGE_TRACK_HEIGHT + 9;

const GAUGE_FIXED_LABEL_Y = GAUGE_TRACK_Y + GAUGE_TRACK_HEIGHT + 22;
const GAUGE_STAY_CURSOR_LINE_BOTTOM = GAUGE_TRACK_Y + GAUGE_TRACK_HEIGHT + 34;
const GAUGE_STAY_CURSOR_LABEL_BG_Y = GAUGE_TRACK_Y + GAUGE_TRACK_HEIGHT + 38;
const GAUGE_STAY_CURSOR_LABEL_Y = GAUGE_TRACK_Y + GAUGE_TRACK_HEIGHT + 54;

const MATRIX_MIN_WIDTH = 900;
const MATRIX_MIN_HEIGHT = 430;
const MATRIX_PADDING_X = 34;
const MATRIX_TOP = 14;
const MATRIX_BOTTOM = 44;
const MATRIX_ACTIVITY_GAP = 22;
const MATRIX_ACTIVITY_HEADER_HEIGHT = 58;
const MATRIX_ACTIVITY_BAR_TOP_GAP = 10;
const MATRIX_ACTIVITY_BAR_BOTTOM_PADDING = 24;

// Largeurs hybrides : chaque activité conserve une base lisible,
// puis la largeur restante est répartie selon les volumes affichés.
// La puissance redonne du poids aux grandes valeurs pour compenser l'effet
// visuellement écrasant des largeurs minimales.
const MATRIX_ACTIVITY_MIN_WIDTH = 90;
const MATRIX_SPLIT_ACTIVITY_MIN_WIDTH = 160;
const MATRIX_SUBACTIVITY_MIN_WIDTH = 90;
const MATRIX_SUBACTIVITY_GAP = 16;
const MATRIX_SUBACTIVITY_PADDING_X = 24;
const MATRIX_SUBACTIVITY_LABEL_SPACE = 26;
const MATRIX_ACTIVITY_WIDTH_VOLUME_POWER = 2;
const MATRIX_SUBACTIVITY_WIDTH_VOLUME_POWER = 1;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

function easeInOutCubic(value) {
  const safe = clamp(Number(value) || 0, 0, 1);

  return safe < 0.5
    ? 4 * safe * safe * safe
    : 1 - Math.pow(-2 * safe + 2, 3) / 2;
}

// Parcours automatique : position actuelle -> maximum -> zero -> position actuelle.
// Les phases se partagent le temps selon leur distance, pour conserver
// une vitesse comparable et montrer tous les extremums de la jauge.
function getAsylumSweepValue(elapsed, duration, startValue, maxValue) {
  const safeMaxValue = Math.max(1, Number(maxValue) || 1);
  const safeStartValue = clamp(Number(startValue) || 0, 0, safeMaxValue);
  const safeDuration = Math.max(1, Number(duration) || 1);
  const safeElapsed = clamp(Number(elapsed) || 0, 0, safeDuration);
  const phases = [
    { from: safeStartValue, to: safeMaxValue },
    { from: safeMaxValue, to: 0 },
    { from: 0, to: safeStartValue },
  ];

  // Le trajet total vaut toujours deux fois l'amplitude complete de la jauge.
  const totalDistance = 2 * safeMaxValue;
  let phaseStartTime = 0;

  for (const phase of phases) {
    const distance = Math.abs(phase.to - phase.from);
    if (distance <= 0) continue;

    const phaseDuration = safeDuration * (distance / totalDistance);
    const phaseEndTime = phaseStartTime + phaseDuration;

    if (safeElapsed <= phaseEndTime) {
      const progress = clamp(
        (safeElapsed - phaseStartTime) / phaseDuration,
        0,
        1
      );
      return lerp(phase.from, phase.to, easeInOutCubic(progress));
    }

    phaseStartTime = phaseEndTime;
  }

  return safeStartValue;
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

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    ["true", "1", "yes", "oui", "on", "show", "visible"].includes(normalized)
  ) {
    return true;
  }

  if (
    ["false", "0", "no", "non", "off", "hide", "hidden", "masquer"].includes(
      normalized
    )
  ) {
    return false;
  }

  return fallback;
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

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseNames(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseRatioMap(value) {
  const ratioMap = new Map();

  String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const separatorIndex = entry.lastIndexOf(":");

      if (separatorIndex < 0) {
        return;
      }

      const key = entry.slice(0, separatorIndex).trim();
      const rawValue = entry.slice(separatorIndex + 1).trim();
      const number = parseFlexibleNumber(rawValue, 0);

      if (!key) {
        return;
      }

      ratioMap.set(normalizeId(key), {
        key,
        value: Math.max(0, number),
      });
    });

  return ratioMap;
}

function normalizeRatioMap(ratioMap, defaults = []) {
  const entries = Array.from(ratioMap.values());
  const safeEntries = entries.length > 0 ? entries : defaults;
  const total = safeEntries.reduce(
    (sum, entry) => sum + Number(entry.value || 0),
    0
  );

  if (total <= 0) {
    const equal = safeEntries.length > 0 ? 1 / safeEntries.length : 0;

    return new Map(
      safeEntries.map((entry) => [
        normalizeId(entry.key),
        {
          key: entry.key,
          ratio: equal,
        },
      ])
    );
  }

  return new Map(
    safeEntries.map((entry) => [
      normalizeId(entry.key),
      {
        key: entry.key,
        ratio: Number(entry.value || 0) / total,
      },
    ])
  );
}

function getRatio(normalizedRatioMap, key, fallback = 0) {
  return normalizedRatioMap.get(normalizeId(key))?.ratio ?? fallback;
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
    };
  }

  return {
    id: normalizeId(label),
    name: label,
    shortName: label,
  };
}

function parsePartnerWeights(value, fallbackWeights) {
  const parsedWeights = String(value || "")
    .split(",")
    .map((entry, index) => {
      const trimmedEntry = entry.trim();

      if (!trimmedEntry) {
        return null;
      }

      const separatorIndex = trimmedEntry.lastIndexOf(":");
      const rawName =
        separatorIndex >= 0
          ? trimmedEntry.slice(0, separatorIndex).trim()
          : trimmedEntry;
      const rawValue =
        separatorIndex >= 0
          ? trimmedEntry.slice(separatorIndex + 1).trim()
          : "1";
      const partner = parsePartnerLabel(rawName, index);

      return {
        ...partner,
        weight: Math.max(0, parseFlexibleNumber(rawValue, 0)),
      };
    })
    .filter(Boolean);

  return parsedWeights.length > 0 ? parsedWeights : fallbackWeights;
}

function distributeValue(partnerWeights, totalValue) {
  const totalWeight = partnerWeights.reduce(
    (sum, partner) => sum + partner.weight,
    0
  );

  if (partnerWeights.length === 0) {
    return [];
  }

  if (totalWeight <= 0) {
    return partnerWeights.map((partner, index) => ({
      ...partner,
      value: index === 0 ? totalValue : 0,
      index,
    }));
  }

  return partnerWeights.map((partner, index) => ({
    ...partner,
    value: totalValue * (partner.weight / totalWeight),
    index,
  }));
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

const DEFAULT_BASELINE_DIVISION_VALUES =
  "MAT|AROCH [AROCH]:70,AVP / STS [AVP / STS]:0,ARNWCH [ARNWCH]:700,ARBE [ARBE]:98,ARWCH [ARWCH]:140,ARTZCH [ARTZCH]:126,ARZH [ARZH]:266;" +
  "LIGHT|AROCH [AROCH]:259,AVP / STS [AVP / STS]:670,ARNWCH [ARNWCH]:316,ARBE [ARBE]:103,ARWCH [ARWCH]:84,ARTZCH [ARTZCH]:207,ARZH [ARZH]:159;" +
  "Auditions>Longues|AROCH [AROCH]:102,AVP / STS [AVP / STS]:0,ARNWCH [ARNWCH]:1589,ARBE [ARBE]:495,ARWCH [ARWCH]:1690,ARTZCH [ARTZCH]:36,ARZH [ARZH]:1705;" +
  "Auditions>Courtes|AROCH [AROCH]:363,AVP / STS [AVP / STS]:1269,ARNWCH [ARNWCH]:267,ARBE [ARBE]:344,ARWCH [ARWCH]:315,ARTZCH [ARTZCH]:0,ARZH [ARZH]:450;" +
  "Séjour|ADAR:700,DB ZI:300;";

function parseDivisionValueEntry(entry, fallbackIndex) {
  const separatorIndex = entry.lastIndexOf(":");

  if (separatorIndex < 0) {
    return null;
  }

  const rawName = entry.slice(0, separatorIndex).trim();
  const rawValue = entry.slice(separatorIndex + 1).trim();
  const partner = parsePartnerLabel(rawName, fallbackIndex);

  return {
    ...partner,
    value: Math.max(0, parseFlexibleNumber(rawValue, 0)),
    index: fallbackIndex,
  };
}

function parseBaselineDivisionValues(value) {
  const activityMap = new Map();

  String(value || DEFAULT_BASELINE_DIVISION_VALUES)
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry, entryIndex) => {
      const separatorIndex = entry.indexOf("|");

      if (separatorIndex < 0) {
        return;
      }

      const rawPath = entry.slice(0, separatorIndex).trim();
      const rawDivisions = entry.slice(separatorIndex + 1).trim();
      const [rawActivityName, rawSubActivityName] = rawPath
        .split(">")
        .map((item) => item.trim())
        .filter(Boolean);

      if (!rawActivityName) {
        return;
      }

      const activityId = normalizeId(rawActivityName);
      const subActivityName = rawSubActivityName || rawActivityName;
      const subActivityId = rawSubActivityName
        ? normalizeId(rawSubActivityName)
        : "__main__";
      const divisionValues = rawDivisions
        .split(",")
        .map((divisionEntry, divisionIndex) =>
          parseDivisionValueEntry(divisionEntry.trim(), divisionIndex)
        )
        .filter(Boolean);
      const subActivityTotal = divisionValues.reduce(
        (sum, division) => sum + division.value,
        0
      );

      if (!activityMap.has(activityId)) {
        activityMap.set(activityId, {
          id: activityId,
          name: rawActivityName,
          domain: activityId === "sejour" ? "sejour" : "asile",
          volume: 0,
          originalOrder: entryIndex,
          subActivities: [],
          subActivityMap: new Map(),
        });
      }

      const activity = activityMap.get(activityId);
      const subActivity = {
        id: subActivityId,
        name: subActivityName,
        isMain: !rawSubActivityName,
        baselineVolume: subActivityTotal,
        divisionValues,
      };

      activity.subActivityMap.set(subActivityId, subActivity);
      activity.subActivities = Array.from(activity.subActivityMap.values());
      activity.volume = activity.subActivities.reduce(
        (sum, item) => sum + item.baselineVolume,
        0
      );
    });

  return Array.from(activityMap.values()).map((activity) => {
    const { subActivityMap, ...cleanActivity } = activity;

    return cleanActivity;
  });
}

function scaleDivisionValues(divisionValues, scale) {
  return divisionValues.map((division) => ({
    ...division,
    value: division.value * scale,
  }));
}

function scaleBaselineActivity(activity, scale) {
  const subActivities = activity.subActivities.map((subActivity) => ({
    ...subActivity,
    divisionValues: scaleDivisionValues(subActivity.divisionValues, scale),
  }));

  return {
    ...activity,
    volume: activity.volume * scale,
    subActivities,
  };
}

function buildTransferModel(filters = {}, gaugeValues = {}) {
  const gaugeMaxValue = Math.max(
    1,
    parseFlexibleNumber(filters.gaugeMaxValue, 30000)
  );

  const initialAsylumPendenzen = clamp(
    parseFlexibleNumber(filters.initialAsylumPendenzen, 15000),
    0,
    gaugeMaxValue
  );

  const initialStayPendenzen = clamp(
    parseFlexibleNumber(filters.initialStayPendenzen, 8400),
    0,
    gaugeMaxValue
  );

  const asylumPendenzen = clamp(
    parseFlexibleNumber(gaugeValues.asylumPendenzen, initialAsylumPendenzen),
    0,
    gaugeMaxValue
  );

  const stayPendenzen = clamp(
    parseFlexibleNumber(gaugeValues.stayPendenzen, initialStayPendenzen),
    0,
    gaugeMaxValue
  );

  const totalPendenzen = Math.max(
    1,
    parseFlexibleNumber(filters.totalPendenzen, asylumPendenzen + stayPendenzen)
  );

  const totalFte = Math.max(0, parseFlexibleNumber(filters.totalFte, 10));
  const productivityPerFte = Math.max(
    0,
    parseFlexibleNumber(filters.productivityPerFte, 1200)
  );

  const asylumCaseWeight = Math.max(
    0.01,
    parseFlexibleNumber(filters.asylumCaseWeight, 2)
  );

  const stayCaseWeight = Math.max(
    0.01,
    parseFlexibleNumber(filters.stayCaseWeight, 1)
  );

  const asylumPriorityFactor = Math.max(
    0.01,
    parseFlexibleNumber(filters.asylumPriorityFactor, 1.25)
  );

  const activityOrderIds = parseNames(
    filters.matrixActivityOrder || "MAT,LIGHT,Auditions,Séjour"
  ).map(normalizeId);

  const baselineActivities = parseBaselineDivisionValues(
    filters.matrixBaselineDivisionValues || filters.matrixFutureDivisionValues
  );

  const baselineStayActivity = baselineActivities.find(
    (activity) =>
      activity.domain === "sejour" || normalizeId(activity.name) === "sejour"
  );
  const baselineStayResources = baselineStayActivity?.volume || 0;
  const baselineAsylumResources = baselineActivities
    .filter((activity) => activity !== baselineStayActivity)
    .reduce((sum, activity) => sum + activity.volume, 0);
  const baselineTotalCapacity = baselineAsylumResources + baselineStayResources;

  const asylumCapacityPivotValue = clamp(
    parseFlexibleNumber(
      filters.asylumCapacityPivotValue,
      initialAsylumPendenzen
    ),
    0,
    gaugeMaxValue
  );

  const stayWorkUnitsAtPivot = clamp(
    parseFlexibleNumber(filters.stayWorkUnitsAtPivot, baselineStayResources),
    0,
    baselineTotalCapacity
  );

  const stayAdditionalCapacityAtMinimumAsylum = Math.max(
    0,
    parseFlexibleNumber(filters.stayAdditionalCapacityAtMinimumAsylum, 2000)
  );

  const defaultStayWorkUnitsAtMinimumAsylum = Math.min(
    baselineTotalCapacity,
    stayWorkUnitsAtPivot + stayAdditionalCapacityAtMinimumAsylum
  );

  const configuredStayWorkUnitsAtMinimumAsylum = parseFlexibleNumber(
    filters.stayWorkUnitsAtMinimumAsylum,
    defaultStayWorkUnitsAtMinimumAsylum
  );

  const stayWorkUnitsAtMinimumAsylum = clamp(
    Math.max(
      stayWorkUnitsAtPivot,
      configuredStayWorkUnitsAtMinimumAsylum,
      defaultStayWorkUnitsAtMinimumAsylum
    ),
    stayWorkUnitsAtPivot,
    baselineTotalCapacity
  );

  const stayWorkUnitsAtMaximumAsylum = clamp(
    parseFlexibleNumber(filters.stayWorkUnitsAtMaximumAsylum, 0),
    0,
    stayWorkUnitsAtPivot
  );

  let stayResources;
  let asylumUnderloadRatio = 0;
  let asylumOverloadRatio = 0;

  if (asylumPendenzen < asylumCapacityPivotValue) {
    const underloadRange = Math.max(1, asylumCapacityPivotValue);
    asylumUnderloadRatio = clamp(
      (asylumCapacityPivotValue - asylumPendenzen) / underloadRange,
      0,
      1
    );

    stayResources = lerp(
      stayWorkUnitsAtPivot,
      stayWorkUnitsAtMinimumAsylum,
      asylumUnderloadRatio
    );
  } else {
    const overloadRange = Math.max(1, gaugeMaxValue - asylumCapacityPivotValue);
    asylumOverloadRatio = clamp(
      (asylumPendenzen - asylumCapacityPivotValue) / overloadRange,
      0,
      1
    );

    stayResources = lerp(
      stayWorkUnitsAtPivot,
      stayWorkUnitsAtMaximumAsylum,
      asylumOverloadRatio
    );
  }

  stayResources = clamp(stayResources, 0, baselineTotalCapacity);

  const stayDeltaFromPivot = stayResources - stayWorkUnitsAtPivot;
  const asylumCapacityResources = clamp(
    baselineAsylumResources - stayDeltaFromPivot,
    0,
    baselineTotalCapacity
  );

  const asylumDemandTargetValue = clamp(
    parseFlexibleNumber(
      filters.asylumDemandTargetValue ??
        filters.gaugeAsylumThresholdValue ??
        filters.gaugeThresholdValue,
      5800
    ),
    0,
    gaugeMaxValue
  );
  const asylumDemandCurvePower = Math.max(
    0.1,
    parseFlexibleNumber(filters.asylumDemandCurvePower, 1.6)
  );
  const asylumMinimumDemandRatio = clamp(
    parseFlexibleNumber(filters.asylumMinimumDemandRatio, 0.2),
    0,
    1
  );

  let asylumDemandRatio;

  if (asylumPendenzen <= asylumDemandTargetValue) {
    asylumDemandRatio = asylumMinimumDemandRatio;
  } else if (asylumPendenzen >= asylumCapacityPivotValue) {
    asylumDemandRatio = 1;
  } else {
    const demandRange = Math.max(
      1,
      asylumCapacityPivotValue - asylumDemandTargetValue
    );
    const linearDemandRatio = clamp(
      (asylumPendenzen - asylumDemandTargetValue) / demandRange,
      0,
      1
    );
    const curvedDemandRatio = Math.pow(
      linearDemandRatio,
      asylumDemandCurvePower
    );

    asylumDemandRatio = lerp(
      asylumMinimumDemandRatio,
      1,
      curvedDemandRatio
    );
  }

  const asylumResources = clamp(
    asylumCapacityResources * asylumDemandRatio,
    0,
    asylumCapacityResources
  );
  const unusedAsylumCapacity = Math.max(
    0,
    asylumCapacityResources - asylumResources
  );

  const asylumScale =
    baselineAsylumResources > 0 ? asylumResources / baselineAsylumResources : 0;
  const stayScale =
    baselineStayResources > 0 ? stayResources / baselineStayResources : 0;

  const weightedAsylum =
    asylumPendenzen * asylumCaseWeight * asylumPriorityFactor;
  const weightedStay = stayPendenzen * stayCaseWeight;
  const effectiveResourceTotal = asylumResources + stayResources;
  const asylumResourceShare =
    effectiveResourceTotal > 0 ? asylumResources / effectiveResourceTotal : 0;
  const stayResourceShare =
    effectiveResourceTotal > 0 ? stayResources / effectiveResourceTotal : 0;

  const activities = baselineActivities.map((activity, index) => {
    const scale = activity === baselineStayActivity ? stayScale : asylumScale;

    return {
      ...scaleBaselineActivity(activity, scale),
      color: getActivityColor(activity.name, index, activityOrderIds),
    };
  });

  const sortedActivities = sortActivitiesByOrder(activities, activityOrderIds);

  return {
    asylumPendenzen,
    stayPendenzen,
    gaugeMaxValue,
    totalPendenzen,
    totalFte,
    productivityPerFte,
    theoreticalCapacity: totalFte * productivityPerFte,
    totalCapacity: baselineTotalCapacity,
    baselineAsylumResources,
    baselineStayResources,
    asylumCaseWeight,
    stayCaseWeight,
    asylumPriorityFactor,
    asylumCapacityPivotValue,
    stayWorkUnitsAtPivot,
    stayWorkUnitsAtMinimumAsylum,
    stayWorkUnitsAtMaximumAsylum,
    stayAdditionalCapacityAtMinimumAsylum,
    asylumDemandTargetValue,
    asylumDemandCurvePower,
    asylumMinimumDemandRatio,
    asylumDemandRatio,
    asylumCapacityResources,
    unusedAsylumCapacity,
    asylumUnderloadRatio,
    asylumOverloadRatio,
    weightedAsylum,
    weightedStay,
    asylumResourceShare,
    stayResourceShare,
    asylumResources,
    stayResources,
    activities: sortedActivities,
    totalVolume: sortedActivities.reduce(
      (sum, activity) => sum + activity.volume,
      0
    ),
  };
}

function useElementSize() {
  const elementRef = useRef(null);
  const [size, setSize] = useState({ width: 1000, height: 540 });

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

function resolveWidthsWithMinimum(
  items,
  availableWidth,
  gap,
  volumePower = 1
) {
  const count = items.length;

  if (count === 0) {
    return [];
  }

  const gapTotal = gap * Math.max(0, count - 1);
  const safeAvailableWidth = Math.max(1, availableWidth - gapTotal);
  const minWidths = items.map((item) => item.minimumWidth || 100);
  const minTotal = minWidths.reduce((sum, width) => sum + width, 0);

  if (minTotal >= safeAvailableWidth) {
    const scale = safeAvailableWidth / minTotal;
    return minWidths.map((width) => width * scale);
  }

  const flexibleWidth = safeAvailableWidth - minTotal;
  const safeVolumePower = Math.max(0.1, Number(volumePower) || 1);

  const weightedVolumes = items.map((item) => {
    const volume = Math.max(0, Number(item.volume) || 0);
    return Math.pow(volume, safeVolumePower);
  });

  const totalWeightedVolume = weightedVolumes.reduce(
    (sum, value) => sum + value,
    0
  );

  if (totalWeightedVolume <= 0) {
    return minWidths.map((width) => width + flexibleWidth / count);
  }

  return items.map((item, index) => {
    return (
      minWidths[index] +
      flexibleWidth * (weightedVolumes[index] / totalWeightedVolume)
    );
  });
}

function buildMatrixLayout(model, size) {
  const width = Math.max(MATRIX_MIN_WIDTH, size.width);
  const height = Math.max(MATRIX_MIN_HEIGHT, size.height);
  const frameHeight = Math.max(300, height - MATRIX_TOP - MATRIX_BOTTOM);
  const frameY = MATRIX_TOP;

  const activities = model.activities.map((activity) => ({
    ...activity,
    minimumWidth:
      activity.subActivities.length > 1
        ? MATRIX_SPLIT_ACTIVITY_MIN_WIDTH
        : MATRIX_ACTIVITY_MIN_WIDTH,
  }));

  const widths = resolveWidthsWithMinimum(
    activities,
    width - MATRIX_PADDING_X * 2,
    MATRIX_ACTIVITY_GAP,
    MATRIX_ACTIVITY_WIDTH_VOLUME_POWER
  );

  let runningX = MATRIX_PADDING_X;

  const positionedActivities = activities.map((activity, index) => {
    const frameWidth = widths[index] || 120;
    const barY =
      frameY + MATRIX_ACTIVITY_HEADER_HEIGHT + MATRIX_ACTIVITY_BAR_TOP_GAP;
    const barHeight = Math.max(
      170,
      frameHeight -
        MATRIX_ACTIVITY_HEADER_HEIGHT -
        MATRIX_ACTIVITY_BAR_BOTTOM_PADDING
    );

    const positionedActivity = {
      ...activity,
      x: runningX,
      y: frameY,
      width: frameWidth,
      height: frameHeight,
      centerX: runningX + frameWidth / 2,
      headerY: frameY + 25,
      valueY: frameY + 48,
      barY,
      barHeight,
    };

    runningX += frameWidth + MATRIX_ACTIVITY_GAP;

    return positionedActivity;
  });

  return {
    width,
    height,
    activities: positionedActivities,
  };
}

function getSubColumns(activity) {
  const subActivities = activity.subActivities || [];
  const subActivityLabelSpace = MATRIX_SUBACTIVITY_LABEL_SPACE;

  if (subActivities.length <= 1) {
    return [
      {
        ...subActivities[0],
        x: activity.x + 14,
        y: activity.barY + subActivityLabelSpace,
        width: Math.max(1, activity.width - 28),
        height: Math.max(1, activity.barHeight - subActivityLabelSpace),
        centerX: activity.x + activity.width / 2,
      },
    ];
  }

  const gap = MATRIX_SUBACTIVITY_GAP;
  const paddingX = MATRIX_SUBACTIVITY_PADDING_X;

  const subActivityItems = subActivities.map((subActivity) => {
    const volume = subActivity.divisionValues.reduce(
      (sum, division) => sum + division.value,
      0
    );

    return {
      ...subActivity,
      volume,
      minimumWidth: MATRIX_SUBACTIVITY_MIN_WIDTH,
    };
  });

  const widths = resolveWidthsWithMinimum(
    subActivityItems,
    Math.max(1, activity.width - paddingX * 2),
    gap,
    MATRIX_SUBACTIVITY_WIDTH_VOLUME_POWER
  );

  let runningX = activity.x + paddingX;

  return subActivityItems.map((subActivity, index) => {
    const width = widths[index] || MATRIX_SUBACTIVITY_MIN_WIDTH;

    const column = {
      ...subActivity,
      x: runningX,
      y: activity.barY + subActivityLabelSpace,
      width,
      height: Math.max(1, activity.barHeight - subActivityLabelSpace),
      centerX: runningX + width / 2,
      labelY: activity.barY + 14,
    };

    runningX += width + gap;

    return column;
  });
}

function getDivisionRows(subColumn) {
  const divisionValues = (subColumn.divisionValues || []).filter((division) => {
    return Number.isFinite(Number(division.value));
  });

  if (divisionValues.length === 0) {
    return [];
  }

  const rowHeight = subColumn.height / divisionValues.length;

  return divisionValues.map((division, index) => ({
    ...division,
    y: subColumn.y + rowHeight * index,
    height: rowHeight,
    centerY: subColumn.y + rowHeight * index + rowHeight / 2,
  }));
}

function getDivisionTextLayout(width, rowHeight, showDivisionValues = false) {
  if (!showDivisionValues) {
    if (width >= 115 && rowHeight >= 28) {
      return {
        mode: "label-only",
        labelFontSize: 10,
      };
    }

    if (width >= 58 && rowHeight >= 20) {
      return {
        mode: "label-only",
        labelFontSize: 8,
      };
    }

    if (width >= 34 && rowHeight >= 16) {
      return {
        mode: "label-only",
        labelFontSize: 7,
      };
    }

    return {
      mode: "hidden",
    };
  }

  if (width >= 115 && rowHeight >= 42) {
    return {
      mode: "two-lines",
      labelFontSize: 9.5,
      valueFontSize: 15,
      labelOffsetY: -8,
      valueOffsetY: 8,
    };
  }

  if (width >= 58 && rowHeight >= 26) {
    return {
      mode: "two-lines",
      labelFontSize: 7,
      valueFontSize: 12,
      labelOffsetY: -6,
      valueOffsetY: 7,
    };
  }

  if (width >= 34 && rowHeight >= 16) {
    return {
      mode: "value-only",
      valueFontSize: 10,
    };
  }

  return {
    mode: "hidden",
  };
}

function DomainGauge({ filters, gaugeModel, onApplyGaugeValues }) {
  const asylumThresholdValue = clamp(
    parseFlexibleNumber(
      filters.gaugeAsylumThresholdValue ?? filters.gaugeThresholdValue,
      5800
    ),
    0,
    gaugeModel.gaugeMaxValue
  );

  const stayThresholdValue = clamp(
    parseFlexibleNumber(filters.gaugeStayThresholdValue, 5800),
    0,
    gaugeModel.gaugeMaxValue
  );

  const shouldShowAsylumThreshold = asylumThresholdValue > 0;
  const shouldShowStayThreshold = stayThresholdValue > 0;

  const asylumValue = clamp(
    gaugeModel.asylumPendenzen,
    0,
    gaugeModel.gaugeMaxValue
  );

  const stayValue = clamp(
    gaugeModel.stayPendenzen,
    0,
    gaugeModel.gaugeMaxValue
  );

  const asylumThresholdX =
    GAUGE_CENTER_X -
    (asylumThresholdValue / gaugeModel.gaugeMaxValue) * GAUGE_HALF_WIDTH;
  const stayThresholdX =
    GAUGE_CENTER_X +
    (stayThresholdValue / gaugeModel.gaugeMaxValue) * GAUGE_HALF_WIDTH;
  const asylumCursorX =
    GAUGE_CENTER_X -
    (asylumValue / gaugeModel.gaugeMaxValue) * GAUGE_HALF_WIDTH;
  const stayCursorX =
    GAUGE_CENTER_X + (stayValue / gaugeModel.gaugeMaxValue) * GAUGE_HALF_WIDTH;

  const applyPointerEvent = useCallback(
    (event) => {
      const svgElement =
        event.currentTarget.ownerSVGElement || event.currentTarget;
      const bounds = svgElement.getBoundingClientRect();

      if (!bounds.width) {
        return;
      }

      const svgX =
        ((event.clientX - bounds.left) / bounds.width) * GAUGE_VIEWBOX_WIDTH;

      const clampedX = clamp(
        svgX,
        GAUGE_TRACK_X,
        GAUGE_TRACK_X + GAUGE_TRACK_WIDTH
      );

      if (clampedX <= GAUGE_CENTER_X) {
        const distanceRatio = clamp(
          (GAUGE_CENTER_X - clampedX) / GAUGE_HALF_WIDTH,
          0,
          1
        );

        const nextAsylumPendenzen = distanceRatio * gaugeModel.gaugeMaxValue;

        onApplyGaugeValues({
          asylumPendenzen: nextAsylumPendenzen,
          stayPendenzen: gaugeModel.stayPendenzen,
        });

        return;
      }

      const distanceRatio = clamp(
        (clampedX - GAUGE_CENTER_X) / GAUGE_HALF_WIDTH,
        0,
        1
      );

      const nextStayPendenzen = distanceRatio * gaugeModel.gaugeMaxValue;

      onApplyGaugeValues({
        asylumPendenzen: gaugeModel.asylumPendenzen,
        stayPendenzen: nextStayPendenzen,
      });
    },
    [
      gaugeModel.asylumPendenzen,
      gaugeModel.stayPendenzen,
      gaugeModel.gaugeMaxValue,
      onApplyGaugeValues,
    ]
  );

  const handlePointerDown = useCallback(
    (event) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      applyPointerEvent(event);
    },
    [applyPointerEvent]
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (event.buttons !== 1) {
        return;
      }

      applyPointerEvent(event);
    },
    [applyPointerEvent]
  );

  const handlePointerUp = useCallback((event) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  const handleKeyDown = useCallback(
    (event) => {
      const step = event.shiftKey ? 1000 : 500;
      const isLeftSide = event.currentTarget.dataset.activeSide === "asile";

      let nextAsylumPendenzen = gaugeModel.asylumPendenzen;
      let nextStayPendenzen = gaugeModel.stayPendenzen;

      if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        if (isLeftSide) {
          nextAsylumPendenzen += step;
        } else {
          nextStayPendenzen += step;
        }
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        if (isLeftSide) {
          nextAsylumPendenzen -= step;
        } else {
          nextStayPendenzen -= step;
        }
      }

      if (event.key === "Home") {
        if (isLeftSide) {
          nextAsylumPendenzen = 0;
        } else {
          nextStayPendenzen = 0;
        }
      }

      if (event.key === "End") {
        if (isLeftSide) {
          nextAsylumPendenzen = gaugeModel.gaugeMaxValue;
        } else {
          nextStayPendenzen = gaugeModel.gaugeMaxValue;
        }
      }

      if (
        ![
          "ArrowRight",
          "ArrowUp",
          "ArrowLeft",
          "ArrowDown",
          "Home",
          "End",
        ].includes(event.key)
      ) {
        return;
      }

      event.preventDefault();

      onApplyGaugeValues({
        asylumPendenzen: clamp(
          nextAsylumPendenzen,
          0,
          gaugeModel.gaugeMaxValue
        ),
        stayPendenzen: clamp(nextStayPendenzen, 0, gaugeModel.gaugeMaxValue),
      });
    },
    [
      gaugeModel.asylumPendenzen,
      gaugeModel.stayPendenzen,
      gaugeModel.gaugeMaxValue,
      onApplyGaugeValues,
    ]
  );

  return (
    <div className="aptr-gauge-strip">
      <svg
        className="aptr-gauge-svg"
        viewBox={`0 0 ${GAUGE_VIEWBOX_WIDTH} ${GAUGE_VIEWBOX_HEIGHT}`}
        role="img"
        aria-label="Pendenzen Asile et Séjour, avec adaptation des ressources SAM"
      >
        <defs>
          <linearGradient
            id="aptr-balance-gradient"
            x1="0%"
            x2="100%"
            y1="0%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#e9a8a8" />
            <stop offset="8%" stopColor="#ebb1a0" />
            <stop offset="16%" stopColor="#efc292" />
            <stop offset="25%" stopColor="#f3dda6" />
            <stop offset="36%" stopColor="#dbeaf2" />
            <stop offset="46%" stopColor="#bdd6e7" />
            <stop offset="50%" stopColor="#a8c8dc" />
            <stop offset="54%" stopColor="#bdd6e7" />
            <stop offset="64%" stopColor="#dbeaf2" />
            <stop offset="75%" stopColor="#f3dda6" />
            <stop offset="84%" stopColor="#efc292" />
            <stop offset="92%" stopColor="#ebb1a0" />
            <stop offset="100%" stopColor="#e9a8a8" />
          </linearGradient>
        </defs>

        <text
          className="aptr-gauge-kicker"
          x={GAUGE_CENTER_X}
          y={GAUGE_TITLE_Y}
          textAnchor="middle"
        >
          {filters.gaugeTitle || "Pendenzen"}
        </text>

        <text
          className="aptr-gauge-domain-label"
          x={GAUGE_LEFT_DOMAIN_LABEL_X}
          y={GAUGE_TRACK_Y - 16}
          textAnchor="start"
        >
          ASILE
        </text>
        <text
          className="aptr-gauge-domain-label"
          x={GAUGE_RIGHT_DOMAIN_LABEL_X}
          y={GAUGE_TRACK_Y - 16}
          textAnchor="end"
        >
          SÉJOUR
        </text>

        <rect
          className="aptr-gauge-track"
          x={GAUGE_TRACK_X}
          y={GAUGE_TRACK_Y}
          width={GAUGE_TRACK_WIDTH}
          height={GAUGE_TRACK_HEIGHT}
          rx={GAUGE_TRACK_HEIGHT / 2}
          fill="url(#aptr-balance-gradient)"
        />

        {shouldShowAsylumThreshold && (
          <line
            className="aptr-gauge-threshold-line"
            x1={asylumThresholdX}
            x2={asylumThresholdX}
            y1={GAUGE_THRESHOLD_LINE_TOP}
            y2={GAUGE_THRESHOLD_LINE_BOTTOM}
          />
        )}

        {shouldShowStayThreshold && (
          <line
            className="aptr-gauge-threshold-line"
            x1={stayThresholdX}
            x2={stayThresholdX}
            y1={GAUGE_THRESHOLD_LINE_TOP}
            y2={GAUGE_THRESHOLD_LINE_BOTTOM}
          />
        )}

        <line
          className="aptr-gauge-zero-line"
          x1={GAUGE_CENTER_X}
          x2={GAUGE_CENTER_X}
          y1={GAUGE_ZERO_LINE_TOP}
          y2={GAUGE_ZERO_LINE_BOTTOM}
        />

        <text
          className="aptr-gauge-scale"
          x={GAUGE_TRACK_X}
          y={GAUGE_FIXED_LABEL_Y}
        >
          {formatNumber(gaugeModel.gaugeMaxValue)}
        </text>

        {shouldShowAsylumThreshold && (
          <text
            className="aptr-gauge-threshold-label"
            x={asylumThresholdX}
            y={GAUGE_FIXED_LABEL_Y}
            textAnchor="middle"
          >
            Seuil Asile {formatNumber(asylumThresholdValue)}
          </text>
        )}

        <text
          className="aptr-gauge-scale"
          x={GAUGE_CENTER_X}
          y={GAUGE_FIXED_LABEL_Y}
          textAnchor="middle"
        >
          0
        </text>

        {shouldShowStayThreshold && (
          <text
            className="aptr-gauge-threshold-label"
            x={stayThresholdX}
            y={GAUGE_FIXED_LABEL_Y}
            textAnchor="middle"
          >
            Seuil Séjour {formatNumber(stayThresholdValue)}
          </text>
        )}

        <text
          className="aptr-gauge-scale"
          x={GAUGE_TRACK_X + GAUGE_TRACK_WIDTH}
          y={GAUGE_FIXED_LABEL_Y}
          textAnchor="end"
        >
          {formatNumber(gaugeModel.gaugeMaxValue)}
        </text>

        <g
          className="aptr-gauge-cursor"
          transform={`translate(${asylumCursorX} 0)`}
        >
          <rect
            className="aptr-gauge-cursor-label-bg"
            x="-46"
            y={GAUGE_TRACK_Y - 38}
            width="92"
            height="24"
            rx="12"
          />
          <text
            className="aptr-gauge-cursor-label"
            x="0"
            y={GAUGE_TRACK_Y - 22}
            textAnchor="middle"
          >
            Asile {formatNumber(asylumValue)}
          </text>
          <line
            className="aptr-gauge-cursor-line"
            x1="0"
            x2="0"
            y1={GAUGE_TRACK_Y - 8}
            y2={GAUGE_TRACK_Y + GAUGE_TRACK_HEIGHT / 2}
          />
          <circle
            className="aptr-gauge-cursor-dot"
            cx="0"
            cy={GAUGE_TRACK_Y + GAUGE_TRACK_HEIGHT / 2}
            r="6"
          />
        </g>

        <g
          className="aptr-gauge-cursor"
          transform={`translate(${stayCursorX} 0)`}
        >
          <line
            className="aptr-gauge-cursor-line"
            x1="0"
            x2="0"
            y1={GAUGE_TRACK_Y + GAUGE_TRACK_HEIGHT / 2}
            y2={GAUGE_STAY_CURSOR_LINE_BOTTOM}
          />
          <circle
            className="aptr-gauge-cursor-dot"
            cx="0"
            cy={GAUGE_TRACK_Y + GAUGE_TRACK_HEIGHT / 2}
            r="6"
          />
          <rect
            className="aptr-gauge-cursor-label-bg"
            x="-50"
            y={GAUGE_STAY_CURSOR_LABEL_BG_Y}
            width="100"
            height="24"
            rx="12"
          />
          <text
            className="aptr-gauge-cursor-label"
            x="0"
            y={GAUGE_STAY_CURSOR_LABEL_Y}
            textAnchor="middle"
          >
            Séjour {formatNumber(stayValue)}
          </text>
        </g>

        <rect
          className="aptr-gauge-hit-area"
          x={GAUGE_TRACK_X - 28}
          y={GAUGE_TRACK_Y - 44}
          width={GAUGE_HALF_WIDTH + 28}
          height="128"
          tabIndex="0"
          role="slider"
          data-active-side="asile"
          aria-label="Déplacer les pendenzen Asile"
          aria-valuemin="0"
          aria-valuemax={Math.round(gaugeModel.gaugeMaxValue)}
          aria-valuenow={Math.round(asylumValue)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
        />

        <rect
          className="aptr-gauge-hit-area"
          x={GAUGE_CENTER_X}
          y={GAUGE_TRACK_Y - 44}
          width={GAUGE_HALF_WIDTH + 28}
          height="128"
          tabIndex="0"
          role="slider"
          data-active-side="sejour"
          aria-label="Déplacer les pendenzen Séjour"
          aria-valuemin="0"
          aria-valuemax={Math.round(gaugeModel.gaugeMaxValue)}
          aria-valuenow={Math.round(stayValue)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
        />
      </svg>
    </div>
  );
}

function ActivityLabel({ activity }) {
  const isStayActivity = activity.id === "sejour";

  return (
    <g>
      <text
        className="aptr-activity-title"
        x={activity.centerX}
        y={activity.headerY}
        textAnchor="middle"
      >
        {activity.name}
      </text>
      <text
        className="aptr-activity-volume"
        x={activity.centerX}
        y={activity.valueY}
        textAnchor="middle"
      >
        {formatNumber(activity.volume)}
        {isStayActivity && (
          <tspan className="aptr-work-package-asterisk">*</tspan>
        )}
      </text>
    </g>
  );
}

function DivisionRows({ subColumn, showDivisionValues }) {
  const rows = getDivisionRows(subColumn);

  return (
    <g>
      {rows.map((row, index) => {
        const layout = getDivisionTextLayout(
          subColumn.width,
          row.height,
          showDivisionValues
        );
        const textX = subColumn.x + subColumn.width / 2;

        return (
          <g key={`${subColumn.id}-${row.id}-${index}`}>
            {index > 0 && (
              <line
                className="aptr-division-line"
                x1={subColumn.x + 12}
                x2={subColumn.x + subColumn.width - 12}
                y1={row.y}
                y2={row.y}
              />
            )}

            {layout.mode === "label-only" && (
              <text
                className="aptr-division-label"
                x={textX}
                y={row.centerY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={layout.labelFontSize}
              >
                {row.shortName || row.name}
              </text>
            )}

            {layout.mode === "two-lines" && (
              <text
                className="aptr-division-text"
                x={textX}
                y={row.centerY}
                textAnchor="middle"
              >
                <tspan
                  className="aptr-division-label"
                  x={textX}
                  dy={layout.labelOffsetY}
                  fontSize={layout.labelFontSize}
                >
                  {row.shortName || row.name}
                </tspan>
                <tspan
                  className="aptr-division-value"
                  x={textX}
                  dy={layout.valueOffsetY - layout.labelOffsetY}
                  fontSize={layout.valueFontSize}
                >
                  {formatNumber(row.value)}
                </tspan>
              </text>
            )}

            {layout.mode === "value-only" && (
              <text
                className="aptr-division-value"
                x={textX}
                y={row.centerY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={layout.valueFontSize}
              >
                {formatNumber(row.value)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function ActivityColumn({ activity, showDivisionValues }) {
  const subColumns = getSubColumns(activity);
  const hasSubActivities = subColumns.length > 1;

  return (
    <g>
      <rect
        className="aptr-activity-frame"
        x={activity.x}
        y={activity.y}
        width={activity.width}
        height={activity.height}
        rx="18"
      />
      <ActivityLabel activity={activity} />

      {subColumns.map((subColumn) => (
        <g key={`${activity.id}-${subColumn.id}`}>
          {hasSubActivities && (
            <>
              <rect
                className="aptr-subactivity-frame"
                x={subColumn.x - 10}
                y={activity.barY - 7}
                width={subColumn.width + 20}
                height={activity.barHeight + 11}
                rx="16"
              />
              <text
                className="aptr-subactivity-title"
                x={subColumn.centerX}
                y={subColumn.labelY}
                textAnchor="middle"
              >
                {subColumn.name}
              </text>
            </>
          )}

          <rect
            className="aptr-activity-bar"
            x={subColumn.x}
            y={subColumn.y}
            width={subColumn.width}
            height={subColumn.height}
            rx={Math.min(24, subColumn.width / 2, subColumn.height / 6)}
            fill={activity.color}
          />
          <DivisionRows
            subColumn={subColumn}
            showDivisionValues={showDivisionValues}
          />
        </g>
      ))}
    </g>
  );
}

// Ligne de référence transversale, indépendante de la capacité calculée.
// Le pourcentage est mesuré du bas vers le haut de la zone colorée des colonnes.
function MinimumWorkThreshold({ layout, percent, label }) {
  const safePercent = clamp(Number(percent) || 0, 0, 100);

  // À 0 %, masquer la ligne et son libellé.
  if (safePercent === 0) {
    return null;
  }

  const firstActivity = layout.activities[0];
  const lastActivity = layout.activities[layout.activities.length - 1];

  if (!firstActivity || !lastActivity) {
    return null;
  }

  // Les colonnes simples et les deux sous-colonnes Auditions partagent
  // ce même point de départ et cette même hauteur depuis getSubColumns().
  const barTop = firstActivity.barY + MATRIX_SUBACTIVITY_LABEL_SPACE;
  const barHeight = Math.max(
    1,
    firstActivity.barHeight - MATRIX_SUBACTIVITY_LABEL_SPACE
  );
  const thresholdY = barTop + barHeight * (1 - safePercent / 100);

  const lineStartX = firstActivity.x;
  const lineEndX = lastActivity.x + lastActivity.width;
  const labelY = Math.max(barTop + 12, thresholdY - 10);

  return (
    <g className="aptr-minimum-work-threshold" aria-hidden="true">
      <line
        className="aptr-minimum-work-threshold-line"
        x1={lineStartX}
        x2={lineEndX}
        y1={thresholdY}
        y2={thresholdY}
      />
      {label && (
        <text
          className="aptr-minimum-work-threshold-label"
          x={lineEndX - 10}
          y={labelY}
          textAnchor="end"
        >
          {label}
        </text>
      )}
    </g>
  );
}

function MatrixSvg({
  model,
  size,
  showDivisionValues,
  minimumWorkThresholdPercent,
  minimumWorkThresholdLabel,
}) {
  const layout = useMemo(() => buildMatrixLayout(model, size), [model, size]);

  return (
    <svg
      className="aptr-matrix-svg"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label="Répartition interne des ressources par activité et domaine"
    >
      <g className="aptr-activities-layer">
        {layout.activities.map((activity) => (
          <ActivityColumn
            key={activity.id}
            activity={activity}
            showDivisionValues={showDivisionValues}
          />
        ))}
      </g>
      <MinimumWorkThreshold
        layout={layout}
        percent={minimumWorkThresholdPercent}
        label={minimumWorkThresholdLabel}
      />
      <text
        className="aptr-matrix-footnote"
        x={layout.width - 34}
        y={layout.height - 12}
        textAnchor="end"
      >
        * Pour le domaine Séjour, la valeur représente des paquets de travail et
        non des prestations.
      </text>
    </svg>
  );
}

export default function ActivityPartnerTransferRenderer({
  filters,
  isAnimating,
}) {
  const initialGaugeValues = useMemo(
    () => ({
      asylumPendenzen: clamp(
        parseFlexibleNumber(filters.initialAsylumPendenzen, 15000),
        0,
        parseFlexibleNumber(filters.gaugeMaxValue, 30000)
      ),
      stayPendenzen: clamp(
        parseFlexibleNumber(filters.initialStayPendenzen, 8400),
        0,
        parseFlexibleNumber(filters.gaugeMaxValue, 30000)
      ),
    }),
    [
      filters.initialAsylumPendenzen,
      filters.initialStayPendenzen,
      filters.gaugeMaxValue,
    ]
  );

  const [gaugeValues, setGaugeValues] = useState(initialGaugeValues);
  const [matrixValues, setMatrixValues] = useState(initialGaugeValues);
  const [stageRef, stageSize] = useElementSize();

  const animationFrameRef = useRef(null);
  const matrixTransitionRef = useRef(null);
  const matrixReactionTimeoutRef = useRef(null);
  const matrixValuesRef = useRef(initialGaugeValues);
  // La position affichee, y compris apres un mouvement manuel, est le depart
  // de la prochaine animation lancee par le bouton.
  const gaugeValuesRef = useRef(initialGaugeValues);

  const stopRunningAnimations = useCallback(() => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (matrixTransitionRef.current) {
      window.cancelAnimationFrame(matrixTransitionRef.current);
      matrixTransitionRef.current = null;
    }

    if (matrixReactionTimeoutRef.current) {
      window.clearTimeout(matrixReactionTimeoutRef.current);
      matrixReactionTimeoutRef.current = null;
    }
  }, []);

  const commitMatrixValues = useCallback(
    (nextValues) => {
      const gaugeMaxValue = parseFlexibleNumber(filters.gaugeMaxValue, 30000);

      const safeValues = {
        asylumPendenzen: clamp(
          parseFlexibleNumber(nextValues.asylumPendenzen, 15000),
          0,
          gaugeMaxValue
        ),
        stayPendenzen: clamp(
          parseFlexibleNumber(nextValues.stayPendenzen, 8400),
          0,
          gaugeMaxValue
        ),
      };

      matrixValuesRef.current = safeValues;
      setMatrixValues(safeValues);
    },
    [filters.gaugeMaxValue]
  );

  const animateMatrixToValues = useCallback(
    (targetValues) => {
      const gaugeMaxValue = parseFlexibleNumber(filters.gaugeMaxValue, 30000);

      const safeTargetValues = {
        asylumPendenzen: clamp(
          parseFlexibleNumber(targetValues.asylumPendenzen, 15000),
          0,
          gaugeMaxValue
        ),
        stayPendenzen: clamp(
          parseFlexibleNumber(targetValues.stayPendenzen, 8400),
          0,
          gaugeMaxValue
        ),
      };

      const startValues = matrixValuesRef.current;
      const duration = Math.max(
        250,
        parseFlexibleNumber(filters.matrixManualTransitionDurationMs, 900)
      );

      if (matrixTransitionRef.current) {
        window.cancelAnimationFrame(matrixTransitionRef.current);
        matrixTransitionRef.current = null;
      }

      let startTime = null;

      function animate(timestamp) {
        if (startTime === null) {
          startTime = timestamp;
        }

        const elapsed = timestamp - startTime;
        const localProgress = clamp(elapsed / duration, 0, 1);
        const easedProgress = easeInOutCubic(localProgress);

        const nextValues = {
          asylumPendenzen: lerp(
            startValues.asylumPendenzen,
            safeTargetValues.asylumPendenzen,
            easedProgress
          ),
          stayPendenzen: lerp(
            startValues.stayPendenzen,
            safeTargetValues.stayPendenzen,
            easedProgress
          ),
        };

        commitMatrixValues(nextValues);

        if (localProgress < 1) {
          matrixTransitionRef.current = window.requestAnimationFrame(animate);
        } else {
          commitMatrixValues(safeTargetValues);
          matrixTransitionRef.current = null;
        }
      }

      matrixTransitionRef.current = window.requestAnimationFrame(animate);
    },
    [
      commitMatrixValues,
      filters.gaugeMaxValue,
      filters.matrixManualTransitionDurationMs,
    ]
  );

  const applyGaugeValues = useCallback(
    (nextValues) => {
      const gaugeMaxValue = parseFlexibleNumber(filters.gaugeMaxValue, 30000);

      const safeValues = {
        asylumPendenzen: clamp(
          parseFlexibleNumber(
            nextValues.asylumPendenzen,
            gaugeValues.asylumPendenzen
          ),
          0,
          gaugeMaxValue
        ),
        stayPendenzen: clamp(
          parseFlexibleNumber(
            nextValues.stayPendenzen,
            gaugeValues.stayPendenzen
          ),
          0,
          gaugeMaxValue
        ),
      };

      const delay = Math.max(
        0,
        parseFlexibleNumber(filters.matrixReactionDelayMs, 600)
      );

      stopRunningAnimations();
      gaugeValuesRef.current = safeValues;
      setGaugeValues(safeValues);

      matrixReactionTimeoutRef.current = window.setTimeout(() => {
        matrixReactionTimeoutRef.current = null;
        animateMatrixToValues(safeValues);
      }, delay);
    },
    [
      animateMatrixToValues,
      filters.gaugeMaxValue,
      filters.matrixReactionDelayMs,
      gaugeValues.asylumPendenzen,
      gaugeValues.stayPendenzen,
      stopRunningAnimations,
    ]
  );

  useEffect(() => {
    // Le bouton (ExampleLayout) peut remettre isAnimating a false avant que
    // le parcours soit acheve. Ce changement ne doit PAS annuler les frames.
    // L'animation gere elle-meme sa fin selon animationDurationMs.
    if (!isAnimating) {
      return;
    }

    stopRunningAnimations();

    const delay = Math.max(
      0,
      parseFlexibleNumber(filters.matrixReactionDelayMs, 600)
    );

    // Une seule duree totale, incluant le retard de reaction de la matrice.
    // matrixTransitionDurationMs est conserve comme valeur de repli.
    const totalDuration = Math.max(
      6000,
      parseFlexibleNumber(
        filters.animationDurationMs,
        parseFlexibleNumber(filters.matrixTransitionDurationMs, 14000) + delay
      )
    );
    const duration = Math.max(1, totalDuration - delay);
    const gaugeMaxValue = Math.max(
      1,
      parseFlexibleNumber(filters.gaugeMaxValue, 30000)
    );

    // Capturer la position visible au moment du clic plutot que de repartir
    // de zero ou de reinitialiser la jauge a sa valeur configuree.
    const startValues = {
      asylumPendenzen: clamp(
        gaugeValuesRef.current.asylumPendenzen,
        0,
        gaugeMaxValue
      ),
      stayPendenzen: clamp(
        gaugeValuesRef.current.stayPendenzen,
        0,
        gaugeMaxValue
      ),
    };

    let startTime = null;

    function getAutoValues(elapsed) {
      return {
        asylumPendenzen: getAsylumSweepValue(
          elapsed,
          duration,
          startValues.asylumPendenzen,
          gaugeMaxValue
        ),
        // Le curseur Sejour reste independant de l'animation Asile.
        stayPendenzen: startValues.stayPendenzen,
      };
    }

    function animate(timestamp) {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const nextGaugeValues = getAutoValues(elapsed);
      const nextMatrixValues = getAutoValues(elapsed - delay);

      gaugeValuesRef.current = nextGaugeValues;
      setGaugeValues(nextGaugeValues);
      commitMatrixValues(nextMatrixValues);

      // Continuer jusqu'a la fin des 20 s, meme si isAnimating passe a false.
      if (elapsed < totalDuration) {
        animationFrameRef.current = window.requestAnimationFrame(animate);
      } else {
        gaugeValuesRef.current = startValues;
        setGaugeValues(startValues);
        commitMatrixValues(startValues);
        animationFrameRef.current = null;
      }
    }

    // Pas de saut initial vers 0 : l'animation part de l'etat affiche.
    gaugeValuesRef.current = startValues;
    setGaugeValues(startValues);
    commitMatrixValues(startValues);
    animationFrameRef.current = window.requestAnimationFrame(animate);

    // Ne pas retourner de cleanup ici : React appellerait ce cleanup quand
    // isAnimating devient false, ce qui couperait la lecture en plein milieu.
    // L'annulation lors d'un deplacement manuel ou du demontage du composant
    // est toujours geree par stopRunningAnimations().
  }, [
    commitMatrixValues,
    filters.animationDurationMs,
    filters.gaugeMaxValue,
    filters.matrixReactionDelayMs,
    filters.matrixTransitionDurationMs,
    isAnimating,
    stopRunningAnimations,
  ]);

  useEffect(() => {
    return () => {
      stopRunningAnimations();
    };
  }, [stopRunningAnimations]);

  const gaugeModel = useMemo(() => {
    return buildTransferModel(filters, gaugeValues);
  }, [filters, gaugeValues]);

  const matrixModel = useMemo(() => {
    return buildTransferModel(filters, matrixValues);
  }, [filters, matrixValues]);

  const showDivisionValues = useMemo(() => {
    return parseBoolean(filters.showDivisionValues, false);
  }, [filters.showDivisionValues]);

  const minimumWorkThresholdPercent = clamp(
    parseFlexibleNumber(filters.matrixMinimumWorkThresholdPercent, 100 / 3),
    0,
    100
  );
  const minimumWorkThresholdLabel = String(
    filters.matrixMinimumWorkThresholdLabel ?? "Seuil minimum de travail"
  ).trim();

  return (
    <div className="aptr-renderer">
      <section className="aptr-matrix-card">
        <div className="aptr-matrix-header">
          <h3>Matrice activités / domaines</h3>
          <p>
            Les activités sont détaillées par domaines et peuvent être découpées
            en sous-activités divisions.
          </p>
        </div>

        <div className="aptr-matrix-stage">
          <DomainGauge
            filters={filters}
            gaugeModel={gaugeModel}
            onApplyGaugeValues={applyGaugeValues}
          />

          <div className="aptr-matrix-visual" ref={stageRef}>
            <MatrixSvg
              model={matrixModel}
              size={stageSize}
              showDivisionValues={showDivisionValues}
              minimumWorkThresholdPercent={minimumWorkThresholdPercent}
              minimumWorkThresholdLabel={minimumWorkThresholdLabel}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
