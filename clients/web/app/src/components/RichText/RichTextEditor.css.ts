import { globalStyle, style } from "@vanilla-extract/css";
import { atoms } from "ui/styles/atoms.css";
import { vars } from "ui/styles/vars.css";

export const contentEditable = style({
  outline: "none",
});

export const richTextEditorUI = atoms({
  paddingX: "md",
  paddingY: "md",
});

export const root = style({});

export const paragraph = style({});

export const ul = style({
  margin: 0,
  padding: 0,
  listStylePosition: "inside",
});

export const ol = style({
  margin: `${vars.space.xs} 0`,
  padding: 0,
  listStylePosition: "inside",
});

export const listitem = style({
  margin: `${vars.space.xs} ${vars.space.md}`,
});

export const ol1 = style({
  listStyleType: "decimal",
});
export const ol2 = style({
  listStyleType: "lower-alpha",
});
export const ol3 = style({
  listStyleType: "lower-roman",
});
export const ol4 = style({
  listStyleType: "decimal",
});

export const ul1 = style({
  listStyleType: "disc",
});
export const ul2 = style({
  listStyleType: "square",
});
export const ul3 = style({
  listStyleType: "disc",
});
export const ul4 = style({
  listStyleType: "square",
});

export const nestedListItem = style({
  listStyleType: "none",
  selectors: {
    ["&:before"]: {
      display: "none",
    },
    ["&:after"]: {
      display: "none",
    },
  },
});

const listitemCheckedShared = style({
  position: "relative",
  marginLeft: `${vars.space.sm}`,
  marginRight: `${vars.space.sm}`,
  paddingLeft: `${vars.space.lg}`,
  paddingRight: `${vars.space.lg}`,
  listStyleType: "none",
  outline: "none",

  selectors: {
    ["&:before"]: {
      content: "",
      display: "block",
      border: `1px solid ${vars.color.background.level4}`,
      width: vars.dims.square.square_xs,
      height: vars.dims.square.square_xs,
      top: `0`,
      left: `0`,
      cursor: "pointer",
      background: vars.color.background.level1,
      borderRadius: vars.borderRadius.xs,
      backgroundSize: "cover",
      position: "absolute",
    },
    ["&:focus:before"]: {
      borderRadius: `2px`,
      boxShadow: ` 0 0 0 2px #a6cdef`,
    },
  },
});

export const listitemChecked = style([
  listitemCheckedShared,
  {
    margin: `${vars.space.xs} ${vars.space.md}`,
    textDecoration: "line-through",
    selectors: {
      ["&:after"]: {
        content: "",
        display: `block`,
        position: `absolute`,
        cursor: "pointer",
        borderColor: vars.color.foreground.default,
        borderStyle: `solid`,
        top: `4px`,
        width: `3px`,
        left: `7px`,
        height: `6px`,
        transform: `rotate(45deg)`,
        borderWidth: `0 2px 2px 0`,
      },
    },
  },
]);

export const listitemUnchecked = style([
  listitemCheckedShared,
  {
    margin: `${vars.space.xs} ${vars.space.md}`,
  },
]);

globalStyle(`${contentEditable} ${paragraph} + ${paragraph}`, {
  marginTop: vars.space.md,
});

globalStyle(
  `${contentEditable} ${listitemCheckedShared}${nestedListItem}:before`,
  {
    display: "none",
  },
);

globalStyle(
  `
  ${contentEditable} ${paragraph} + ${ul},
  ${contentEditable} ${paragraph} + ${ol},
  ${contentEditable} ${ul} + *,
  ${contentEditable} ${ol} + *
  `,
  {
    marginTop: vars.space.md,
  },
);

globalStyle(`${contentEditable} ${ul}:first-of-type li:first-child`, {
  marginTop: 0,
});

globalStyle(`${contentEditable} ${ul}:first-of-type li:last-child`, {
  marginBottom: 0,
});
