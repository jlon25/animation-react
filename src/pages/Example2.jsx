import ExampleLayout from "../components/ExampleLayout";
import HorizontalFilledBarRenderer from "../renderers/HorizontalFilledBarRenderer";

export default function Example2() {
  return (
    <ExampleLayout
      title="Exemple 2 - Dashboard avec barre empilée"
      description="Vue synthétique de la répartition globale des ressources à l’aide d’une barre empilée à 100%."
      renderer={HorizontalFilledBarRenderer}
      initialFilters={{
        resourceCount: 3,
        totalFte: 10,
        activityNames: "Build, Run, Support",
        weightsQ1: "3,2,1",
      }}
    />
  );
}
