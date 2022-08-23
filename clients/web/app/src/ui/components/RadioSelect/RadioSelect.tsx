import { clsx } from "clsx";
import React, { FormEvent, SelectHTMLAttributes, useRef } from "react";
import { RefCallBack } from "react-hook-form";
import { Box, Text } from "@ui";
import { Grid } from "../Grid/Grid";
import { Stack } from "../Stack/Stack";
import { Field, FieldBaseProps, FieldTone } from "../_internal/Field/Field";
import * as fieldStyles from "../_internal/Field/Field.css";
import { FieldOutline } from "../_internal/Field/FieldOutline";
import * as styles from "./RadioSelect.css";

type Props = {
  defaultValue?: string;
  render?: (value: string, selected: boolean) => JSX.Element;
  options: ({ label: string; value: string } | string)[];
  columns?: number | string;
  onChange?: (e: FormEvent<HTMLSelectElement>) => void;
  onValueChange?: (value: string) => void;
  applyChildProps?: () => {
    ref: RefCallBack;
  } & Omit<SelectHTMLAttributes<HTMLSelectElement>, "color">;
} & FieldBaseProps;

export const RadioSelect = (props: Props) => {
  const {
    defaultValue,
    options: _options,
    render,
    columns,
    onChange: delegatedOnChange,
    onValueChange,
    applyChildProps,
    ...fieldProps
  } = props;

  const options = _options.map((o) =>
    typeof o === "string" ? { label: o, value: o } : o,
  );

  return (
    <Field {...fieldProps} height="auto" paddingX="none">
      {(overlays, { className, ...inputProps }) => (
        <>
          <Stack grow paddingTop="sm">
            <Grid
              columns={typeof columns === "number" ? columns : undefined}
              columnMinSize={typeof columns === "string" ? columns : undefined}
              className={clsx(className, styles.radioSelect)}
              {...inputProps}
              flexWrap="wrap"
            >
              {options.map((o) => {
                return (
                  <Checkbox
                    key={o.value}
                    id={inputProps?.id}
                    label={o.label}
                    value={o.value}
                    render={render}
                    tone={props.tone ?? "neutral"}
                    applyChildProps={applyChildProps}
                  />
                );
              })}
            </Grid>
          </Stack>
          {overlays}
        </>
      )}
    </Field>
  );
};

const Checkbox = (props: {
  id?: string;
  label: string;
  value: string;
  tone: FieldTone;
  render?: (value: string, selected: boolean) => JSX.Element;
  applyChildProps: Props["applyChildProps"];
}) => {
  const { label, value, id, render, applyChildProps } = props;
  const labelId = `label-${value.replace(/[^a-z0-9]/i, "_")}`;

  const fieldRef = useRef<HTMLInputElement | null>();
  const { ref, ...childProps } = applyChildProps?.() ?? {};

  return (
    <Stack
      horizontal
      cursor="pointer"
      as="label"
      gap="sm"
      color="gray1"
      alignItems="center"
      pointerEvents="all"
      key={labelId}
    >
      <Stack horizontal position="relative">
        <Box
          as="input"
          type="radio"
          color="negative"
          name={id}
          id={labelId}
          key={value}
          value={value}
          className={clsx([
            fieldStyles.field,
            render ? styles.hiddenRadio : styles.radio,
          ])}
          ref={(e) => {
            ref?.(e);
            fieldRef.current = e as HTMLInputElement;
          }}
          {...childProps}
        />
        {!render && (
          <FieldOutline
            tone={props.tone ?? "neutral"}
            disabled={false}
            rounded="full"
          />
        )}
      </Stack>
      {render ? (
        render(value, !!fieldRef?.current?.checked)
      ) : (
        <Text className={styles.radioLabel}>{String(label)}</Text>
      )}
    </Stack>
  );
};
