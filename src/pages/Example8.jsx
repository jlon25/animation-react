import ExampleLayout from "../components/ExampleLayout";
import ActivityPartnerDivisionMatrixRenderer from "../renderers/ActivityPartnerDivisionMatrixRenderer";

const initialFilters = {
  matrixActivityOrder: "MAT,LIGHT,Auditions,ADMIN",

  matrixPastLabel: "État passé",
  matrixPastDate: "01.01.2023 - 31.12.2024",
  matrixPastActivityNames: "MAT,LIGHT,Auditions",
  matrixPastActivityVolumes: "599,466,7100",
  matrixPastPartnerCount: 7,
  matrixPastDivisionValues:
    "MAT|AROCH [AROCH]:10,AVP / STS [AVP / STS]:44,ARNWCH [ARNWCH]:246,ARBE [ARBE]:84,ARWCH [ARWCH]:76,ARTZCH [ARTZCH]:26,ARZCH [ARZCH]:113;" +
    "LIGHT|AROCH [AROCH]:84,AVP / STS [AVP / STS]:365,ARNWCH [ARNWCH]:15,ARBE [ARBE]:0,ARWCH [ARWCH]:1,ARTZCH [ARTZCH]:0,ARZCH [ARZCH]:1;" +
    "Auditions>Longues|AROCH [AROCH]:335,AVP / STS [AVP / STS]:75,ARNWCH [ARNWCH]:1086,ARBE [ARBE]:556,ARWCH [ARWCH]:891,ARTZCH [ARTZCH]:89,ARZCH [ARZCH]:1123;" +
    "Auditions>Courtes|AROCH [AROCH]:48,AVP / STS [AVP / STS]:632,ARNWCH [ARNWCH]:430,ARBE [ARBE]:182,ARWCH [ARWCH]:594,ARTZCH [ARTZCH]:728,ARZCH [ARZCH]:331;",

  matrixCurrentLabel: "État actuel",
  matrixCurrentDate: "01.01.2025 - 31.12.2026",
  matrixCurrentActivityNames: "MAT,LIGHT,Auditions",
  matrixCurrentActivityVolumes: "1707,1832,9296",
  matrixCurrentPartnerCount: 7,
  matrixCurrentDivisionValues:
    "MAT|AROCH [AROCH]:65,AVP / STS [AVP / STS]:85,ARNWCH [ARNWCH]:882,ARBE [ARBE]:97,ARWCH [ARWCH]:211,ARTZCH [ARTZCH]:178,ARZCH [ARZCH]:189;" +
    "LIGHT|AROCH [AROCH]:229,AVP / STS [AVP / STS]:959,ARNWCH [ARNWCH]:219,ARBE [ARBE]:97,ARWCH [ARWCH]:65,ARTZCH [ARTZCH]:120,ARZCH [ARZCH]:143;" +
    "Auditions>Longues|AROCH [AROCH]:168,AVP / STS [AVP / STS]:76,ARNWCH [ARNWCH]:1524,ARBE [ARBE]:413,ARWCH [ARWCH]:1470,ARTZCH [ARTZCH]:54,ARZCH [ARZCH]:1499;" +
    "Auditions>Courtes|AROCH [AROCH]:261,AVP / STS [AVP / STS]:1004,ARNWCH [ARNWCH]:542,ARBE [ARBE]:666,ARWCH [ARWCH]:676,ARTZCH [ARTZCH]:489,ARZCH [ARZCH]:454;",

  matrixFutureLabel: "État futur",
  matrixFutureDate: "01.01.2027 - 31.12.2028",
  matrixFutureActivityNames: "MAT,LIGHT,Auditions,Séjour",
  matrixFutureActivityVolumes: "1400,1798,8625,1012",
  matrixFuturePartnerCount: 7,
  matrixFutureDivisionValues:
    "MAT|AROCH [AROCH]:70,AVP / STS [AVP / STS]: 0,ARNWCH [ARNWCH]:700,ARBE [ARBE]:98,ARWCH [ARWCH]:140,ARTZCH [ARTZCH]:126,ARZCH [ARZCH]:266;" +
    "LIGHT|AROCH [AROCH]:259,AVP / STS [AVP / STS]: 670,ARNWCH [ARNWCH]:316,ARBE [ARBE]:103,ARWCH [ARWCH]:84,ARTZCH [ARTZCH]:207,ARZCH [ARZCH]:159;" +
    "Auditions>Longues|AROCH [AROCH]:102,AVP / STS [AVP / STS]: 0,ARNWCH [ARNWCH]:1589,ARBE [ARBE]:495,ARWCH [ARWCH]:1690,ARTZCH [ARTZCH]:36,ARZCH [ARZCH]:1705;" +
    "Auditions>Courtes|AROCH [AROCH]:363,AVP / STS [AVP / STS]: 1269,ARNWCH [ARNWCH]:267,ARBE [ARBE]:344,ARWCH [ARWCH]:315,ARTZCH [ARTZCH]:0,ARZCH [ARZCH]:450;" +
    "Séjour|ADAR [ADAR]:708,DB ZI [DB ZI]:304;",

  matrixTransitionDurationMs: 16000,
  matrixManualTransitionDurationMs: 3000,

  tooltips: {
    auditions: {
      courtes: {
        description: "Dublin, Kurzbefragung, EB UMA, RüA",
      },
      longues: {
        description: "A1, Audition complémentaire",
      },
    },
  },
};

export default function Example8() {
  return (
    <ExampleLayout
      title="Évolution détaillée des activités et partenaires"
      description=""
      renderer={ActivityPartnerDivisionMatrixRenderer}
      initialFilters={initialFilters}
      showActivityPartnerMatrixFilters
      summary={() => "Activités × divisions"}
    />
  );
}
