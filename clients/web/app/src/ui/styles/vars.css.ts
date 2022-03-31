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
  Green: "#16E782",
  Eth: "#18A0FB",
} as const;

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

  dims: {
    // bl: {
    //   "0": `${baseline * 0}px`,
    //   "1": `${baseline * 0.5}px`,
    //   "2": `${baseline * 1}px`,
    //   "3": `${baseline * 1.5}px`,
    //   "4": `${baseline * 2}px`,
    //   "5": `${baseline * 2.5}px`,
    //   "6": `${baseline * 3}px`,
    //   "7": `${baseline * 3.5}px`,
    //   "8": `${baseline * 4}px`,
    //   "9": `${baseline * 4.5}px`,
    //   "10": `${baseline * 5}px`,
    //   "11": `${baseline * 5.5}px`,
    //   "12": `${baseline * 6}px`,
    //   "13": `${baseline * 6.5}px`,
    //   "14": `${baseline * 7}px`,
    //   "15": `${baseline * 7.5}px`,
    //   "16": `${baseline * 8}px`,
    //   "17": `${baseline * 8.5}px`,
    //   "18": `${baseline * 9}px`,
    //   "19": `${baseline * 9.5}px`,
    //   "20": `${baseline * 10}px`,
    //   "21": `${baseline * 10.5}px`,
    //   "22": `${baseline * 11}px`,
    //   "23": `${baseline * 11.5}px`,
    //   "24": `${baseline * 12}px`,
    // },

    icons: {
      // xsmall icons / avatars
      xs: `${baseline * 2}px`,
      // small icons / avatars
      sm: `${baseline * 2.5}px`,
      // default icon
      md: `${baseline * 3}px`,
      // default icon
      lg: `${baseline * 4}px`,
      // big icons
      xl: `${baseline * 7}px`,
      // hero avatar
      xxl: `${baseline * 12.5}px`,
    },
    rows: {
      /** pills */
      xs: `${baseline * 2.5}px`,
      /** text rows */
      sm: `${baseline * 3.5}px`,
      /** message rows */
      md: `${baseline * 4.5}px`,
      /** input fields / topbar */
      lg: `${baseline * 5}px`,
    },
    inputs: {
      sm: `${baseline * 3}px`,
      // drop downs
      md: `${baseline * 4}px`,
      // chat input
      lg: `${baseline * 5}px`,
    },
  } as const,

  borderRadius: {
    none: "0",
    xxs: `${baseline * 0.5}px`,
    xs: `${baseline * 0.75}px`,
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
    sm: "11px",
    md: "13px",
    lg: "15px",
    xl: "18px",
    // note: before setting the naming, figure the sizes we actually use
    xl24: "24px",
    xl32: "32px",
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
      default: FigmaPalette.DarkGrey,
      muted: FigmaPalette.MedGrey,
      muted1: FigmaPalette.MedGrey,
      muted2: FigmaPalette.Grey,
      muted3: FigmaPalette.LightGrey,
      accent: FigmaPalette.Blue,
      secondary: FigmaPalette.Green,
      inverted: FigmaPalette.White,
    },
  } as const,
});
