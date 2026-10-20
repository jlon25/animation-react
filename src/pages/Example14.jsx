import ExampleLayout from "../components/ExampleLayout";
import ActivityPartnerAnnualMatrixRenderer from "../renderers/ActivityPartnerAnnualMatrixRenderer";

// DONNÉES FICTIVES : remplacer les volumes par les valeurs constatées.
// Les valeurs sont définies par année, activité, sous-activité et partenaire.
// Séjour reste invisible tant que les quatre années totalisent zéro.
const annualData = {
  2023: {
    MAT: {
      AROCH: 7,
      "AVP / STS": 0,
      ARNWCH: 8,
      ARBE: 70,
      ARWCH: 36,
      ARTZCH: 3,
      ARZH: 80,
    },
    LIGHT: {
      AROCH: 0,
      "AVP / STS": 0,
      ARNWCH: 0,
      ARBE: 0,
      ARWCH: 0,
      ARTZCH: 0,
      ARZH: 0,
    },
    Auditions: {
      Longues: {
        AROCH: 100,
        "AVP / STS": 0,
        ARNWCH: 155,
        ARBE: 215,
        ARWCH: 187,
        ARTZCH: 0,
        ARZH: 319,
      },
      Courtes: {
        AROCH: 25,
        "AVP / STS": 0,
        ARNWCH: 119,
        ARBE: 59,
        ARWCH: 220,
        ARTZCH: 313,
        ARZH: 110,
      },
    },
    Séjour: { ADAR: 0, "DB ZI": 0 },
  },

  2024: {
    MAT: {
      AROCH: 6,
      "AVP / STS": 0,
      ARNWCH: 133,
      ARBE: 52,
      ARWCH: 34,
      ARTZCH: 25,
      ARZH: 39,
    },
    LIGHT: {
      AROCH: 86,
      "AVP / STS": 368,
      ARNWCH: 0,
      ARBE: 0,
      ARWCH: 0,
      ARTZCH: 0,
      ARZH: 0,
    },
    Auditions: {
      Longues: {
        AROCH: 160,
        "AVP / STS": 0,
        ARNWCH: 687,
        ARBE: 198,
        ARWCH: 452,
        ARTZCH: 50,
        ARZH: 459,
      },
      Courtes: {
        AROCH: 0,
        "AVP / STS": 631,
        ARNWCH: 123,
        ARBE: 68,
        ARWCH: 129,
        ARTZCH: 221,
        ARZH: 74,
      },
    },
    Séjour: { ADAR: 0, "DB ZI": 0 },
  },

  2025: {
    MAT: {
      AROCH: 28,
      "AVP / STS": 0,
      ARNWCH: 516,
      ARBE: 51,
      ARWCH: 137,
      ARTZCH: 123,
      ARZH: 58,
    },
    LIGHT: {
      AROCH: 25,
      "AVP / STS": 414,
      ARNWCH: 32,
      ARBE: 1,
      ARWCH: 3,
      ARTZCH: 34,
      ARZH: 3,
    },
    Auditions: {
      Longues: {
        AROCH: 212,
        "AVP / STS": 0,
        ARNWCH: 650,
        ARBE: 254,
        ARWCH: 712,
        ARTZCH: 74,
        ARZH: 726,
      },
      Courtes: {
        AROCH: 0,
        "AVP / STS": 346,
        ARNWCH: 280,
        ARBE: 154,
        ARWCH: 294,
        ARTZCH: 504,
        ARZH: 168,
      },
    },
    Séjour: { ADAR: 0, "DB ZI": 0 },
  },

  2026: {
    MAT: {
      AROCH: 45,
      "AVP / STS": 0,
      ARNWCH: 447,
      ARBE: 60,
      ARWCH: 72,
      ARTZCH: 68,
      ARZH: 129,
    },
    LIGHT: {
      AROCH: 71,
      "AVP / STS": 1088,
      ARNWCH: 93,
      ARBE: 3,
      ARWCH: 8,
      ARTZCH: 99,
      ARZH: 8,
    },
    Auditions: {
      Longues: {
        AROCH: 99,
        "AVP / STS": 0,
        ARNWCH: 833,
        ARBE: 292,
        ARWCH: 838,
        ARTZCH: 14,
        ARZH: 874,
      },
      Courtes: {
        AROCH: 203,
        "AVP / STS": 846,
        ARNWCH: 282,
        ARBE: 135,
        ARWCH: 180,
        ARTZCH: 226,
        ARZH: 102,
      },
    },
    Séjour: { ADAR: 0, "DB ZI": 0 },
  },
};

const initialFilters = {
  annualData,
  annualYears: "2023,2024,2025,2026",
  matrixActivityOrder: "Auditions,MAT,LIGHT,Séjour",
  matrixTransitionDurationMs: 17500,
  animationDurationMs: 30000,
  matrixManualTransitionDurationMs: 850,
  showDivisionValues: "true",
  // Largeur disponible pour la matrice des activités, en pourcentage.
  // 100 = largeur actuelle ; 80 = 80 % ; 60 = 60 %.
  // Le bloc est centré, les colonnes sont recalculées proportionnellement.
  // Valeurs autorisées : entre 40 et 100.
  matrixActivityContainerWidthPercent: "75",
};

export default function Example14() {
  return (
    <ExampleLayout
      title="Évolution annuelle des activités SAM (2023–2026)"
      description="Comparaison des prestations et de leur répartition entre partenaires, année par année."
      renderer={ActivityPartnerAnnualMatrixRenderer}
      initialFilters={initialFilters}
      summary={() => "Quatre états annuels × activités × partenaires"}
    />
  );
}
