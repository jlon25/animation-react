import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ScenarioSlider from "../components/ScenarioSlider";
import "../css/activity-partner-annual-matrix.css";

const COLORS = {
  MAT: "#265b7d",
  LIGHT: "#678ca4",
  Auditions: "#a8bdcb",
  Séjour: "#1d4964",
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const format = (value) => Math.round(value).toLocaleString("fr-CH");
const totalOf = (value) =>
  typeof value === "number"
    ? value
    : Object.values(value || {}).reduce(
        (sum, child) => sum + totalOf(child),
        0
      );
const isLeaf = (obj) =>
  obj &&
  typeof obj === "object" &&
  Object.values(obj).every((value) => typeof value === "number");
const namesOf = (...objects) =>
  Array.from(new Set(objects.flatMap((object) => Object.keys(object || {}))));
function interpolateTree(left, right, factor) {
  if (typeof left === "number" || typeof right === "number") {
    return (Number(left) || 0) * (1 - factor) + (Number(right) || 0) * factor;
  }
  return Object.fromEntries(
    namesOf(left, right).map((key) => [
      key,
      interpolateTree(left?.[key], right?.[key], factor),
    ])
  );
}
function useDimensions() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 1200, height: 500 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const bounds = el.getBoundingClientRect();
      setSize({ width: bounds.width || 1200, height: bounds.height || 500 });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size];
}
function getWidths(entries, available, minimums) {
  const minimumSum = minimums.reduce((s, n) => s + n, 0);
  const basis = minimumSum > available ? available / minimumSum : 1;
  const flexible = Math.max(0, available - minimumSum);
  const weights = entries.map((entry) =>
    Math.pow(Math.max(0, entry.value), 1.65)
  );
  const sum = weights.reduce((s, w) => s + w, 0);
  return entries.map(
    (_, index) =>
      minimums[index] * basis +
      (sum ? (flexible * weights[index]) / sum : flexible / entries.length)
  );
}
function DivisionColumn({
  data,
  x,
  y,
  width,
  height,
  color,
  showDivisionValues,
}) {
  const entries = Object.entries(data || {});
  if (!entries.length) return null;
  const rowHeight = height / entries.length;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={Math.min(22, width / 3)}
        fill={color}
      />
      {entries.map(([name, value], index) => {
        const centerY = y + rowHeight * (index + 0.5);
        const compact = width < 80;
        return (
          <g key={name}>
            {index > 0 && (
              <line
                x1={x + 9}
                x2={x + width - 9}
                y1={y + rowHeight * index}
                y2={y + rowHeight * index}
                stroke="#fff"
                strokeOpacity=".25"
              />
            )}
            <text
              x={x + width / 2}
              y={showDivisionValues ? centerY - 5 : centerY + 2}
              textAnchor="middle"
              fill="white"
              fontSize={compact ? 8 : 10}
              fontWeight="800"
              dominantBaseline="middle"
            >
              {name}
            </text>
            {showDivisionValues && (
              <text
                x={x + width / 2}
                y={centerY + 11}
                textAnchor="middle"
                fill="white"
                fontSize={compact ? 9 : 12}
                fontWeight="850"
              >
                {format(value)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
export default function ActivityPartnerAnnualMatrixRenderer({
  filters = {},
  isAnimating = false,
}) {
  const years = useMemo(
    () =>
      String(filters.annualYears || "2023,2024,2025,2026")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    [filters.annualYears]
  );
  const annualData = filters.annualData || {};
  const ordered = useMemo(
    () =>
      String(filters.matrixActivityOrder || "MAT,LIGHT,Auditions,Séjour")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    [filters.matrixActivityOrder]
  );
  const activeNames = ordered.filter((name) =>
    years.some((year) => totalOf(annualData[year]?.[name]) > 0)
  );
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const frameRef = useRef(null);
  const manualRef = useRef(null);
  const [stageRef, size] = useDimensions();
  const maxProgress = Math.max(0, years.length - 1);
  const commit = useCallback(
    (value) => {
      const p = clamp(value, 0, maxProgress);
      progressRef.current = p;
      setProgress(p);
    },
    [maxProgress]
  );
  useEffect(() => {
    if (!isAnimating || maxProgress === 0) return;

    // Chaque nouvelle lecture annule le déplacement automatique ou manuel
    // encore actif, sans laisser tourner deux boucles en parallèle.
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (manualRef.current !== null) {
      cancelAnimationFrame(manualRef.current);
      manualRef.current = null;
    }

    // Durée définie pour le parcours complet 2023 → 2026.
    // Si le curseur part d'une année intermédiaire, le trajet est plus court.
    const fullDuration = Math.max(
      4000,
      Number(filters.matrixTransitionDurationMs) || 36000
    );

    // Une nouvelle lecture lancée alors que le curseur est déjà en 2026
    // recommence depuis 2023. Sinon, elle démarre à la position actuelle.
    const initial =
      progressRef.current >= maxProgress - 0.0001 ? 0 : progressRef.current;
    commit(initial);

    const remainingDistance = maxProgress - initial;
    const duration = fullDuration * (remainingDistance / maxProgress);
    let started = null;

    const animation = (time) => {
      if (started === null) started = time;

      const ratio = clamp((time - started) / duration, 0, 1);
      commit(initial + remainingDistance * ease(ratio));

      if (ratio < 1) {
        frameRef.current = requestAnimationFrame(animation);
      } else {
        // Fin définitive sur la dernière année (2026).
        commit(maxProgress);
        frameRef.current = null;
      }
    };

    frameRef.current = requestAnimationFrame(animation);

    // Ne pas annuler le mouvement au seul passage de isAnimating à false :
    // le timer du bouton parent peut se terminer avant le dernier frame.
    // Le cleanup de démontage ci-dessous reste responsable de l'annulation.
  }, [isAnimating, maxProgress, filters.matrixTransitionDurationMs, commit]);
  useEffect(
    () => () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (manualRef.current) cancelAnimationFrame(manualRef.current);
    },
    []
  );
  const scrubTo = useCallback(
    (target) => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (manualRef.current !== null) {
        cancelAnimationFrame(manualRef.current);
        manualRef.current = null;
      }
      commit(target);
    },
    [commit]
  );
  const animateTo = useCallback(
    (target) => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (manualRef.current) cancelAnimationFrame(manualRef.current);
      const start = progressRef.current;
      const duration = Math.max(
        200,
        Number(filters.matrixManualTransitionDurationMs) || 850
      );
      let started = null;
      const tick = (time) => {
        if (started === null) started = time;
        const ratio = clamp((time - started) / duration, 0, 1);
        commit(start + (target - start) * ease(ratio));
        if (ratio < 1) manualRef.current = requestAnimationFrame(tick);
        else manualRef.current = null;
      };
      manualRef.current = requestAnimationFrame(tick);
    },
    [commit, filters.matrixManualTransitionDurationMs]
  );
  const current = useMemo(() => {
    const index = Math.min(Math.floor(progress), Math.max(0, years.length - 2));
    const fraction = clamp(progress - index, 0, 1);
    return interpolateTree(
      annualData[years[index]] || {},
      annualData[years[index + 1]] || annualData[years[index]] || {},
      fraction
    );
  }, [annualData, progress, years]);
  const yearLabel =
    progress % 1 === 0
      ? years[progress]
      : `${years[Math.floor(progress)]} → ${years[Math.ceil(progress)]}`;
  const width = Math.max(900, size.width);
  const height = Math.max(385, size.height);
  // Le paramètre pilote seulement la largeur du bloc d'activités à l'intérieur
  // du SVG. Les commandes annuelles et le panneau extérieur restent inchangés.
  const requestedWidthPercent = Number.parseFloat(
    String(filters.matrixActivityContainerWidthPercent ?? "100").replace(
      ",",
      "."
    )
  );
  const widthPercent = clamp(
    Number.isFinite(requestedWidthPercent) ? requestedWidthPercent : 100,
    40,
    100
  );
  // Largeur de référence : le total annuel le plus élevé parmi les années
  // configurées. Les activités nulles sur TOUTES les années sont exclues.
  // Ainsi, seule l'année de capacité maximale remplit le conteneur à 100 %.
  const maxAnnualVolume = Math.max(
    0,
    ...years.map((year) =>
      activeNames.reduce(
        (sum, name) => sum + totalOf(annualData[year]?.[name]),
        0
      )
    )
  );

  const containerWidth = (width - 56) * (widthPercent / 100);
  const containerLeft = (width - containerWidth) / 2;
  const gap = 18;

  // Contrairement à l'ancienne version, la largeur totale du groupe varie
  // avec la somme effective des activités en cours d'interpolation.
  const entries = activeNames
    .map((name) => ({ name, value: Math.max(0, totalOf(current[name])) }))
    .filter((entry) => entry.value > 0);
  const currentAnnualVolume = entries.reduce(
    (sum, entry) => sum + entry.value,
    0
  );
  const annualWidthRatio =
    maxAnnualVolume > 0
      ? clamp(currentAnnualVolume / maxAnnualVolume, 0, 1)
      : 0;
  const occupiedWidth = containerWidth * annualWidthRatio;

  // Les inter-colonnes ne doivent jamais consommer plus que la largeur
  // disponible, notamment au début de l'apparition d'une activité à zéro.
  const effectiveGap =
    entries.length > 1
      ? Math.min(gap, occupiedWidth / (entries.length * 4))
      : 0;
  const available = Math.max(
    0,
    occupiedWidth - Math.max(0, entries.length - 1) * effectiveGap
  );
  const minWidths = entries.map((entry) =>
    entry.name === "Auditions" ? 240 : entry.name === "Séjour" ? 112 : 110
  );
  const widths = getWidths(entries, available, minWidths);

  // Le groupe d'activités reste centré dans la zone maximale définie
  // par matrixActivityContainerWidthPercent.
  let runningX = containerLeft + (containerWidth - occupiedWidth) / 2;
  const positions = entries.map((entry, index) => {
    const result = { ...entry, x: runningX, width: widths[index] };
    runningX += widths[index] + effectiveGap;
    return result;
  });
  const top = 44;

  // On utilise un peu mieux l’espace au-dessus des colonnes
  // et on ajoute un vrai espace entre le total et les sous-libellés.
  const activityTitleY = top + 22;
  const activityVolumeY = top + 48;

  const barTop = 122;
  const subtitleY = barTop - 10;

  // On garde à peu près le même alignement bas qu’avant.
  const barHeight = height - 164;
  const showValues = [true, "true", "1"].includes(filters.showDivisionValues);
  const scenarios = years.map((year) => ({
    name: year,
    description: `Répartition des prestations SAM en ${year}`,
  }));
  return (
    <div className="apam-root">
      <div className="apam-header">
        <h3>Activités et partenaires — {yearLabel}</h3>
        <p>Comparaison annuelle des volumes de prestations</p>
      </div>
      <div ref={stageRef} className="apam-stage">
        <svg
          className="apam-svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Répartition des activités SAM en ${yearLabel}`}
        >
          {positions.map(({ name, value, x, width: columnWidth }) => {
            const data = current[name] || {};
            const subdivisions = isLeaf(data)
              ? [{ name, data }]
              : Object.entries(data).map(([label, subData]) => ({
                  name: label,
                  data: subData,
                }));
            const innerPadding = 12;
            const subGap = 14;
            // Trop étroite, une activité naissante ne peut pas accueillir
            // ses labels : on la révèle dès qu'elle devient lisible.
            if (columnWidth < 34) return null;
            const effectivePadding = Math.min(innerPadding, columnWidth * 0.1);
            const effectiveSubGap = Math.min(
              subGap,
              columnWidth / (subdivisions.length * 4)
            );
            const usable = Math.max(
              0,
              columnWidth -
                effectivePadding * 2 -
                (subdivisions.length - 1) * effectiveSubGap
            );
            const subWidth = getWidths(
              subdivisions.map((sub) => ({ value: totalOf(sub.data) })),
              usable,
              subdivisions.map(() => 68)
            );
            let innerX = x + effectivePadding;
            return (
              <g key={name}>
                <rect
                  x={x}
                  y={top}
                  width={columnWidth}
                  height={height - 72}
                  rx="18"
                  className="apam-frame"
                />

                <text
                  x={x + columnWidth / 2}
                  y={activityTitleY}
                  className="apam-title"
                  textAnchor="middle"
                >
                  {name.toUpperCase()}
                </text>

                <text
                  x={x + columnWidth / 2}
                  y={activityVolumeY}
                  className="apam-volume"
                  textAnchor="middle"
                >
                  {format(value)}
                </text>

                {subdivisions.map((sub, index) => {
                  const sx = innerX;
                  const sw = subWidth[index];
                  innerX += sw + effectiveSubGap;

                  return (
                    <g key={sub.name}>
                      {subdivisions.length > 1 && (
                        <text
                          x={sx + sw / 2}
                          y={subtitleY}
                          className="apam-subtitle"
                          textAnchor="middle"
                        >
                          {sub.name.toUpperCase()}
                        </text>
                      )}

                      <DivisionColumn
                        data={sub.data}
                        x={sx}
                        y={barTop}
                        width={sw}
                        height={barHeight}
                        color={COLORS[name] || "#678ca4"}
                        showDivisionValues={showValues}
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <ScenarioSlider
        scenarios={scenarios}
        value={progress}
        min={0}
        max={maxProgress}
        step={0.001}
        activationMode="reached"
        onChange={scrubTo}
        onStepClick={animateTo}
      />
    </div>
  );
}
