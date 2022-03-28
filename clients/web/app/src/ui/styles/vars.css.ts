import { createGlobalTheme } from "@vanilla-extract/css";

export const baseline = 8;

const FigmaPalette = {
  Black: "#191B21",
  XDarkGrey: "#252934",
  DarkGrey: "#383B49",
  MedGrey: "#636A78",
  Grey: "#9BA5B8",
  LightGrey: "#D3DCE3",
  XLightGrey: "#E6ECF1",
  XXLightGrey: "#F4F7F9",
  White: "#FFFFFF",
  Blue: "#0000FF",
  Green: "#00FF00",
};

export const vars = createGlobalTheme(":root", {
  bl: "8px",
  size: {
    none: "0",
    sm: `${baseline * 4}px`,
    md: `${baseline * 8}px`,
    lg: `${baseline * 12}px`,
  } as const,
  space: {
    none: "0",
    xxs: `${baseline * 0.5}px`,
    xs: `${baseline * 1}px`,
    sm: `${baseline * 2}px`,
    md: `${baseline * 4}px`,
    lg: `${baseline * 8}px`,
    xl: `${baseline * 16}px`,
  } as const,

  flexGrow: {
    x0: "0",
    x1: "1",
    x2: "2",
    x3: "3",
    x4: "4",
    x5: "5",
    x6: "6",
    x7: "7",
    x8: "8",
    x9: "9",
  } as const,

  dims: {
    // TBD
    xs: `16px`,
    sm: `20px`,
    md: `28px`,
    lg: `36px`,
    xl: `57px`,
  } as const,
  border: {
    thin: "0.5px",
    regular: "1px",
    true: "1px",
    thick: "2px",
  } as const,

  borderRadius: {
    none: "0",
    xxs: `${baseline * 0.25}px`,
    xs: `${baseline * 0.5}px`,
    sm: `${baseline * 1}px`,
    md: `${baseline * 2}px`,
    lg: `${baseline * 4}px`,
    xl: `${baseline * 8}px`,
    full: "999999px",
  } as const,

  fontWeight: {
    normal: "400",
    strong: "900",
  } as const,
  fontSize: {
    xxs: "9px",
    xs: "11px",
    sm: "13px",
    md: "15px",
    lg: "18px",
    xl: "24px",
    // note: before setting the naming, figure the sizes we actually use
    xxl: "36px",
    // xl48: "48px",
    // xl72: "72px",
  } as const,
  textAlign: {
    left: "left",
    right: "right",
    center: "center",
    justify: "justify",
  } as const,
  textTransform: {
    uppercase: "uppercase",
    capitalize: "capitalize",
    none: "normal",
  } as const,
  color: {
    background: {
      transparent: "transparent",
      default: FigmaPalette.White,
      level1: `rgba(0, 40, 80, 0.05)`,
      level2: `rgba(0, 40, 80, 0.10)`,
      level3: `rgba(0, 0, 100, 0.33)`,
      // level1: FigmaPalette.XXLightGrey,
      // level2: FigmaPalette.XLightGrey,
      // level3: FigmaPalette.LightGrey,
      accent: FigmaPalette.Blue,
      brand: FigmaPalette.Green,
      inverted: FigmaPalette.Black,
    } as const,
    text: {
      default: FigmaPalette.DarkGrey,
      muted: FigmaPalette.MedGrey,
      muted1: FigmaPalette.MedGrey,
      muted2: FigmaPalette.Grey,
      muted3: FigmaPalette.LightGrey,
      accent: FigmaPalette.Blue,
      brand: FigmaPalette.Green,
      inverted: FigmaPalette.White,
    },
  } as const,
});
