import React from "react";
import { Stack, Text } from "@ui";
import { Heading } from "ui/components/Text/Heading";
import { Paragraph } from "ui/components/Text/Paragraph";

export type FieldLabelProps = {
  label?: string;
  secondaryLabel?: string;
  description?: string;
  for: string;
};

export const FieldLabel = (props: FieldLabelProps) => {
  return props.label || props.secondaryLabel ? (
    <Stack as="label" gap="md" htmlFor={props.for}>
      <Stack horizontal gap="xs">
        <Heading level={4}>{props.label}</Heading>
        <Text color="gray1">{props.secondaryLabel}</Text>
      </Stack>
      {props.description && (
        <Paragraph color="gray1">{props.description}</Paragraph>
      )}
    </Stack>
  ) : (
    <></>
  );
};
