import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "ui/styles/vars.css";

export const MessageBody = style({});

globalStyle(`${MessageBody} p`, {
  lineHeight: "1.2em",
});

globalStyle(`${MessageBody} p + p`, {
  marginTop: "1em",
});

globalStyle(`${MessageBody} a`, {
  color: vars.color.foreground.accent,
});

globalStyle(`${MessageBody} strong`, {
  fontWeight: vars.fontWeight.strong,
  color: vars.color.text.default,
});
