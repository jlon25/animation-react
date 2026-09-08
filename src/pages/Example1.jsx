import ExampleLayout from "../components/ExampleLayout";
import TubesRenderer from "../renderers/TubesRenderer";

export default function Example1() {
  return (
    <ExampleLayout
      title="Exemple 1 - Tubes de répartitions des ressources"
      description="Visualisation sous forme de tubes remplis verticalement."
      renderer={TubesRenderer}
      initialFilters={{
        resourceCount: 3,
        totalFte: 10,
        activityNames: "Build, Run, Support",
        weightsQ1: "3,2,1",
      }}
    />
  );
}
