import React from "react";
import { Stack, Text } from "@ui";

export type FieldLabelProps = {
  label?: string;
  secondaryLabel?: string;
  for: string;
};

export const FieldLabel = (props: FieldLabelProps) => {
  return props.label || props.secondaryLabel ? (
    <Stack horizontal gap="xs">
      <Text as="label" for={props.for}>
        {props.label}
      </Text>
      <Text as="label" for={props.for} color="gray1">
        {props.secondaryLabel}
      </Text>
    </Stack>
  ) : (
    <></>
  );
};
