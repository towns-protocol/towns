import { defineProperties } from "@vanilla-extract/sprinkles";
import { darkTheme, vars } from "ui/styles/vars.css";

export const colorAtomicProperties = defineProperties({
  conditions: {
    lightMode: {},
    /** instead of using a media-query, we refer to the class set from JS on the
     * root element from within App.tsx */
    darkMode: { selector: `${darkTheme} &` },
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
        color: vars.color.text.gray1,
      },
      level2: {
        background: vars.color.background.level2,
        color: vars.color.text.gray1,
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
        color: vars.color.text.onTone,
      },
      warning: {
        background: vars.color.background.warning,
        color: vars.color.text.onTone,
      },
      positive: {
        background: vars.color.background.positive,
        color: vars.color.text.onTone,
      },
      neutral: {
        background: vars.color.background.inverted,
        color: vars.color.text.inverted,
      },
      accent: {
        background: vars.color.background.accent,
        color: vars.color.text.onTone,
      },
      etherum: {
        background: vars.color.background.etherum,
        color: vars.color.text.onTone,
      },
    },
    color: vars.color.foreground,
  },
});
