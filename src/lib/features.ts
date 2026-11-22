export type Features = Record<string, boolean>;

export const DEFAULT_FEATURES: Features = {
  brands: true,
  payment_tracker: true,
  inventory: true,
  shipments: true,
  messages: true,
  sales: true,
  checklist: true,
  marketing: true,
  planning: true,
  brand_organizer_hub: false,
  attendees: true,
  notifications: true,
};

export function resolveProfileFeatures(value: unknown): Features {
  if (value != null && (typeof value !== "object" || Array.isArray(value))) {
    throw new Error("Profile default features must be an object.");
  }

  const features = { ...DEFAULT_FEATURES };
  for (const key of Object.keys(DEFAULT_FEATURES)) {
    if (value && key in value) {
      const featureValue = (value as Record<string, unknown>)[key];
      if (featureValue != null && typeof featureValue !== "boolean") {
        throw new Error(`Invalid profile default for feature "${key}".`);
      }
      if (typeof featureValue === "boolean") features[key] = featureValue;
    }
  }
  return features;
}
