import React from "react";
import { InputStyleVariants, inputStyle } from "./Input.css";

type NativeInputProps = React.AllHTMLAttributes<HTMLInputElement>;

type StyleProps = Omit<NonNullable<InputStyleVariants>, "active">;

type Props = {
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

export const Input = ({ size, ...inputProps }: Props) => {
  return <input {...inputProps} className={inputStyle({ size })} />;
};
