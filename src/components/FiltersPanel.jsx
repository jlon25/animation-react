export default function FiltersPanel({
  filters,
  onChange,
  showQuarterFilters = false,
  showFlowFilters = false,
  showActivitySectorSankeyFilters = false,
  showBacklogSankeyFilters = false,
  showActivityPartnerMatrixFilters = false,
  isAnimating = false,
  onToggleAnimation,
}) {
  return (
    <aside className="left filters">
      <button type="button" onClick={onToggleAnimation}>
        {isAnimating ? "Arrêter l’animation" : "Lancer l’animation"}
      </button>

      {!showBacklogSankeyFilters && !showActivityPartnerMatrixFilters && (
        <label>
          Nb de ressources :
          <input
            type="number"
            min="1"
            step="1"
            value={filters.resourceCount}
            onChange={(event) => onChange("resourceCount", event.target.value)}
          />
        </label>
      )}

      {!showActivityPartnerMatrixFilters && (
        <>
          <label>
            Total ressources :
            <input
              type="number"
              min="0"
              step="0.1"
              value={filters.totalResources}
              onChange={(event) =>
                onChange("totalResources", event.target.value)
              }
            />
          </label>

          <label>
            Activités :
            <input
              type="text"
              value={filters.activityNames}
              onChange={(event) =>
                onChange("activityNames", event.target.value)
              }
            />
          </label>
        </>
      )}

      {!showQuarterFilters && !showActivityPartnerMatrixFilters && (
        <label>
          Pondérations :
          <input
            type="text"
            value={filters.weightsQ1}
            onChange={(event) => onChange("weightsQ1", event.target.value)}
          />
        </label>
      )}

      {showQuarterFilters && (
        <>
          <label>
            Nom du silo initial :
            <input
              type="text"
              value={filters.initialSilo}
              onChange={(event) => onChange("initialSilo", event.target.value)}
            />
          </label>
          <label>
            Pondérations T1 :
            <input
              type="text"
              value={filters.weightsQ1}
              onChange={(event) => onChange("weightsQ1", event.target.value)}
            />
          </label>

          <label>
            Pondérations T2 :
            <input
              type="text"
              value={filters.weightsQ2}
              onChange={(event) => onChange("weightsQ2", event.target.value)}
            />
          </label>

          <label>
            Pondérations T3 :
            <input
              type="text"
              value={filters.weightsQ3}
              onChange={(event) => onChange("weightsQ3", event.target.value)}
            />
          </label>

          <label>
            Pondérations T4 :
            <input
              type="text"
              value={filters.weightsQ4}
              onChange={(event) => onChange("weightsQ4", event.target.value)}
            />
          </label>
        </>
      )}

      {showFlowFilters && (
        <>
          <label>
            Flux T1 → T2 :
            <textarea
              rows="4"
              value={filters.flowsQ1Q2}
              onChange={(event) => onChange("flowsQ1Q2", event.target.value)}
            />
          </label>

          <label>
            Flux T2 → T3 :
            <textarea
              rows="4"
              value={filters.flowsQ2Q3}
              onChange={(event) => onChange("flowsQ2Q3", event.target.value)}
            />
          </label>

          <label>
            Flux T3 → T4 :
            <textarea
              rows="4"
              value={filters.flowsQ3Q4}
              onChange={(event) => onChange("flowsQ3Q4", event.target.value)}
            />
          </label>
        </>
      )}
      {showBacklogSankeyFilters && (
        <>
          <label>
            Nom colonne gauche :
            <input
              type="text"
              value={filters.pendingColumnName}
              onChange={(event) =>
                onChange("pendingColumnName", event.target.value)
              }
            />
          </label>

          <label>
            Nom colonne centrale :
            <input
              type="text"
              value={filters.executionColumnName}
              onChange={(event) =>
                onChange("executionColumnName", event.target.value)
              }
            />
          </label>

          <label>
            Quantités en attente :
            <input
              type="text"
              value={filters.pendingActivityQuantities}
              onChange={(event) =>
                onChange("pendingActivityQuantities", event.target.value)
              }
            />
          </label>

          <label>
            Quantités réalisées :
            <input
              type="text"
              value={filters.executionActivityQuantities}
              onChange={(event) =>
                onChange("executionActivityQuantities", event.target.value)
              }
            />
          </label>

          <label>
            Secteurs :
            <input
              type="text"
              value={filters.sectorNames}
              onChange={(event) => onChange("sectorNames", event.target.value)}
            />
          </label>

          <label>
            Flux réalisé → secteurs :
            <textarea
              rows="5"
              value={filters.executionSectorFlows}
              onChange={(event) =>
                onChange("executionSectorFlows", event.target.value)
              }
            />
          </label>
          <div className="filter-field filter-checkbox-field">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={Boolean(filters.showActivityDetails)}
                onChange={(event) =>
                  onChange("showActivityDetails", event.target.checked)
                }
              />

              <span>Afficher le détail des activités</span>
            </label>

            <small>
              Affiche les informations détaillées sous le graphique, notamment
              pour les activités dont le bloc est trop petit.
            </small>
          </div>
        </>
      )}

      {showActivityPartnerMatrixFilters && (
        <>
          <label>
            Durée de transition automatique en ms
            <input
              type="number"
              min="3000"
              step="500"
              value={filters.matrixTransitionDurationMs || 10000}
              onChange={(event) =>
                onChange("matrixTransitionDurationMs", event.target.value)
              }
            />
          </label>

          <label>
            Pas d’incrémentation des divisions partenaires
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={filters.matrixPartnerCountDisplayStep || 1}
              onChange={(event) =>
                onChange("matrixPartnerCountDisplayStep", event.target.value)
              }
            />
          </label>

          <label>
            Durée transition entre états en ms
            <input
              type="number"
              min="800"
              step="250"
              value={filters.matrixManualTransitionDurationMs || 3000}
              onChange={(event) =>
                onChange("matrixManualTransitionDurationMs", event.target.value)
              }
            />
          </label>

          <label>
            Libellé état passé
            <input
              type="text"
              value={filters.matrixPastLabel || ""}
              onChange={(event) =>
                onChange("matrixPastLabel", event.target.value)
              }
            />
          </label>

          <label>
            Activités état passé
            <input
              type="text"
              value={filters.matrixPastActivityNames || ""}
              onChange={(event) =>
                onChange("matrixPastActivityNames", event.target.value)
              }
            />
          </label>

          <label>
            Volumes état passé
            <input
              type="text"
              value={filters.matrixPastActivityVolumes || ""}
              onChange={(event) =>
                onChange("matrixPastActivityVolumes", event.target.value)
              }
            />
          </label>

          <label>
            Nombre de partenaires état passé
            <input
              type="number"
              min="1"
              value={filters.matrixPastPartnerCount || 1}
              onChange={(event) =>
                onChange("matrixPastPartnerCount", event.target.value)
              }
            />
          </label>

          <label>
            Libellé état actuel
            <input
              type="text"
              value={filters.matrixCurrentLabel || ""}
              onChange={(event) =>
                onChange("matrixCurrentLabel", event.target.value)
              }
            />
          </label>

          <label>
            Activités état actuel
            <input
              type="text"
              value={filters.matrixCurrentActivityNames || ""}
              onChange={(event) =>
                onChange("matrixCurrentActivityNames", event.target.value)
              }
            />
          </label>

          <label>
            Volumes état actuel
            <input
              type="text"
              value={filters.matrixCurrentActivityVolumes || ""}
              onChange={(event) =>
                onChange("matrixCurrentActivityVolumes", event.target.value)
              }
            />
          </label>

          <label>
            Nombre de partenaires état actuel
            <input
              type="number"
              min="1"
              value={filters.matrixCurrentPartnerCount || 1}
              onChange={(event) =>
                onChange("matrixCurrentPartnerCount", event.target.value)
              }
            />
          </label>

          <label>
            Libellé état futur
            <input
              type="text"
              value={filters.matrixFutureLabel || ""}
              onChange={(event) =>
                onChange("matrixFutureLabel", event.target.value)
              }
            />
          </label>

          <label>
            Activités état futur
            <input
              type="text"
              value={filters.matrixFutureActivityNames || ""}
              onChange={(event) =>
                onChange("matrixFutureActivityNames", event.target.value)
              }
            />
          </label>

          <label>
            Volumes état futur
            <input
              type="text"
              value={filters.matrixFutureActivityVolumes || ""}
              onChange={(event) =>
                onChange("matrixFutureActivityVolumes", event.target.value)
              }
            />
          </label>

          <label>
            Nombre de partenaires état futur
            <input
              type="number"
              min="1"
              value={filters.matrixFuturePartnerCount || 1}
              onChange={(event) =>
                onChange("matrixFuturePartnerCount", event.target.value)
              }
            />
          </label>
        </>
      )}
    </aside>
  );
}
