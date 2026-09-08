import { useEffect, useRef, useState } from "react";

import Header from "./Header";
import FiltersPanel from "./FiltersPanel";
import MainContent from "./MainContent";

function getBooleanUrlParam(name) {
  if (typeof window === "undefined") {
    return false;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const value = searchParams.get(name);

  return value === "true" || value === "1" || value === "yes";
}

function shouldStartAnimationFromUrl() {
  return (
    getBooleanUrlParam("isAnimated") ||
    getBooleanUrlParam("isanimated") ||
    getBooleanUrlParam("auto-animation") ||
    getBooleanUrlParam("autoAnimation")
  );
}

const defaultFilters = {
  resourceCount: 4,
  totalResources: 10,
  initialSilo: "Ressources disponibles",
  showActivityDetails: false,
  activityNames: "Build,Run,Support,Innovation",

  weightsQ1: "3,2,1,0",
  weightsQ2: "2,2,1,1",
  weightsQ3: "1,3,2,0",
  weightsQ4: "2,1,1,2",

  flowsQ1Q2:
    "Build>Build:33.3;Build>Innovation:16.7;Run>Run:33.3;Support>Support:16.7",
  flowsQ2Q3:
    "Build>Build:16.7;Build>Run:16.6;Run>Run:33.3;Support>Support:16.7;Innovation>Support:16.7",
  flowsQ3Q4:
    "Build>Build:16.7;Run>Build:16.6;Run>Run:16.7;Support>Support:16.7;Support>Innovation:16.6",

  pendingColumnName: "Activités en attente",
  executionColumnName: "Activitiés réalisées",
  pendingActivityQuantities: "100,60,30",
  executionActivityQuantities: "85,60,25",
  sectorNames: "Asile,Séjour",
  executionSectorFlows:
    "MAT>Asile:85;LIGHT>Asile:35;LIGHT>Séjour:25;Auditions>Asile:10;Auditions>Séjour:15",
};

export default function ExampleLayout({
  title,
  description,
  renderer,
  initialFilters = {},
  summary,
  scenarios = [],
  showQuarterFilters = false,
  showFlowFilters = false,
  showActivitySectorSankeyFilters = false,
  showBacklogSankeyFilters = false,
  showActivityPartnerMatrixFilters = false,
}) {
  const hasScenarios = scenarios.length > 0;
  const initialScenarioFilters = hasScenarios ? scenarios[0].filters : {};

  const [filtersCollapsed, setFiltersCollapsed] = useState(() =>
    getBooleanUrlParam("hidden-menu")
  );
  const [isAnimating, setIsAnimating] = useState(() =>
    shouldStartAnimationFromUrl()
  );
  const [activeScenarioIndex, setActiveScenarioIndex] = useState(0);

  const [filters, setFilters] = useState(() => ({
    ...defaultFilters,
    ...initialFilters,
    ...initialScenarioFilters,
    showActivityDetails:
      getBooleanUrlParam("with-details") ||
      Boolean(initialFilters.showActivityDetails) ||
      Boolean(initialScenarioFilters.showActivityDetails) ||
      Boolean(defaultFilters.showActivityDetails),
  }));

  const animationTimeoutRef = useRef(null);

  useEffect(() => {
    if (animationTimeoutRef.current) {
      window.clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    if (!isAnimating) {
      return undefined;
    }

    animationTimeoutRef.current = window.setTimeout(() => {
      setIsAnimating(false);
      animationTimeoutRef.current = null;
    }, getAnimationTimeoutMs());

    return () => {
      if (animationTimeoutRef.current) {
        window.clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
    };
  }, [
    isAnimating,
    showActivityPartnerMatrixFilters,
    filters.matrixTransitionDurationMs,
  ]);

  function updateFilter(name, value) {
    setIsAnimating(false);

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: name === "resourceCount" ? Math.max(1, Number(value)) : value,
    }));
  }

  function changeScenario(index) {
    const safeIndex = Math.max(0, Math.min(index, scenarios.length - 1));

    if (safeIndex === activeScenarioIndex) {
      return;
    }

    const selectedScenario = scenarios[safeIndex];

    if (!selectedScenario) {
      return;
    }

    setIsAnimating(false);
    setActiveScenarioIndex(safeIndex);

    setFilters((currentFilters) => ({
      ...currentFilters,
      ...selectedScenario.filters,
    }));
  }

  function getAnimationTimeoutMs() {
    if (showActivityPartnerMatrixFilters) {
      return (
        Math.max(6000, Number(filters.matrixTransitionDurationMs) || 20000) +
        500
      );
    }

    return 9000;
  }

  const summaryText =
    typeof summary === "function" ? summary(filters) : summary;

  const scenarioControls = hasScenarios
    ? {
        scenarios,
        activeScenarioIndex,
        onChange: changeScenario,
      }
    : null;

  return (
    <>
      <Header
        filtersCollapsed={filtersCollapsed}
        onToggleFilters={() => setFiltersCollapsed((value) => !value)}
      />

      <main className={`area ${filtersCollapsed ? "filters-collapsed" : ""}`}>
        <FiltersPanel
          filters={filters}
          onChange={updateFilter}
          showQuarterFilters={showQuarterFilters}
          showFlowFilters={showFlowFilters}
          showActivitySectorSankeyFilters={showActivitySectorSankeyFilters}
          showBacklogSankeyFilters={showBacklogSankeyFilters}
          showActivityPartnerMatrixFilters={showActivityPartnerMatrixFilters}
          isAnimating={isAnimating}
          onToggleAnimation={() => setIsAnimating((value) => !value)}
        />

        <MainContent
          title={title}
          description={description}
          filters={filters}
          renderer={renderer}
          isAnimating={isAnimating}
          summary={summaryText}
          scenarioControls={scenarioControls}
        />
      </main>
    </>
  );
}
