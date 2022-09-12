import { globalStyle, style } from "@vanilla-extract/css";
import { debugClass } from "./debug.css";

export const scrollContainerClass = style({
  overflowX: "hidden",
  overflowY: "scroll",
  scrollbarWidth: "none",
  overflowAnchor: "none",
});

globalStyle(`${scrollContainerClass}::-webkit-scrollbar`, {
  display: "none",
});

globalStyle(`${debugClass} ${scrollContainerClass}::-webkit-scrollbar`, {
  border: "2px dashed yellow",
});
