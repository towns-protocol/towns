import React from "react";
import { Stack } from "@ui";
import { vars } from "ui/styles/vars.css";
import { Icon, IconName } from "../Icon";
import { ButtonStyleVariants, buttonStyle } from "./Button.css";

type StyleProps = Omit<NonNullable<ButtonStyleVariants>, "active">;
type Props = {
  children: React.ReactNode;
  variant?: keyof typeof vars.color.tone;
  icon?: IconName;
  onClick: () => void;
} & StyleProps;

export const Button = ({ size, variant, icon, children, onClick }: Props) => (
  <Stack
    horizontal
    as="button"
    className={buttonStyle({ size })}
    justifyContent="center"
    alignItems="center"
    background={variant ?? "neutral"}
    color="onTone"
    onClick={onClick}
  >
    {icon && <Icon type={icon} size="square_inline" />}
    {children}
  </Stack>
);
