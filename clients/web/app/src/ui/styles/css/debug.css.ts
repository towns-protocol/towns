import { globalStyle, style } from "@vanilla-extract/css";

export const debugClass = style({});

globalStyle(".debug-grid:after", {
  pointerEvents: "none",
  opacity: 1,
  content: "",
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundImage:
    "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAjSURBVHgB3cqxAQAABMTA2MxmbP4KNQP8tQk4iCuI2kF08hhzuwNAwHOejwAAAABJRU5ErkJggg==')",
});
