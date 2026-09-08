import { useEffect, useMemo, useRef, useState } from "react";
import { resourceColors } from "../constants/colors";
import { useAnimatedResourceValues } from "../hooks/useAnimatedResourceValues";
import "../css/horizontal-filled-bar.css";

function getSegmentStartPercent(items, index) {
  return items.slice(0, index).reduce((sum, item) => sum + item.percent, 0);
}

export default function HorizontalFilledBarRenderer({ filters, isAnimating }) {
  const [tooltip, setTooltip] = useState(null);

  const { items, totalPercent, totalAllocatedFte, handleSliderChange } =
    useAnimatedResourceValues(filters, isAnimating);

  function handleSegmentMouseMove(event, item) {
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      text:
        `${item.name}\n` +
        `${item.percent.toFixed(1)}%\n` +
        `${item.resources.toFixed(1)} ressources\n` +
        `Pondération : ${item.weight}`,
    });
  }

  return (
    <div className="horizontal-filled-bar-renderer">
      <div className="dashboard-summary">
        <div>
          <h3>Répartition globale</h3>
          <p>Vue consolidée des ressources allouées</p>
        </div>
      </div>

      <div className="dashboard-stacked-bar-wrapper">
        <div className="dashboard-stacked-bar">
          {items.map((item, index) => {
            const isSmall = item.percent < 10;

            return (
              <div
                key={`${item.name}-${index}`}
                className={`dashboard-segment ${isSmall ? "is-small" : ""}`}
                style={{
                  width: `${item.percent}%`,
                  background: item.color,
                }}
                onMouseMove={(event) => handleSegmentMouseMove(event, item)}
                onMouseLeave={() => setTooltip(null)}
              >
                <span className="dashboard-segment-text">
                  {item.name}
                  <br />
                  {item.percent.toFixed(1)}%
                  <br />
                  {item.resources.toFixed(1)} ressources
                </span>
              </div>
            );
          })}
        </div>

        {items.map((item, index) => {
          const isSmall = item.percent < 10;

          if (!isSmall) {
            return null;
          }

          const startPercent = getSegmentStartPercent(items, index);
          const centerPercent = startPercent + item.percent / 2;
          const positionClass = index % 2 === 0 ? "is-top" : "is-bottom";

          return (
            <div
              key={`auto-label-${item.name}-${index}`}
              className={`dashboard-auto-tooltip ${positionClass}`}
              style={{
                left: `${centerPercent}%`,
                borderColor: item.color,
              }}
            >
              <strong>{item.name}</strong>
              <span>{item.percent.toFixed(1)}%</span>
              <span>{item.resources.toFixed(1)} ressources</span>
            </div>
          );
        })}
      </div>

      <div className="dashboard-cards">
        {items.map((item, index) => (
          <article className="dashboard-card" key={`${item.name}-${index}`}>
            <div className="dashboard-card-top">
              <div>
                <strong>{item.name}</strong>
                <span>Pondération : {item.weight}</span>
              </div>

              <em>
                {item.percent.toFixed(1)}% · {item.resources.toFixed(1)}{" "}
                ressources
              </em>
            </div>

            <label className="dashboard-slider-label">
              Valeur pondérée
              <input
                className="dashboard-slider"
                type="range"
                min="0"
                max="100"
                step="0.01"
                value={item.percent}
                onChange={(event) =>
                  handleSliderChange(index, event.target.value)
                }
              />
            </label>
          </article>
        ))}
      </div>

      {tooltip && (
        <div
          className="dashboard-tooltip is-visible"
          style={{
            left: `${tooltip.x - 400}px`,
            top: `${tooltip.y - 300}px`,
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
