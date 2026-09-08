import ExampleLayout from "../components/ExampleLayout";
import HybridRenderer from "../renderers/HybridRenderer";
export default function Example4() {
  return (
    <ExampleLayout
      title="Exemple 4 - Vue hybride - Tubes + barre globale"
      description="Combinaison d’une barre globale empilée et de tubes verticaux pour une lecture globale et détaillée."
      renderer={HybridRenderer}
      initialFilters={{
        resourceCount: 4,
        totalFte: 10,
        activityNames: "MAT, LIGHT, Auditions, ADMIN",
        weightsQ1: "3,2,1,1",
      }}
    />
  );
}
