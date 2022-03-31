import { globalStyle } from "@vanilla-extract/css";

globalStyle("html, body", {
  vars: {
    "--bl": "8px",
  },
  boxSizing: "border-box",
  margin: 0,
  minHeight: "100vh",
  fontFamily: "Nunito, sans-serif",
  textRendering: "optimizeLegibility",
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
  WebkitTextSizeAdjust: "100%",
});

globalStyle("*", {
  boxSizing: "border-box",
});

globalStyle("body, p, button", {
  fontSize: "11px",
  lineHeight: "13px",
});

globalStyle("p", {
  fontSize: "11px",
  lineHeight: "100%",
  margin: "0 0",
});

globalStyle("h1, h2, h3, h4 ,h5 ,h6, h7", {
  fontSize: "11px",
  lineHeight: "13px",
  margin: 0,
  // marginBottom: "0.2em",
});
