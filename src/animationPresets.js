export const ANIMATION_PRESETS = {
  meleeSlash: { cardKind: "melee", projectileKind: "slash", hitEffect: "knife", color: "#fff1c8" },
  spearPierce: { cardKind: "stab", projectileKind: "generalPierce", hitEffect: "pike", color: "#f6cd55" },
  bowVolley: { cardKind: "arrow", projectileKind: "generalPierce", hitEffect: "bow", color: "#f8c73a" },
  cavalryRush: { cardKind: "dash", projectileKind: "cavalrySweep", hitEffect: "cavalry", color: "#d29b22" },
  commandAura: { cardKind: "general", projectileKind: "generalArea", hitEffect: "bow", color: "#f8d86a" },
  ambushPressure: { cardKind: "general", projectileKind: "generalArea", hitEffect: null, color: "#2d2019" }
};

export const EFFECT_RECIPES = {
  knife: { splash: "#2d2019", particles: 10, pulse: "#d19b42" },
  pike: { splash: "#2d2019", particles: 10, pulse: "#f6cd55" },
  bow: { splash: "#2d2019", particles: 9, pulse: "#f8c73a" },
  cavalry: { splash: "#2d2019", particles: 12, pulse: "#d29b22" },
  command: { splash: "#f6cd55", particles: 16, pulse: "#f8d86a" },
  ambush: { splash: "#16110f", particles: 18, pulse: "#416f8f" }
};

export function animationPresetForUnit(unit, weapons, generalConfig) {
  const key = unit?.type === "weapon"
    ? weapons[unit.token]?.animationPreset
    : generalConfig[unit?.token]?.animationPreset;
  return ANIMATION_PRESETS[key] ?? ANIMATION_PRESETS.meleeSlash;
}

export function effectRecipeForProjectile(kind) {
  if (kind === "gold" || kind === "generalPierce" || kind === "generalArea") return EFFECT_RECIPES.command;
  if (kind === "pike") return EFFECT_RECIPES.pike;
  if (kind === "cavalrySweep") return EFFECT_RECIPES.cavalry;
  if (kind === "arrow") return EFFECT_RECIPES.bow;
  return EFFECT_RECIPES.knife;
}

