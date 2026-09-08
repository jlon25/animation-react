import ExampleLayout from "../components/ExampleLayout";
import SankeyRenderer from "../renderers/SankeyRenderer";

export default function Example5() {
  return (
    <ExampleLayout
      title="Sankey trimestriel"
      description="Vue alluviale montrant les transferts de ressources entre activités sur quatre trimestres."
      renderer={SankeyRenderer}
      showQuarterFilters
      showFlowFilters
      initialFilters={{
        resourceCount: 4,
        totalFte: 10,
        initialSilo: "Ressources disponibles",
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
          "Build>Build:16.7;Run>Build:16.6;Run>Run:16.7;Run>Innovation:16.6;Support>Support:16.7;Support>Innovation:16.7",
      }}
    />
  );
}
