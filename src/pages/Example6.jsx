import ExampleLayout from "../components/ExampleLayout";
import BacklogExecutionSectorSankeyRenderer from "../renderers/BacklogExecutionSectorSankeyRenderer";

const scenarios = [
  {
    name: "État passé",
    description:
      "Ressources allouées à la diminution des décisions MAT en suspens",
    filters: {
      pendingColumnName: "Stocks",
      executionColumnName: "Production",
      weightsQ1: "3,2,1",

      totalResources: 20,

      activityNames: "MAT,LIGHT,Auditions",

      pendingActivityQuantities: "775,128,985",
      executionActivityQuantities: "603,107,821",

      sectorNames: "Asile",

      executionSectorFlows: "MAT>Asile:603;LIGHT>Asile:107;Auditions>Asile:821",

      activityDetails: {
        MAT: {
          budget: 1360000,
        },
        LIGHT: {
          budget: 580000,
        },
        Auditions: {
          budget: 1460000,
        },
      },
    },
  },

  {
    name: "État actuel",
    description:
      "Niveau des décisions MAT en suspens ajusté, ressources redirigées vers la réalisation de décisions LIGHT",
    filters: {
      pendingColumnName: "Stocks",
      executionColumnName: "Production",
      weightsQ1: "3,2,1",

      totalResources: 21.5,

      activityNames: "MAT,LIGHT,Auditions",

      pendingActivityQuantities: "716,368,1056",
      executionActivityQuantities: "557,307,880",

      sectorNames: "Asile,Séjour",

      executionSectorFlows: "MAT>Asile:557;LIGHT>Asile:307;Auditions>Asile:880",

      activityDetails: {
        MAT: {
          budget: 1280000,
        },
        LIGHT: {
          budget: 540000,
        },
        Auditions: {
          budget: 1380000,
        },
      },
    },
  },

  {
    name: "État futur",
    description:
      "Augmentation des ressources permettant la réalisation de nouvelles activités",
    filters: {
      pendingColumnName: "Stocks",
      executionColumnName: "Production",
      weightsQ1: "3,2,1",

      totalResources: 23.5,

      activityNames: "MAT,LIGHT,Auditions,Autres",

      pendingActivityQuantities: "900,383,1006,168",
      executionActivityQuantities: "700,248,838,140",

      sectorNames: "Asile,Séjour",

      executionSectorFlows:
        "MAT>Asile:560;MAT>Séjour:140;LIGHT>Asile:198;LIGHT>Séjour:50;Auditions>Asile:670;Auditions>Séjour:168;Autres>Séjour:140",

      activityDetails: {
        MAT: {
          budget: 1100000,
        },
        LIGHT: {
          budget: 500000,
        },
        Auditions: {
          budget: 1200000,
        },
        Autres: {
          budget: 150000,
        },
      },
    },
  },
];

function sumCsvNumbers(value) {
  return String(value || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
    .reduce((sum, value) => sum + value, 0);
}

function sumFlowQuantities(value) {
  return String(value || "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [, rawQuantity] = item.split(":");
      return Number(rawQuantity);
    })
    .filter((value) => Number.isFinite(value) && value > 0)
    .reduce((sum, value) => sum + value, 0);
}

function getScenarioMaxQuantity(scenario) {
  const filters = scenario.filters;

  return Math.max(
    sumCsvNumbers(filters.pendingActivityQuantities),
    sumCsvNumbers(filters.executionActivityQuantities),
    sumFlowQuantities(filters.executionSectorFlows),
    1
  );
}

const scenarioScaleMaxQuantity = Math.max(
  ...scenarios.map(getScenarioMaxQuantity),
  1
);

const scenariosWithScale = scenarios.map((scenario) => ({
  ...scenario,
  filters: {
    ...scenario.filters,
    scaleMaxQuantity: scenarioScaleMaxQuantity,
  },
}));

export default function Example6() {
  return (
    <ExampleLayout
      title="Adaptation des ressources aux besoins opérationnels"
      description="Une organisation flexible permettant de réaffecter les ressources en fonction de l'évolution des activités."
      renderer={BacklogExecutionSectorSankeyRenderer}
      showBacklogSankeyFilters
      scenarios={scenariosWithScale}
      initialFilters={scenariosWithScale[0].filters}
      summary={(filters) =>
        `${Number(filters.totalResources) || 0} ressources à disposition`
      }
    />
  );
}
