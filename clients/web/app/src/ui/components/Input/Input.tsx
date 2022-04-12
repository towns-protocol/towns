import React from "react";
import { Box, BoxProps } from "../Box/Box";
import { inputContainerStyle, inputFieldStyle } from "./Input.css";

type NativeInputProps = React.AllHTMLAttributes<HTMLInputElement>;

type StyleProps = { active?: boolean; size?: "sm" | "md" };

type Props = {
  before?: React.ReactNode;
  after?: React.ReactNode;
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
  before,
  after,
  size,
  grow,
  shrink,
  padding,
  rounded,
  ...inputProps
}: Props) => {
  const boxProps = { grow, shrink, padding, rounded };
  return (
    <Box
      className={inputContainerStyle}
      {...boxProps}
      direction="row"
      justifyContent="spaceBetween"
      alignItems="center"
    >
      {before}
      <Box
        as="input"
        {...inputProps}
        fontSize="md"
        className={inputFieldStyle}
      />
      {after}
    </Box>
  );
};
