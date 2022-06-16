import { motion } from "framer-motion";
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
  onClick?: () => void;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragEnd" | "onDragStart" | "onAnimationStart"
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
    initial={false}
    direction="row"
    as="button"
    cursor={disabled ? "default" : "pointer"}
    className={buttonStyle({ size })}
    justifyContent="center"
    alignItems="center"
    background={tone}
    onClick={onClick}
    {...inputProps}
  >
    {icon && (
      <motion.div layout="position">
        <Icon type={icon} size="square_inline" />
      </motion.div>
    )}
    <motion.div layout="position">{children}</motion.div>
  </MotionStack>
);

const MotionStack = motion(Box);
