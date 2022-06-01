import React from "react";
import { Heading, Stack } from "@ui";
import { vars } from "ui/styles/vars.css";
import { Icon, IconName } from "../Icon";
import { ButtonStyleVariants, buttonStyle } from "./Button.css";

type StyleProps = Omit<NonNullable<ButtonStyleVariants>, "active">;
type Props = {
  children: React.ReactNode;
  tone?: keyof typeof vars.color.tone;
  icon?: IconName;
  disabled?: boolean;
  onClick?: () => void;
} & StyleProps;

export const Button = ({
  size,
  disabled,
  tone,
  icon,
  children,
  onClick,
}: Props) => (
  <Stack
    horizontal
    cursor={disabled ? "default" : "pointer"}
    as="button"
    className={buttonStyle({ size })}
    justifyContent="center"
    alignItems="center"
    background={tone ?? "neutral"}
    onClick={onClick}
  >
    {icon && <Icon type={icon} size="square_inline" />}
    <Heading level={5}>{children}</Heading>
  </Stack>
);
