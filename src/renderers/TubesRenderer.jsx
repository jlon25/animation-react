import { useAnimatedResourceValues } from "../hooks/useAnimatedResourceValues";
import "../css/tubes.css";

export default function TubesRenderer({ filters, isAnimating }) {
  const { items, handleSliderChange } = useAnimatedResourceValues(
    filters,
    isAnimating
  );

  return (
    <div className="tubes-renderer">
      <div className="tubes-grid">
        {items.map((item, index) => (
          <article className="tube-card" key={`${item.name}-${index}`}>
            <div className="tube-progress">
              <div
                className="tube-fill"
                style={{ transform: `scaleY(${item.percent / 100})` }}
              />

              <span className="tube-value">
                {item.percent.toFixed(1)}%
                <br />
                {item.resources.toFixed(1)} ressources
              </span>
            </div>

            <strong className="tube-title">{item.name}</strong>

            <label className="tube-slider-label">
              Valeur pondérée
              <input
                className="tube-slider"
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
