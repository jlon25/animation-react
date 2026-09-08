import { useState } from "react";
import { useAnimatedResourceValues } from "../hooks/useAnimatedResourceValues";
import "../css/hybrid.css";

function getSegmentStartPercent(items, index) {
  return items.slice(0, index).reduce((sum, item) => sum + item.percent, 0);
}

export default function HybridRenderer({ filters, isAnimating }) {
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
    <div className="hybrid-renderer">
      <section className="hybrid-top">
        <div className="hybrid-summary">
          <div>
            <h3>Répartition globale</h3>
            <p>Vue consolidée à 100%</p>
          </div>
        </div>

        <div className="hybrid-stacked-bar-wrapper">
          <div className="hybrid-stacked-bar">
            {items.map((item, index) => {
              const isSmall = item.percent < 10;

              return (
                <div
                  key={`${item.name}-${index}`}
                  className={`hybrid-segment ${isSmall ? "is-small" : ""}`}
                  style={{
                    width: `${item.percent}%`,
                    background: item.color,
                  }}
                  onMouseMove={(event) => handleSegmentMouseMove(event, item)}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <span>
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
            const shouldShowExternalLabel =
              item.percent >= 4 && item.percent < 10;

            if (!shouldShowExternalLabel) {
              return null;
            }

            const startPercent = getSegmentStartPercent(items, index);
            const centerPercent = startPercent + item.percent / 2;
            const positionClass = index % 2 === 0 ? "is-top" : "is-bottom";

            return (
              <div
                key={`hybrid-label-${item.name}-${index}`}
                className={`hybrid-auto-tooltip ${positionClass}`}
                style={{
                  left: `${centerPercent}%`,
                  borderColor: item.color,
                }}
              >
                <strong>{item.name}</strong>
                <span>{item.percent.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="hybrid-tubes-grid">
        {items.map((item, index) => (
          <article className="hybrid-tube-card" key={`${item.name}-${index}`}>
            <div className="hybrid-tube-progress">
              <div
                className="hybrid-tube-fill"
                style={{
                  transform: `scaleY(${item.percent / 100})`,
                  background: `linear-gradient(180deg, ${item.color}, #265b7d)`,
                }}
              />

              <span className="hybrid-tube-value">
                {item.percent.toFixed(1)}%
                <br />
                {item.resources.toFixed(1)} ressources
              </span>
            </div>

            <div className="hybrid-tube-meta">
              <strong>{item.name}</strong>
              <span>Pondération : {item.weight}</span>
            </div>

            <label className="hybrid-slider-label">
              Valeur pondérée
              <input
                className="hybrid-slider"
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
      </section>

      {tooltip && (
        <div
          className="hybrid-tooltip is-visible"
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
