import { Link } from "react-router-dom";
import swissFlag from "../assets/swiss-flag.svg";

function HomeIcon() {
  return (
    <svg
      className="home-svg"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10.5z" />
    </svg>
  );
}

export default function Header({ filtersCollapsed = false, onToggleFilters }) {
  return (
    <header>
      <img className="swiss-flag" src={swissFlag} alt="Drapeau suisse" />

      <h1>Répartition des ressources SAM</h1>

      {onToggleFilters && (
        <button
          className="toggle-filters-button"
          type="button"
          aria-label={
            filtersCollapsed ? "Afficher les filtres" : "Masquer les filtres"
          }
          title={
            filtersCollapsed ? "Afficher les filtres" : "Masquer les filtres"
          }
          onClick={onToggleFilters}
        >
          ☰
        </button>
      )}

      <Link
        className="home-link"
        to="/"
        aria-label="Retour à l'accueil"
        title="Accueil"
      >
        <HomeIcon />
      </Link>
    </header>
  );
}
