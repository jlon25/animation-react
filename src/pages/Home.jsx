import { Link } from "react-router-dom";
import swissFlag from "../assets/swiss-flag.svg";

const examples = [
  {
    path: "/example1",
    title: "Exemple 1",
    subtitle: "Tubes verticaux",
    description:
      "Visualisation sous forme de tubes remplis verticalement, idéale pour représenter un niveau de ressource par tâche avec un rendu simple et intuitif.",
  },
  {
    path: "/example2",
    title: "Exemple 2",
    subtitle: "Dashboard avec barre empilée",
    description:
      "Vue synthétique de la répartition globale des ressources à l’aide d’une barre empilée à 100%, accompagnée de cartes de réglage pour chaque tâche.",
  },
  {
    path: "/example3",
    title: "Exemple 3",
    subtitle: "Cartes avec barres horizontales",
    description:
      "Présentation compacte sous forme de cartes, avec une barre horizontale par tâche pour comparer rapidement les allocations.",
  },
  {
    path: "/example4",
    title: "Exemple 4",
    subtitle: "Vue hybride",
    description:
      "Combinaison des tubes verticaux et d’une barre globale empilée, permettant une lecture détaillée par tâche et une vision d’ensemble.",
  },
  {
    path: "/example5",
    title: "Exemple 5",
    subtitle: "Sankey trimestriel",
    description:
      "Vue alluviale sur quatre trimestres, montrant les transferts de ressources entre activités selon les pondérations et les FTE.",
  },
  {
    path: "/example6",
    title: "Exemple 6",
    subtitle: "En attente / réalisation / secteurs",
    description:
      "Sankey en quantités absolues montrant les activités en attente, les activités réalisées et leur répartition par secteur.",
  },
  {
    path: "/example7",
    title: "Exemple 7",
    subtitle: "Activités et partenaires",
    description:
      "Matrice d’évolution des activités et des partenaires avec transitions continues entre état passé, actuel et futur.",
  },
  {
    path: "/example8",
    title: "Exemple 8",
    subtitle: "Activités et partenaires avec sous-divisions",
    description:
      "Matrice d’évolution des activités et des partenaires et leurs sous-divisions avec transitions continues entre état passé, actuel et futur.",
  },
];

export default function Home() {
  return (
    <div className="home-page">
      <header className="home-header">
        <img className="swiss-flag" src={swissFlag} alt="Drapeau suisse" />

        <div>
          <h1>Répartition des ressources SAM</h1>
        </div>
      </header>

      <main className="home-main">
        <h2>Choisis un rendu pour explorer la répartition des ressources.</h2>
        <section className="tiles-container" aria-label="Liste des exemples">
          {examples.map((example) => (
            <Link className="tile" to={example.path} key={example.path}>
              <span className="tile-kicker">{example.title}</span>
              <h2>{example.subtitle}</h2>
              <p>{example.description}</p>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
