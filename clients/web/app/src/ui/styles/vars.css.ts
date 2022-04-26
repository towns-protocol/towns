import {
  createGlobalTheme,
  createTheme,
  createThemeContract,
} from "@vanilla-extract/css";
import { breakpoints } from "./breakpoints";
import { palettes } from "./palettes";

// export const zoom = 1.1;
export const baseline = 8;
export const fontBase = 15;

const color = createThemeContract(palettes.light);
export const lightTheme = createTheme(color, palettes.light);
export const darkTheme = createTheme(color, palettes.dark);

const root = createGlobalTheme(":root", {
  bl: `${baseline}px`,
  size: {
    none: "0",
    sm: `${baseline * 4}px`,
    md: `${baseline * 8}px`,
    lg: `${baseline * 12}px`,
  } as const,
  insetX: {
    none: { marginLeft: "0", marginRight: "0" },
    xxs: {
      marginLeft: `${baseline * -0.5}px`,
      marginRight: `${baseline * -0.5}px`,
    },
    xs: { marginLeft: `${baseline * -1}px`, marginRight: `${baseline * -1}px` },
    sm: { marginLeft: `${baseline * -2}px`, marginRight: `${baseline * -2}px` },
    md: { marginLeft: `${baseline * -4}px`, marginRight: `${baseline * -4}px` },
    lg: { marginLeft: `${baseline * -8}px`, marginRight: `${baseline * -8}px` },
    xl: {
      marginLeft: `${baseline * -16}px`,
      marginRight: `${baseline * -16}px`,
    },
  } as const,
  insetY: {
    none: { marginTop: "0", marginBottom: "0" },
    xxs: {
      marginTop: `${baseline * -0.5}px`,
      marginBottom: `${baseline * -0.5}px`,
    },
    xs: { marginTop: `${baseline * -1}px`, marginBottom: `${baseline * -1}px` },
    sm: { marginTop: `${baseline * -2}px`, marginBottom: `${baseline * -2}px` },
    md: { marginTop: `${baseline * -4}px`, marginBottom: `${baseline * -4}px` },
    lg: { marginTop: `${baseline * -8}px`, marginBottom: `${baseline * -8}px` },
    xl: {
      marginTop: `${baseline * -16}px`,
      marginBottom: `${baseline * -16}px`,
    },
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
      xl: `${baseline * 6.5}px`,
      // hero avatar
      xxl: `${baseline * 10}px`,

      adapt: `1.2em`,
    },
    rows: {
      xxs: `${baseline * 1.5}px`,
      /** pills */
      xs: `${baseline * 2.5}px`,
      /** text rows */
      sm: `${baseline * 3.5}px`,
      /** message rows */
      md: `${baseline * 5}px`,
      /** input fields / topbar */
      lg: `${baseline * 6.5}px`,

      /**
       * ideally we would only use semantical but small inconsistencies makes it
       * hard to to make one-version-fits-all-needs
       **/
      x1: `${baseline * 1}px`,
      x2: `${baseline * 2}px`,
      x3: `${baseline * 3}px`,
      x4: `${baseline * 4}px`,
      x5: `${baseline * 5}px`,
      x6: `${baseline * 6}px`,
      x7: `${baseline * 7}px`,
      x8: `${baseline * 8}px`,
      x9: `${baseline * 9}px`,

      /** 80px */
      x10: `${baseline * 10}px`,
      /** 160px */
      x20: `${baseline * 20}px`,
      /** 320px */
      x40: `${baseline * 40}px`,
    },

    screens: {
      none: "0",
      auto: "auto",
      // for testing !
      "5vw": `5vw`,
      "10vw": `10vw`,
      "25vw": `25vw`,
      "50vw": `50vw`,
      "75vw": `75vw`,
      "10vh": `10vh`,
      "25vh": `25vh`,
      "50vh": `50vh`,
      "75vh": `75vh`,
      "100%": `100%`,
      "100": `100px`,
      "200": `200px`,
      "300": `300px`,
      "400": `400px`,
      "1200": `1200px`,
      "1440": `1440px`,
      tablet: `${breakpoints.tablet}px`,
      desktop: `${breakpoints.desktop}px`,
      wide: `${breakpoints.wide}px`,
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
    md: `${baseline * 1.5}px`,
    lg: `${baseline * 4}px`,
    xl: `${baseline * 8}px`,
    full: "999999px",
  } as const,

  fontWeight: {
    normal: "400",
    strong: "900",
  } as const,

  fontSize: {
    sm: `${13}px`,
    md: `${15}px`,
    lg: `${17}px`,
    xl: `${24}px`,
    // note: before setting the naming, figure the sizes we actually use
    xl24: `${32}px`,
    xl32: `${37}px`,
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

const defaultColorTheme = createGlobalTheme(":root", color, palettes.light);

export const vars = {
  ...root,
  defaultColorTheme,
  color,
};
