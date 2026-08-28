"use client";

import { useMemo, useState } from "react";
import medicationsData from "@/data/medications.json";

const POPULAR_TERMS = [
  "Tylenol",
  "Febrax",
  "Lomotil",
  "XL-3",
  "Paracetamol",
  "Advil",
];

type Medication = (typeof medicationsData.medications)[number];

type SearchResult = {
  medication: Medication;
  score: number;
  matchType: "brand" | "commercial" | "ingredient" | "alias" | "general";
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [selectedMedicationId, setSelectedMedicationId] = useState<
    string | null
  >(null);

  const normalizedQuery = normalize(query);

  const searchResults = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    const results: SearchResult[] = [];

    for (const medication of medicationsData.medications) {
      const brandTerms =
        medication.searchProfile?.brandTerms?.map(normalize) ?? [];

      const ingredientTerms =
        medication.searchProfile?.ingredientTerms?.map(normalize) ?? [];

      const aliases = medication.searchProfile?.aliases?.map(normalize) ?? [];

      const commercialNames =
        medication.products?.map((product) =>
          normalize(product.commercialName),
        ) ?? [];

      const displayName = normalize(medication.displayName);

      let score = 0;
      let matchType: SearchResult["matchType"] = "general";

      if (brandTerms.some((term) => term === normalizedQuery)) {
        score = 100;
        matchType = "brand";
      } else if (brandTerms.some((term) => term.includes(normalizedQuery))) {
        score = 90;
        matchType = "brand";
      } else if (
        commercialNames.some((term) => term.includes(normalizedQuery))
      ) {
        score = 80;
        matchType = "commercial";
      } else if (
        ingredientTerms.some((term) => term.includes(normalizedQuery))
      ) {
        score = 70;
        matchType = "ingredient";
      } else if (aliases.some((term) => term.includes(normalizedQuery))) {
        score = 60;
        matchType = "alias";
      } else if (displayName.includes(normalizedQuery)) {
        score = 50;
        matchType = "general";
      }

      if (score > 0) {
        results.push({
          medication,
          score,
          matchType,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }, [normalizedQuery]);

  const selectedMedication = useMemo(() => {
    if (!selectedMedicationId) {
      return null;
    }

    return (
      medicationsData.medications.find(
        (medication) => medication.id === selectedMedicationId,
      ) ?? null
    );
  }, [selectedMedicationId]);

  const selectedBrandEntry = useMemo(() => {
    if (!selectedMedication || !query.trim()) {
      return null;
    }

    const entries = selectedMedication.brandEntryPoints;

    if (!entries) {
      return null;
    }

    const found = Object.entries(entries).find(
      ([brand]) => normalize(brand) === normalize(query),
    );

    if (!found) {
      return null;
    }

    return {
      brand: found[0],
      data: found[1],
    };
  }, [selectedMedication, query]);

  const comparison = useMemo(() => {
    if (!selectedMedication) {
      return null;
    }

    const offers = selectedMedication.products.flatMap((product) =>
      product.offers.map((offer) => ({
        ...offer,
        productId: product.id,
        productName: product.commercialName,
        brand: product.brand,
        relationToReference:
          "relationToReference" in product ? product.relationToReference : null,
        recommendationLabel:
          "recommendationLabel" in product ? product.recommendationLabel : null,
        isReferenceBrand:
          "isReferenceBrand" in product ? product.isReferenceBrand : false,
      })),
    );

    if (offers.length === 0) {
      return null;
    }

    const sortedOffers = [...offers].sort((a, b) => a.price - b.price);

    const cheapest = sortedOffers[0];

    return {
      offers: sortedOffers,
      cheapest,
    };
  }, [selectedMedication]);

  const exactBrandOffers = useMemo(() => {
    if (!comparison || !selectedBrandEntry) {
      return [];
    }

    return comparison.offers.filter((offer) => offer.isReferenceBrand === true);
  }, [comparison, selectedBrandEntry]);

  const exactAlternatives = useMemo(() => {
    if (!comparison || !selectedBrandEntry) {
      return [];
    }

    return comparison.offers.filter(
      (offer) =>
        offer.relationToReference ===
        "exact-active-ingredients-strength-form-quantity",
    );
  }, [comparison, selectedBrandEntry]);

  const relatedMedications = useMemo(() => {
    if (!selectedMedication?.relatedMedicationIds) {
      return [];
    }

    return selectedMedication.relatedMedicationIds
      .map((relation) => {
        const medication = medicationsData.medications.find(
          (item) => item.id === relation.medicationId,
        );

        if (!medication) {
          return null;
        }

        return {
          medication,
          relation,
        };
      })
      .filter(Boolean);
  }, [selectedMedication]);

  const popularMedications = useMemo(() => {
    return POPULAR_TERMS.map((term) => {
      const normalizedTerm = normalize(term);

      return medicationsData.medications.find((medication) => {
        const brands =
          medication.searchProfile?.brandTerms?.map(normalize) ?? [];

        const aliases = medication.searchProfile?.aliases?.map(normalize) ?? [];

        return (
          brands.includes(normalizedTerm) ||
          aliases.includes(normalizedTerm) ||
          normalize(medication.displayName).includes(normalizedTerm)
        );
      });
    }).filter(Boolean);
  }, []);

  function handleSelectMedication(
    medicationId: string,
    selectedQuery?: string,
  ) {
    setSelectedMedicationId(medicationId);

    if (selectedQuery) {
      setQuery(selectedQuery);
      return;
    }

    const medication = medicationsData.medications.find(
      (item) => item.id === medicationId,
    );

    if (medication) {
      setQuery(medication.displayName);
    }
  }

  function handleResetSearch() {
    setSelectedMedicationId(null);
    setQuery("");
  }

  function getPharmacyName(pharmacyId: string) {
    return (
      medicationsData.pharmacies.find((pharmacy) => pharmacy.id === pharmacyId)
        ?.name ?? pharmacyId
    );
  }

  return (
    <main className="site-shell">
      <div className="page-container">
        <header className="site-header">
          <button type="button" className="brand" onClick={handleResetSearch}>
            <span className="brand-mark">EF</span>
            <span>Entre farmacias</span>
          </button>
        </header>

        {!selectedMedication && (
          <>
            <section className="hero">
              <div className="hero-badge">Compara antes de comprar</div>

              <h1>
                Encuentra tu medicamento
                <span> al mejor precio encontrado.</span>
              </h1>

              <p className="hero-description">
                Busca por marca o por principio activo y compara los precios
                publicados en distintas farmacias.
              </p>

              <div className="search-wrapper">
                <label htmlFor="medication-search" className="search-label">
                  ¿Qué medicamento buscas?
                </label>

                <div className="search-box">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="search-icon"
                  >
                    <path
                      d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>

                  <input
                    id="medication-search"
                    type="text"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setSelectedMedicationId(null);
                    }}
                    placeholder="Ej. Febrax, Tylenol, Lomotil, Paracetamol..."
                    autoComplete="off"
                  />

                  {query && (
                    <button
                      type="button"
                      className="clear-search"
                      onClick={() => setQuery("")}
                      aria-label="Limpiar búsqueda"
                    >
                      ×
                    </button>
                  )}
                </div>

                {query.trim() && (
                  <div className="search-results">
                    {searchResults.length > 0 ? (
                      searchResults.map(({ medication, matchType }) => {
                        const mainBrand =
                          medication.searchProfile?.brandTerms?.[0];

                        return (
                          <button
                            type="button"
                            key={medication.id}
                            className="search-result"
                            onClick={() =>
                              handleSelectMedication(
                                medication.id,
                                matchType === "brand" && mainBrand
                                  ? mainBrand
                                  : medication.displayName,
                              )
                            }
                          >
                            <div>
                              <strong>{medication.displayName}</strong>

                              <span>{getMatchLabel(matchType)}</span>
                            </div>

                            <span className="result-arrow">→</span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="no-results">
                        No encontramos ese medicamento.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {!query.trim() && (
              <section className="popular-section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Búsquedas populares</p>
                    <h2>Prueba con una marca conocida</h2>
                  </div>

                  <p>
                    Puedes buscar tanto marcas comerciales como principios
                    activos.
                  </p>
                </div>

                <div className="popular-grid">
                  {popularMedications.map((medication) => {
                    if (!medication) {
                      return null;
                    }

                    const brand = medication.searchProfile?.brandTerms?.[0];

                    return (
                      <button
                        type="button"
                        key={medication.id}
                        className="popular-card"
                        onClick={() =>
                          handleSelectMedication(
                            medication.id,
                            brand ?? medication.displayName,
                          )
                        }
                      >
                        <div className="popular-icon">
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M7.5 4.5h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3Zm4.5 4v7m-3.5-3.5h7"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>

                        <div className="popular-content">
                          <strong>{brand ?? medication.displayName}</strong>

                          <span>{medication.displayName}</span>
                        </div>

                        <span className="popular-arrow">→</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {selectedMedication && (
          <section className="results-page">
            <button
              type="button"
              className="back-button"
              onClick={handleResetSearch}
            >
              <span>←</span>
              Buscar otro medicamento
            </button>

            {selectedBrandEntry ? (
              <>
                <div className="medication-heading">
                  <p className="eyebrow">{selectedMedication.category}</p>

                  <h1>{selectedBrandEntry.data.headline}</h1>

                  <p>{selectedMedication.displayName}</p>
                </div>

                {exactBrandOffers.length > 0 && (
                  <section className="other-options">
                    <div className="section-heading results-heading">
                      <div>
                        <p className="eyebrow">Producto que buscaste</p>

                        <h2>Precios de {selectedBrandEntry.brand}</h2>
                      </div>

                      <span>
                        {exactBrandOffers.length}{" "}
                        {exactBrandOffers.length === 1 ? "precio" : "precios"}
                      </span>
                    </div>

                    <div className="offers-list">
                      {exactBrandOffers.map((offer, index) => (
                        <OfferCard
                          key={`${offer.productId}-${offer.pharmacyId}-${offer.sku}`}
                          offer={offer}
                          index={index}
                          cheapestPrice={
                            exactBrandOffers[0]?.price ?? offer.price
                          }
                          medication={selectedMedication}
                          getPharmacyName={getPharmacyName}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {exactAlternatives.length > 0 && (
                  <section className="other-options">
                    <div className="section-heading results-heading">
                      <div>
                        <p className="eyebrow">Alternativas encontradas</p>

                        <h2>Mismos principios activos y presentación</h2>
                      </div>
                    </div>

                    <div className="brand-warning">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                        <path
                          d="M12 11v5m0-8v.2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>

                      <p>
                        {selectedBrandEntry.data.alternativeHeadline}{" "}
                        <strong>
                          Esto no significa que sean intercambiables ni que
                          debas cambiar un medicamento indicado por un
                          profesional.
                        </strong>
                      </p>
                    </div>

                    <div className="offers-list">
                      {exactAlternatives.map((offer, index) => (
                        <OfferCard
                          key={`${offer.productId}-${offer.pharmacyId}-${offer.sku}`}
                          offer={offer}
                          index={index}
                          cheapestPrice={
                            exactAlternatives[0]?.price ?? offer.price
                          }
                          medication={selectedMedication}
                          getPharmacyName={getPharmacyName}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {relatedMedications.length > 0 && (
                  <section className="other-options">
                    <div className="section-heading">
                      <div>
                        <p className="eyebrow">Otras presentaciones</p>

                        <h2>También puedes consultar</h2>
                      </div>
                    </div>

                    <div className="popular-grid">
                      {relatedMedications.map((item) => {
                        if (!item) {
                          return null;
                        }

                        return (
                          <button
                            key={item.medication.id}
                            type="button"
                            className="popular-card"
                            onClick={() =>
                              handleSelectMedication(
                                item.medication.id,
                                item.medication.displayName,
                              )
                            }
                          >
                            <div className="popular-content">
                              <strong>{item.medication.displayName}</strong>

                              <span>{item.relation.label}</span>
                            </div>

                            <span className="popular-arrow">→</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <>
                <div className="medication-heading">
                  <p className="eyebrow">{selectedMedication.category}</p>

                  <h1>{selectedMedication.displayName}</h1>

                  <p>
                    Comparamos las opciones encontradas para esta presentación.
                  </p>
                </div>

                {comparison && (
                  <>
                    <section className="best-option">
                      <div className="best-option-copy">
                        <div className="best-badge">
                          Mejor precio encontrado
                        </div>

                        <p className="best-label">Lo encontramos en</p>

                        <h2>
                          {getPharmacyName(comparison.cheapest.pharmacyId)}
                        </h2>

                        <div className="best-price">
                          <span>$</span>
                          {comparison.cheapest.price.toFixed(2)}
                        </div>

                        <p className="best-product">
                          {comparison.cheapest.productName}
                        </p>

                        <a
                          href={comparison.cheapest.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="primary-button"
                        >
                          Ver producto
                          <span>↗</span>
                        </a>
                      </div>

                      <div className="best-option-side">
                        <div className="unit-price-card">
                          <span>Precio por unidad</span>

                          <strong>
                            ${comparison.cheapest.pricePerUnit.toFixed(2)}
                          </strong>

                          <small>{comparison.cheapest.pricePerUnitLabel}</small>
                        </div>

                        <div className="updated-card">
                          <span>Precio consultado</span>

                          <strong>
                            {formatDate(comparison.cheapest.checkedAt)}
                          </strong>

                          <small>Puede haber cambiado desde entonces.</small>
                        </div>
                      </div>
                    </section>

                    <section className="other-options">
                      <div className="section-heading results-heading">
                        <div>
                          <p className="eyebrow">Compara antes de comprar</p>

                          <h2>Opciones encontradas</h2>
                        </div>

                        <span>
                          {comparison.offers.length}{" "}
                          {comparison.offers.length === 1
                            ? "opción"
                            : "opciones"}
                        </span>
                      </div>

                      <div className="offers-list">
                        {comparison.offers.map((offer, index) => (
                          <OfferCard
                            key={`${offer.productId}-${offer.pharmacyId}-${offer.sku}`}
                            offer={offer}
                            index={index}
                            cheapestPrice={comparison.cheapest.price}
                            medication={selectedMedication}
                            getPharmacyName={getPharmacyName}
                          />
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </>
            )}
          </section>
        )}

        <a
          href="https://ko-fi.com/abrahamgomez96"
          target="_blank"
          rel="noopener noreferrer"
          className="donation-button"
          aria-label="Apoyar Entre farmacias con una donación"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="donation-icon">
            <path
              d="M5 6.5h11.5v7A4.5 4.5 0 0 1 12 18H9.5A4.5 4.5 0 0 1 5 13.5v-7Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />

            <path
              d="M16.5 8H18a2.5 2.5 0 0 1 0 5h-1.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            <path
              d="M8.1 10.2c0-1.4 1.8-1.8 2.65-.65.85-1.15 2.65-.75 2.65.65 0 1.5-2.65 3.1-2.65 3.1s-2.65-1.6-2.65-3.1Z"
              fill="currentColor"
            />
          </svg>

          <span>
            <strong>¿Te sirvió?</strong>
            Invítame un café
          </span>
        </a>

        <footer className="footer">
          <div className="footer-info">
            <p>
              Entre farmacias compara precios publicados en línea. Los precios y
              la disponibilidad pueden variar por ubicación.
            </p>

            <span>Compara precios, no tratamientos.</span>
          </div>

          <div className="footer-signature">
            <span>Hecho con café, código y muchas pestañas abiertas por</span>

            <a
              href="https://www.agsolutions.dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              AG Solutions
              <span>↗</span>
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}

function OfferCard({
  offer,
  index,
  cheapestPrice,
  medication,
  getPharmacyName,
}: {
  offer: any;
  index: number;
  cheapestPrice: number;
  medication: Medication;
  getPharmacyName: (pharmacyId: string) => string;
}) {
  const difference = offer.price - cheapestPrice;
  const isBest = index === 0;

  return (
    <article className={`offer-card ${isBest ? "offer-card-best" : ""}`}>
      <div className="offer-main">
        <div className="offer-position">{isBest ? "✓" : index + 1}</div>

        <div className="offer-info">
          <div className="offer-title-row">
            <h3>{getPharmacyName(offer.pharmacyId)}</h3>

            {isBest && <span className="best-small-badge">Mejor precio</span>}
          </div>

          <p>{offer.productName}</p>

          <span className="offer-brand">Marca: {offer.brand}</span>

          {offer.recommendationLabel && (
            <div className="promotion">{offer.recommendationLabel}</div>
          )}

          {offer.promotion && (
            <div className="promotion">{offer.promotion}</div>
          )}
        </div>
      </div>

      <div className="offer-price-area">
        <strong>${offer.price.toFixed(2)}</strong>

        <span>
          ${offer.pricePerUnit.toFixed(2)}{" "}
          {offer.pricePerUnitLabel ?? `por ${medication.dosageForm}`}
        </span>

        {!isBest && difference > 0 && (
          <small>${difference.toFixed(2)} más</small>
        )}
      </div>

      <a
        href={offer.url}
        target="_blank"
        rel="noopener noreferrer"
        className="offer-link"
      >
        Ver producto
        <span>↗</span>
      </a>
    </article>
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDate(date: string) {
  const parsedDate = new Date(`${date}T12:00:00`);

  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsedDate);
}

function getMatchLabel(matchType: SearchResult["matchType"]) {
  switch (matchType) {
    case "brand":
      return "Coincidencia de marca";
    case "commercial":
      return "Producto comercial";
    case "ingredient":
      return "Principio activo";
    case "alias":
      return "Relacionado";
    default:
      return "Medicamento";
  }
}
