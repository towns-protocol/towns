import React from "react";
import { Box } from "@ui";
import { Field, FieldBaseProps } from "../_internal/Field/Field";

type NativeInputProps = React.AllHTMLAttributes<HTMLInputElement>;

type InputCallbackProps = {
  onBlur?: NativeInputProps["onBlur"];
  onChange?: React.EventHandler<React.ChangeEvent<HTMLInputElement>>;
  onFocus?: NativeInputProps["onFocus"];
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
};

type Props = {
  placeholder?: string;
  type?: NativeInputProps["type"];
} & FieldBaseProps &
  InputCallbackProps;

export const TextField = (props: Props) => {
  const { type, placeholder, ...fieldProps } = props;
  return (
    <Field {...fieldProps}>
      {(overlays, inputProps) => (
        <>
          <Box
            as="input"
            {...inputProps}
            type={type}
            placeholder={placeholder}
          />
          {overlays}
        </>
      )}
    </Field>
  );
};
