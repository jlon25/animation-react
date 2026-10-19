import ExampleLayout from "../components/ExampleLayout";
import ActivityPartnerTransferRenderer from "../renderers/ActivityPartnerTransferRenderer";

const initialFilters = {
  // Indicateurs indépendants de la jauge.
  // Le curseur Asile pilote la réallocation SAM.
  // Le curseur Séjour reste un indicateur et ne modifie pas la matrice.
  initialAsylumPendenzen: "15'000",
  initialStayPendenzen: "8'400",

  // Jauge
  gaugeTitle: "Pendenzen",
  gaugeMaxValue: "30'000",
  gaugeAsylumThresholdValue: "5'800",
  gaugeStayThresholdValue: "0",
  totalPendenzen: "30'000",

  // Point pivot métier : à 15'000 pendenzen Asile, on affiche la capacité 2026 réelle.
  asylumCapacityPivotValue: "15'000",

  // Seuil de demande métier : sous ce seuil, la pression Asile ne justifie plus
  // d'activer les volumes de capacité annuels comme dans la situation de référence.
  asylumDemandTargetValue: "5'800",

  // Courbe de demande Asile.
  // 1 = linéaire ; > 1 = baisse plus rapide quand on descend vers le seuil cible.
  asylumDemandCurvePower: "1.6",

  // Activité résiduelle minimale sous le seuil cible.
  // 0 = les volumes MAT / LIGHT / Auditions tombent à 0 sous 5'800 pendenzen.
  // Fonds de roulement minimal pour les prestations Asile.
  // 0.20 = on conserve au minimum 20 % de l’activité Asile activée,
  // même lorsque les pendenzen sont sous le seuil cible.
  asylumMinimumDemandRatio: "0.20",

  // Capacité 2026 réelle issue de l'Example12.
  // À 15'000 pendenzen Asile, la matrice affiche exactement ces volumes.
  matrixBaselineDivisionValues:
    "MAT|AROCH [AROCH]:70,AVP / STS [AVP / STS]:0,ARNWCH [ARNWCH]:700,ARBE [ARBE]:98,ARWCH [ARWCH]:140,ARTZCH [ARTZCH]:126,ARZH [ARZH]:266;" +
    "LIGHT|AROCH [AROCH]:259,AVP / STS [AVP / STS]:670,ARNWCH [ARNWCH]:316,ARBE [ARBE]:103,ARWCH [ARWCH]:84,ARTZCH [ARTZCH]:207,ARZH [ARZH]:159;" +
    "Auditions>Longues|AROCH [AROCH]:102,AVP / STS [AVP / STS]:0,ARNWCH [ARNWCH]:1589,ARBE [ARBE]:495,ARWCH [ARWCH]:1690,ARTZCH [ARTZCH]:36,ARZH [ARZH]:1705;" +
    "Auditions>Courtes|AROCH [AROCH]:363,AVP / STS [AVP / STS]:1269,ARNWCH [ARNWCH]:267,ARBE [ARBE]:344,ARWCH [ARWCH]:315,ARTZCH [ARTZCH]:0,ARZH [ARZH]:450;" +
    "Séjour|ADAR:700,DB ZI:300;",

  // Capacité Séjour au point pivot, calculée depuis la base 2026 : 700 + 300 = 1'000.
  stayWorkUnitsAtPivot: "1'000",

  // Si Asile baisse fortement sous le pivot, SAM peut réengager au maximum
  // 2'000 unités supplémentaires vers Séjour.
  stayAdditionalCapacityAtMinimumAsylum: "2'000",

  // Valeur cible explicite lorsque les pendenzen Asile arrivent à 0.
  // 1'000 de base + 2'000 réengagés = 3'000.
  stayWorkUnitsAtMinimumAsylum: "3'000",

  // Si Asile atteint le maximum de la jauge, toute la capacité Séjour 2026
  // peut être transférée vers les tâches Asile.
  stayWorkUnitsAtMaximumAsylum: "0",

  // Paramètres conservés comme informations métier / compatibilité.
  // La matrice n'utilise plus totalFte × productivityPerFte comme capacité principale.
  totalFte: "10",
  productivityPerFte: "1'200",

  // Pondération métier informative.
  asylumCaseWeight: "2",
  stayCaseWeight: "1",
  asylumPriorityFactor: "1.25",

  matrixActivityOrder: "MAT,LIGHT,Auditions,Séjour",

  // Affichage des valeurs dans les lignes divisions.
  // false par défaut : seules les divisions sont affichées.
  // true via URL : affiche division + valeur.
  showDivisionValues: "false",

  // Seuil minimum de travail (repère VISUEL uniquement).
  // Pourcentage de hauteur mesuré depuis le BAS des colonnes :
  // 0 = seuil masqué, 33.33 = tiers inférieur, 50 = milieu, 100 = haut.
  // Ces deux paramètres sont également modifiables par l'URL.
  matrixMinimumWorkThresholdPercent: "33.33",
  matrixMinimumWorkThresholdLabel: "Seuil minimum de travail",

  // Animation / réaction.
  matrixReactionDelayMs: 600,
  matrixManualTransitionDurationMs: 900,
  // Parcours Asile : depart -> 30'000 -> 0 -> depart.
  // Duree totale : 20 s, dont 0,6 s de decalage pour la matrice.
  // L'animation se termine d'elle-meme, meme si le bouton est reinitialise
  // plus tot par ExampleLayout.
  matrixTransitionDurationMs: 19400, // compatibilite / valeur de repli
  animationDurationMs: 20000,

  tooltips: {
    auditions: {
      courtes: {
        description: "Auditions courtes selon les besoins opérationnels.",
      },
      longues: {
        description:
          "A1, audition complémentaire et cas nécessitant davantage de temps.",
      },
    },
  },
};

export default function Example13() {
  return (
    <ExampleLayout
      title="Évolution des Pendenzen et adaptation SAM"
      description=""
      renderer={ActivityPartnerTransferRenderer}
      initialFilters={initialFilters}
      summary={() => "Pendenzen Asile × demande réelle × capacité 2026 SAM"}
    />
  );
}
