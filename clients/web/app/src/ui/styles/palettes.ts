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

const light = (() => {
  const semantic = {
    neutral: FigmaPalette.MedGrey,
    accent: FigmaPalette.Blue,
    positive: "green",
    critical: "red",
    warning: "orange",
  } as const;
  const layer = {
    none: "none",
    default: FigmaPalette.White,
    level1: FigmaPalette.XXLightGrey,
    level2: FigmaPalette.XLightGrey,
    level3: FigmaPalette.LightGrey,
    /** opacity overlay, highlighting content undependently of parent layer layers */
    overlay: `rgba(255,255,255,0.5)`,
    inverted: FigmaPalette.Black,
  } as const;
  const text = {
    default: FigmaPalette.XDarkGrey,
    gray1: FigmaPalette.MedGrey,
    gray2: FigmaPalette.Grey,
    accent: FigmaPalette.Blue,
    secondary: FigmaPalette.Green,
    inverted: FigmaPalette.White,
    onSemantic: FigmaPalette.White,
  };

  return {
    semantic,
    layer,
    text,
    foreground: {
      ...text,
      ...semantic,
    } as const,
    background: {
      ...layer,
      ...semantic,
    } as const,
  } as const;
})();

const dark = (() => {
  const semantic = {
    critical: "red",
    warning: "orange",
    positive: "green",
    neutral: FigmaPalette.MedGrey,
    accent: FigmaPalette.Blue,
  } as const;
  const layer = {
    none: "none",
    default: FigmaPalette.Black,
    level1: FigmaPalette.XXDarkGrey,
    level2: FigmaPalette.XDarkGrey,
    level3: FigmaPalette.DarkGrey,
    /** opacity overlay, highlighting content undependently of parent layer background */
    overlay: `rgba(255,255,255,0.5)`,
    inverted: FigmaPalette.White,
  } as const;
  const text = {
    default: FigmaPalette.White,
    gray1: FigmaPalette.XLightGrey,
    gray2: "#BAC4D7",
    accent: FigmaPalette.Blue,
    secondary: FigmaPalette.Green,
    inverted: FigmaPalette.Black,
    onSemantic: FigmaPalette.White,
  } as const;
  return {
    semantic,
    layer,
    text,
    foreground: {
      ...text,
      ...semantic,
    } as const,
    background: {
      ...layer,
      ...semantic,
    } as const,
  } as const;
})();

export const palettes = {
  light,
  dark,
} as const;
