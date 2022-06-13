import React from "react";
import { Stack } from "@ui";
import { ToneNameType } from "ui/styles/themes";
import { Icon, IconName } from "../Icon";
import { ButtonStyleVariants, buttonStyle } from "./Button.css";

type StyleProps = Omit<NonNullable<ButtonStyleVariants>, "active">;
type Props = {
  children: React.ReactNode;
  tone?: ToneNameType;
  icon?: IconName;
  disabled?: boolean;
  onClick?: () => void;
} & StyleProps;

export const Button = ({
  size = "input_md",
  disabled,
  tone = "cta1",
  icon,
  children,
  onClick,
}: Props) => (
  <Stack
    horizontal
    as="button"
    cursor={disabled ? "default" : "pointer"}
    className={buttonStyle({ size })}
    justifyContent="center"
    alignItems="center"
    background={tone}
    onClick={onClick}
  >
    {icon && <Icon type={icon} size="square_inline" />}
    {children}
  </Stack>
);
