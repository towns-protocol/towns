import clsx from "clsx";
import React from "react";
import { Box, BoxProps } from "@ui";
import * as styles from "./FieldOutline.css";
import { FieldTone } from "../Field";

type Props = {
  tone: FieldTone;
  noBorder: boolean;
};

export const FieldOutline = (props: Props) => (
  <>
    <OutlineOverlay
      className={clsx([styles.outlineBase, styles.outlines["focus"]])}
    />
    {(!props.noBorder || !props.tone || props.tone !== "neutral") && (
      <OutlineOverlay
        className={clsx(styles.outlineBase, styles.outlines[props.tone])}
      />
    )}

    <OutlineOverlay className={clsx([styles.outlineBase, styles.hidden])} />
  </>
);

const OutlineOverlay = (props: BoxProps) => (
  <Box absoluteFill rounded="sm" pointerEvents="none" {...props} />
);
