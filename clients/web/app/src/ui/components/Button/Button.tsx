import { Variants, motion } from "framer-motion";
import React, { ButtonHTMLAttributes } from "react";
import { Box } from "@ui";
import { ToneNameType } from "ui/styles/themes";
import { Icon, IconName } from "../Icon";
import { ButtonStyleVariants, buttonStyle } from "./Button.css";

type StyleProps = Omit<NonNullable<ButtonStyleVariants>, "active">;

type Props = {
  children?: React.ReactNode;
  tone?: ToneNameType;
  icon?: IconName;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragEnd" | "onDragStart" | "onAnimationStart" | "size" | "color"
> &
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
  <MotionStack
    layout
    horizontal
    as="button"
    cursor={disabled ? "default" : "pointer"}
    className={buttonStyle({ size })}
    justifyContent="center"
    alignItems="center"
    background={tone}
    variants={buttonVariants}
    whileHover="hover"
    onClick={onClick}
    {...inputProps}
  >
    {icon && <Icon type={icon} size="square_inline" />}
    {children}
  </MotionStack>
);

const buttonVariants: Variants = {
  hover: {
    // border: `0 0 0 1px ${Figma.Colors.Orange}`,
  },
};

const MotionStack = motion(Box);
