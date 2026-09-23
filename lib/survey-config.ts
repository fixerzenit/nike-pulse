export const VERSION = "1.4" as const;
export const ages = ["18–24", "25–34", "35–44", "45–54", "55+"] as const;
export const fields = [
  "Creative / Design",
  "Fashion",
  "Sport",
  "Tech",
  "Finance",
  "Consulting",
  "Marketing / Advertising",
  "Media",
  "Education / Research",
  "Student",
  "Other",
] as const;
export const brands = [
  "Nike",
  "adidas",
  "New Balance",
  "ASICS",
  "Salomon",
  "On",
  "Hoka",
  "Puma",
  "Under Armour",
  "Reebok",
] as const;
export const legacyBrands = [
  "Nike",
  "adidas",
  "New Balance",
  "ASICS",
  "Salomon",
  "On",
  "Hoka",
  "Puma",
  "Jordan",
  "Converse",
  "Vans",
  "Reebok",
  "Saucony",
] as const;
export const previousBrands = legacyBrands.slice(0, 10);
export const tiers = ["S", "A", "B", "C", "—"] as const;
export const tierLabels = [
  "First choice",
  "Strong consideration",
  "Maybe",
  "Unlikely",
  "Not for me",
];
export const categories = [
  "Performance products",
  "Product innovation",
  "Product design",
  "Sneakers / lifestyle",
  "Athlete partnerships",
  "Marketing & storytelling",
  "Fashion / collaborations",
  "Culture",
  "Community",
  "Brand heritage",
] as const;
export const reasons = [
  "Products",
  "Design",
  "Innovation",
  "Marketing / storytelling",
  "Athletes & partnerships",
  "Cultural relevance",
  "Competition from other brands",
  "Brand values",
  "Price / value",
  "Other",
] as const;
export const purchases = [
  "In the last 3 months",
  "3–12 months ago",
  "1–3 years ago",
  "More than 3 years ago",
  "Never",
] as const;
export const recentPurchaseBrands = [
  ...brands,
  "Another brand",
  "No recent purchase",
] as const;
export const purchaseReasons = [
  "Comfort / fit",
  "Performance",
  "Design / style",
  "Price / value",
  "Quality / durability",
  "Brand image",
  "Recommendation",
  "Availability",
] as const;
export const interests = [
  ["interest_sport", "Sport"],
  ["interest_sneakers", "Sneakers"],
  ["interest_fashion", "Fashion / style"],
  ["interest_pop_culture", "Pop culture"],
] as const;
export const attributes = [
  {
    key: "attribute_performance",
    label: "Performance",
    left: "Not at all",
    middle: "Somewhat",
    right: "Very much",
  },
  {
    key: "attribute_innovation",
    label: "Innovation",
    left: "Not at all",
    middle: "Somewhat",
    right: "Very much",
  },
  {
    key: "attribute_audience",
    label: "Who is Nike for?",
    left: "Lifestyle / everyday people",
    middle: "Both equally",
    right: "Athletes",
  },
  {
    key: "attribute_focus",
    label: "What drives Nike?",
    left: "Product-led",
    middle: "Both equally",
    right: "Culture-led",
  },
] as const;
export const legacyAttributes = [
  ["attribute_performance", "Performance"],
  ["attribute_innovation", "Innovation"],
  ["attribute_lifestyle", "Lifestyle"],
  ["attribute_for_athletes", "For Athletes"],
  ["attribute_for_normal_people", "For Normal People"],
  ["attribute_product_led", "Product-led"],
  ["attribute_culture_led", "Culture-led"],
] as const;
export const feelingOptions = [
  "Bold",
  "Innovative",
  "Performance-focused",
  "Style-driven",
  "Accessible",
  "Predictable",
  "Out of touch",
  "Confident",
  "Creative",
  "Premium",
  "Everyday",
  "Inspiring",
] as const;
export const questions = [
  {
    id: "age_group",
    section: "A little about you",
    title: "First, your age.",
    type: "choice",
    options: ages,
  },
  {
    id: "country_code",
    section: "A little about you",
    title: "Where do you currently live?",
    type: "country",
  },
  {
    id: "work_field",
    section: "A little about you",
    title: "What world do you work in?",
    type: "choice",
    options: fields,
  },
  {
    id: "interests",
    section: "A little about you",
    title: "How much are you into these?",
    type: "interests",
  },
  {
    id: "perception_pair",
    section: "Nike today",
    title: "Nike, then and now.",
    type: "pairedScale",
    prompts: [
      {
        key: "overall_perception",
        title: "What is your overall perception of Nike today?",
        min: 0,
        max: 10,
        left: "Very negative",
        right: "Very positive",
      },
      {
        key: "perception_change",
        title:
          "Compared with 3–5 years ago, how has your perception of Nike changed?",
        min: 0,
        max: 10,
        left: "Much worse",
        right: "Much better",
      },
    ],
  },
  {
    id: "perception_change_reasons",
    section: "Looking back",
    title: "What changed your perception most?",
    type: "chips",
    options: reasons,
  },
  {
    id: "brand_tiers",
    section: "The brand arena",
    title:
      "If you were buying sneakers tomorrow, where would these brands sit?",
    type: "tiers",
  },
  {
    id: "nike_strengths",
    section: "The strongest signals",
    title: "Where is Nike strongest today?",
    type: "chips",
    options: categories,
  },
  {
    id: "nike_weaknesses",
    section: "The other side",
    title: "Where is Nike falling behind?",
    type: "chips",
    options: categories,
  },
  {
    id: "culture_score",
    section: "Your instinct",
    title: "How culturally relevant does Nike feel today?",
    type: "scale",
    min: 0,
    max: 10,
    left: "Not relevant",
    right: "Shapes culture",
  },
  {
    id: "product_innovation_score",
    section: "Your instinct",
    title: "How innovative do Nike products feel today?",
    type: "scale",
    min: 0,
    max: 10,
    left: "Behind competitors",
    right: "Leading the industry",
  },
  {
    id: "purchase_pair",
    section: "Your next move",
    title: "The next purchase.",
    type: "pairedScale",
    prompts: [
      {
        key: "purchase_consideration",
        title:
          "How likely are you to consider Nike for your next sneaker purchase?",
        min: 0,
        max: 10,
        left: "Not at all",
        right: "Extremely likely",
      },
      {
        key: "apparel_purchase_consideration",
        title:
          "How likely are you to consider Nike for your next apparel purchase?",
        min: 0,
        max: 10,
        left: "Not at all",
        right: "Extremely likely",
      },
    ],
  },
  {
    id: "last_nike_purchase",
    section: "Your next move",
    title: "When did you last buy a Nike product?",
    type: "choice",
    options: purchases,
  },
  {
    id: "recent_purchase",
    section: "Your last choice",
    title: "Think of your most recent sneaker or sportswear purchase.",
    type: "recentPurchase",
  },
  {
    id: "attributes",
    section: "Four signals",
    title: "Where does Nike sit today?",
    type: "attributes",
  },
  {
    id: "before_after",
    section: "Then & now",
    title: "Finish the sentence.",
    type: "feelingChoices",
  },
  {
    id: "ceo_change",
    section: "One optional thought",
    title: "You’re Nike’s CEO for one day.",
    subtitle:
      "What’s one thing you would change? Skip this if nothing comes to mind.",
    type: "textarea",
  },
] as const;
export type Brand = (typeof brands)[number];
export type LegacyBrand = (typeof legacyBrands)[number] | Brand;
export type Tier = (typeof tiers)[number];
