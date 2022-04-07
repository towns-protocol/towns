import { defineProperties } from "@vanilla-extract/sprinkles";
import { vars } from "ui/styles/vars.css";

export const colorAtomicProperties = defineProperties({
  conditions: {
    lightMode: {},
    darkMode: { "@media": "(prefers-color-scheme: dark)" },
  },
  defaultCondition: "lightMode",
  properties: {
    background: {
      default: {
        background: vars.color.background.default,
      },
      none: {
        background: vars.color.background.none,
      },
      level1: {
        background: vars.color.background.level1,
        color: vars.color.text.muted,
      },
      level2: {
        background: vars.color.background.level2,
        color: vars.color.text.muted,
      },
      level3: {
        background: vars.color.background.level3,
      },
      overlay: {
        background: vars.color.background.overlay,
        color: vars.color.text.inverted,
      },
      inverted: {
        background: vars.color.background.inverted,
        color: vars.color.text.inverted,
      },
      critical: {
        background: vars.color.background.critical,
        color: vars.color.text.onSemantic,
      },
      warning: {
        background: vars.color.background.warning,
        color: vars.color.text.onSemantic,
      },
      positive: {
        background: vars.color.background.positive,
        color: vars.color.text.onSemantic,
      },
      neutral: {
        background: vars.color.background.neutral,
        color: vars.color.text.onSemantic,
      },
      accent: {
        background: vars.color.background.accent,
        color: vars.color.text.onSemantic,
      },
    },
    color: vars.color.text,
  },
});
