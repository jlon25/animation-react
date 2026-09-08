import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ScenarioSlider from "../components/ScenarioSlider";
import "../css/activity-partner-matrix.css";

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

const ACTIVITY_BULGE_INTENSITY = 0.4;
const PARTNER_BULGE_INTENSITY = 0.3;

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

function buildStage({ label, namesText, volumesText, partnerCount }) {
  const names = parseNames(namesText);
  const volumes = parseNumbers(volumesText, names.length);

  const activities = names.map((name, index) => ({
    id: normalizeId(name),
    name,
    volume: volumes[index] || 0,
    color: ACTIVITY_COLORS[index % ACTIVITY_COLORS.length],
  }));

  return {
    label,
    partnerCount: Math.max(1, Number(partnerCount) || 1),
    activities,
    totalVolume: activities.reduce((sum, item) => sum + item.volume, 0),
  };
}

function getActivityVolume(stage, activityId) {
  return (
    stage.activities.find((activity) => activity.id === activityId)?.volume || 0
  );
}

function getMergedActivities(stageA, stageB) {
  const activityMap = new Map();

  [...stageA.activities, ...stageB.activities].forEach((activity, index) => {
    if (!activityMap.has(activity.id)) {
      activityMap.set(activity.id, {
        id: activity.id,
        name: activity.name,
        color:
          activity.color || ACTIVITY_COLORS[index % ACTIVITY_COLORS.length],
      });
    }
  });

  return Array.from(activityMap.values());
}

function interpolateStage(stageA, stageB, progress) {
  const activities = getMergedActivities(stageA, stageB)
    .map((activity) => {
      const fromVolume = getActivityVolume(stageA, activity.id);
      const toVolume = getActivityVolume(stageB, activity.id);
      const volume = lerp(fromVolume, toVolume, progress);

      return {
        ...activity,
        volume,
      };
    })
    .filter((activity) => activity.volume > 0.05);

  const partnerCount = lerp(stageA.partnerCount, stageB.partnerCount, progress);

  return {
    label: progress < 0.5 ? stageA.label : stageB.label,
    partnerCount,
    activities,
    totalVolume: activities.reduce((sum, activity) => sum + activity.volume, 0),
  };
}

function buildInterpolatedState(stages, progress) {
  if (progress <= 1) {
    return interpolateStage(stages[0], stages[1], progress);
  }

  return interpolateStage(stages[1], stages[2], progress - 1);
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

function getDecimalsFromStep(step) {
  const value = String(step);

  if (!value.includes(".")) {
    return 0;
  }

  return value.split(".")[1].length;
}

function roundToStep(value, step = 1) {
  const safeStep = Number(step);

  if (!Number.isFinite(safeStep) || safeStep <= 0) {
    return Math.round(value);
  }

  return Math.round(value / safeStep) * safeStep;
}

function formatPartnerCount(value, step = 1) {
  const roundedValue = roundToStep(value, step);
  const decimals = getDecimalsFromStep(step);

  return formatNumber(roundedValue, decimals);
}

function getPartnerCountDisplayLayout(activity) {
  const availableWidth = Math.max(1, activity.width - 24);
  const availableHeight = Math.max(1, activity.height - 24);

  const valueFontSize = clamp(
    Math.min(availableWidth * 0.52, availableHeight * 0.38),
    20,
    42
  );

  /*
   * Cas 1 :
   * zone très confortable -> libellé long sur 2 lignes
   */
  if (availableWidth >= 150 && availableHeight >= 95) {
    return {
      valueFontSize,
      labelFontSize: 13,
      labelLines: ["Divisions", "partenaires"],
      valueOffsetY: -14,
      lineStartY: 20,
      lineGap: 16,
    };
  }

  /*
   * Cas 2 :
   * zone large mais peu haute -> libellé long sur 1 ligne
   */
  if (availableWidth >= 160 && availableHeight >= 58) {
    return {
      valueFontSize: clamp(valueFontSize, 22, 36),
      labelFontSize: clamp(availableWidth * 0.045, 8, 11),
      labelLines: ["Divisions partenaires"],
      valueOffsetY: -9,
      lineStartY: 18,
      lineGap: 0,
    };
  }

  /*
   * Cas 3 :
   * zone étroite mais haute -> version courte sur 2 lignes
   * C'est ce cas qui va maintenant servir pour MAT, LIGHT, ADMIN.
   */
  if (availableWidth >= 70 && availableHeight >= 110) {
    return {
      valueFontSize: clamp(valueFontSize, 20, 34),
      labelFontSize: clamp(
        Math.min(availableWidth * 0.16, availableHeight * 0.06),
        8,
        11
      ),
      labelLines: ["Div.", "part."],
      valueOffsetY: -10,
      lineStartY: 16,
      lineGap: 13,
    };
  }

  /*
   * Cas 4 :
   * zone moyenne -> version courte sur 2 lignes
   */
  if (availableWidth >= 95 && availableHeight >= 85) {
    return {
      valueFontSize,
      labelFontSize: 11,
      labelLines: ["Div.", "part."],
      valueOffsetY: -12,
      lineStartY: 18,
      lineGap: 14,
    };
  }

  /*
   * Cas 4 :
   * zone moyenne -> version courte sur 2 lignes
   */
  if (availableWidth >= 85 && availableHeight >= 75) {
    return {
      valueFontSize,
      labelFontSize: 11,
      labelLines: ["Div. part."],
      valueOffsetY: -12,
      lineStartY: 18,
      lineGap: 14,
    };
  }

  /*
   * Cas 6 :
   * pas assez d'espace -> valeur seule
   */
  return {
    valueFontSize: clamp(valueFontSize, 18, 34),
    labelFontSize: 0,
    labelLines: [0],
    valueOffsetY: 0,
    lineStartY: 0,
    lineGap: 0,
  };
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

export default function ActivityPartnerMatrixRenderer({
  filters,
  isAnimating,
}) {
  const [progress, setProgress] = useState(0);
  const [progressDirection, setProgressDirection] = useState(1);

  const progressRef = useRef(0);
  const animationFrameRef = useRef(null);
  const manualTransitionRef = useRef(null);

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

  const stages = useMemo(() => {
    return [
      buildStage({
        label: filters.matrixPastLabel || "État passé",
        namesText: filters.matrixPastActivityNames,
        volumesText: filters.matrixPastActivityVolumes,
        partnerCount: filters.matrixPastPartnerCount,
      }),
      buildStage({
        label: filters.matrixCurrentLabel || "État actuel",
        namesText: filters.matrixCurrentActivityNames,
        volumesText: filters.matrixCurrentActivityVolumes,
        partnerCount: filters.matrixCurrentPartnerCount,
      }),
      buildStage({
        label: filters.matrixFutureLabel || "État futur",
        namesText: filters.matrixFutureActivityNames,
        volumesText: filters.matrixFutureActivityVolumes,
        partnerCount: filters.matrixFuturePartnerCount,
      }),
    ];
  }, [
    filters.matrixPastLabel,
    filters.matrixPastActivityNames,
    filters.matrixPastActivityVolumes,
    filters.matrixPastPartnerCount,
    filters.matrixCurrentLabel,
    filters.matrixCurrentActivityNames,
    filters.matrixCurrentActivityVolumes,
    filters.matrixCurrentPartnerCount,
    filters.matrixFutureLabel,
    filters.matrixFutureActivityNames,
    filters.matrixFutureActivityVolumes,
    filters.matrixFuturePartnerCount,
  ]);

  const currentState = useMemo(() => {
    return buildInterpolatedState(stages, progress);
  }, [stages, progress]);

  const sliderScenarios = stages.map((stage, index) => ({
    name: stage.label,
    description:
      index === 0
        ? "État initial avec un périmètre réduit d’activités et de partenaires."
        : index === 1
        ? "État actuel avec une extension des activités et des partenaires."
        : "État cible avec un périmètre élargi et consolidé.",
  }));

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

      return undefined;
    }

    if (manualTransitionRef.current) {
      window.cancelAnimationFrame(manualTransitionRef.current);
      manualTransitionRef.current = null;
    }

    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    commitProgress(0);

    const totalDuration = Math.max(
      6000,
      Number(filters.matrixTransitionDurationMs) || 20000
    );

    let startTime = null;

    function animate(timestamp) {
      if (startTime === null) {
        startTime = timestamp;
      }

      const rawProgress = clamp((timestamp - startTime) / totalDuration, 0, 1);

      const pingPongProgress =
        rawProgress <= 0.5 ? rawProgress * 2 : (1 - rawProgress) * 2;

      const easedProgress = easeInOutCubic(pingPongProgress);

      commitProgress(easedProgress * 2);

      if (rawProgress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(animate);
      } else {
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
  }, [isAnimating, filters.matrixTransitionDurationMs, commitProgress]);

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
    };
  }, []);

  const svgWidth = stageSize.width;
  const svgHeight = stageSize.height;

  const topLabelSpace = 60;
  const bottomSafetySpace = 34;

  const usableMatrixHeight = Math.max(
    1,
    svgHeight - topLabelSpace - bottomSafetySpace
  );

  const maxMatrixWidth = svgWidth * 0.8;
  const maxMatrixHeight = Math.min(svgHeight * 0.8, usableMatrixHeight);

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
    return {
      ...activity,
      width: Math.max(0, activity.volume * widthPerVolumeUnit),
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

  const activityFramePaddingX = 18;
  const activityFrameTopPadding = 50;
  const activityFrameBottomPadding = 16;

  const activityFrameY = matrixY - activityFrameTopPadding;
  const activityFrameHeight =
    matrixHeight + activityFrameTopPadding + activityFrameBottomPadding;

  const partnerBulge = getPartnerBulge({
    stages,
    progress,
    progressDirection,
    matrixHeight,
  });

  const partnerCountDisplayStep =
    Number(filters.matrixPartnerCountDisplayStep) || 1;

  const displayedPartnerCountLabel = formatPartnerCount(
    currentState.partnerCount,
    partnerCountDisplayStep
  );

  function cancelAutomaticAnimation() {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }

  function cancelManualTransition() {
    if (manualTransitionRef.current) {
      window.cancelAnimationFrame(manualTransitionRef.current);
      manualTransitionRef.current = null;
    }
  }

  function handleSliderChange(nextProgress) {
    cancelManualTransition();
    cancelAutomaticAnimation();
    commitProgress(nextProgress);
  }

  function animateProgressTo(targetProgress) {
    cancelManualTransition();
    cancelAutomaticAnimation();

    const startProgress = progressRef.current;
    const endProgress = clamp(Number(targetProgress), 0, 2);

    if (Math.abs(startProgress - endProgress) < 0.0001) {
      return;
    }

    const duration = Math.max(
      800,
      Number(filters.matrixManualTransitionDurationMs) || 2500
    );

    let startTime = null;

    function animate(timestamp) {
      if (startTime === null) {
        startTime = timestamp;
      }

      const rawProgress = clamp((timestamp - startTime) / duration, 0, 1);
      const easedProgress = easeInOutCubic(rawProgress);

      const nextProgress =
        startProgress + (endProgress - startProgress) * easedProgress;

      commitProgress(nextProgress);

      if (rawProgress < 1) {
        manualTransitionRef.current = window.requestAnimationFrame(animate);
      } else {
        commitProgress(endProgress);
        manualTransitionRef.current = null;
      }
    }

    manualTransitionRef.current = window.requestAnimationFrame(animate);
  }

  return (
    <div className="apm-renderer">
      <div className="apm-header">
        <div>
          <h3>Matrice activités / partenaires</h3>

          <p>
            La matrice grandit horizontalement avec les activités et
            verticalement avec les partenaires.
          </p>
        </div>
      </div>

      <div className="apm-stage" ref={stageRef}>
        <svg
          className="apm-svg"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          role="img"
          aria-label="Matrice centrale des activités et partenaires"
        >
          <g>
            {activityColumns.map((activity) => (
              <rect
                key={`activity-frame-${activity.id}`}
                className="apm-activity-frame"
                x={activity.x - activityFramePaddingX}
                y={activityFrameY}
                width={activity.width + activityFramePaddingX * 2}
                height={activityFrameHeight}
                rx="28"
              />
            ))}

            {activityColumns.map((activity) => {
              const activityBulge = getActivityBulge({
                activity,
                stages,
                progress,
                progressDirection,
                activityGap,
              });

              return (
                <path
                  key={activity.id}
                  className="apm-activity-zone"
                  d={createBulgedActivityPath({
                    x: activity.x,
                    y: activity.y,
                    width: activity.width,
                    height: activity.height,
                    radius: 24,
                    horizontalBulge: activityBulge,
                    verticalBulge: partnerBulge,
                  })}
                  fill={activity.color}
                />
              );
            })}

            {activityColumns.map((activity) => {
              const partnerCountLayout = getPartnerCountDisplayLayout(activity);

              return (
                <g
                  key={`partner-count-${activity.id}`}
                  className="apm-partner-count"
                >
                  <title>
                    {displayedPartnerCountLabel} divisions partenaires
                  </title>

                  <text
                    className="apm-partner-count-value"
                    x={activity.centerX}
                    y={activity.centerY + partnerCountLayout.valueOffsetY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontSize: partnerCountLayout.valueFontSize,
                    }}
                  >
                    {displayedPartnerCountLabel}
                  </text>

                  {partnerCountLayout.labelLines.map((line, index) => (
                    <text
                      key={`${activity.id}-partner-label-${line}`}
                      className="apm-partner-count-label"
                      x={activity.centerX}
                      y={
                        activity.centerY +
                        partnerCountLayout.lineStartY +
                        index * partnerCountLayout.lineGap
                      }
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{
                        fontSize: partnerCountLayout.labelFontSize,
                      }}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              );
            })}
          </g>

          {activityColumns.map((activity) => {
            const titleY = matrixY - 32;
            const valueY = matrixY - 11;

            return (
              <g key={`activity-label-${activity.id}`}>
                <text
                  className="apm-activity-label-top"
                  x={activity.centerX}
                  y={titleY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {activity.name}
                </text>

                <text
                  className="apm-activity-value-top"
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
        </svg>
      </div>

      <ScenarioSlider
        scenarios={sliderScenarios}
        value={progress}
        min={0}
        max={2}
        step={0.001}
        onChange={handleSliderChange}
        onStepClick={animateProgressTo}
      />
    </div>
  );
}
