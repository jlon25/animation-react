export default function ScenarioSlider({
  scenarios = [],
  activeScenarioIndex = 0,
  value,
  min = 0,
  max,
  step = 1,
  onChange,
  onStepClick,
  // Par défaut, comportement historique (arrondi au repère le plus proche).
  // "reached" : le scénario actif change uniquement au franchissement du repère.
  activationMode = "nearest",
}) {
  if (!scenarios || scenarios.length <= 1) {
    return null;
  }

  const sliderMax = max ?? scenarios.length - 1;
  const sliderValue = value ?? activeScenarioIndex;

  const activeIndex = Math.max(
    0,
    Math.min(
      scenarios.length - 1,
      activationMode === "reached"
        ? Math.floor(Number(sliderValue) || 0)
        : Math.round(Number(sliderValue) || 0)
    )
  );

  const activeScenario = scenarios[activeIndex];

  return (
    <section className="scenario-slider-panel">
      <div className="scenario-slider-header">
        <div>
          <span className="scenario-slider-label">État actif</span>
          <strong>{activeScenario.name}</strong>

          {activeScenario.date && (
            <span className="scenario-slider-date">{activeScenario.date}</span>
          )}
        </div>

        {activeScenario.description && (
          <p
            key={`scenario-message-${activeIndex}`}
            className="scenario-state-message"
          >
            {activeScenario.description}
          </p>
        )}
      </div>

      <input
        className="scenario-slider"
        type="range"
        min={min}
        max={sliderMax}
        step={step}
        value={sliderValue}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Choisir une étape"
      />

      <div className="scenario-slider-steps">
        {scenarios.map((scenario, index) => (
          <button
            key={scenario.name}
            type="button"
            className={
              index === activeIndex
                ? "scenario-step is-active"
                : "scenario-step"
            }
            onClick={() => {
              if (onStepClick) {
                onStepClick(index);
                return;
              }

              onChange(index);
            }}
          >
            <span className="scenario-step-name">{scenario.name}</span>

            {scenario.date && (
              <span className="scenario-step-date">{scenario.date}</span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
