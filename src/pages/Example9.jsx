import ExampleLayout from "../components/ExampleLayout";
import WaitingCasesSankeyRenderer from "../renderers/WaitingCasesSankeyRenderer";

const initialFilters = {
  waitingTitle: "Situation initial 2026 - 4 700 dossiers en attente",

  waitingColumnLabel: "En attente",
  reasonColumnLabel: "Motif",
  situationColumnLabel: "Situation",

  waitingTotal: 4700,

  waitingUnknown: 2585,
  waitingKnown: 2115,

  blackBox: 2585,
  planned: 940,
  internalBlocked: 235,
  externalWaiting: 470,
  readyToClose: 470,
};

export default function Example9() {
  return (
    <ExampleLayout
      title="Répartition des dossiers en attente"
      description="Visualisation des dossiers en attente selon le motif identifié ou non identifié, puis selon la situation opérationnelle."
      renderer={WaitingCasesSankeyRenderer}
      initialFilters={initialFilters}
      summary={() => "4 700 dossiers en attente"}
    />
  );
}
