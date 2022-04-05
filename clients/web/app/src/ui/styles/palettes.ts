const FigmaPalette = {
  Black: "#191B21",
  XXDarkGrey: "#252934",
  XDarkGrey: "#383B49",
  DarkGrey: "#525769",
  MedGrey: "#636A78",
  Grey: "#9BA5B8",
  LightGrey: "#D3DCE3",
  XLightGrey: "#E6ECF1",
  XXLightGrey: "#F4F7F9",
  White: "#FFFFFF",
  Blue: "#0000FF",
  Green: "#16E782",
  Eth: "#18A0FB",
} as const;

export const palettes = {
  light: {
    background: {
      none: "none",
      default: FigmaPalette.White,
      level1: FigmaPalette.XXLightGrey,
      level2: FigmaPalette.XLightGrey,
      level3: FigmaPalette.LightGrey,
      accent: FigmaPalette.Blue,
      secondary: FigmaPalette.Green,
      /** opacity overlay, highlighting content undependently of parent layer background */
      overlay: `rgba(255,255,255,0.5)`,
      inverted: FigmaPalette.Black,
    } as const,
    text: {
      default: FigmaPalette.XDarkGrey,
      muted: FigmaPalette.MedGrey,
      muted1: FigmaPalette.MedGrey,
      accent: FigmaPalette.Blue,
      secondary: FigmaPalette.Green,
      inverted: FigmaPalette.White,
    },
  },

  dark: {
    background: {
      none: "none",
      default: FigmaPalette.Black,
      level1: FigmaPalette.XXDarkGrey,
      level2: FigmaPalette.XDarkGrey,
      level3: FigmaPalette.DarkGrey,
      accent: FigmaPalette.Blue,
      secondary: FigmaPalette.Green,
      /** opacity overlay, highlighting content undependently of parent layer background */
      overlay: `rgba(255,255,255,0.5)`,
      inverted: FigmaPalette.White,
    } as const,
    text: {
      default: FigmaPalette.White,
      muted: FigmaPalette.XLightGrey,
      muted1: "#BAC4D7",
      accent: FigmaPalette.Blue,
      secondary: FigmaPalette.Green,
      inverted: FigmaPalette.White,
    },
  },
} as const;
