import { useEffect, useId, useMemo, useRef, useState } from "react";
import "../css/backlog-execution-sector-sankey.css";

const blueScale = ["#265b7d", "#3d718f", "#678ca4", "#656565", "#a8bdcb"];

const activityColors = blueScale;
const sectorColors = blueScale;

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function parseList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseQuantities(value, expectedLength) {
  const parsed = String(value || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .map((item) => (Number.isFinite(item) && item > 0 ? item : 0));

  while (parsed.length < expectedLength) {
    parsed.push(0);
  }

  return parsed.slice(0, expectedLength);
}

function parseFlows(value) {
  return String(value || "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [relation, rawQuantity] = item.split(":");
      const [from, to] = String(relation || "").split(">");

      return {
        from: normalizeId(from),
        to: normalizeId(to),
        quantity: Number(rawQuantity),
      };
    })
    .filter(
      (flow) =>
        flow.from &&
        flow.to &&
        Number.isFinite(flow.quantity) &&
        flow.quantity > 0
    );
}

function buildActivityNodes(names, quantities, colors, columnName) {
  return names
    .map((name, index) => {
      const quantity = quantities[index] || 0;

      return {
        id: normalizeId(name),
        name,
        columnName,
        quantity,
        color: colors[index % colors.length],
      };
    })
    .filter((node) => node.quantity > 0);
}

function clampExecutionQuantities(pendingQuantities, executionQuantities) {
  return executionQuantities.map((executionQuantity, index) => {
    const pendingQuantity = pendingQuantities[index] || 0;
    return Math.min(executionQuantity, pendingQuantity);
  });
}

function buildPendingExecutionFlows(pendingNodes, executionNodes) {
  return executionNodes
    .map((executionNode) => {
      const pendingNode = pendingNodes.find(
        (node) => node.id === executionNode.id
      );

      if (!pendingNode) {
        return null;
      }

      const quantity = Math.min(executionNode.quantity, pendingNode.quantity);

      if (quantity <= 0) {
        return null;
      }

      return {
        from: pendingNode.id,
        to: executionNode.id,
        quantity,
      };
    })
    .filter(Boolean);
}

function sanitizeExecutionSectorFlows(rawFlows, executionNodes, sectorNames) {
  const validExecutionIds = new Set(executionNodes.map((node) => node.id));
  const validSectorIds = new Set(sectorNames.map((name) => normalizeId(name)));

  const remainingByActivity = {};

  executionNodes.forEach((node) => {
    remainingByActivity[node.id] = node.quantity;
  });

  const sanitizedFlows = [];

  rawFlows.forEach((flow) => {
    if (!validExecutionIds.has(flow.from) || !validSectorIds.has(flow.to)) {
      return;
    }

    const available = remainingByActivity[flow.from] || 0;
    const quantity = Math.min(flow.quantity, available);

    if (quantity <= 0) {
      return;
    }

    sanitizedFlows.push({
      ...flow,
      quantity,
    });

    remainingByActivity[flow.from] -= quantity;
  });

  return sanitizedFlows;
}

function buildSankeyData(filters) {
  const pendingColumnName = filters.pendingColumnName?.trim() || "Production";
  const executionColumnName =
    filters.executionColumnName?.trim() || "Effectives";

  const scaleMaxQuantity = Number(filters.scaleMaxQuantity) || null;
  const columnScaleMax = filters.columnScaleMax || null;

  const activityNames = parseList(filters.activityNames);
  const sectorNames = parseList(filters.sectorNames);

  const pendingQuantities = parseQuantities(
    filters.pendingActivityQuantities,
    activityNames.length
  );

  const rawExecutionQuantities = parseQuantities(
    filters.executionActivityQuantities,
    activityNames.length
  );

  const isScenarioTransition = filters.isScenarioTransition === true;

  const executionQuantities = isScenarioTransition
    ? rawExecutionQuantities
    : clampExecutionQuantities(pendingQuantities, rawExecutionQuantities);

  const pendingNodes = buildActivityNodes(
    activityNames,
    pendingQuantities,
    activityColors,
    pendingColumnName
  );

  const executionNodes = buildActivityNodes(
    activityNames,
    executionQuantities,
    activityColors,
    executionColumnName
  );

  const pendingExecutionFlows = buildPendingExecutionFlows(
    pendingNodes,
    executionNodes
  );

  const rawExecutionSectorFlows = parseFlows(filters.executionSectorFlows);

  const executionSectorFlows = isScenarioTransition
    ? rawExecutionSectorFlows.filter((flow) => {
        const validExecutionIds = new Set(
          executionNodes.map((node) => node.id)
        );

        const validSectorIds = new Set(
          sectorNames.map((name) => normalizeId(name))
        );

        return validExecutionIds.has(flow.from) && validSectorIds.has(flow.to);
      })
    : sanitizeExecutionSectorFlows(
        rawExecutionSectorFlows,
        executionNodes,
        sectorNames
      );

  const sectorNodes = sectorNames
    .map((name, index) => {
      const id = normalizeId(name);

      const quantity = executionSectorFlows
        .filter((flow) => flow.to === id)
        .reduce((sum, flow) => sum + flow.quantity, 0);

      return {
        id,
        name,
        quantity,
        color: sectorColors[index % sectorColors.length],
      };
    })
    .filter((sector) => sector.quantity > 0);

  return {
    scaleMaxQuantity,
    columnScaleMax,
    pendingColumnName,
    executionColumnName,
    pendingNodes,
    executionNodes,
    sectorNodes,
    pendingExecutionFlows,
    executionSectorFlows,
  };
}

function getColumnTotal(nodes) {
  return nodes.reduce((sum, node) => sum + node.quantity, 0);
}

function getScenarioScaleMax(filters) {
  const fixedScaleMaxQuantity = Number(filters.scaleMaxQuantity);

  if (Number.isFinite(fixedScaleMaxQuantity) && fixedScaleMaxQuantity > 0) {
    return fixedScaleMaxQuantity;
  }

  const data = buildSankeyData({
    ...filters,
    columnScaleMax: null,
  });

  const pendingTotal = getColumnTotal(data.pendingNodes);
  const executionTotal = getColumnTotal(data.executionNodes);
  const sectorTotal = getColumnTotal(data.sectorNodes);

  return Math.max(pendingTotal, executionTotal, sectorTotal, 1);
}

function interpolateScale(previousValue, nextValue, progress) {
  return previousValue + (nextValue - previousValue) * progress;
}

function layoutColumn({
  nodes,
  x,
  width,
  top,
  availableHeight,
  pxPerUnit,
  gap,
  minNodeHeight = 22,
}) {
  const totalGap = Math.max(nodes.length - 1, 0) * gap;
  const usableHeight = Math.max(0, availableHeight - totalGap);

  const rawNodes = nodes.map((node) => {
    const rawHeight = node.quantity * pxPerUnit;

    return {
      ...node,
      rawHeight,
    };
  });

  const rawTotalHeight = rawNodes.reduce((sum, node) => {
    return sum + node.rawHeight;
  }, 0);

  const availableExtraHeight = Math.max(0, usableHeight - rawTotalHeight);

  const requiredExtraHeight = rawNodes.reduce((sum, node) => {
    return sum + Math.max(0, minNodeHeight - node.rawHeight);
  }, 0);

  const extraRatio =
    requiredExtraHeight > 0
      ? Math.min(1, availableExtraHeight / requiredExtraHeight)
      : 0;

  const nodesWithDisplayHeight = rawNodes.map((node) => {
    const extraHeight =
      Math.max(0, minNodeHeight - node.rawHeight) * extraRatio;

    const height = node.rawHeight + extraHeight;

    const flowHeight = Math.min(node.rawHeight, height);
    const flowStartOffset = (height - flowHeight) / 2;

    return {
      ...node,
      height,
      flowHeight,
      flowStartOffset,
    };
  });

  const columnHeight =
    nodesWithDisplayHeight.reduce((sum, node) => {
      return sum + node.height;
    }, 0) + totalGap;

  let y = top + (availableHeight - columnHeight) / 2;

  return nodesWithDisplayHeight.map((node) => {
    const positionedNode = {
      ...node,
      x,
      y,
      width,
      centerY: y + node.height / 2,
      flowStartY: y + node.flowStartOffset,
    };

    y += node.height + gap;

    return positionedNode;
  });
}

function buildColumnEnvelope(
  nodes,
  totalQuantity,
  paddingX = 10,
  paddingY = 10
) {
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
    quantity: totalQuantity,
  };
}

function layoutNodes(data, size) {
  const width = size.width;
  const height = size.height;

  const top = 40;
  const bottom = 15;
  const availableHeight = height - top - bottom;

  const columnWidth = 130;
  const envelopePaddingX = 10;
  const envelopePaddingY = 10;

  const pendingNodeWidth = columnWidth;
  const executionNodeWidth = columnWidth;
  const sectorNodeWidth = columnWidth;

  const pendingGap = 0;
  const executionGap = 5;
  const sectorGap = 10;

  const pendingTotal = getColumnTotal(data.pendingNodes);
  const executionTotal = getColumnTotal(data.executionNodes);
  const sectorTotal = getColumnTotal(data.sectorNodes);

  const calculatedMaxColumnTotal = Math.max(
    pendingTotal,
    executionTotal,
    sectorTotal,
    1
  );

  const maxGap = Math.max(
    Math.max(data.pendingNodes.length - 1, 0) * pendingGap,
    Math.max(data.executionNodes.length - 1, 0) * executionGap,
    Math.max(data.sectorNodes.length - 1, 0) * sectorGap
  );

  function resolveColumnScaleMax(columnName) {
    const columnValue = Number(data.columnScaleMax?.[columnName]);

    if (Number.isFinite(columnValue) && columnValue > 0) {
      return Math.max(columnValue, calculatedMaxColumnTotal, 1);
    }

    const fixedScaleMaxQuantity = Number(data.scaleMaxQuantity);

    if (Number.isFinite(fixedScaleMaxQuantity) && fixedScaleMaxQuantity > 0) {
      return Math.max(fixedScaleMaxQuantity, calculatedMaxColumnTotal, 1);
    }

    return Math.max(calculatedMaxColumnTotal, 1);
  }

  function resolvePxPerUnit(columnName) {
    const scaleMax = resolveColumnScaleMax(columnName);
    const usableHeight = Math.max(1, availableHeight - maxGap);

    return usableHeight / Math.max(scaleMax, 1);
  }

  function getColumnLabelY(envelope, offset = 10) {
    if (!envelope) {
      return top - offset;
    }

    return Math.max(14, envelope.y - offset);
  }

  const pendingPxPerUnit = resolvePxPerUnit("pending");
  const executionPxPerUnit = resolvePxPerUnit("execution");
  const sectorPxPerUnit = resolvePxPerUnit("sector");

  /*
   * Centrage horizontal du graphe complet
   * On tient compte :
   * - des 3 colonnes de 130px
   * - des espaces entre colonnes
   * - du padding des enveloppes
   * - de la place nécessaire au label vertical à gauche
   */
  const sideTotalReservedWidth = 42;
  const leftExtraSpace = envelopePaddingX + sideTotalReservedWidth;
  const rightExtraSpace = envelopePaddingX;

  const horizontalMargin = 64;

  const availableWidth = width - horizontalMargin * 2;

  const rawColumnGap =
    (availableWidth -
      leftExtraSpace -
      rightExtraSpace -
      pendingNodeWidth -
      executionNodeWidth -
      sectorNodeWidth) /
    2;

  const columnGap = Math.max(170, rawColumnGap);

  const graphWidth =
    leftExtraSpace +
    pendingNodeWidth +
    columnGap +
    executionNodeWidth +
    columnGap +
    sectorNodeWidth +
    rightExtraSpace;

  const graphStartX = (width - graphWidth) / 2;

  const pendingX = graphStartX + leftExtraSpace;
  const executionX = pendingX + pendingNodeWidth + columnGap;
  const sectorX = executionX + executionNodeWidth + columnGap;

  const pendingNodes = layoutColumn({
    nodes: data.pendingNodes,
    x: pendingX,
    width: pendingNodeWidth,
    top,
    availableHeight,
    pxPerUnit: pendingPxPerUnit,
    gap: pendingGap,
    minNodeHeight: 22,
  });

  const executionNodes = layoutColumn({
    nodes: data.executionNodes,
    x: executionX,
    width: executionNodeWidth,
    top,
    availableHeight,
    pxPerUnit: executionPxPerUnit,
    gap: executionGap,
    minNodeHeight: 22,
  });

  const sectorNodes = layoutColumn({
    nodes: data.sectorNodes,
    x: sectorX,
    width: sectorNodeWidth,
    top,
    availableHeight,
    pxPerUnit: sectorPxPerUnit,
    gap: sectorGap,
    minNodeHeight: 22,
  });

  const pendingEnvelope = buildColumnEnvelope(
    pendingNodes,
    pendingTotal,
    envelopePaddingX,
    envelopePaddingY
  );

  const executionEnvelope = buildColumnEnvelope(
    executionNodes,
    executionTotal,
    envelopePaddingX,
    envelopePaddingY
  );

  const sectorEnvelope = buildColumnEnvelope(
    sectorNodes,
    sectorTotal,
    envelopePaddingX,
    envelopePaddingY
  );

  return {
    pendingNodes,
    executionNodes,
    sectorNodes,

    pendingEnvelope,
    executionEnvelope,
    sectorEnvelope,

    pxPerUnit: Math.min(pendingPxPerUnit, executionPxPerUnit, sectorPxPerUnit),

    columnLabels: [
      {
        text: data.pendingColumnName,
        x: pendingX + pendingNodeWidth / 2,
        y: getColumnLabelY(pendingEnvelope),
      },
      {
        text: data.executionColumnName,
        x: executionX + executionNodeWidth / 2,
        y: getColumnLabelY(executionEnvelope),
      },
      {
        text: "Secteurs",
        x: sectorX + sectorNodeWidth / 2,
        y: getColumnLabelY(sectorEnvelope),
      },
    ],
  };
}

function computeRibbons({
  pendingNodes,
  executionNodes,
  sectorNodes,
  pendingExecutionFlows,
  executionSectorFlows,
  pxPerUnit,
}) {
  const pendingOutputOffsets = {};
  const executionInputOffsets = {};
  const executionOutputOffsets = {};
  const sectorInputOffsets = {};

  pendingNodes.forEach((node) => {
    pendingOutputOffsets[node.id] = 0;
  });

  executionNodes.forEach((node) => {
    executionInputOffsets[node.id] = 0;
    executionOutputOffsets[node.id] = 0;
  });

  sectorNodes.forEach((node) => {
    sectorInputOffsets[node.id] = 0;
  });

  const pendingToExecutionRibbons = pendingExecutionFlows
    .map((flow) => {
      const source = pendingNodes.find((node) => node.id === flow.from);
      const target = executionNodes.find((node) => node.id === flow.to);

      if (!source || !target || flow.quantity <= 0) {
        return null;
      }

      const sourceFlowHeight = source.flowHeight ?? source.height;
      const targetFlowHeight = target.flowHeight ?? target.height;

      const sourceFlowStartY = source.flowStartY ?? source.y;
      const targetFlowStartY = target.flowStartY ?? target.y;

      const maxSource = sourceFlowHeight - pendingOutputOffsets[source.id];
      const maxTarget = targetFlowHeight - executionInputOffsets[target.id];

      const height = Math.min(flow.quantity * pxPerUnit, maxSource, maxTarget);

      if (height <= 0) {
        return null;
      }

      const sy0 = sourceFlowStartY + pendingOutputOffsets[source.id];
      const sy1 = sy0 + height;

      const ty0 = targetFlowStartY + executionInputOffsets[target.id];
      const ty1 = ty0 + height;

      pendingOutputOffsets[source.id] += height;
      executionInputOffsets[target.id] += height;

      const quantity = height / pxPerUnit;

      return {
        group: "pending",
        from: source,
        to: target,
        quantity,
        color: source.color,
        x0: source.x + source.width,
        x1: target.x,
        sy0,
        sy1,
        ty0,
        ty1,
      };
    })
    .filter(Boolean);

  const executionToSectorRibbons = executionSectorFlows
    .map((flow) => {
      const source = executionNodes.find((node) => node.id === flow.from);
      const target = sectorNodes.find((node) => node.id === flow.to);

      if (!source || !target || flow.quantity <= 0) {
        return null;
      }

      const sourceFlowHeight = source.flowHeight ?? source.height;
      const targetFlowHeight = target.flowHeight ?? target.height;

      const sourceFlowStartY = source.flowStartY ?? source.y;
      const targetFlowStartY = target.flowStartY ?? target.y;

      const maxSource = sourceFlowHeight - executionOutputOffsets[source.id];
      const maxTarget = targetFlowHeight - sectorInputOffsets[target.id];

      const height = Math.min(flow.quantity * pxPerUnit, maxSource, maxTarget);

      if (height <= 0) {
        return null;
      }

      const sy0 = sourceFlowStartY + executionOutputOffsets[source.id];
      const sy1 = sy0 + height;

      const ty0 = targetFlowStartY + sectorInputOffsets[target.id];
      const ty1 = ty0 + height;

      executionOutputOffsets[source.id] += height;
      sectorInputOffsets[target.id] += height;

      const quantity = height / pxPerUnit;

      return {
        group: "sector",
        from: source,
        to: target,
        quantity,
        color: source.color,
        x0: source.x + source.width,
        x1: target.x,
        sy0,
        sy1,
        ty0,
        ty1,
      };
    })
    .filter(Boolean);

  return [...pendingToExecutionRibbons, ...executionToSectorRibbons];
}

function createRibbonPath(ribbon, progress = 1) {
  const safeProgress = Math.max(0, Math.min(1, progress));

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

function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({
    width: 980,
    height: 420,
  });

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    function updateSize() {
      const rect = element.getBoundingClientRect();

      setSize({
        width: Math.max(820, rect.width),
        height: Math.max(340, rect.height),
      });
    }

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
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

    const duration = 5200;
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
        const eased = -(Math.cos(Math.PI * rawProgress) - 1) / 2;
        setProgress(eased);
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

function NodeInsideLabel({ node }) {
  if (node.height < 22) {
    return null;
  }

  const centerX = node.x + node.width / 2;

  if (node.height >= 42) {
    return (
      <text
        className="bes-node-inside-label"
        x={centerX}
        y={node.centerY}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        <tspan x={centerX} dy="-7">
          {node.name}
        </tspan>

        <tspan className="bes-node-inside-quantity" x={centerX} dy="16">
          {node.quantity.toFixed(0)}
        </tspan>
      </text>
    );
  }

  return (
    <text
      className="bes-node-inside-label bes-node-inside-label-small"
      x={centerX}
      y={node.centerY}
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {node.name} · {node.quantity.toFixed(0)}
    </text>
  );
}

function createRoundedRectPath({
  x,
  y,
  width,
  height,
  radius = 10,
  topLeft = false,
  topRight = false,
  bottomRight = false,
  bottomLeft = false,
}) {
  const r = Math.min(radius, width / 2, height / 2);

  return [
    `M ${x + (topLeft ? r : 0)} ${y}`,

    // Haut
    `H ${x + width - (topRight ? r : 0)}`,

    // Coin haut droit
    topRight
      ? `Q ${x + width} ${y} ${x + width} ${y + r}`
      : `L ${x + width} ${y}`,

    // Droite
    `V ${y + height - (bottomRight ? r : 0)}`,

    // Coin bas droit
    bottomRight
      ? `Q ${x + width} ${y + height} ${x + width - r} ${y + height}`
      : `L ${x + width} ${y + height}`,

    // Bas
    `H ${x + (bottomLeft ? r : 0)}`,

    // Coin bas gauche
    bottomLeft
      ? `Q ${x} ${y + height} ${x} ${y + height - r}`
      : `L ${x} ${y + height}`,

    // Gauche
    `V ${y + (topLeft ? r : 0)}`,

    // Coin haut gauche
    topLeft ? `Q ${x} ${y} ${x + r} ${y}` : `L ${x} ${y}`,

    "Z",
  ].join(" ");
}

function ColumnSideTotal({
  envelope,
  className = "",
  preLabel = "Total",
  postLabel = "Activités",
  offset = 18,
}) {
  if (!envelope) {
    return null;
  }

  const x = envelope.x - offset;
  const y = envelope.centerY;

  return (
    <text
      className={`bes-column-side-total ${className}`}
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      transform={`rotate(-90 ${x} ${y})`}
    >
      {preLabel} {envelope.quantity.toFixed(0)} {postLabel}
    </text>
  );
}

const SCENARIO_TRANSITION_DURATION = 7200;

const STABLE_STAGES = {
  pending: 1,
  execution: 1,
  sector: 1,
  flow: 1,
};

function easeInOutSmooth(value) {
  const safeValue = Math.max(0, Math.min(1, value));

  return (
    safeValue * safeValue * safeValue * (safeValue * (safeValue * 6 - 15) + 10)
  );
}

function phaseProgress(rawProgress, start, end) {
  if (rawProgress <= start) {
    return 0;
  }

  if (rawProgress >= end) {
    return 1;
  }

  return easeInOutSmooth((rawProgress - start) / (end - start));
}

function getSequentialStages(rawProgress) {
  return {
    pending: phaseProgress(rawProgress, 0, 0.2),
    execution: phaseProgress(rawProgress, 0.22, 0.42),
    sector: phaseProgress(rawProgress, 0.44, 0.64),
    flow: phaseProgress(rawProgress, 0.66, 1),
  };
}

function getStageOrganicValue(stageProgress) {
  return Math.sin(Math.max(0, Math.min(1, stageProgress)) * Math.PI);
}

function getTransitionSignature(filters) {
  return [
    filters.activityNames,
    filters.pendingActivityQuantities,
    filters.executionActivityQuantities,
    filters.sectorNames,
    filters.executionSectorFlows,
  ].join("|");
}

function formatInterpolatedNumber(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
}

function parseNamedQuantities(namesValue, quantitiesValue) {
  const names = parseList(namesValue);

  const quantities = String(quantitiesValue || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .map((item) => (Number.isFinite(item) && item > 0 ? item : 0));

  const quantitiesByName = new Map();

  names.forEach((name, index) => {
    quantitiesByName.set(normalizeId(name), quantities[index] || 0);
  });

  return quantitiesByName;
}

function mergeCsvNames(nextValue, previousValue) {
  const result = [];
  const seen = new Set();

  function addName(name) {
    const normalized = normalizeId(name);

    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    result.push(name);
  }

  parseList(nextValue).forEach(addName);
  parseList(previousValue).forEach(addName);

  return result;
}

function interpolateQuantitiesForNames({
  names,
  previousNames,
  previousQuantities,
  nextNames,
  nextQuantities,
  progress,
}) {
  const previousMap = parseNamedQuantities(previousNames, previousQuantities);
  const nextMap = parseNamedQuantities(nextNames, nextQuantities);

  return names
    .map((name) => {
      const id = normalizeId(name);
      const previousValue = previousMap.get(id) || 0;
      const nextValue = nextMap.get(id) || 0;
      const value = previousValue + (nextValue - previousValue) * progress;

      return formatInterpolatedNumber(value);
    })
    .join(",");
}

function parseFlowMap(value) {
  const flowMap = new Map();

  parseFlows(value).forEach((flow) => {
    const key = `${flow.from}>${flow.to}`;
    flowMap.set(key, flow.quantity);
  });

  return flowMap;
}

function mergeFlowKeys(nextFlowsValue, previousFlowsValue) {
  const result = [];
  const seen = new Set();

  function addFlowKey(flow) {
    const key = `${flow.from}>${flow.to}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push(key);
  }

  parseFlows(nextFlowsValue).forEach(addFlowKey);
  parseFlows(previousFlowsValue).forEach(addFlowKey);

  return result;
}

function interpolateFlowText(previousFlowsValue, nextFlowsValue, progress) {
  const previousMap = parseFlowMap(previousFlowsValue);
  const nextMap = parseFlowMap(nextFlowsValue);
  const flowKeys = mergeFlowKeys(nextFlowsValue, previousFlowsValue);

  return flowKeys
    .map((key) => {
      const previousValue = previousMap.get(key) || 0;
      const nextValue = nextMap.get(key) || 0;
      const value = previousValue + (nextValue - previousValue) * progress;

      if (value <= 0.05) {
        return null;
      }

      return `${key}:${formatInterpolatedNumber(value)}`;
    })
    .filter(Boolean)
    .join(";");
}

const ACTIVITY_DETAIL_NUMERIC_FIELDS = [
  "budget",
  "resourcesRequired",
  "resourcesAllocated",
  "averageExecutionDurationDays",
];

function normalizeActivityDetailsForInterpolation(activityDetails) {
  if (!activityDetails || typeof activityDetails !== "object") {
    return {};
  }

  return Object.entries(activityDetails).reduce(
    (result, [activityName, details]) => {
      result[normalizeId(activityName)] = {
        originalName: activityName,
        ...(details || {}),
      };

      return result;
    },
    {}
  );
}

function interpolateNumberValue(previousValue, nextValue, progress) {
  const previousNumber = Number(previousValue);
  const nextNumber = Number(nextValue);

  const safePrevious = Number.isFinite(previousNumber) ? previousNumber : 0;
  const safeNext = Number.isFinite(nextNumber) ? nextNumber : 0;

  return safePrevious + (safeNext - safePrevious) * progress;
}

function interpolateActivityDetails(previousDetails, nextDetails, progress) {
  const previousById =
    normalizeActivityDetailsForInterpolation(previousDetails);
  const nextById = normalizeActivityDetailsForInterpolation(nextDetails);

  const activityIds = new Set([
    ...Object.keys(previousById),
    ...Object.keys(nextById),
  ]);

  return Array.from(activityIds).reduce((result, activityId) => {
    const previousActivityDetails = previousById[activityId] || {};
    const nextActivityDetails = nextById[activityId] || {};

    const activityName =
      nextActivityDetails.originalName ||
      previousActivityDetails.originalName ||
      activityId;

    const interpolatedDetails = {
      ...previousActivityDetails,
      ...nextActivityDetails,
    };

    ACTIVITY_DETAIL_NUMERIC_FIELDS.forEach((fieldName) => {
      interpolatedDetails[fieldName] = interpolateNumberValue(
        previousActivityDetails[fieldName],
        nextActivityDetails[fieldName],
        progress
      );
    });

    delete interpolatedDetails.originalName;

    result[activityName] = interpolatedDetails;

    return result;
  }, {});
}

function buildStagedInterpolatedFilters(previousFilters, nextFilters, stages) {
  const activityNames = mergeCsvNames(
    nextFilters.activityNames,
    previousFilters.activityNames
  );

  const sectorNames = mergeCsvNames(
    nextFilters.sectorNames,
    previousFilters.sectorNames
  );

  const previousScaleMax = getScenarioScaleMax(previousFilters);
  const nextScaleMax = getScenarioScaleMax(nextFilters);

  const detailsProgress = stages.execution;

  return {
    ...nextFilters,

    isScenarioTransition: true,

    activityNames: activityNames.join(","),
    sectorNames: sectorNames.join(","),

    columnScaleMax: {
      pending: interpolateScale(previousScaleMax, nextScaleMax, stages.pending),
      execution: interpolateScale(
        previousScaleMax,
        nextScaleMax,
        stages.execution
      ),
      sector: interpolateScale(previousScaleMax, nextScaleMax, stages.sector),
    },

    activityDetails: interpolateActivityDetails(
      previousFilters.activityDetails,
      nextFilters.activityDetails,
      detailsProgress
    ),

    pendingActivityQuantities: interpolateQuantitiesForNames({
      names: activityNames,
      previousNames: previousFilters.activityNames,
      previousQuantities: previousFilters.pendingActivityQuantities,
      nextNames: nextFilters.activityNames,
      nextQuantities: nextFilters.pendingActivityQuantities,
      progress: stages.pending,
    }),

    executionActivityQuantities: interpolateQuantitiesForNames({
      names: activityNames,
      previousNames: previousFilters.activityNames,
      previousQuantities: previousFilters.executionActivityQuantities,
      nextNames: nextFilters.activityNames,
      nextQuantities: nextFilters.executionActivityQuantities,
      progress: stages.execution,
    }),

    executionSectorFlows: interpolateFlowText(
      previousFilters.executionSectorFlows,
      nextFilters.executionSectorFlows,
      stages.sector
    ),
  };
}

function useStagedScenarioTransitionFilters(filters) {
  const [displayFilters, setDisplayFiltersState] = useState(filters);
  const [stages, setStages] = useState(STABLE_STAGES);
  const [isScenarioTransitioning, setIsScenarioTransitioning] = useState(false);

  const displayFiltersRef = useRef(filters);
  const animationFrameRef = useRef(null);

  const transitionSignature = getTransitionSignature(filters);

  function setDisplayFilters(nextFilters) {
    displayFiltersRef.current = nextFilters;
    setDisplayFiltersState(nextFilters);
  }

  useEffect(() => {
    const previousFilters = displayFiltersRef.current;
    const nextFilters = filters;

    if (
      getTransitionSignature(previousFilters) ===
      getTransitionSignature(nextFilters)
    ) {
      setDisplayFilters(nextFilters);
      setStages(STABLE_STAGES);
      setIsScenarioTransitioning(false);
      return undefined;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    let startTime = null;
    setIsScenarioTransitioning(true);

    function animate(timestamp) {
      if (startTime === null) {
        startTime = timestamp;
      }

      const rawProgress = Math.min(
        1,
        (timestamp - startTime) / SCENARIO_TRANSITION_DURATION
      );

      const nextStages = getSequentialStages(rawProgress);

      const interpolatedFilters = buildStagedInterpolatedFilters(
        previousFilters,
        nextFilters,
        nextStages
      );

      setDisplayFilters(interpolatedFilters);
      setStages(nextStages);

      if (rawProgress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayFilters({
          ...nextFilters,
          isScenarioTransition: true,
        });

        setStages(STABLE_STAGES);
        setIsScenarioTransitioning(false);
        animationFrameRef.current = null;
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = null;
    };
  }, [transitionSignature, filters]);

  return {
    animatedFilters: displayFilters,
    stages,
    isScenarioTransitioning,
  };
}

function isTruthy(value) {
  return value === true || value === "true";
}

function normalizeActivityDetails(activityDetails) {
  if (!activityDetails || typeof activityDetails !== "object") {
    return {};
  }

  return Object.entries(activityDetails).reduce((result, [name, details]) => {
    result[normalizeId(name)] = details || {};
    return result;
  }, {});
}

function formatBudget(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number.toLocaleString("fr-CH", {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 0,
  });
}

function formatNumber(value, suffix = "") {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `${number.toLocaleString("fr-CH", {
    maximumFractionDigits: 1,
  })}${suffix}`;
}

function buildActivityDetailRows(data, filters) {
  const detailsByActivity = normalizeActivityDetails(filters.activityDetails);
  const activityIds = new Set();

  data.pendingNodes.forEach((node) => activityIds.add(node.id));
  data.executionNodes.forEach((node) => activityIds.add(node.id));

  return Array.from(activityIds).map((activityId) => {
    const pendingNode = data.pendingNodes.find(
      (node) => node.id === activityId
    );

    const executionNode = data.executionNodes.find(
      (node) => node.id === activityId
    );

    const name = pendingNode?.name || executionNode?.name || activityId;
    const color = pendingNode?.color || executionNode?.color || "#265b7d";

    const pendingQuantity = pendingNode?.quantity || 0;
    const executionQuantity = executionNode?.quantity || 0;
    const remainingQuantity = Math.max(0, pendingQuantity - executionQuantity);

    const executionRate =
      pendingQuantity > 0 ? (executionQuantity / pendingQuantity) * 100 : 0;

    const details = detailsByActivity[activityId] || {};

    const resourcesRequired = Number(details.resourcesRequired);
    const resourcesAllocated = Number(details.resourcesAllocated);

    const resourceDifference =
      Number.isFinite(resourcesRequired) && Number.isFinite(resourcesAllocated)
        ? resourcesAllocated - resourcesRequired
        : null;

    return {
      id: activityId,
      name,
      color,

      pendingQuantity,
      executionQuantity,
      remainingQuantity,
      executionRate,

      budget: details.budget,
      resourcesRequired: details.resourcesRequired,
      resourcesAllocated: details.resourcesAllocated,
      resourceDifference,
      averageExecutionDurationDays: details.averageExecutionDurationDays,
    };
  });
}

function SankeyDetailsPanel({ data, filters }) {
  const activityRows = buildActivityDetailRows(data, filters);

  if (activityRows.length === 0) {
    return null;
  }

  return (
    <section className="bes-details-panel">
      <div className="bes-details-grid">
        {activityRows.map((row) => {
          const differenceClass =
            row.resourceDifference > 0
              ? "is-positive"
              : row.resourceDifference < 0
              ? "is-negative"
              : "is-neutral";

          const differenceLabel =
            row.resourceDifference === null
              ? "—"
              : `${row.resourceDifference > 0 ? "+" : ""}${formatNumber(
                  row.resourceDifference
                )}`;

          return (
            <article className="bes-detail-card" key={row.id}>
              <div className="bes-detail-title">
                <span
                  className="bes-detail-color"
                  style={{ backgroundColor: row.color }}
                />

                <strong>{row.name}</strong>
              </div>

              <div className="bes-detail-values">
                <div>
                  <span>Production</span>
                  <strong>{formatNumber(row.pendingQuantity)}</strong>
                </div>

                <div>
                  <span>Effectives</span>
                  <strong>{formatNumber(row.executionQuantity)}</strong>
                </div>

                <div>
                  <span>Restantes</span>
                  <strong>{formatNumber(row.remainingQuantity)}</strong>
                </div>

                <div class="full-width">
                  <span>Budget</span>
                  <strong>{formatBudget(row.budget)}</strong>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function BacklogExecutionSectorSankeyRenderer({
  filters,
  isAnimating,
}) {
  const { ref, size } = useElementSize();
  const progress = useRevealAnimation(isAnimating);
  const [tooltip, setTooltip] = useState(null);

  const rawClipId = useId();

  const pendingClipId = `bes-pending-envelope-clip-${rawClipId.replace(
    /[^a-zA-Z0-9_-]/g,
    ""
  )}`;

  const { animatedFilters, stages, isScenarioTransitioning } =
    useStagedScenarioTransitionFilters(filters);

  const data = useMemo(() => {
    return buildSankeyData(animatedFilters);
  }, [animatedFilters]);

  const layout = useMemo(() => {
    const nodes = layoutNodes(data, size);

    const ribbons = computeRibbons({
      ...nodes,
      pendingExecutionFlows: data.pendingExecutionFlows,
      executionSectorFlows: data.executionSectorFlows,
    });

    return {
      ...nodes,
      ribbons,
    };
  }, [data, size]);

  const flowRevealProgress = isScenarioTransitioning ? stages.flow : progress;

  const leftProgress = Math.min(1, flowRevealProgress * 2);
  const rightProgress = Math.max(0, Math.min(1, flowRevealProgress * 2 - 1));

  const pendingOrganic = isScenarioTransitioning
    ? getStageOrganicValue(stages.pending)
    : 0;

  const executionOrganic = isScenarioTransitioning
    ? getStageOrganicValue(stages.execution)
    : 0;

  const sectorOrganic = isScenarioTransitioning
    ? getStageOrganicValue(stages.sector)
    : 0;

  const showActivityDetails = isTruthy(filters.showActivityDetails);

  function handleRibbonMouseMove(event, ribbon) {
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      text:
        `${ribbon.from.name} → ${ribbon.to.name}\n` +
        `${ribbon.quantity.toFixed(0)} unités`,
    });
  }

  function handleNodeMouseMove(event, node) {
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      text: `${node.name}\n${node.quantity.toFixed(0)} unités`,
    });
  }

  return (
    <>
      <div
        className={`bes-sankey-renderer ${
          showActivityDetails && "with-details"
        }`}
        ref={ref}
      >
        <svg
          className="bes-sankey-svg"
          viewBox={`0 0 ${size.width} ${size.height}`}
          role="img"
          aria-label="Sankey backlog réalisation secteurs"
        >
          {layout.pendingEnvelope && (
            <defs>
              <clipPath id={pendingClipId}>
                <rect
                  x={layout.pendingEnvelope.x}
                  y={layout.pendingEnvelope.y}
                  width={layout.pendingEnvelope.width}
                  height={layout.pendingEnvelope.height}
                  rx="14"
                  ry="14"
                />
              </clipPath>
            </defs>
          )}

          {layout.columnLabels.map((label, index) => (
            <text
              key={`column-label-${index}`}
              className="bes-column-label"
              x={label.x}
              y={label.y}
              textAnchor="middle"
            >
              {label.text}
            </text>
          ))}

          <g className="bes-ribbons-layer">
            {layout.ribbons.map((ribbon, index) => {
              const ribbonProgress =
                ribbon.group === "pending" ? leftProgress : rightProgress;

              if (ribbonProgress <= 0) {
                return null;
              }

              return (
                <path
                  key={`ribbon-${index}`}
                  className="bes-ribbon"
                  d={createRibbonPath(ribbon, ribbonProgress)}
                  fill={ribbon.color}
                  onMouseMove={(event) => handleRibbonMouseMove(event, ribbon)}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </g>

          <g className="bes-nodes-layer">
            {layout.pendingEnvelope && (
              <rect
                className="bes-column-envelope bes-pending-envelope"
                x={layout.pendingEnvelope.x}
                y={layout.pendingEnvelope.y}
                width={layout.pendingEnvelope.width}
                height={layout.pendingEnvelope.height}
                rx="14"
                ry="14"
              />
            )}

            {layout.executionEnvelope && (
              <rect
                className="bes-column-envelope bes-execution-envelope"
                x={layout.executionEnvelope.x}
                y={layout.executionEnvelope.y}
                width={layout.executionEnvelope.width}
                height={layout.executionEnvelope.height}
                rx="14"
                ry="14"
              />
            )}

            {layout.sectorEnvelope && (
              <rect
                className="bes-column-envelope bes-sector-envelope"
                x={layout.sectorEnvelope.x}
                y={layout.sectorEnvelope.y}
                width={layout.sectorEnvelope.width}
                height={layout.sectorEnvelope.height}
                rx="14"
                ry="14"
              />
            )}

            {layout.pendingEnvelope && (
              <g clipPath={`url(#${pendingClipId})`}>
                {layout.pendingNodes.map((node, index) => {
                  const isFirstNode = index === 0;
                  const isLastNode = index === layout.pendingNodes.length - 1;

                  return (
                    <g
                      key={`pending-${node.id}`}
                      onMouseMove={(event) => handleNodeMouseMove(event, node)}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <path
                        className="bes-node bes-pending-node"
                        d={createRoundedRectPath({
                          x: node.x,
                          y: node.y,
                          width: node.width,
                          height: node.height,
                          radius: 12 + pendingOrganic * 6,
                          topLeft: isFirstNode,
                          topRight: isFirstNode,
                          bottomRight: isLastNode,
                          bottomLeft: isLastNode,
                        })}
                        fill={node.color}
                      />

                      <NodeInsideLabel node={node} />
                    </g>
                  );
                })}
              </g>
            )}

            {layout.executionNodes.map((node) => (
              <g
                key={`execution-${node.id}`}
                onMouseMove={(event) => handleNodeMouseMove(event, node)}
                onMouseLeave={() => setTooltip(null)}
              >
                <rect
                  className="bes-node bes-execution-node"
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  fill={node.color}
                  rx={8 + executionOrganic * 6}
                  ry={8 + executionOrganic * 6}
                />

                <NodeInsideLabel node={node} />
              </g>
            ))}

            {layout.sectorNodes.map((node) => (
              <g
                key={`sector-${node.id}`}
                onMouseMove={(event) => handleNodeMouseMove(event, node)}
                onMouseLeave={() => setTooltip(null)}
              >
                <rect
                  className="bes-node bes-sector-node"
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  fill={node.color}
                  rx={8 + sectorOrganic * 6}
                  ry={8 + sectorOrganic * 6}
                />

                <NodeInsideLabel node={node} />
              </g>
            ))}

            <ColumnSideTotal
              envelope={layout.pendingEnvelope}
              className="bes-pending-total"
            />

            <ColumnSideTotal
              envelope={layout.executionEnvelope}
              className="bes-execution-total"
            />

            <ColumnSideTotal
              envelope={layout.sectorEnvelope}
              className="bes-sector-total"
            />
          </g>
        </svg>

        {tooltip && (
          <div
            className="bes-tooltip is-visible"
            style={{
              left: `${tooltip.x + -650}px`,
              top: `${tooltip.y + -150}px`,
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>

      {showActivityDetails && (
        <SankeyDetailsPanel data={data} filters={animatedFilters} />
      )}
    </>
  );
}
