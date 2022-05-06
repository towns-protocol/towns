export const FontFamily = {
  TitleFont: "TitleFont",
  BodyFont: "BodyFont",
} as const;

export const fontSettings = [
  {
    fontFamily: FontFamily.BodyFont,
    src: "url('/fonts/Inter.var.woff2')",
    fontDescription: {
      weight: "normal",
      style: "normal",
    },
    targets: ["p"],
    capSize: {
      trimTop: "-0.26em",
      trimBottom: "-0.24em",
      lineHeight: "1.24em",
    },
  },
  {
    fontFamily: FontFamily.TitleFont,
    src: "url('/fonts/GT Flexa Var Trial.woff2')",
    fontDescription: {
      weight: "normal",
      style: "normal",
    },
    targets: ["h1", "h2", "h3", "h4", "h5", "h6"],
    capSize: {
      trimTop: "-0.2em",
      trimBottom: "-0.32em",
      lineHeight: "1.24em",
    },
  },
] as const;

let isInit = false;

export const FontLoader = {
  init() {
    if (isInit) return;
    isInit = true;
    fontSettings.forEach((f) => {
      const font = new FontFace(f.fontFamily, f.src, f.fontDescription);
      document.fonts.add(font);
    });
  },
};
