import { useEffect, useMemo, useRef, useState } from "react";
import { resourceColors } from "../constants/colors";
import { useAnimatedResourceValues } from "../hooks/useAnimatedResourceValues";
import "../css/horizontal-simple-bars.css";

export default function CardsHorizontalBarsRenderer({ filters, isAnimating }) {
  const { items, handleSliderChange } = useAnimatedResourceValues(
    filters,
    isAnimating
  );

  return (
    <div className="cards-bars-renderer">
      <div className="cards-bars-grid">
        {items.map((item, index) => (
          <article className="resource-card" key={`${item.name}-${index}`}>
            <div className="resource-card-header">
              <div>
                <h3>{item.name}</h3>
                <p>Pondération : {item.weight}</p>
              </div>

              <strong>
                {item.percent.toFixed(1)}% · {item.resources.toFixed(1)}{" "}
                ressources
              </strong>
            </div>

            <div className="resource-bar">
              <div
                className="resource-bar-fill"
                style={{
                  width: `${item.percent}%`,
                  background: item.color,
                }}
              />

              <span>{item.percent.toFixed(1)}%</span>
            </div>

            <label className="resource-slider-label">
              Valeur pondérée
              <input
                className="resource-slider"
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
    </div>
  );
}
