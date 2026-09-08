import ExampleLayout from "../components/ExampleLayout";
import ActivityPartnerMatrixRenderer from "../renderers/ActivityPartnerMatrixRenderer";

const initialFilters = {
  matrixTransitionDurationMs: 20000,
  matrixManualTransitionDurationMs: 3000,
  matrixPartnerCountDisplayStep: 1,

  matrixPastLabel: "État passé",
  matrixPastActivityNames: "MAT,Auditions",
  matrixPastActivityVolumes: "40,120",
  matrixPastPartnerCount: 3,

  matrixCurrentLabel: "État actuel",
  matrixCurrentActivityNames: "MAT,Auditions,LIGHT",
  matrixCurrentActivityVolumes: "80,100,30",
  matrixCurrentPartnerCount: 7,

  matrixFutureLabel: "État futur",
  matrixFutureActivityNames: "MAT,Auditions,LIGHT,Admin",
  matrixFutureActivityVolumes: "50,50,120,30",
  matrixFuturePartnerCount: 10,
};

export default function Example7() {
  return (
    <ExampleLayout
      title="Évolution des activités et partenaires"
      description="Visualisation matricielle du volume réalisé selon les activités et les divisions partenaires."
      renderer={ActivityPartnerMatrixRenderer}
      initialFilters={initialFilters}
      showActivityPartnerMatrixFilters
      summary={() => "Activités × partenaires"}
    />
  );
}
