import {
  createGlobalTheme,
  createTheme,
  createThemeContract,
} from "@vanilla-extract/css";

export const zoom = 1.1;
export const baseline = 8 * zoom;
export const fontBase = 13 * zoom;

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

const color = createThemeContract({
  background: {
    none: null,
    default: null,
    level1: null,
    level2: null,
    level3: null,
    accent: null,
    secondary: null,
    /** opacity overlay, highlighting content undependently of parent layer background */
    overlay: null,
    inverted: null,
  } as const,
  text: {
    default: null,
    muted: null,
    muted1: null,
    // muted2: null,
    // muted3: null,
    accent: null,
    secondary: null,
    inverted: null,
  },
});

export const lightTheme = createTheme(color, {
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
    // muted2: FigmaPalette.Grey,
    // muted3: FigmaPalette.LightGrey,
    accent: FigmaPalette.Blue,
    secondary: FigmaPalette.Green,
    inverted: FigmaPalette.White,
  },
});

export const darkTheme = createTheme(color, {
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
    // muted2: FigmaPalette.DarkGrey,
    // muted3: FigmaPalette.XXDarkGrey,
    accent: FigmaPalette.Blue,
    secondary: FigmaPalette.Green,
    inverted: FigmaPalette.White,
  },
});

const root = createGlobalTheme(":root", {
  bl: `${baseline}px`,
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
    icons: {
      xxs: `${baseline * 1.5}px`,
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

    screens: {
      // for testing !
      "25vw": `25vw`,
      // for testing !
      "50vw": `50vw`,
      // for testing !
      "75vw": `75vw`,
      // for testing !
      "1200": `1200px`,
      // for testing !
      "1440": `1440px`,
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
    sm: `${(fontBase * 11) / 13}px`,
    md: `${(fontBase * 13) / 13}px`,
    lg: `${(fontBase * 15) / 13}px`,
    xl: `${(fontBase * 18) / 13}px`,
    // note: before setting the naming, figure the sizes we actually use
    xl24: `${(fontBase * 24) / 13}px`,
    xl32: `${(fontBase * 32) / 13}px`,
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

  colSpan: {
    1: `span 1`,
    2: `span 2`,
    3: `span 3`,
    4: `span 4`,
    5: `span 5`,
    6: `span 6`,
    7: `span 7`,
    8: `span 8`,
    9: `span 9`,
    10: `span 10`,
    11: `span 11`,
    12: `span 12`,
  } as const,
});

export const vars = {
  ...root,
  color,
};
