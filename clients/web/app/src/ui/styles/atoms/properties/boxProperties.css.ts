import { vars } from "ui/styles/vars.css";

export const border = {
  default: `1px solid ${vars.color.background.level3}`,
  strong: `1px solid ${vars.color.text.default}`,
  inverted: `1px solid ${vars.color.text.inverted}`,
} as const;

export const aspectRatio = {
  square: "1",
  "1/1": "1",
  "4/3": "4 / 3",
  "3/4": "3 / 4",
  "16/9": "16 / 9",
  "9/16": "9 / 16",
  "2/1": "2 / 1",
  "1/2": "1 / 2",
  "3/1": "3 / 1",
  "1/3": "1 / 3",
};

export const flexDirection = {
  row: "row",
  column: "column",
} as const;

export const flexAlignment = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
} as const;

export const flexJustifyAlignment = {
  ...flexAlignment,
  spaceAround: "space-around",
  spaceBetween: "space-between",
} as const;

export const flexGrow = {
  h1: 0.1,
  h2: 0.2,
  h3: 0.3,
  h4: 0.4,
  h5: 0.5,
  h6: 0.6,
  h7: 0.7,
  h8: 0.8,
  h9: 0.9,
  x0: 0,
  x1: 1,
  x2: 2,
  x3: 3,
  x4: 4,
  x5: 5,
  x6: 6,
  x7: 7,
  x8: 8,
  x9: 9,
} as const;
