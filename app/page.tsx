"use client";

import { useMemo, useState } from "react";
import medicationsData from "@/data/medications.json";

/* =========================================================
   CONFIG
   ========================================================= */

const POPULAR_TERMS = [
  "Febrax",
  "Saridon",
  "Lomotil",
  "Riopan",
  "Broncolin",
  "Tylenol",
];

const MAX_SEARCH_RESULTS = 12;

const EXACT_RELATIONS = new Set([
  "same-active-ingredients-strength-form-quantity",
  "exact-active-ingredients-strength-form-quantity",
]);

/* =========================================================
   TYPES
   ========================================================= */

type Ingredient = {
  name: string;
  strength?: string;
};

type Offer = {
  pharmacyId: string;
  sourceName: string;
  sku: string;
  price: number;
  currency: string;

  pricePerUnit?: number;
  pricePerUnitLabel?: string;

  availability?: string;
  saleCondition?: string;

  url: string;
  checkedAt: string;

  regularPrice?: number;
  promotion?: string;
  marketSignal?: string;
};

type Product = {
  id: string;
  brand: string;
  commercialName: string;

  offers: Offer[];

  searchAliases?: string[];
  matchLevel?: string;

  isReferenceBrand?: boolean;

  relationToReference?: string | null;

  recommendationLabel?: string | null;
};

type RelatedMedication = {
  medicationId: string;
  relation: string;
  label: string;
};

type SearchProfile = {
  brandTerms?: string[];
  ingredientTerms?: string[];
  aliases?: string[];
  presentationTerms?: string[];
  normalizedText?: string;
};

type Medication = {
  id: string;
  slug: string;

  displayName: string;
  category: string;

  searchTerms?: string[];

  activeIngredients: Ingredient[];

  dosageForm: string;
  quantity: number;
  unit: string;

  otc?: boolean;

  comparisonType?: string;
  comparisonWarning?: string;

  products: Product[];

  ingredientSignature?: string;

  searchProfile?: SearchProfile;

  relatedMedicationIds?: RelatedMedication[];

  marketSignal?: {
    source?: string;
    label?: string;
  };

  publicEligible?: boolean;
  verificationStatus?: string;
};

type SearchResult = {
  medication: Medication;

  score: number;

  matchType:
    | "brand"
    | "commercial"
    | "ingredient"
    | "alias"
    | "general";
};

type EnrichedOffer = Offer & {
  productId: string;
  productName: string;

  brand: string;

  medicationId: string;
  medicationName: string;

  relationToSelected: string;

  recommendationLabel?: string | null;

  isSearchedBrand: boolean;
};

/* =========================================================
   DATA
   ========================================================= */

const medications =
  medicationsData.medications as unknown as Medication[];

/* =========================================================
   PAGE
   ========================================================= */

export default function Home() {
  const [query, setQuery] = useState("");

  const [selectedMedicationId, setSelectedMedicationId] =
    useState<string | null>(null);

  const [searchedBrand, setSearchedBrand] = useState<
    string | null
  >(null);

  const normalizedQuery = normalize(query);

  /* =======================================================
     SEARCH
     ======================================================= */

  const searchResults = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    const results: SearchResult[] = [];

    for (const medication of medications) {
      const brandTerms =
        medication.searchProfile?.brandTerms?.map(
          normalize,
        ) ?? [];

      const ingredientTerms =
        medication.searchProfile?.ingredientTerms?.map(
          normalize,
        ) ?? [];

      const aliases =
        medication.searchProfile?.aliases?.map(
          normalize,
        ) ?? [];

      const searchTerms =
        medication.searchTerms?.map(normalize) ?? [];

      const productAliases =
        medication.products.flatMap(
          (product) =>
            product.searchAliases?.map(normalize) ?? [],
        );

      const commercialNames =
        medication.products.map((product) =>
          normalize(product.commercialName),
        );

      const productBrands =
        medication.products.map((product) =>
          normalize(product.brand),
        );

      const displayName = normalize(
        medication.displayName,
      );

      let score = 0;

      let matchType: SearchResult["matchType"] =
        "general";

      if (
        brandTerms.includes(normalizedQuery) ||
        productBrands.includes(normalizedQuery)
      ) {
        score = 140;
        matchType = "brand";
      } else if (
        commercialNames.includes(normalizedQuery)
      ) {
        score = 130;
        matchType = "commercial";
      } else if (
        displayName === normalizedQuery
      ) {
        score = 125;
        matchType = "general";
      } else if (
        brandTerms.some((term) =>
          term.startsWith(normalizedQuery),
        ) ||
        productBrands.some((term) =>
          term.startsWith(normalizedQuery),
        )
      ) {
        score = 115;
        matchType = "brand";
      } else if (
        commercialNames.some((term) =>
          term.startsWith(normalizedQuery),
        )
      ) {
        score = 110;
        matchType = "commercial";
      } else if (
        ingredientTerms.includes(normalizedQuery)
      ) {
        score = 105;
        matchType = "ingredient";
      } else if (
        aliases.includes(normalizedQuery) ||
        productAliases.includes(normalizedQuery) ||
        searchTerms.includes(normalizedQuery)
      ) {
        score = 100;
        matchType = "alias";
      } else if (
        ingredientTerms.some((term) =>
          term.startsWith(normalizedQuery),
        )
      ) {
        score = 95;
        matchType = "ingredient";
      } else if (
        brandTerms.some((term) =>
          term.includes(normalizedQuery),
        ) ||
        productBrands.some((term) =>
          term.includes(normalizedQuery),
        )
      ) {
        score = 90;
        matchType = "brand";
      } else if (
        commercialNames.some((term) =>
          term.includes(normalizedQuery),
        )
      ) {
        score = 85;
        matchType = "commercial";
      } else if (
        ingredientTerms.some((term) =>
          term.includes(normalizedQuery),
        )
      ) {
        score = 80;
        matchType = "ingredient";
      } else if (
        aliases.some((term) =>
          term.includes(normalizedQuery),
        ) ||
        productAliases.some((term) =>
          term.includes(normalizedQuery),
        ) ||
        searchTerms.some((term) =>
          term.includes(normalizedQuery),
        )
      ) {
        score = 75;
        matchType = "alias";
      } else if (
        displayName.includes(normalizedQuery)
      ) {
        score = 70;
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

    return results
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return a.medication.displayName.localeCompare(
          b.medication.displayName,
          "es",
        );
      })
      .slice(0, MAX_SEARCH_RESULTS);
  }, [normalizedQuery]);

  /* =======================================================
     SELECTED MEDICATION
     ======================================================= */

  const selectedMedication = useMemo(() => {
    if (!selectedMedicationId) {
      return null;
    }

    return (
      medications.find(
        (medication) =>
          medication.id === selectedMedicationId,
      ) ?? null
    );
  }, [selectedMedicationId]);

  /* =======================================================
     EXACT RELATED
     ======================================================= */

  const exactRelatedMedications = useMemo(() => {
    if (!selectedMedication) {
      return [];
    }

    const related =
      selectedMedication.relatedMedicationIds ?? [];

    return related
      .filter((relation) =>
        EXACT_RELATIONS.has(relation.relation),
      )
      .map((relation) => {
        const medication = medications.find(
          (item) =>
            item.id === relation.medicationId,
        );

        if (!medication) {
          return null;
        }

        return {
          medication,
          relation,
        };
      })
      .filter(
        (
          item,
        ): item is {
          medication: Medication;
          relation: RelatedMedication;
        } => item !== null,
      );
  }, [selectedMedication]);

  /* =======================================================
     OTHER PRESENTATIONS
     ======================================================= */

  const otherRelatedMedications = useMemo(() => {
    if (!selectedMedication) {
      return [];
    }

    const related =
      selectedMedication.relatedMedicationIds ?? [];

    return related
      .filter(
        (relation) =>
          !EXACT_RELATIONS.has(relation.relation),
      )
      .map((relation) => {
        const medication = medications.find(
          (item) =>
            item.id === relation.medicationId,
        );

        if (!medication) {
          return null;
        }

        return {
          medication,
          relation,
          cheapest:
            getCheapestMedicationOffer(medication),
        };
      })
      .filter(
        (
          item,
        ): item is {
          medication: Medication;
          relation: RelatedMedication;
          cheapest: EnrichedOffer | null;
        } => item !== null,
      );
  }, [selectedMedication]);

  /* =======================================================
     UNIFIED COMPARISON
     ======================================================= */

  const comparison = useMemo(() => {
    if (!selectedMedication) {
      return null;
    }

    const medicationSources: {
      medication: Medication;
      relation: string;
    }[] = [
      {
        medication: selectedMedication,
        relation: "selected",
      },

      ...exactRelatedMedications.map(
        ({ medication, relation }) => ({
          medication,
          relation: relation.relation,
        }),
      ),
    ];

    const offers: EnrichedOffer[] = [];

    for (const source of medicationSources) {
      for (const product of source.medication.products) {
        for (const offer of product.offers) {
          offers.push({
            ...offer,

            productId: product.id,

            productName:
              product.commercialName,

            brand: product.brand,

            medicationId:
              source.medication.id,

            medicationName:
              source.medication.displayName,

            relationToSelected:
              source.relation,

            recommendationLabel:
              product.recommendationLabel,

            isSearchedBrand:
              Boolean(searchedBrand) &&
              normalize(product.brand) ===
                normalize(searchedBrand ?? ""),
          });
        }
      }
    }

    const deduplicatedOffers =
      deduplicateOffers(offers);

    if (!deduplicatedOffers.length) {
      return null;
    }

    const sortedOffers =
      [...deduplicatedOffers].sort(
        (a, b) => a.price - b.price,
      );

    return {
      offers: sortedOffers,
      cheapest: sortedOffers[0],
    };
  }, [
    selectedMedication,
    exactRelatedMedications,
    searchedBrand,
  ]);

  /* =======================================================
     BRAND BEST PRICE
     ======================================================= */

  const searchedBrandBestPrice = useMemo(() => {
    if (!comparison || !searchedBrand) {
      return null;
    }

    const brandOffers =
      comparison.offers.filter(
        (offer) =>
          normalize(offer.brand) ===
          normalize(searchedBrand),
      );

    if (!brandOffers.length) {
      return null;
    }

    return [...brandOffers].sort(
      (a, b) => a.price - b.price,
    )[0];
  }, [comparison, searchedBrand]);

  /* =======================================================
     CHEAPER EXACT ALTERNATIVE
     ======================================================= */

  const cheaperAlternative = useMemo(() => {
    if (
      !comparison ||
      !searchedBrand ||
      !searchedBrandBestPrice
    ) {
      return null;
    }

    const alternatives =
      comparison.offers.filter(
        (offer) =>
          normalize(offer.brand) !==
            normalize(searchedBrand) &&
          offer.price <
            searchedBrandBestPrice.price,
      );

    if (!alternatives.length) {
      return null;
    }

    return [...alternatives].sort(
      (a, b) => a.price - b.price,
    )[0];
  }, [
    comparison,
    searchedBrand,
    searchedBrandBestPrice,
  ]);

  /* =======================================================
     SAVINGS
     ======================================================= */

  const alternativeSavings = useMemo(() => {
    if (
      !cheaperAlternative ||
      !searchedBrandBestPrice
    ) {
      return null;
    }

    const amount =
      searchedBrandBestPrice.price -
      cheaperAlternative.price;

    if (amount <= 0) {
      return null;
    }

    return {
      amount,

      percent:
        (amount /
          searchedBrandBestPrice.price) *
        100,
    };
  }, [
    cheaperAlternative,
    searchedBrandBestPrice,
  ]);

  /* =======================================================
     PRIMARY OFFER
     ======================================================= */

  /*
   * Si el usuario buscó una marca:
   *
   * → mostramos primero el mejor precio DE ESA MARCA.
   *
   * Si buscó por ingrediente:
   *
   * → mostramos directamente el mejor precio general.
   */

  const primaryOffer =
    searchedBrand && searchedBrandBestPrice
      ? searchedBrandBestPrice
      : comparison?.cheapest ?? null;

  /* =======================================================
     INGREDIENTS
     ======================================================= */

  const selectedIngredients = useMemo(() => {
    if (!selectedMedication) {
      return "";
    }

    return selectedMedication.activeIngredients
      .map((ingredient) => {
        if (!ingredient.strength) {
          return ingredient.name;
        }

        return `${ingredient.name} ${ingredient.strength}`;
      })
      .join(" + ");
  }, [selectedMedication]);

  /* =======================================================
     POPULAR
     ======================================================= */

  const popularMedications = useMemo(() => {
    const found = POPULAR_TERMS.map((term) => {
      const normalizedTerm =
        normalize(term);

      return medications.find(
        (medication) => {
          const brands =
            medication.searchProfile?.brandTerms?.map(
              normalize,
            ) ?? [];

          const aliases =
            medication.searchProfile?.aliases?.map(
              normalize,
            ) ?? [];

          const searchTerms =
            medication.searchTerms?.map(
              normalize,
            ) ?? [];

          const productBrands =
            medication.products.map(
              (product) =>
                normalize(product.brand),
            );

          return (
            brands.includes(normalizedTerm) ||
            aliases.includes(normalizedTerm) ||
            searchTerms.includes(normalizedTerm) ||
            productBrands.includes(normalizedTerm) ||
            normalize(
              medication.displayName,
            ).includes(normalizedTerm)
          );
        },
      );
    });

    return found.filter(
      (
        medication,
        index,
        array,
      ): medication is Medication =>
        Boolean(medication) &&
        array.findIndex(
          (item) =>
            item?.id === medication?.id,
        ) === index,
    );
  }, []);

  /* =======================================================
     EVENTS
     ======================================================= */

  function handleSelectMedication(
    medicationId: string,
    selectedQuery?: string,
    matchType?: SearchResult["matchType"],
  ) {
    const medication =
      medications.find(
        (item) =>
          item.id === medicationId,
      );

    if (!medication) {
      return;
    }

    if (
      selectedQuery &&
      matchType === "brand"
    ) {
      const brand =
        findMatchingBrand(
          medication,
          selectedQuery,
        );

      setSearchedBrand(brand);
    } else {
      const brand = selectedQuery
        ? findExactBrand(
            medication,
            selectedQuery,
          )
        : null;

      setSearchedBrand(brand);
    }

    setSelectedMedicationId(
      medicationId,
    );

    setQuery(
      selectedQuery ??
        medication.displayName,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleResetSearch() {
    setSelectedMedicationId(null);
    setSearchedBrand(null);
    setQuery("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function getPharmacyName(
    pharmacyId: string,
  ) {
    return (
      medicationsData.pharmacies.find(
        (pharmacy) =>
          pharmacy.id === pharmacyId,
      )?.name ?? pharmacyId
    );
  }

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <main className="site-shell">
      <div className="page-container">
        {/* HEADER */}

        <header className="site-header">
          <button
            type="button"
            className="brand"
            onClick={handleResetSearch}
            aria-label="Volver al inicio de Entre farmacias"
          >
            <span className="brand-mark">
              EF
            </span>

            <span>
              Entre farmacias
            </span>
          </button>
        </header>

        {/* =================================================
            HOME
            ================================================= */}

        {!selectedMedication && (
          <>
            <section className="hero">
              <div className="hero-badge">
                Compara antes de comprar
              </div>

              <h1>
                Encuentra tu medicamento
                <span>
                  {" "}
                  al mejor precio encontrado.
                </span>
              </h1>

              <p className="hero-description">
                Busca entre{" "}
                {medications.length}{" "}
                presentaciones por marca o
                principio activo.
              </p>

              {/* SEARCH */}

              <div className="search-wrapper">
                <label
                  htmlFor="medication-search"
                  className="search-label"
                >
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
                    type="search"
                    value={query}
                    onChange={(event) => {
                      setQuery(
                        event.target.value,
                      );

                      setSelectedMedicationId(
                        null,
                      );

                      setSearchedBrand(
                        null,
                      );
                    }}
                    placeholder="Ej. Febrax, Saridon, Riopan..."
                    autoComplete="off"
                    spellCheck={false}
                  />

                  {query && (
                    <button
                      type="button"
                      className="clear-search"
                      onClick={() => {
                        setQuery("");

                        setSelectedMedicationId(
                          null,
                        );

                        setSearchedBrand(
                          null,
                        );
                      }}
                      aria-label="Limpiar búsqueda"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* RESULTS */}

                {query.trim() && (
                  <div
                    className="search-results"
                    role="listbox"
                    aria-label="Resultados de búsqueda"
                  >
                    {searchResults.length >
                    0 ? (
                      searchResults.map(
                        ({
                          medication,
                          matchType,
                        }) => {
                          const matchingBrand =
                            matchType ===
                            "brand"
                              ? findMatchingBrand(
                                  medication,
                                  query,
                                )
                              : null;

                          return (
                            <button
                              type="button"
                              key={
                                medication.id
                              }
                              className="search-result"
                              role="option"
                              aria-selected="false"
                              onClick={() =>
                                handleSelectMedication(
                                  medication.id,

                                  matchingBrand ??
                                    medication.displayName,

                                  matchType,
                                )
                              }
                            >
                              <div>
                                <strong>
                                  {
                                    medication.displayName
                                  }
                                </strong>

                                <span>
                                  {getMatchLabel(
                                    matchType,
                                  )}
                                </span>
                              </div>

                              <span className="result-arrow">
                                →
                              </span>
                            </button>
                          );
                        },
                      )
                    ) : (
                      <div className="no-results">
                        No encontramos ese
                        medicamento.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* POPULAR */}

            {!query.trim() && (
              <section className="popular-section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">
                      Búsquedas populares
                    </p>

                    <h2>
                      Prueba una marca
                    </h2>
                  </div>
                </div>

                <div className="popular-grid">
                  {popularMedications.map(
                    (medication) => {
                      const brand =
                        getPreferredBrand(
                          medication,
                        );

                      const cheapest =
                        getCheapestMedicationOffer(
                          medication,
                        );

                      return (
                        <button
                          type="button"
                          key={
                            medication.id
                          }
                          className="popular-card"
                          onClick={() =>
                            handleSelectMedication(
                              medication.id,

                              brand ??
                                medication.displayName,

                              brand
                                ? "brand"
                                : "general",
                            )
                          }
                        >
                          <div className="popular-icon">
                            <svg
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
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
                            <strong>
                              {brand ??
                                medication.displayName}
                            </strong>

                            <span>
                              {
                                medication.displayName
                              }
                            </span>

                            {cheapest && (
                              <small>
                                Desde $
                                {cheapest.price.toFixed(
                                  2,
                                )}
                              </small>
                            )}
                          </div>

                          <span className="popular-arrow">
                            →
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {/* =================================================
            RESULTS
            ================================================= */}

        {selectedMedication &&
          comparison &&
          primaryOffer && (
            <section className="results-page">
              <button
                type="button"
                className="back-button"
                onClick={
                  handleResetSearch
                }
              >
                <span>←</span>
                Buscar otro medicamento
              </button>

              {/* HEADING */}

              <div className="medication-heading">
                <p className="eyebrow">
                  {
                    selectedMedication.category
                  }
                </p>

                <h1>
                  {
                    selectedMedication.displayName
                  }
                </h1>

                <p>
                  {selectedIngredients}
                </p>
              </div>

              {/* WARNING */}

              {selectedMedication.comparisonWarning && (
                <div className="brand-warning">
                  <InfoIcon />

                  <p>
                    {
                      selectedMedication.comparisonWarning
                    }
                  </p>
                </div>
              )}

              {/* =================================================
                  MAIN PRODUCT
                  ================================================= */}

              <section className="best-option">
                <div className="best-option-copy">
                  <div className="best-badge">
                    {searchedBrand
                      ? `Mejor precio de ${searchedBrand}`
                      : "Mejor precio encontrado"}
                  </div>

                  <p className="best-label">
                    {getPharmacyName(
                      primaryOffer.pharmacyId,
                    )}
                  </p>

                  <div className="best-price">
                    <span>$</span>

                    {primaryOffer.price.toFixed(
                      2,
                    )}
                  </div>

                  <p className="best-product">
                    {
                      primaryOffer.productName
                    }
                  </p>

                  {searchedBrand && (
                    <div className="promotion">
                      Marca que buscaste
                    </div>
                  )}

                  <a
                    href={primaryOffer.url}
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
                    <span>
                      Precio por unidad
                    </span>

                    <strong>
                      {formatPricePerUnit(
                        primaryOffer,
                      )}
                    </strong>

                    <small>
                      {primaryOffer.pricePerUnitLabel ??
                        getDefaultUnitLabel(
                          selectedMedication,
                        )}
                    </small>
                  </div>

                  <div className="updated-card">
                    <span>
                      Consultado
                    </span>

                    <strong>
                      {formatDate(
                        primaryOffer.checkedAt,
                      )}
                    </strong>
                  </div>
                </div>
              </section>

              {/* =================================================
                  CHEAPER ALTERNATIVE
                  ================================================= */}

              {cheaperAlternative &&
                alternativeSavings && (
                  <section className="other-options">
                    <div className="section-heading results-heading">
                      <div>
                        <p className="eyebrow">
                          Opción para ahorrar
                        </p>

                        <h2>
                          Misma composición y
                          presentación
                        </h2>
                      </div>

                      <span>
                        {alternativeSavings.percent.toFixed(
                          0,
                        )}
                        % menos
                      </span>
                    </div>

                    <article className="offer-card offer-card-best">
                      <div className="offer-main">
                        <div className="offer-position">
                          ↓
                        </div>

                        <div className="offer-info">
                          <div className="offer-title-row">
                            <h3>
                              {
                                cheaperAlternative.brand
                              }
                            </h3>

                            <span className="best-small-badge">
                              Ahorras $
                              {alternativeSavings.amount.toFixed(
                                2,
                              )}
                            </span>
                          </div>

                          <p>
                            {
                              cheaperAlternative.productName
                            }
                          </p>

                          <span className="offer-brand">
                            {getPharmacyName(
                              cheaperAlternative.pharmacyId,
                            )}
                          </span>

                          <div className="promotion">
                            Mismos principios
                            activos,
                            concentración y
                            presentación
                          </div>
                        </div>
                      </div>

                      <div className="offer-price-area">
                        <strong>
                          $
                          {cheaperAlternative.price.toFixed(
                            2,
                          )}
                        </strong>

                        <span>
                          {formatPricePerUnit(
                            cheaperAlternative,
                          )}{" "}
                          {cheaperAlternative.pricePerUnitLabel ??
                            getDefaultUnitLabel(
                              selectedMedication,
                            )}
                        </span>

                        <small>
                          $
                          {alternativeSavings.amount.toFixed(
                            2,
                          )}{" "}
                          menos
                        </small>
                      </div>

                      <a
                        href={
                          cheaperAlternative.url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="offer-link"
                      >
                        Ver opción
                        <span>↗</span>
                      </a>
                    </article>

                    <div className="brand-warning">
                      <InfoIcon />

                      <p>
                        Misma composición y
                        presentación. No implica
                        sustitución médica.
                      </p>
                    </div>
                  </section>
                )}

              {/* =================================================
                  ALL PRICES
                  ================================================= */}

              <section className="other-options">
                <div className="section-heading results-heading">
                  <div>
                    <p className="eyebrow">
                      Todos los precios
                    </p>

                    <h2>
                      Compara opciones
                    </h2>
                  </div>

                  <span>
                    {
                      comparison.offers.length
                    }{" "}
                    {comparison.offers.length ===
                    1
                      ? "opción"
                      : "opciones"}
                  </span>
                </div>

                <div className="offers-list">
                  {comparison.offers.map(
                    (
                      offer,
                      index,
                    ) => (
                      <OfferCard
                        key={`${offer.productId}-${offer.pharmacyId}-${offer.sku}-${offer.medicationId}`}
                        offer={offer}
                        index={index}
                        cheapestPrice={
                          comparison.cheapest
                            .price
                        }
                        medication={
                          selectedMedication
                        }
                        searchedBrand={
                          searchedBrand
                        }
                        getPharmacyName={
                          getPharmacyName
                        }
                      />
                    ),
                  )}
                </div>
              </section>

              {/* =================================================
                  OTHER PRESENTATIONS
                  ================================================= */}

              {otherRelatedMedications.length >
                0 && (
                <RelatedMedications
                  items={
                    otherRelatedMedications
                  }
                  onSelect={
                    handleSelectMedication
                  }
                />
              )}
            </section>
          )}

        {/* =================================================
            DONATION
            ================================================= */}

        <a
          href="https://ko-fi.com/abrahamgomez96"
          target="_blank"
          rel="noopener noreferrer"
          className="donation-button"
          aria-label="Apoyar Entre farmacias con una donación"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="donation-icon"
          >
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
            <strong>
              ¿Te sirvió?
            </strong>
            Invítame un café
          </span>
        </a>

        {/* =================================================
            FOOTER
            ================================================= */}

        <footer className="footer">
          <div className="footer-info">
            <p>
              Entre farmacias compara
              precios publicados en línea.
              Los precios y disponibilidad
              pueden variar.
            </p>

            <span>
              Compara precios, no
              tratamientos.
            </span>
          </div>

          <div className="footer-signature">
            <span>
              Hecho con café, código y
              muchas pestañas abiertas por
            </span>

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

/* =========================================================
   RELATED MEDICATIONS
   ========================================================= */

function RelatedMedications({
  items,
  onSelect,
}: {
  items: {
    medication: Medication;
    relation: RelatedMedication;
    cheapest: EnrichedOffer | null;
  }[];

  onSelect: (
    medicationId: string,
    selectedQuery?: string,
    matchType?: SearchResult["matchType"],
  ) => void;
}) {
  return (
    <section className="other-options">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            Otras presentaciones
          </p>

          <h2>
            También puedes comparar
          </h2>
        </div>
      </div>

      <div className="popular-grid">
        {items.map(
          ({
            medication,
            relation,
            cheapest,
          }) => (
            <button
              key={medication.id}
              type="button"
              className="popular-card"
              onClick={() =>
                onSelect(
                  medication.id,
                  medication.displayName,
                  "general",
                )
              }
            >
              <div className="popular-content">
                <strong>
                  {
                    medication.displayName
                  }
                </strong>

                <span>
                  {shortRelationLabel(
                    relation.relation,
                  )}
                </span>

                {cheapest && (
                  <small>
                    Desde $
                    {cheapest.price.toFixed(
                      2,
                    )}
                  </small>
                )}
              </div>

              <span className="popular-arrow">
                →
              </span>
            </button>
          ),
        )}
      </div>
    </section>
  );
}

/* =========================================================
   OFFER CARD
   ========================================================= */

function OfferCard({
  offer,
  index,
  cheapestPrice,
  medication,
  searchedBrand,
  getPharmacyName,
}: {
  offer: EnrichedOffer;
  index: number;
  cheapestPrice: number;
  medication: Medication;

  searchedBrand: string | null;

  getPharmacyName: (
    pharmacyId: string,
  ) => string;
}) {
  const difference =
    offer.price - cheapestPrice;

  const isBest = index === 0;

  const isSearchedBrand =
    Boolean(searchedBrand) &&
    normalize(offer.brand) ===
      normalize(searchedBrand ?? "");

  const savingsFromRegularPrice =
    offer.regularPrice &&
    offer.regularPrice > offer.price
      ? offer.regularPrice -
        offer.price
      : null;

  return (
    <article
      className={`offer-card ${
        isBest
          ? "offer-card-best"
          : ""
      }`}
    >
      <div className="offer-main">
        <div className="offer-position">
          {isBest
            ? "✓"
            : index + 1}
        </div>

        <div className="offer-info">
          <div className="offer-title-row">
            <h3>
              {getPharmacyName(
                offer.pharmacyId,
              )}
            </h3>

            {isBest && (
              <span className="best-small-badge">
                Mejor precio
              </span>
            )}

            {isSearchedBrand &&
              !isBest && (
                <span className="best-small-badge">
                  Marca buscada
                </span>
              )}
          </div>

          <p>
            {offer.productName}
          </p>

          <span className="offer-brand">
            Marca: {offer.brand}
          </span>

          {searchedBrand &&
            !isSearchedBrand && (
              <div className="promotion">
                Misma composición
              </div>
            )}

          {offer.promotion && (
            <div className="promotion">
              {offer.promotion}
            </div>
          )}

          {offer.regularPrice &&
            offer.regularPrice >
              offer.price && (
              <div className="promotion">
                Antes $
                {offer.regularPrice.toFixed(
                  2,
                )}
              </div>
            )}
        </div>
      </div>

      <div className="offer-price-area">
        <strong>
          ${offer.price.toFixed(2)}
        </strong>

        <span>
          {formatPricePerUnit(
            offer,
          )}{" "}
          {offer.pricePerUnitLabel ??
            getDefaultUnitLabel(
              medication,
            )}
        </span>

        {!isBest &&
          difference > 0 && (
            <small>
              $
              {difference.toFixed(
                2,
              )}{" "}
              más
            </small>
          )}

        {savingsFromRegularPrice && (
          <small>
            Ahorras $
            {savingsFromRegularPrice.toFixed(
              2,
            )}
          </small>
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

/* =========================================================
   INFO ICON
   ========================================================= */

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
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
  );
}

/* =========================================================
   HELPERS
   ========================================================= */

function normalize(
  value: string,
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(
  values: string[],
) {
  return Array.from(
    new Set(
      values.filter(Boolean),
    ),
  );
}

/* =========================================================
   BRAND
   ========================================================= */

function getPreferredBrand(
  medication: Medication,
) {
  const productBrands =
    medication.products.map(
      (product) => product.brand,
    );

  const searchTerms =
    medication.searchTerms ?? [];

  const brandFromSearch =
    productBrands.find((brand) =>
      searchTerms.some(
        (term) =>
          normalize(term) ===
          normalize(brand),
      ),
    );

  if (brandFromSearch) {
    return brandFromSearch;
  }

  return (
    medication.searchProfile
      ?.brandTerms?.[0] ??
    productBrands[0] ??
    null
  );
}

function findExactBrand(
  medication: Medication,
  query: string,
) {
  const normalizedQuery =
    normalize(query);

  const brands = uniqueStrings([
    ...(medication.searchProfile
      ?.brandTerms ?? []),

    ...medication.products.map(
      (product) => product.brand,
    ),
  ]);

  return (
    brands.find(
      (brand) =>
        normalize(brand) ===
        normalizedQuery,
    ) ?? null
  );
}

function findMatchingBrand(
  medication: Medication,
  searchQuery: string,
) {
  const normalizedSearch =
    normalize(searchQuery);

  const brands = uniqueStrings([
    ...(medication.searchProfile
      ?.brandTerms ?? []),

    ...medication.products.map(
      (product) => product.brand,
    ),
  ]);

  const exact = brands.find(
    (brand) =>
      normalize(brand) ===
      normalizedSearch,
  );

  if (exact) {
    return exact;
  }

  const startsWith =
    brands.find((brand) =>
      normalize(brand).startsWith(
        normalizedSearch,
      ),
    );

  if (startsWith) {
    return startsWith;
  }

  const includes =
    brands.find((brand) =>
      normalize(brand).includes(
        normalizedSearch,
      ),
    );

  return includes ?? null;
}

/* =========================================================
   OFFER HELPERS
   ========================================================= */

function getCheapestMedicationOffer(
  medication: Medication,
): EnrichedOffer | null {
  const offers: EnrichedOffer[] =
    medication.products.flatMap(
      (product) =>
        product.offers.map(
          (offer) => ({
            ...offer,

            productId:
              product.id,

            productName:
              product.commercialName,

            brand:
              product.brand,

            medicationId:
              medication.id,

            medicationName:
              medication.displayName,

            relationToSelected:
              "selected",

            recommendationLabel:
              product.recommendationLabel,

            isSearchedBrand:
              false,
          }),
        ),
    );

  if (!offers.length) {
    return null;
  }

  return [...offers].sort(
    (a, b) =>
      a.price - b.price,
  )[0];
}

function deduplicateOffers(
  offers: EnrichedOffer[],
) {
  const seen =
    new Map<
      string,
      EnrichedOffer
    >();

  for (const offer of offers) {
    const key = [
      normalize(
        offer.pharmacyId,
      ),
      normalize(
        offer.sku ?? "",
      ),
      normalize(
        offer.url ?? "",
      ),
    ].join("|");

    const existing =
      seen.get(key);

    if (!existing) {
      seen.set(key, offer);
      continue;
    }

    if (
      offer.price <
      existing.price
    ) {
      seen.set(key, offer);
    }
  }

  return Array.from(
    seen.values(),
  );
}

/* =========================================================
   PRICE
   ========================================================= */

function getDefaultUnitLabel(
  medication: Medication,
) {
  const unit =
    normalize(medication.unit);

  if (
    unit.includes("tableta")
  ) {
    return "por tableta";
  }

  if (
    unit.includes("capsula")
  ) {
    return "por cápsula";
  }

  if (
    unit.includes("comprimido")
  ) {
    return "por comprimido";
  }

  if (
    unit.includes("sobre")
  ) {
    return "por sobre";
  }

  if (
    unit.includes("supositorio")
  ) {
    return "por supositorio";
  }

  if (
    unit.includes("enema")
  ) {
    return "por enema";
  }

  if (unit === "ml") {
    return "por ml";
  }

  if (unit === "g") {
    return "por g";
  }

  return `por ${medication.unit}`;
}

function formatPricePerUnit(
  offer: Pick<
    Offer,
    "pricePerUnit"
  >,
) {
  if (
    typeof offer.pricePerUnit !==
      "number" ||
    Number.isNaN(
      offer.pricePerUnit,
    )
  ) {
    return "—";
  }

  return `$${offer.pricePerUnit.toFixed(
    2,
  )}`;
}

/* =========================================================
   DATE
   ========================================================= */

function formatDate(
  date: string,
) {
  if (!date) {
    return "Fecha no disponible";
  }

  const parsedDate =
    new Date(
      `${date}T12:00:00`,
    );

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return date;
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(parsedDate);
}

/* =========================================================
   RELATION LABEL
   ========================================================= */

function shortRelationLabel(
  relation: string,
) {
  if (
    relation.includes(
      "different-quantity",
    )
  ) {
    return "Misma composición, otra cantidad";
  }

  if (
    relation.includes(
      "different-form",
    )
  ) {
    return "Misma composición, otra presentación";
  }

  if (
    relation.includes(
      "different-presentation",
    )
  ) {
    return "Misma composición, otra presentación";
  }

  return "Presentación relacionada";
}

/* =========================================================
   SEARCH LABEL
   ========================================================= */

function getMatchLabel(
  matchType: SearchResult["matchType"],
) {
  switch (matchType) {
    case "brand":
      return "Marca";

    case "commercial":
      return "Producto";

    case "ingredient":
      return "Principio activo";

    case "alias":
      return "Relacionado";

    default:
      return "Medicamento";
  }
}