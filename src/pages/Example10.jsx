import ExampleLayout from "../components/ExampleLayout";
import WaitingCasesClassicSankeyRenderer from "../renderers/WaitingCasesClassicSankeyRenderer";

const initialFilters = {
  waitingTitle: "Répartition des 4 700 dossiers en attente",

  waitingColumnLabel: "EN ATTENTE",
  reasonColumnLabel: "MOTIF",
  situationColumnLabel: "SITUATION",

  waitingNodeLabel: "Tous les dossiers\nen attente",

  unknownReasonLabel: "Raisons non\nidentifiées",
  knownReasonLabel: "Raisons\nidentifiées",

  blackBoxLabel: "Angle mort",
  plannedLabel: "Suite planifiée",
  internalBlockedLabel: "Blocage interne",
  externalWaitingLabel: "Attente externe",
  readyToCloseLabel: "Prêts pour clôture",

  waitingTotal: 4700,

  waitingUnknown: 2585,
  waitingKnown: 2115,

  blackBox: 2585,
  planned: 940,
  internalBlocked: 235,
  externalWaiting: 470,
  readyToClose: 470,

  animationDurationMs: 22000,
};

export default function Example10() {
  return (
    <ExampleLayout
      title="Répartition des dossiers en attente"
      description="Sankey classique de répartition des dossiers en attente entre motifs identifiés et non identifiés, avec détail des situations opérationnelles associées."
      renderer={WaitingCasesClassicSankeyRenderer}
      initialFilters={initialFilters}
      summary={() => "4 700 dossiers en attente"}
    />
  );
}
