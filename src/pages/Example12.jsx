import ExampleLayout from "../components/ExampleLayout";
import ActivityPartnerGaugeMatrixRenderer from "../renderers/ActivityPartnerGaugeMatrixRenderer";

const initialFilters = {
  matrixActivityOrder: "MAT,LIGHT,Auditions,Séjour",

  matrixPastLabel: "dossiers",
  matrixPastDate: "01.01.2024 - 31.12.2024",
  matrixPastActivityNames: "MAT,LIGHT,Auditions",
  matrixPastActivityVolumes: "700,1200,6100",
  matrixPastPartnerCount: 7,
  matrixPastDivisionValues:
    "MAT|AROCH [AROCH]:35,AVP / STS [AVP / STS]:0,ARNWCH [ARNWCH]:360,ARBE [ARBE]:50,ARWCH [ARWCH]:70,ARTZCH [ARTZCH]:65,ARZH [ARZH]:120;" +
    "LIGHT|AROCH [AROCH]:180,AVP / STS [AVP / STS]:410,ARNWCH [ARNWCH]:220,ARBE [ARBE]:70,ARWCH [ARWCH]:55,ARTZCH [ARTZCH]:145,ARZH [ARZH]:120;" +
    "Auditions>Longues|AROCH [AROCH]:70,AVP / STS [AVP / STS]:0,ARNWCH [ARNWCH]:1150,ARBE [ARBE]:310,ARWCH [ARWCH]:1220,ARTZCH [ARTZCH]:20,ARZH [ARZH]:1220;" +
    "Auditions>Courtes|AROCH [AROCH]:260,AVP / STS [AVP / STS]:850,ARNWCH [ARNWCH]:190,ARBE [ARBE]:250,ARWCH [ARWCH]:230,ARTZCH [ARTZCH]:0,ARZH [ARZH]:330;",

  matrixCurrentLabel: "dossiers",
  matrixCurrentDate: "01.01.2025 - 31.12.2025",
  matrixCurrentActivityNames: "MAT,LIGHT,Auditions",
  matrixCurrentActivityVolumes: "900,1500,7700",
  matrixCurrentPartnerCount: 7,
  matrixCurrentDivisionValues:
    "MAT|AROCH [AROCH]:50,AVP / STS [AVP / STS]:0,ARNWCH [ARNWCH]:470,ARBE [ARBE]:65,ARWCH [ARWCH]:95,ARTZCH [ARTZCH]:90,ARZH [ARZH]:130;" +
    "LIGHT|AROCH [AROCH]:220,AVP / STS [AVP / STS]:540,ARNWCH [ARNWCH]:265,ARBE [ARBE]:85,ARWCH [ARWCH]:70,ARTZCH [ARTZCH]:175,ARZH [ARZH]:145;" +
    "Auditions>Longues|AROCH [AROCH]:85,AVP / STS [AVP / STS]:0,ARNWCH [ARNWCH]:1380,ARBE [ARBE]:420,ARWCH [ARWCH]:1470,ARTZCH [ARTZCH]:28,ARZH [ARZH]:1420;" +
    "Auditions>Courtes|AROCH [AROCH]:320,AVP / STS [AVP / STS]:1080,ARNWCH [ARNWCH]:235,ARBE [ARBE]:300,ARWCH [ARWCH]:285,ARTZCH [ARTZCH]:0,ARZH [ARZH]:397;",

  matrixFutureLabel: "dossiers",
  matrixFutureDate: "01.01.2026 - 31.12.2026",
  matrixFutureActivityNames: "MAT,LIGHT,Auditions,Séjour",
  matrixFutureActivityVolumes: "1400,1798,8625,1012",
  matrixFuturePartnerCount: 7,
  matrixFutureDivisionValues:
    "MAT|AROCH [AROCH]:70,AVP / STS [AVP / STS]:0,ARNWCH [ARNWCH]:700,ARBE [ARBE]:98,ARWCH [ARWCH]:140,ARTZCH [ARTZCH]:126,ARZH [ARZH]:266;" +
    "LIGHT|AROCH [AROCH]:259,AVP / STS [AVP / STS]:670,ARNWCH [ARNWCH]:316,ARBE [ARBE]:103,ARWCH [ARWCH]:84,ARTZCH [ARTZCH]:207,ARZH [ARZH]:159;" +
    "Auditions>Longues|AROCH [AROCH]:102,AVP / STS [AVP / STS]:0,ARNWCH [ARNWCH]:1589,ARBE [ARBE]:495,ARWCH [ARWCH]:1690,ARTZCH [ARTZCH]:36,ARZH [ARZH]:1705;" +
    "Auditions>Courtes|AROCH [AROCH]:363,AVP / STS [AVP / STS]:1269,ARNWCH [ARNWCH]:267,ARBE [ARBE]:344,ARWCH [ARWCH]:315,ARTZCH [ARTZCH]:0,ARZH [ARZH]:450;" +
    "Séjour|ADAR:708,DB ZI:304;",

  gaugeTitle: "Pendenzen",
  gaugePastValue: "20'000",
  gaugeCurrentValue: "25'000",
  gaugeFutureValue: "10'000",
  gaugeMaxValue: "30'000",
  gaugeThresholdValue: "5'800",

  tooltips: {
    auditions: {
      courtes: {
        description: "Auditions courtes selon les besoins opérationnels.",
      },
      longues: {
        description: "A1, audition complémentaire et cas nécessitant davantage de temps.",
      },
    },
  },

  matrixTransitionDurationMs: 18000,
  matrixReactionDelayMs: 1000,
  animationDurationMs: 20000,
  matrixManualTransitionDurationMs: 1200,
};

export default function Example12() {
  return (
    <ExampleLayout
      title="Évolution des Pendenzen et adaptation SAM"
      description=""
      renderer={ActivityPartnerGaugeMatrixRenderer}
      initialFilters={initialFilters}
      showActivityPartnerMatrixFilters
      summary={() => "Besoin global × activités SAM"}
    />
  );
}
