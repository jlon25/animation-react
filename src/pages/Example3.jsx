import ExampleLayout from "../components/ExampleLayout";
import HorizontalSimpleBarsRenderer from "../renderers/HorizontalSimpleBarsRenderer";

export default function Example3() {
  return (
    <ExampleLayout
      title="Exemple 3 - Cartes avec barres horizontales"
      description="Présentation compacte sous forme de cartes, avec une barre horizontale par ressource."
      renderer={HorizontalSimpleBarsRenderer}
      initialFilters={{
        resourceCount: 3,
        totalFte: 10,
        activityNames: "Build, Run, Support",
        weightsQ1: "3,2,1",
      }}
    />
  );
}
