import { useEffect, useMemo, useRef, useState } from "react";
import { easeInOutSine } from "../utils/animationUtils";
import { WrappedSvgText } from "../utils/svgTextUtils";
import { useElementSize } from "../hooks/useElementSize";
import {
  buildSankeyData,
  computeFlowSlots,
  createRibbonPath,
  getNodeTextMode,
  getRevealForColumn,
  getRevealForFlowGroup,
  layoutQuarter,
  parseSankeyWeights,
} from "../utils/sankeyUtils";
import "../css/sankey.css";

export default function SankeyRenderer({ filters, isAnimating }) {
  const animationFrameRef = useRef(null);
  const animationStartRef = useRef(null);

  const [progress, setProgress] = useState(1);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!isAnimating) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = null;
      animationStartRef.current = null;
      setProgress(1);

      return undefined;
    }

    const duration = 10000;
    const pauseDuration = 3000;
    const loopDuration = duration + pauseDuration;

    setProgress(0);
    animationStartRef.current = null;

    function animate(timestamp) {
      if (animationStartRef.current === null) {
        animationStartRef.current = timestamp;
      }

      const elapsed = timestamp - animationStartRef.current;
      const loopElapsed = elapsed % loopDuration;

      if (loopElapsed < duration) {
        const rawProgress = loopElapsed / duration;
        const easedProgress = easeInOutSine(rawProgress);

        setProgress(easedProgress);
      } else {
        setProgress(1);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = null;
      animationStartRef.current = null;
    };
  }, [isAnimating]);

  const { ref: containerRef, size } = useElementSize({
    minWidth: 720,
    minHeight: 540,
    defaultWidth: 1190,
    defaultHeight: 620,
  });

  const sankeyData = useMemo(() => {
    return buildSankeyData(filters);
  }, [filters]);

  const { quarters, flowGroups, totalFte } = sankeyData;

  const layout = useMemo(() => {
    const minWidth = 760;
    const svgWidth = Math.max(size.width, minWidth);
    const svgHeight = Math.max(size.height, 560);

    const horizontalPadding = svgWidth < 900 ? 28 : 50;
    const top = svgWidth < 900 ? 118 : 145;
    const bottomPadding = svgWidth < 900 ? 36 : 75;

    const availableHeight = Math.max(300, svgHeight - top - bottomPadding);

    const nodeWidth = svgWidth < 800 ? 92 : svgWidth < 1000 ? 118 : 150;

    const columnsCount = quarters.length;
    const usableWidth = svgWidth - horizontalPadding * 2 - nodeWidth;
    const columnStep = usableWidth / Math.max(columnsCount - 1, 1);

    const columnXs = quarters.map((_, index) => {
      return horizontalPadding + index * columnStep;
    });

    const pxPerPercent = availableHeight / 100;

    const layouts = quarters.map((quarter, index) => {
      return layoutQuarter(
        quarter,
        columnXs[index],
        top,
        availableHeight,
        nodeWidth
      );
    });

    const ribbonGroups = flowGroups.map((flowGroup) => {
      return computeFlowSlots(layouts, flowGroup, pxPerPercent, totalFte);
    });

    return {
      svgWidth,
      svgHeight,
      top,
      availableHeight,
      nodeWidth,
      columnXs,
      pxPerPercent,
      layouts,
      ribbonGroups,
    };
  }, [quarters, flowGroups, totalFte, size.width, size.height]);

  function handleRibbonMouseMove(event, ribbon) {
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      text:
        `${ribbon.from.name} → ${ribbon.to.name}\n` +
        `${ribbon.value.toFixed(1)}%\n`,
    });
  }

  function handleNodeMouseMove(event, node) {
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      text:
        `${node.name}\n` +
        `${node.percent.toFixed(1)}%\n` +
        `Pondération : ${node.weight}`,
    });
  }

  return (
    <div className="sankey-renderer">
      <svg
        className="sankey-svg"
        viewBox={`0 0 ${layout.svgWidth} ${layout.svgHeight}`}
        role="img"
        aria-label="Sankey trimestriel des ressources"
      >
        {quarters.map((quarter, index) => (
          <g key={`label-${quarter.label}`}>
            <WrappedSvgText
              text={quarter.label}
              className="sankey-quarter-label"
              x={layout.columnXs[index] + layout.nodeWidth / 2}
              y={layout.svgWidth < 900 ? 34 : 44}
              maxWidth={layout.nodeWidth + 20}
              lineHeight={15}
              maxLines={2}
            />

            <text
              className="sankey-quarter-subtitle"
              x={layout.columnXs[index] + layout.nodeWidth / 2}
              y={layout.svgWidth < 900 ? 54 : 66}
              textAnchor="middle"
            >
              100% · {totalFte.toFixed(1)} ressources
            </text>
          </g>
        ))}

        {layout.ribbonGroups.map((ribbons, groupIndex) => {
          const revealProgress = getRevealForFlowGroup(groupIndex, progress);

          if (revealProgress <= 0) {
            return null;
          }

          return (
            <g key={`ribbon-group-${groupIndex}`}>
              {ribbons.map((ribbon, ribbonIndex) => (
                <path
                  key={`ribbon-${groupIndex}-${ribbonIndex}`}
                  className="sankey-ribbon"
                  d={createRibbonPath(ribbon, revealProgress)}
                  fill={ribbon.color}
                  onMouseMove={(event) => handleRibbonMouseMove(event, ribbon)}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </g>
          );
        })}

        {layout.layouts.map((nodes, columnIndex) => {
          const columnReveal = getRevealForColumn(columnIndex, progress);

          if (columnReveal <= 0) {
            return null;
          }

          return (
            <g
              key={`column-${columnIndex}`}
              opacity={columnReveal}
              transform={`translate(0 ${12 * (1 - columnReveal)})`}
            >
              {nodes.map((node) => {
                if (!node.visible) {
                  return null;
                }

                return (
                  <g
                    key={`${columnIndex}-${node.id}`}
                    className={`sankey-node ${
                      node.isInitial ? "initial-node" : ""
                    }`}
                    onMouseMove={(event) => handleNodeMouseMove(event, node)}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <rect
                      className="node-rect"
                      x={node.x}
                      y={node.y}
                      width={node.width}
                      height={node.height}
                      fill={node.color}
                    />

                    {(() => {
                      const textMode = getNodeTextMode(node, layout);

                      if (textMode === "none") {
                        return null;
                      }

                      if (textMode === "full") {
                        return (
                          <>
                            <WrappedSvgText
                              text={node.name}
                              className="node-title"
                              x={node.x + node.width / 2}
                              y={node.centerY - 14}
                              maxWidth={node.width - 12}
                              lineHeight={11}
                              maxLines={2}
                            />

                            <WrappedSvgText
                              text={`${node.percent.toFixed(1)}%`}
                              className="node-value"
                              x={node.x + node.width / 2}
                              y={node.centerY + 10}
                              maxWidth={node.width - 12}
                              lineHeight={10}
                              maxLines={1}
                            />
                          </>
                        );
                      }

                      if (textMode === "compact") {
                        return (
                          <>
                            <WrappedSvgText
                              text={node.name}
                              className="node-title"
                              x={node.x + node.width / 2}
                              y={node.centerY - 8}
                              maxWidth={node.width - 12}
                              lineHeight={11}
                              maxLines={1}
                            />

                            <WrappedSvgText
                              text={`${node.percent.toFixed(1)}%`}
                              className="node-value"
                              x={node.x + node.width / 2}
                              y={node.centerY + 12}
                              maxWidth={node.width - 12}
                              lineHeight={10}
                              maxLines={1}
                            />
                          </>
                        );
                      }

                      return (
                        <WrappedSvgText
                          text={node.name}
                          className="node-title"
                          x={node.x + node.width / 2}
                          y={node.centerY}
                          maxWidth={node.width - 12}
                          lineHeight={10}
                          maxLines={1}
                        />
                      );
                    })()}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <div
          className="sankey-tooltip is-visible"
          style={{
            left: `${tooltip.x + 12}px`,
            top: `${tooltip.y + 12}px`,
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
