import React from "react";
import { vars } from "ui/styles/vars.css";
import { Box } from "../Box/Box";
import { Icon, IconName } from "../Icon";
import { ButtonStyleVariants, buttonStyle } from "./Button.css";

type StyleProps = Omit<NonNullable<ButtonStyleVariants>, "active">;
type Props = {
  children: React.ReactNode;
  variant?: keyof typeof vars.color.semantic;
  icon?: IconName;
} & StyleProps;

export const Button = ({ size, variant, icon, children }: Props) => (
  <Box
    as="button"
    direction="row"
    className={buttonStyle({ size })}
    justifyContent="center"
    alignItems="center"
    background={variant ?? "neutral"}
    color="default"
  >
    {icon && <Icon type={icon} size="adapt" />}
    {children}
  </Box>
);
