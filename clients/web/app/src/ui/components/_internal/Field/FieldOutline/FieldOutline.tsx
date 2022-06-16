import clsx from "clsx";
import React from "react";
import { Box, BoxProps } from "@ui";
import { FieldTone } from "../Field";
import * as styles from "./FieldOutline.css";

type Props = {
  tone: FieldTone;
  withBorder?: boolean;
  disabled?: boolean;
} & BoxProps;

export const FieldOutline = (props: Props) => (
  <Box
    absoluteFill
    rounded="sm"
    pointerEvents="none"
    {...props}
    className={clsx([styles.fieldOutline, styles.fieldTones[props.tone]])}
  />
);
