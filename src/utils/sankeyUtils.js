import { initialSiloColor, resourceColors } from "../constants/colors";
import { parseList } from "./resourceCalculations";

export function normalizeActivityId(value) {
  return value.trim().toLowerCase();
}

export function parseFlows(value) {
  if (!value.trim()) {
    return [];
  }

  return value
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [relation, rawValue] = item.split(":");
      const [from, to] = relation.split(">");

      return {
        from: normalizeActivityId(from || ""),
        to: normalizeActivityId(to || ""),
        value: Number(rawValue),
      };
    })
    .filter(
      (flow) =>
        flow.from && flow.to && Number.isFinite(flow.value) && flow.value > 0
    );
}

export function buildQuarter(label, weights, names, totalFte) {
  const totalWeight = weights.reduce((sum, weight) => {
    return sum + (weight > 0 ? weight : 0);
  }, 0);

  const activities = names.map((name, index) => {
    const safeWeight = weights[index] > 0 ? weights[index] : 0;
    const percent = totalWeight > 0 ? (safeWeight / totalWeight) * 100 : 0;
    const fte = (percent / 100) * totalFte;

    return {
      id: normalizeActivityId(name),
      name,
      weight: safeWeight,
      percent,
      fte,
      color: resourceColors[index % resourceColors.length],
      isActive: safeWeight > 0,
    };
  });

  return { label, activities };
}

export function buildSankeyData(filters) {
  const resourceCount = Math.max(1, Number(filters.resourceCount) || 1);
  const totalFte = Number(filters.totalFte) || 0;

  const names = parseList(filters.activityNames, resourceCount);

  const q1Weights = parseSankeyWeights(filters.weightsQ1, names.length);
  const q2Weights = parseSankeyWeights(filters.weightsQ2, names.length);
  const q3Weights = parseSankeyWeights(filters.weightsQ3, names.length);
  const q4Weights = parseSankeyWeights(filters.weightsQ4, names.length);

  const initialName = filters.initialSilo?.trim() || "Ressources disponibles";

  const initialQuarter = {
    label: "Initial",
    activities: [
      {
        id: "initial",
        name: initialName,
        weight: 1,
        percent: 100,
        fte: totalFte,
        color: "#265b7d",
        isActive: true,
        isInitial: true,
      },
    ],
  };

  const q1 = buildQuarter("T1", q1Weights, names, totalFte);
  const q2 = buildQuarter("T2", q2Weights, names, totalFte);
  const q3 = buildQuarter("T3", q3Weights, names, totalFte);
  const q4 = buildQuarter("T4", q4Weights, names, totalFte);

  const initialFlows = q1.activities
    .filter((activity) => activity.percent > 0)
    .map((activity) => ({
      from: "initial",
      to: activity.id,
      value: activity.percent,
    }));

  return {
    totalFte,
    quarters: [initialQuarter, q1, q2, q3, q4],
    flowGroups: [
      { fromQuarter: 0, toQuarter: 1, items: initialFlows },
      { fromQuarter: 1, toQuarter: 2, items: parseFlows(filters.flowsQ1Q2) },
      { fromQuarter: 2, toQuarter: 3, items: parseFlows(filters.flowsQ2Q3) },
      { fromQuarter: 3, toQuarter: 4, items: parseFlows(filters.flowsQ3Q4) },
    ],
  };
}

export function layoutQuarter(quarter, x, top, availableHeight, nodeWidth) {
  const activeActivities = quarter.activities.filter(
    (activity) => activity.percent > 0
  );

  const gap =
    activeActivities.length >= 5 ? 14 : activeActivities.length >= 4 ? 18 : 24;

  const pxPerPercent = availableHeight / 100;

  const activeTotalHeight =
    activeActivities.reduce((sum, activity) => {
      return sum + activity.percent * pxPerPercent;
    }, 0) +
    Math.max(activeActivities.length - 1, 0) * gap;

  let y = top + (availableHeight - activeTotalHeight) / 2;

  return quarter.activities.map((activity) => {
    if (activity.percent <= 0) {
      return {
        ...activity,
        x,
        y: top + availableHeight / 2,
        width: nodeWidth,
        height: 0,
        centerY: top + availableHeight / 2,
        visible: false,
      };
    }

    const height = activity.percent * pxPerPercent;

    const node = {
      ...activity,
      x,
      y,
      width: nodeWidth,
      height,
      centerY: y + height / 2,
      visible: true,
    };

    y += height + gap;

    return node;
  });
}

export function computeFlowSlots(layouts, flowGroup, pxPerPercent, totalFte) {
  const sourceNodes = layouts[flowGroup.fromQuarter];
  const targetNodes = layouts[flowGroup.toQuarter];

  const sourceOffsets = {};
  const targetOffsets = {};

  sourceNodes.forEach((node) => {
    sourceOffsets[node.id] = 0;
  });

  targetNodes.forEach((node) => {
    targetOffsets[node.id] = 0;
  });

  return flowGroup.items
    .map((flow) => {
      const sourceNode = sourceNodes.find((node) => node.id === flow.from);
      const targetNode = targetNodes.find((node) => node.id === flow.to);

      if (!sourceNode || !targetNode) {
        return null;
      }

      const flowHeight = flow.value * pxPerPercent;

      const sourceBaseY =
        sourceNode.height > 0 ? sourceNode.y : sourceNode.centerY;
      const targetBaseY =
        targetNode.height > 0 ? targetNode.y : targetNode.centerY;

      const sy0 = sourceBaseY + sourceOffsets[flow.from];
      const sy1 = sy0 + flowHeight;
      const ty0 = targetBaseY + targetOffsets[flow.to];
      const ty1 = ty0 + flowHeight;

      sourceOffsets[flow.from] += flowHeight;
      targetOffsets[flow.to] += flowHeight;

      return {
        from: sourceNode,
        to: targetNode,
        value: flow.value,
        fte: (flow.value / 100) * totalFte,
        x0: sourceNode.x + sourceNode.width,
        x1: targetNode.x,
        sy0,
        sy1,
        ty0,
        ty1,
        color: sourceNode.color || targetNode.color,
      };
    })
    .filter(Boolean);
}

export function getRevealForColumn(columnIndex, progress) {
  const stageCount = 4;
  const currentStage = progress * stageCount;

  if (columnIndex === 0) {
    return 1;
  }

  return Math.max(0, Math.min(1, currentStage - (columnIndex - 1)));
}

export function getRevealForFlowGroup(flowGroupIndex, progress) {
  const stageCount = 4;
  const currentStage = progress * stageCount;

  return Math.max(0, Math.min(1, currentStage - flowGroupIndex));
}

export function createRibbonPath(ribbon, revealProgress = 1) {
  const x0 = ribbon.x0;
  const x1 = ribbon.x1;
  const sy0 = ribbon.sy0;
  const sy1 = ribbon.sy1;
  const ty0 = ribbon.ty0;
  const ty1 = ribbon.ty1;

  const revealedX1 = x0 + (x1 - x0) * revealProgress;
  const revealedTy0 = sy0 + (ty0 - sy0) * revealProgress;
  const revealedTy1 = sy1 + (ty1 - sy1) * revealProgress;
  const curvature = Math.abs(revealedX1 - x0) * 0.45;

  return [
    `M ${x0} ${sy0}`,
    `C ${x0 + curvature} ${sy0}, ${
      revealedX1 - curvature
    } ${revealedTy0}, ${revealedX1} ${revealedTy0}`,
    `L ${revealedX1} ${revealedTy1}`,
    `C ${revealedX1 - curvature} ${revealedTy1}, ${
      x0 + curvature
    } ${sy1}, ${x0} ${sy1}`,
    "Z",
  ].join(" ");
}

export function getNodeTextMode(node, layout) {
  const isNarrow = layout.nodeWidth < 120;

  if (node.height >= 78 && !isNarrow) {
    return "full";
  }

  if (node.height >= 56) {
    return "compact";
  }

  if (node.height >= 30) {
    return "name-only";
  }

  return "none";
}

function parseSankeyWeights(value, expectedLength) {
  const parsed = String(value || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .map((item) => (Number.isFinite(item) && item > 0 ? item : 0));

  while (parsed.length < expectedLength) {
    parsed.push(0);
  }

  return parsed.slice(0, expectedLength);
}
