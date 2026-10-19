import { useEffect, useMemo, useRef, useState } from "react";
import "../css/waiting-cases-classic-sankey.css";

const blueScale = ["#265b7d", "#3d718f", "#678ca4", "#8aa8ba", "#a8bdcb"];

const COLORS = {
  sourceNode: "#6f6f6f",

  unknownNode: blueScale[0],
  knownNode: blueScale[2],

  blindSpotNode: blueScale[0],
  plannedNode: blueScale[1],
  internalBlockedNode: blueScale[2],
  externalWaitingNode: blueScale[3],
  readyToCloseNode: blueScale[4],

  unknownRibbon: "rgba(168, 189, 203, 0.56)",
  knownRibbon: "rgba(103, 140, 164, 0.28)",
  secondaryRibbon: "rgba(168, 189, 203, 0.42)",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getNumber(value, fallback) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return Math.round(number)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatPercent(value, total) {
  const safeTotal = Number(total);

  if (!Number.isFinite(safeTotal) || safeTotal <= 0) {
    return 0;
  }

  return Math.round((Number(value) / safeTotal) * 100);
}

function useElementSize() {
  const ref = useRef(null);

  const [size, setSize] = useState({
    width: 1180,
    height: 680,
  });

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return undefined;
    }

    function updateSize() {
      const rect = element.getBoundingClientRect();

      setSize({
        width: Math.max(900, rect.width),
        height: Math.max(560, rect.height),
      });
    }

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref, size };
}

function useRevealAnimation(isAnimating) {
  const [progress, setProgress] = useState(1);
  const frameRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = null;
    startRef.current = null;

    if (!isAnimating) {
      setProgress(1);
      return undefined;
    }

    setProgress(0);

    const duration = 9000;
    const pause = 1000;
    const fullDuration = duration + pause;

    function animate(timestamp) {
      if (startRef.current === null) {
        startRef.current = timestamp;
      }

      const elapsed = timestamp - startRef.current;
      const loopTime = elapsed % fullDuration;

      if (loopTime <= duration) {
        const rawProgress = loopTime / duration;
        const easedProgress = -(Math.cos(Math.PI * rawProgress) - 1) / 2;

        setProgress(easedProgress);
      } else {
        setProgress(1);
      }

      frameRef.current = requestAnimationFrame(animate);
    }

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = null;
      startRef.current = null;
    };
  }, [isAnimating]);

  return progress;
}

function buildData(filters = {}) {
  const total = getNumber(filters.waitingTotal, 4700);

  const unknown = getNumber(filters.waitingUnknown, 2585);
  const known = getNumber(filters.waitingKnown, total - unknown);

  const blindSpot = getNumber(filters.blindSpot ?? filters.blackBox, unknown);
  const planned = getNumber(filters.planned, 940);
  const internalBlocked = getNumber(filters.internalBlocked, 235);
  const externalWaiting = getNumber(filters.externalWaiting, 470);
  const readyToClose = getNumber(filters.readyToClose, 470);

  return {
    title:
      filters.waitingTitle ||
      `Répartition des ${formatNumber(total)} dossiers en attente`,

    total,

    columns: {
      waiting: filters.waitingColumnLabel || "EN ATTENTE",
      reason: filters.reasonColumnLabel || "MOTIF",
      situation: filters.situationColumnLabel || "SITUATION",
    },

    nodes: [
      {
        id: "all",
        name: filters.waitingNodeLabel || "Tous les dossiers\nen attente",
        value: total,
        column: "waiting",
        color: COLORS.sourceNode,
      },
      {
        id: "unknown",
        name: filters.unknownReasonLabel || "Raisons non\nidentifiées",
        value: unknown,
        column: "reason",
        color: COLORS.unknownNode,
      },
      {
        id: "known",
        name: filters.knownReasonLabel || "Raisons\nidentifiées",
        value: known,
        column: "reason",
        color: COLORS.knownNode,
      },
      {
        id: "blind-spot",
        name: filters.blindSpotLabel || filters.blackBoxLabel || "Angle mort",
        value: blindSpot,
        column: "situation",
        color: COLORS.blindSpotNode,
      },
      {
        id: "planned",
        name: filters.plannedLabel || "Suite planifiée",
        value: planned,
        column: "situation",
        color: COLORS.plannedNode,
      },
      {
        id: "internal-blocked",
        name: filters.internalBlockedLabel || "Blocage interne",
        value: internalBlocked,
        column: "situation",
        color: COLORS.internalBlockedNode,
      },
      {
        id: "external-waiting",
        name: filters.externalWaitingLabel || "Attente externe",
        value: externalWaiting,
        column: "situation",
        color: COLORS.externalWaitingNode,
      },
      {
        id: "ready-to-close",
        name: filters.readyToCloseLabel || "Prêts pour clôture",
        value: readyToClose,
        column: "situation",
        color: COLORS.readyToCloseNode,
      },
    ],

    links: [
      {
        from: "all",
        to: "unknown",
        value: unknown,
        color: COLORS.unknownRibbon,
      },
      {
        from: "all",
        to: "known",
        value: known,
        color: COLORS.knownRibbon,
      },
      {
        from: "unknown",
        to: "blind-spot",
        value: blindSpot,
        color: COLORS.unknownRibbon,
      },
      {
        from: "known",
        to: "planned",
        value: planned,
        color: COLORS.knownRibbon,
      },
      {
        from: "known",
        to: "internal-blocked",
        value: internalBlocked,
        color: COLORS.secondaryRibbon,
      },
      {
        from: "known",
        to: "external-waiting",
        value: externalWaiting,
        color: COLORS.knownRibbon,
      },
      {
        from: "known",
        to: "ready-to-close",
        value: readyToClose,
        color: COLORS.secondaryRibbon,
      },
    ],
  };
}

function getNodeById(nodes, id) {
  return nodes.find((node) => node.id === id);
}

function enrichNode(node, layout) {
  return {
    ...node,
    ...layout,
    centerY: layout.y + layout.height / 2,
  };
}

function layoutClassicSankey(data, size) {
  const width = size.width;
  const height = size.height;

  const titleSpace = 58;
  const topSpace = 58;
  const bottomSpace = 26;

  const availableHeight = Math.max(
    1,
    height - titleSpace - topSpace - bottomSpace
  );

  const nodeWidth = 40;

  const reasonGap = clamp(availableHeight * 0.075, 34, 54);
  const situationGap = clamp(availableHeight * 0.038, 20, 34);

  const totalSituationGap = situationGap * 3;

  const pxPerUnit = Math.max(
    0.04,
    (availableHeight - Math.max(reasonGap, totalSituationGap)) /
      Math.max(data.total, 1)
  );

  const graphTop = titleSpace + topSpace;
  const totalHeight = data.total * pxPerUnit;

  const graphContentTop = graphTop + (availableHeight - totalHeight) / 2;

  const leftX = clamp(width * 0.035, 22, 52);
  const middleX = width * 0.405;
  const rightX = width * 0.82;

  const nodesById = new Map();

  const allNode = getNodeById(data.nodes, "all");
  const unknownNode = getNodeById(data.nodes, "unknown");
  const knownNode = getNodeById(data.nodes, "known");

  nodesById.set(
    "all",
    enrichNode(allNode, {
      x: leftX,
      y: graphContentTop,
      width: nodeWidth,
      height: totalHeight,
    })
  );

  const reasonTotalHeight =
    unknownNode.value * pxPerUnit + knownNode.value * pxPerUnit + reasonGap;

  let reasonY = graphTop + (availableHeight - reasonTotalHeight) / 2;

  nodesById.set(
    "unknown",
    enrichNode(unknownNode, {
      x: middleX,
      y: reasonY,
      width: nodeWidth,
      height: unknownNode.value * pxPerUnit,
    })
  );

  reasonY += unknownNode.value * pxPerUnit + reasonGap;

  nodesById.set(
    "known",
    enrichNode(knownNode, {
      x: middleX,
      y: reasonY,
      width: nodeWidth,
      height: knownNode.value * pxPerUnit,
    })
  );

  const blindSpotNode = getNodeById(data.nodes, "blind-spot");
  const unknownLayout = nodesById.get("unknown");
  const knownLayout = nodesById.get("known");

  nodesById.set(
    "blind-spot",
    enrichNode(blindSpotNode, {
      x: rightX,
      y: unknownLayout.y,
      width: nodeWidth,
      height: unknownLayout.height,
    })
  );

  const knownSituationIds = [
    "planned",
    "internal-blocked",
    "external-waiting",
    "ready-to-close",
  ];

  const knownSituationNodes = knownSituationIds
    .map((id) => getNodeById(data.nodes, id))
    .filter(Boolean);

  const totalKnownSituationValue = knownSituationNodes.reduce((sum, node) => {
    return sum + node.value;
  }, 0);

  const availableKnownSituationHeight = Math.max(
    1,
    knownLayout.height -
      situationGap * Math.max(0, knownSituationNodes.length - 1)
  );

  let situationY = knownLayout.y;

  knownSituationNodes.forEach((node) => {
    const ratio =
      totalKnownSituationValue > 0
        ? node.value / totalKnownSituationValue
        : 1 / knownSituationNodes.length;

    const nodeHeight = availableKnownSituationHeight * ratio;

    nodesById.set(
      node.id,
      enrichNode(node, {
        x: rightX,
        y: situationY,
        width: nodeWidth,
        height: Math.max(1, nodeHeight),
      })
    );

    situationY += nodeHeight + situationGap;
  });

  const nodes = Array.from(nodesById.values());

  return {
    nodes,
    pxPerUnit,
    columnLabels: [
      {
        text: data.columns.waiting,
        x: nodesById.get("all").x + nodesById.get("all").width / 2,
        y: titleSpace + 32,
        textAnchor: "middle",
      },
      {
        text: data.columns.reason,
        x: nodesById.get("unknown").x + nodesById.get("unknown").width / 2,
        y: titleSpace + 32,
        textAnchor: "middle",
      },
      {
        text: data.columns.situation,
        x:
          nodesById.get("blind-spot").x + nodesById.get("blind-spot").width / 2,
        y: titleSpace + 32,
        textAnchor: "middle",
      },
    ],
  };
}

function computeRibbons({ nodes, links }) {
  const sourceOffsets = {};
  const targetOffsets = {};
  const sourceTotals = {};
  const targetTotals = {};

  nodes.forEach((node) => {
    sourceOffsets[node.id] = 0;
    targetOffsets[node.id] = 0;
    sourceTotals[node.id] = 0;
    targetTotals[node.id] = 0;
  });

  links.forEach((link) => {
    const value = Number(link.value);

    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    sourceTotals[link.from] = (sourceTotals[link.from] || 0) + value;
    targetTotals[link.to] = (targetTotals[link.to] || 0) + value;
  });

  return links
    .map((link) => {
      const source = getNodeById(nodes, link.from);
      const target = getNodeById(nodes, link.to);

      if (!source || !target || link.value <= 0) {
        return null;
      }

      const sourceTotal = sourceTotals[source.id] || source.value || 1;
      const targetTotal = targetTotals[target.id] || target.value || 1;

      const sourceRatio = link.value / sourceTotal;
      const targetRatio = link.value / targetTotal;

      const sourceOffset = sourceOffsets[source.id] || 0;
      const targetOffset = targetOffsets[target.id] || 0;

      const sourceHeight = Math.min(
        source.height - sourceOffset,
        source.height * sourceRatio
      );

      const targetHeight = Math.min(
        target.height - targetOffset,
        target.height * targetRatio
      );

      if (sourceHeight <= 0 || targetHeight <= 0) {
        return null;
      }

      const sy0 = source.y + sourceOffset;
      const sy1 = sy0 + sourceHeight;

      const ty0 = target.y + targetOffset;
      const ty1 = ty0 + targetHeight;

      sourceOffsets[source.id] += sourceHeight;
      targetOffsets[target.id] += targetHeight;

      return {
        ...link,
        source,
        target,
        x0: source.x + source.width,
        x1: target.x,
        sy0,
        sy1,
        ty0,
        ty1,
      };
    })
    .filter(Boolean);
}

function createRibbonPath(ribbon, progress = 1) {
  const safeProgress = clamp(progress, 0, 1);

  const revealedX1 = ribbon.x0 + (ribbon.x1 - ribbon.x0) * safeProgress;
  const revealedTy0 = ribbon.sy0 + (ribbon.ty0 - ribbon.sy0) * safeProgress;
  const revealedTy1 = ribbon.sy1 + (ribbon.ty1 - ribbon.sy1) * safeProgress;

  const curvature = Math.abs(revealedX1 - ribbon.x0) * 0.46;

  return [
    `M ${ribbon.x0} ${ribbon.sy0}`,
    `C ${ribbon.x0 + curvature} ${ribbon.sy0}, ${
      revealedX1 - curvature
    } ${revealedTy0}, ${revealedX1} ${revealedTy0}`,
    `L ${revealedX1} ${revealedTy1}`,
    `C ${revealedX1 - curvature} ${revealedTy1}, ${ribbon.x0 + curvature} ${
      ribbon.sy1
    }, ${ribbon.x0} ${ribbon.sy1}`,
    "Z",
  ].join(" ");
}

function SvgMultilineLabel({
  x,
  y,
  lines,
  className,
  textAnchor = "start",
  lineHeight = 19,
}) {
  return (
    <text
      className={className}
      x={x}
      y={y}
      textAnchor={textAnchor}
      dominantBaseline="middle"
    >
      {lines.map((line, index) => (
        <tspan
          key={`${line}-${index}`}
          x={x}
          dy={index === 0 ? -(lines.length - 1) * (lineHeight / 2) : lineHeight}
        >
          {line}
        </tspan>
      ))}
    </text>
  );
}

function NodeLabel({ node, total, rightLimit }) {
  const percent = formatPercent(node.value, total);
  const valueLine = `${formatNumber(node.value)} · ${percent} %`;
  const nameLines = node.name.split("\n").filter(Boolean);

  let x = node.x + node.width + 22;
  let textAnchor = "start";

  if (node.column === "situation") {
    x = node.x + node.width + 18;
    textAnchor = "start";
  }

  if (node.column === "waiting") {
    x = node.x + node.width + 26;
    textAnchor = "start";
  }

  const maxX = rightLimit - 6;

  if (x > maxX) {
    x = node.x - 16;
    textAnchor = "end";
  }

  return (
    <SvgMultilineLabel
      x={x}
      y={node.centerY}
      className="wccs-node-label"
      textAnchor={textAnchor}
      lineHeight={18}
      lines={[...nameLines, valueLine]}
    />
  );
}

export default function WaitingCasesClassicSankeyRenderer({
  filters,
  isAnimating,
}) {
  const { ref, size } = useElementSize();
  const revealProgress = useRevealAnimation(isAnimating);

  const data = useMemo(() => {
    return buildData(filters);
  }, [filters]);

  const layout = useMemo(() => {
    const positioned = layoutClassicSankey(data, size);

    return {
      ...positioned,
      ribbons: computeRibbons({
        nodes: positioned.nodes,
        links: data.links,
      }),
    };
  }, [data, size]);

  const leftProgress = Math.min(1, revealProgress * 2);
  const rightProgress = Math.max(0, Math.min(1, revealProgress * 2 - 1));

  return (
    <div className="wccs-renderer" ref={ref}>
      <h2 className="wccs-title">{data.title}</h2>

      <svg
        className="wccs-svg"
        viewBox={`0 0 ${size.width} ${size.height}`}
        role="img"
        aria-label={data.title}
      >
        <g className="wccs-column-labels">
          {layout.columnLabels.map((label) => (
            <text
              key={label.text}
              className="wccs-column-label"
              x={label.x}
              y={label.y}
              textAnchor={label.textAnchor}
            >
              {label.text}
            </text>
          ))}
        </g>

        <g className="wccs-ribbons-layer">
          {layout.ribbons.map((ribbon) => {
            const progress =
              ribbon.source.id === "all" ? leftProgress : rightProgress;

            if (progress <= 0) {
              return null;
            }

            return (
              <path
                key={`${ribbon.from}-${ribbon.to}`}
                className="wccs-ribbon"
                d={createRibbonPath(ribbon, progress)}
                fill={ribbon.color}
              >
                <title>
                  {`${ribbon.source.name.replace(
                    /\n/g,
                    " "
                  )} → ${ribbon.target.name.replace(
                    /\n/g,
                    " "
                  )}\n${formatNumber(ribbon.value)} dossiers`}
                </title>
              </path>
            );
          })}
        </g>

        <g className="wccs-nodes-layer">
          {layout.nodes.map((node) => (
            <rect
              key={node.id}
              className={`wccs-node wccs-node-${node.id}`}
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              fill={node.color}
              rx="0"
              ry="0"
            >
              <title>
                {`${node.name.replace(/\n/g, " ")}\n${formatNumber(
                  node.value
                )} dossiers · ${formatPercent(node.value, data.total)} %`}
              </title>
            </rect>
          ))}
        </g>

        <g className="wccs-labels-layer">
          {layout.nodes.map((node) => (
            <NodeLabel
              key={`label-${node.id}`}
              node={node}
              total={data.total}
              rightLimit={size.width}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
