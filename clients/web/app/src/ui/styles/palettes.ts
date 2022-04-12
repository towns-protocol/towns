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
  Blue: "#6B71F7",
  Green: "#16E782",
  Eth: "#18A0FB",
  Red: "#FB635C",
  ENSBlue: "#18A0FB",
} as const;

const tone = {
  critical: "#e71a16",
  warning: "#e78216",
  positive: FigmaPalette.Green,
  neutral: FigmaPalette.MedGrey,
  accent: FigmaPalette.Red,
  etherum: FigmaPalette.ENSBlue,
} as const;

const light = (() => {
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
    accent: FigmaPalette.Red,
    secondary: FigmaPalette.Green,
    inverted: FigmaPalette.White,
    onTone: FigmaPalette.White,
  };

  return {
    tone,
    layer,
    text,
    foreground: {
      ...text,
      ...tone,
    } as const,
    background: {
      ...layer,
      ...tone,
    } as const,
  } as const;
})();

const dark = (() => {
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
    accent: FigmaPalette.Red,
    secondary: FigmaPalette.Green,
    inverted: FigmaPalette.Black,
    onTone: FigmaPalette.White,
  } as const;
  return {
    tone,
    layer,
    text,
    foreground: {
      ...text,
      ...tone,
    } as const,
    background: {
      ...layer,
      ...tone,
    } as const,
  } as const;
})();

export const palettes = {
  light,
  dark,
} as const;
