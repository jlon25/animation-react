import { useState } from "react";
import ScenarioSlider from "./ScenarioSlider";
import AnimatedSummaryNumber from "./AnimatedSummaryNumber";

export default function MainContent({
  title,
  description,
  filters,
  renderer: Renderer,
  isAnimating,
  summary,
  scenarioControls,
}) {
  const [isSummaryRolling, setIsSummaryRolling] = useState(false);

  const defaultSummary = `100% · ${Number(
    filters.totalResources ?? filters.totalFte ?? 0
  ).toFixed(1)} ressources`;

  const showActivityDetails = isTruthy(filters.showActivityDetails);

  function isTruthy(value) {
    return value === true || value === "true";
  }

  return (
    <section className="right">
      <section className="graph-panel">
        <div className="graph-header">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>

          {showActivityDetails && (
            <strong
              id="graphTotal"
              className={
                isSummaryRolling ? "graph-total is-rolling" : "graph-total"
              }
            >
              <AnimatedSummaryNumber
                text={summary ?? defaultSummary}
                decimals={1}
                onRollingChange={setIsSummaryRolling}
              />
            </strong>
          )}
        </div>

        <div className="graph-stage">
          {Renderer ? (
            <Renderer filters={filters} isAnimating={isAnimating} />
          ) : (
            <div className="placeholder">Aucun rendu sélectionné</div>
          )}
        </div>

        {scenarioControls && (
          <ScenarioSlider
            scenarios={scenarioControls.scenarios}
            activeScenarioIndex={scenarioControls.activeScenarioIndex}
            onChange={scenarioControls.onChange}
          />
        )}
      </section>
    </section>
  );
}
