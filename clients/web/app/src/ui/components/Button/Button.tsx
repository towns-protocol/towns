import React, { ButtonHTMLAttributes } from "react";
import { Stack } from "@ui";
import { ToneNameType } from "ui/styles/themes";
import { Icon, IconName } from "../Icon";
import { ButtonStyleVariants, buttonStyle } from "./Button.css";

type StyleProps = Omit<NonNullable<ButtonStyleVariants>, "active">;

type Props = {
  children?: React.ReactNode;
  tone?: ToneNameType;
  icon?: IconName;
  disabled?: boolean;
  onClick?: () => void;
} & ButtonHTMLAttributes<HTMLButtonElement> &
  StyleProps;

export const Button = ({
  size = "input_md",
  disabled,
  tone = "cta1",
  icon,
  children,
  onClick,
  ...inputProps
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
    {...inputProps}
  >
    {icon && <Icon type={icon} size="square_inline" />}
    {children}
  </Stack>
);
