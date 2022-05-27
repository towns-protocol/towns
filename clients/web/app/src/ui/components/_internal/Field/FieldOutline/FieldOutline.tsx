import clsx from "clsx";
import React from "react";
import { Box, BoxProps } from "@ui";
import * as styles from "./FieldOutline.css";
import { FieldTone } from "../Field";

export const FieldOutline = (props: { tone: FieldTone }) => (
  <>
    <OutlineOverlay
      className={clsx([styles.outlineBase, styles.outlines["focus"]])}
    />
    <OutlineOverlay
      className={clsx(styles.outlineBase, styles.outlines[props.tone])}
    />
    <OutlineOverlay className={clsx([styles.outlineBase, styles.hidden])} />
  </>
);

const OutlineOverlay = (props: BoxProps) => (
  <Box absoluteFill rounded="sm" pointerEvents="none" {...props} />
);
