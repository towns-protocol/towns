import React from "react";
import { Box, BoxProps } from "../Box/Box";
import { buttonStyle, ButtonStyleVariants } from "./Button.css";

type StyleProps = Omit<NonNullable<ButtonStyleVariants>, "active">;
type Props = {} & BoxProps & StyleProps;

export const Button = ({ size, children, ...boxProps }: Props) => (
  <Box as="button" className={buttonStyle({ size })} {...boxProps}>
    {children}
  </Box>
);
