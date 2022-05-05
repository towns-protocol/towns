import React from "react";
import clsx from "clsx";
import { Icon } from "@ui";
import { Box, BoxProps } from "../Box/Box";
import {
  InputAtoms,
  inputAtoms,
  inputContainerStyle,
  inputFieldStyle,
  inputIconStyle,
} from "./Input.css";
import { IconName } from "../Icon";

type NativeInputProps = React.AllHTMLAttributes<HTMLInputElement>;

type StyleProps = { active?: boolean; size?: "sm" | "md" };

type Props = {
  icon?: IconName;
  after?: React.ReactNode;
  height?: InputAtoms["height"];
  grow?: BoxProps["grow"];
  shrink?: BoxProps["shrink"];
  padding?: BoxProps["padding"];
  rounded?: BoxProps["rounded"];
  autoFocus?: NativeInputProps["autoFocus"];
  autoComplete?: NativeInputProps["autoComplete"];
  autoCorrect?: NativeInputProps["autoCorrect"];
  defaultValue?: string | number;
  disabled?: boolean;
  id?: NativeInputProps["id"];
  inputMode?: NativeInputProps["inputMode"];
  name?: string;
  placeholder?: NativeInputProps["placeholder"];
  readOnly?: NativeInputProps["readOnly"];
  spellCheck?: NativeInputProps["spellCheck"];
  tabIndex?: NativeInputProps["tabIndex"];
  type?: "email" | "number" | "text" | "search";
  units?: string;
  value?: string | number;
  onBlur?: NativeInputProps["onBlur"];
  onChange?: React.EventHandler<React.ChangeEvent<HTMLInputElement>>;
  onFocus?: NativeInputProps["onFocus"];
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
} & StyleProps;

export const Input = ({
  icon,
  after,
  size,
  grow,
  shrink,
  padding,
  rounded,
  height = "input_md",
  ...inputProps
}: Props) => {
  const boxProps = { grow, shrink, padding, rounded };
  return (
    <Box
      className={clsx(inputContainerStyle, inputAtoms({ height }))}
      direction="row"
      justifyContent="spaceBetween"
      alignItems="center"
      background="level2"
      color="default"
      gap="sm"
      {...boxProps}
    >
      {icon && (
        <Icon
          type={icon}
          size="square_xs"
          background="level3"
          className={inputIconStyle}
        />
      )}
      <Box
        as="input"
        {...inputProps}
        grow
        border
        fontSize="md"
        className={inputFieldStyle}
      />
      {after}
    </Box>
  );
};
