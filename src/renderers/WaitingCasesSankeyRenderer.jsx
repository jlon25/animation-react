import { useEffect, useMemo, useRef, useState } from "react";
import "../css/waiting-cases-sankey.css";

const blueScale = ["#265b7d", "#3d718f", "#678ca4", "#8aa8ba", "#a8bdcb"];

const COLORS = {
  total: blueScale[0],

  unknown: blueScale[0],
  known: blueScale[2],

  blackBox: blueScale[0],
  planned: blueScale[1],
  internalBlocked: blueScale[2],
  externalWaiting: blueScale[3],
  readyToClose: blueScale[4],

  ribbon: "rgba(168, 189, 203, 0.55)",
  ribbonStrong: "rgba(103, 140, 164, 0.38)",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
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
    width: 1200,
    height: 460,
  });

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return undefined;
    }

    function updateSize() {
      const rect = element.getBoundingClientRect();

      setSize({
        width: Math.max(920, rect.width),
        height: Math.max(420, rect.height),
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

    const duration = 4000;
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

function buildWaitingCasesData(filters = {}) {
  const total = getNumber(filters.waitingTotal, 4700);

  const unknown = getNumber(filters.waitingUnknown, 2585);
  const known = getNumber(filters.waitingKnown, total - unknown);

  const blackBox = getNumber(filters.blackBox, unknown);
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
      waiting: filters.waitingColumnLabel || "En attente",
      reason: filters.reasonColumnLabel || "Motif",
      situation: filters.situationColumnLabel || "Situation",
    },

    nodes: [
      {
        id: "all",
        name: "Dossiers\nen attente",
        value: total,
        column: "waiting",
        color: COLORS.total,
      },
      {
        id: "unknown",
        name: "Raisons non\nidentifiées",
        value: unknown,
        column: "reason",
        color: COLORS.unknown,
      },
      {
        id: "known",
        name: "Raisons\nidentifiées",
        value: known,
        column: "reason",
        color: COLORS.known,
      },
      {
        id: "black-box",
        name: "Angle mort",
        value: blackBox,
        column: "situation",
        color: COLORS.blackBox,
      },
      {
        id: "planned",
        name: "Suite planifiée",
        value: planned,
        column: "situation",
        color: COLORS.planned,
      },
      {
        id: "internal-blocked",
        name: "Blocage interne",
        value: internalBlocked,
        column: "situation",
        color: COLORS.internalBlocked,
      },
      {
        id: "external-waiting",
        name: "Attente externe",
        value: externalWaiting,
        column: "situation",
        color: COLORS.externalWaiting,
      },
      {
        id: "ready-to-close",
        name: "Prêts pour clôture",
        value: readyToClose,
        column: "situation",
        color: COLORS.readyToClose,
      },
    ],

    links: [
      {
        from: "all",
        to: "unknown",
        value: unknown,
        color: COLORS.ribbon,
      },
      {
        from: "all",
        to: "known",
        value: known,
        color: COLORS.ribbonStrong,
      },
      {
        from: "unknown",
        to: "black-box",
        value: blackBox,
        color: COLORS.ribbon,
      },
      {
        from: "known",
        to: "planned",
        value: planned,
        color: COLORS.ribbonStrong,
      },
      {
        from: "known",
        to: "internal-blocked",
        value: internalBlocked,
        color: COLORS.ribbon,
      },
      {
        from: "known",
        to: "external-waiting",
        value: externalWaiting,
        color: COLORS.ribbonStrong,
      },
      {
        from: "known",
        to: "ready-to-close",
        value: readyToClose,
        color: COLORS.ribbon,
      },
    ],
  };
}

function getColumnTotal(nodes) {
  return nodes.reduce((sum, node) => sum + node.value, 0);
}

function resolveNodeHeightsWithMinimum({
  nodes,
  pxPerUnit,
  availableHeight,
  gap,
  minNodeHeight = 0,
}) {
  const count = nodes.length;

  if (count === 0) {
    return [];
  }

  const totalGap = Math.max(0, count - 1) * gap;
  const availableNodeHeight = Math.max(1, availableHeight - totalGap);

  const safeMinNodeHeight = Math.min(
    minNodeHeight,
    availableNodeHeight / count
  );

  const rawHeights = nodes.map((node) => {
    return Math.max(1, node.value * pxPerUnit);
  });

  if (safeMinNodeHeight <= 0) {
    return rawHeights;
  }

  const lockedHeights = new Map();
  const remainingIndexes = new Set(
    Array.from({ length: count }, (_, index) => index)
  );

  let remainingHeight = availableNodeHeight;

  while (remainingIndexes.size > 0) {
    const remainingRawTotal = Array.from(remainingIndexes).reduce(
      (sum, index) => sum + rawHeights[index],
      0
    );

    if (remainingRawTotal <= 0) {
      const equalHeight = remainingHeight / remainingIndexes.size;

      remainingIndexes.forEach((index) => {
        lockedHeights.set(index, Math.max(equalHeight, safeMinNodeHeight));
      });

      remainingIndexes.clear();
      break;
    }

    const indexesToLock = [];

    remainingIndexes.forEach((index) => {
      const proportionalHeight =
        remainingHeight * (rawHeights[index] / remainingRawTotal);

      if (proportionalHeight < safeMinNodeHeight) {
        indexesToLock.push(index);
      }
    });

    if (indexesToLock.length === 0) {
      break;
    }

    indexesToLock.forEach((index) => {
      lockedHeights.set(index, safeMinNodeHeight);
      remainingIndexes.delete(index);
      remainingHeight -= safeMinNodeHeight;
    });
  }

  const remainingRawTotal = Array.from(remainingIndexes).reduce(
    (sum, index) => sum + rawHeights[index],
    0
  );

  return Array.from({ length: count }, (_, index) => {
    if (lockedHeights.has(index)) {
      return lockedHeights.get(index);
    }

    if (remainingRawTotal <= 0) {
      return remainingHeight / Math.max(1, remainingIndexes.size);
    }

    return remainingHeight * (rawHeights[index] / remainingRawTotal);
  });
}

function layoutColumn({
  nodes,
  x,
  width,
  top,
  availableHeight,
  pxPerUnit,
  gap,
  minNodeHeight = 0,
}) {
  const nodeHeights = resolveNodeHeightsWithMinimum({
    nodes,
    pxPerUnit,
    availableHeight,
    gap,
    minNodeHeight,
  });

  const totalNodeHeight = nodeHeights.reduce((sum, height) => {
    return sum + height;
  }, 0);

  const totalGap = Math.max(nodes.length - 1, 0) * gap;
  const columnHeight = totalNodeHeight + totalGap;

  let y = top + (availableHeight - columnHeight) / 2;

  return nodes.map((node, index) => {
    const height = Math.max(1, nodeHeights[index] || 1);

    const positionedNode = {
      ...node,
      x,
      y,
      width,
      height,
      centerY: y + height / 2,
    };

    y += height + gap;

    return positionedNode;
  });
}

function buildColumnEnvelope(nodes, totalValue, paddingX = 10, paddingY = 10) {
  if (nodes.length === 0) {
    return null;
  }

  const firstNode = nodes[0];

  const top = Math.min(...nodes.map((node) => node.y));
  const bottom = Math.max(...nodes.map((node) => node.y + node.height));

  const x = firstNode.x - paddingX;
  const y = top - paddingY;
  const width = firstNode.width + paddingX * 2;
  const height = bottom - top + paddingY * 2;

  return {
    x,
    y,
    width,
    height,
    centerX: x + width / 2,
    centerY: y + height / 2,
    value: totalValue,
  };
}

function layoutWaitingCasesSankey(data, size) {
  const width = size.width;
  const height = size.height;

  /*
   * Avant, une part importante de la hauteur était réservée
   * au titre, au haut du graphique et au bas.
   * Ces valeurs plus compactes donnent plus de place aux colonnes.
   */
  const titleHeight = 20;
  const top = 20;
  const bottom = 14;

  const availableHeight = Math.max(1, height - titleHeight - top - bottom);

  const columnWidth = 200;
  const envelopePaddingX = 10;
  const envelopePaddingY = 10;

  const nodeWidth = columnWidth;

  /*
   * Gaps adaptatifs :
   * - assez grands pour garder une lecture claire
   * - mais plus faibles lorsque la hauteur est limitée
   */
  const reasonGap = clamp(availableHeight * 0.045, 26, 42);
  const situationGap = clamp(availableHeight * 0.025, 14, 24);

  const waitingNodesRaw = data.nodes.filter(
    (node) => node.column === "waiting"
  );
  const reasonNodesRaw = data.nodes.filter((node) => node.column === "reason");
  const situationNodesRaw = data.nodes.filter(
    (node) => node.column === "situation"
  );

  const waitingTotal = getColumnTotal(waitingNodesRaw);
  const reasonTotal = getColumnTotal(reasonNodesRaw);
  const situationTotal = getColumnTotal(situationNodesRaw);

  const maxGap = Math.max(
    Math.max(waitingNodesRaw.length - 1, 0) * 0,
    Math.max(reasonNodesRaw.length - 1, 0) * reasonGap,
    Math.max(situationNodesRaw.length - 1, 0) * situationGap
  );

  const maxColumnTotal = Math.max(waitingTotal, reasonTotal, situationTotal, 1);

  /*
   * Plus availableHeight est grand et plus maxGap est faible,
   * plus pxPerUnit augmente.
   * C'est ce qui agrandit réellement les colonnes et les ribbons.
   */
  const pxPerUnit = Math.max(0.04, (availableHeight - maxGap) / maxColumnTotal);

  const sideTotalReservedWidth = 46;
  const leftExtraSpace = envelopePaddingX + sideTotalReservedWidth;
  const rightExtraSpace = envelopePaddingX;

  const horizontalMargin = 58;
  const availableWidth = width - horizontalMargin * 2;

  const rawColumnGap =
    (availableWidth - leftExtraSpace - rightExtraSpace - nodeWidth * 3) / 2;

  const columnGap = Math.max(170, rawColumnGap);

  const graphWidth =
    leftExtraSpace +
    nodeWidth +
    columnGap +
    nodeWidth +
    columnGap +
    nodeWidth +
    rightExtraSpace;

  const graphStartX = (width - graphWidth) / 2;

  const waitingX = graphStartX + leftExtraSpace;
  const reasonX = waitingX + nodeWidth + columnGap;
  const situationX = reasonX + nodeWidth + columnGap;

  const columnTop = titleHeight + top;

  const waitingNodes = layoutColumn({
    nodes: waitingNodesRaw,
    x: waitingX,
    width: nodeWidth,
    top: columnTop,
    availableHeight,
    pxPerUnit,
    gap: 0,
  });

  const reasonNodes = layoutColumn({
    nodes: reasonNodesRaw,
    x: reasonX,
    width: nodeWidth,
    top: columnTop,
    availableHeight,
    pxPerUnit,
    gap: reasonGap,
  });

  const unknownReasonNode = reasonNodes.find((node) => node.id === "unknown");
  const knownReasonNode = reasonNodes.find((node) => node.id === "known");

  const blackBoxRawNode = situationNodesRaw.find(
    (node) => node.id === "black-box"
  );

  const knownSituationNodesRaw = situationNodesRaw.filter((node) => {
    return node.id !== "black-box";
  });

  const blackBoxNode =
    blackBoxRawNode && unknownReasonNode
      ? {
          ...blackBoxRawNode,
          x: situationX,
          y: unknownReasonNode.y,
          width: nodeWidth,
          height: unknownReasonNode.height,
          centerY: unknownReasonNode.centerY,
        }
      : null;

  /*
   * Hauteur minimale pour les petites situations.
   * C’est ce qui permet à 5 % ou 10 % de rester lisible.
   */
  const situationMinNodeHeight = clamp(availableHeight * 0.065, 30, 46);

  const knownSituationNodes = knownReasonNode
    ? layoutColumn({
        nodes: knownSituationNodesRaw,
        x: situationX,
        width: nodeWidth,
        top: knownReasonNode.y,
        availableHeight: knownReasonNode.height,
        pxPerUnit,
        gap: situationGap,
        minNodeHeight: situationMinNodeHeight,
      })
    : [];

  const situationNodes = [blackBoxNode, ...knownSituationNodes].filter(Boolean);

  const waitingEnvelope = buildColumnEnvelope(
    waitingNodes,
    waitingTotal,
    envelopePaddingX,
    envelopePaddingY
  );

  const reasonEnvelope = buildColumnEnvelope(
    reasonNodes,
    reasonTotal,
    envelopePaddingX,
    envelopePaddingY
  );

  const situationEnvelope = buildColumnEnvelope(
    situationNodes,
    situationTotal,
    envelopePaddingX,
    envelopePaddingY
  );

  const columnLabelOffset = 12;

  return {
    waitingNodes,
    reasonNodes,
    situationNodes,

    waitingEnvelope,
    reasonEnvelope,
    situationEnvelope,

    allNodes: [...waitingNodes, ...reasonNodes, ...situationNodes],

    pxPerUnit,

    columnLabels: [
      {
        text: data.columns.waiting,
        x: waitingX + nodeWidth / 2,
        y: waitingEnvelope ? waitingEnvelope.y - columnLabelOffset : 56,
      },
      {
        text: data.columns.reason,
        x: reasonX + nodeWidth / 2,
        y: reasonEnvelope ? reasonEnvelope.y - columnLabelOffset : 56,
      },
      {
        text: data.columns.situation,
        x: situationX + nodeWidth / 2,
        y: situationEnvelope ? situationEnvelope.y - columnLabelOffset : 56,
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

  /*
   * On calcule le total des flux sortants et entrants.
   * Cela permet de répartir 100 % de la hauteur réelle de chaque bloc,
   * même lorsque les blocs cibles ont été agrandis ou séparés par des gaps.
   */
  links.forEach((link) => {
    if (!Number.isFinite(Number(link.value)) || Number(link.value) <= 0) {
      return;
    }

    sourceTotals[link.from] =
      (sourceTotals[link.from] || 0) + Number(link.value);
    targetTotals[link.to] = (targetTotals[link.to] || 0) + Number(link.value);
  });

  return links
    .map((link) => {
      const source = nodes.find((node) => node.id === link.from);
      const target = nodes.find((node) => node.id === link.to);

      if (!source || !target || link.value <= 0) {
        return null;
      }

      const sourceTotal = sourceTotals[source.id] || source.value || 1;
      const targetTotal = targetTotals[target.id] || target.value || 1;

      const sourceRatio = link.value / sourceTotal;
      const targetRatio = link.value / targetTotal;

      const currentSourceOffset = sourceOffsets[source.id] || 0;
      const currentTargetOffset = targetOffsets[target.id] || 0;

      const sourceRemaining = Math.max(0, source.height - currentSourceOffset);

      const targetRemaining = Math.max(0, target.height - currentTargetOffset);

      /*
       * Point important :
       * - côté source : le ribbon prend sa part dans 100 % du bloc source
       * - côté cible : le ribbon prend sa part dans 100 % du bloc cible
       *
       * Les deux hauteurs peuvent donc être différentes.
       */
      const sourceHeight = Math.min(
        sourceRemaining,
        source.height * sourceRatio
      );

      const targetHeight = Math.min(
        targetRemaining,
        target.height * targetRatio
      );

      if (sourceHeight <= 0 || targetHeight <= 0) {
        return null;
      }

      const sy0 = source.y + currentSourceOffset;
      const sy1 = sy0 + sourceHeight;

      const ty0 = target.y + currentTargetOffset;
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

function createRoundedRectPath({
  x,
  y,
  width,
  height,
  radius = 10,
  topLeft = true,
  topRight = true,
  bottomRight = true,
  bottomLeft = true,
}) {
  const r = Math.min(radius, width / 2, height / 2);

  return [
    `M ${x + (topLeft ? r : 0)} ${y}`,

    `H ${x + width - (topRight ? r : 0)}`,

    topRight
      ? `Q ${x + width} ${y} ${x + width} ${y + r}`
      : `L ${x + width} ${y}`,

    `V ${y + height - (bottomRight ? r : 0)}`,

    bottomRight
      ? `Q ${x + width} ${y + height} ${x + width - r} ${y + height}`
      : `L ${x + width} ${y + height}`,

    `H ${x + (bottomLeft ? r : 0)}`,

    bottomLeft
      ? `Q ${x} ${y + height} ${x} ${y + height - r}`
      : `L ${x} ${y + height}`,

    `V ${y + (topLeft ? r : 0)}`,

    topLeft ? `Q ${x} ${y} ${x + r} ${y}` : `L ${x} ${y}`,

    "Z",
  ].join(" ");
}

function getCompactNodeName(name) {
  const label = String(name || "")
    .replace(/\n/g, " ")
    .trim();

  const compactLabels = {
    "Tous les dossiers en attente": "Dossiers en attente",
    "Raisons non identifiées": "Non identifiées",
    "Raisons identifiées": "Identifiées",
    "Suite planifiée": "Suite planifiée",
    "Blocage interne": "Blocage interne",
    "Attente externe": "Attente externe",
    "Prêts pour clôture": "Prêts clôture",
    "Angle mort": "Angle mort",
    "Black box": "Black box",
  };

  return compactLabels[label] || label;
}

function NodeInsideLabel({ node, total }) {
  if (node.height < 12) {
    return null;
  }

  const centerX = node.x + node.width / 2;
  const percent = formatPercent(node.value, total);
  const valueLabel = formatNumber(node.value);
  const nameLines = node.name.split("\n").filter(Boolean);
  const compactName = getCompactNodeName(node.name);

  /*
   * Grand bloc : affichage complet sur plusieurs lignes.
   */
  if (node.height >= 68) {
    return (
      <text
        className="wcs-node-inside-label"
        x={centerX}
        y={node.centerY}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {nameLines.map((line, index) => (
          <tspan
            key={`${node.id}-name-${index}`}
            x={centerX}
            dy={index === 0 ? -12 - (nameLines.length - 1) * 7 : 15}
          >
            {line}
          </tspan>
        ))}

        <tspan className="wcs-node-inside-value" x={centerX} dy="18">
          {valueLabel}
        </tspan>

        <tspan className="wcs-node-inside-percent" x={centerX} dy="16">
          {percent} %
        </tspan>
      </text>
    );
  }

  /*
   * Bloc moyen : nom + valeur/% sur deux lignes.
   */
  if (node.height >= 38) {
    return (
      <text
        className="wcs-node-inside-label wcs-node-inside-label-compact"
        x={centerX}
        y={node.centerY}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        <title>
          {`${node.name.replace(
            /\n/g,
            " "
          )}\n${valueLabel} dossiers · ${percent} %`}
        </title>

        <tspan x={centerX} dy="-6">
          {compactName}
        </tspan>

        <tspan className="wcs-node-inside-value" x={centerX} dy="15">
          {valueLabel} · {percent} %
        </tspan>
      </text>
    );
  }

  /*
   * Petit bloc : tout sur une seule ligne.
   * C'est le cas important pour les blocs à 5 % ou 10 %.
   */
  if (node.height >= 20) {
    return (
      <text
        className="wcs-node-inside-label wcs-node-inside-label-small"
        x={centerX}
        y={node.centerY}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        <title>
          {`${node.name.replace(
            /\n/g,
            " "
          )}\n${valueLabel} dossiers · ${percent} %`}
        </title>
        {compactName} · {valueLabel} · {percent} %
      </text>
    );
  }

  /*
   * Très petit bloc : valeur seule, mais détail complet au survol.
   */
  return (
    <text
      className="wcs-node-inside-label wcs-node-inside-label-tiny"
      x={centerX}
      y={node.centerY}
      textAnchor="middle"
      dominantBaseline="middle"
    >
      <title>
        {`${node.name.replace(
          /\n/g,
          " "
        )}\n${valueLabel} dossiers · ${percent} %`}
      </title>

      {valueLabel}
    </text>
  );
}

function ColumnSideTotal({
  envelope,
  className = "",
  preLabel = "Total",
  postLabel = "dossiers",
  offset = 20,
}) {
  if (!envelope) {
    return null;
  }

  const x = envelope.x - offset;
  const y = envelope.centerY;

  return (
    <text
      className={`wcs-column-side-total ${className}`}
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      transform={`rotate(-90 ${x} ${y})`}
    >
      {preLabel} · {formatNumber(envelope.value)} {postLabel}
    </text>
  );
}

export default function WaitingCasesSankeyRenderer({ filters, isAnimating }) {
  const { ref, size } = useElementSize();
  const progress = useRevealAnimation(isAnimating);

  const data = useMemo(() => {
    return buildWaitingCasesData(filters);
  }, [filters]);

  const layout = useMemo(() => {
    const nodes = layoutWaitingCasesSankey(data, size);

    const ribbons = computeRibbons({
      nodes: nodes.allNodes,
      links: data.links,
    });

    return {
      ...nodes,
      ribbons,
    };
  }, [data, size]);

  const leftProgress = Math.min(1, progress * 2);
  const rightProgress = Math.max(0, Math.min(1, progress * 2 - 1));

  return (
    <div className="wcs-renderer" ref={ref}>
      <h2 className="wcs-title">{data.title}</h2>

      <svg
        className="wcs-svg"
        viewBox={`0 0 ${size.width} ${size.height}`}
        role="img"
        aria-label={data.title}
      >
        <g className="wcs-column-labels">
          {layout.columnLabels.map((label) => (
            <text
              key={label.text}
              className="wcs-column-label"
              x={label.x}
              y={label.y}
              textAnchor="middle"
            >
              {label.text}
            </text>
          ))}
        </g>

        <g className="wcs-ribbons-layer">
          {layout.ribbons.map((ribbon) => {
            const ribbonProgress =
              ribbon.source.id === "all" ? leftProgress : rightProgress;

            if (ribbonProgress <= 0) {
              return null;
            }

            return (
              <path
                key={`${ribbon.from}-${ribbon.to}`}
                className="wcs-ribbon"
                d={createRibbonPath(ribbon, ribbonProgress)}
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

        <g className="wcs-envelopes-layer">
          {layout.waitingEnvelope && (
            <rect
              className="wcs-column-envelope"
              x={layout.waitingEnvelope.x}
              y={layout.waitingEnvelope.y}
              width={layout.waitingEnvelope.width}
              height={layout.waitingEnvelope.height}
              rx="14"
              ry="14"
              fill="rgba(255, 255, 255, 0.04)"
              stroke="rgba(38, 91, 125, 0.22)"
              strokeWidth="1.2"
            />
          )}

          {layout.reasonEnvelope && (
            <rect
              className="wcs-column-envelope"
              x={layout.reasonEnvelope.x}
              y={layout.reasonEnvelope.y}
              width={layout.reasonEnvelope.width}
              height={layout.reasonEnvelope.height}
              rx="14"
              ry="14"
              fill="rgba(255, 255, 255, 0.04)"
              stroke="rgba(38, 91, 125, 0.22)"
              strokeWidth="1.2"
            />
          )}

          {layout.situationEnvelope && (
            <rect
              className="wcs-column-envelope"
              x={layout.situationEnvelope.x}
              y={layout.situationEnvelope.y}
              width={layout.situationEnvelope.width}
              height={layout.situationEnvelope.height}
              rx="14"
              ry="14"
              fill="rgba(255, 255, 255, 0.04)"
              stroke="rgba(38, 91, 125, 0.22)"
              strokeWidth="1.2"
            />
          )}
        </g>

        <g className="wcs-nodes-layer">
          {layout.allNodes.map((node) => (
            <g key={node.id}>
              <path
                className={`wcs-node wcs-node-${normalizeId(node.id)}`}
                d={createRoundedRectPath({
                  x: node.x,
                  y: node.y,
                  width: node.width,
                  height: node.height,
                  radius: 12,
                })}
                fill={node.color}
              >
                <title>
                  {`${node.name.replace(/\n/g, " ")}\n${formatNumber(
                    node.value
                  )} dossiers · ${formatPercent(node.value, data.total)} %`}
                </title>
              </path>

              <NodeInsideLabel node={node} total={data.total} />
            </g>
          ))}
        </g>

        <g className="wcs-side-totals-layer">
          <ColumnSideTotal
            envelope={layout.waitingEnvelope}
            className="wcs-waiting-total"
          />

          <ColumnSideTotal
            envelope={layout.reasonEnvelope}
            className="wcs-reason-total"
          />

          <ColumnSideTotal
            envelope={layout.situationEnvelope}
            className="wcs-situation-total"
          />
        </g>
      </svg>
    </div>
  );
}
