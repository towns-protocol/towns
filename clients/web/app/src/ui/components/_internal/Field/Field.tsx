import React, { AllHTMLAttributes, ReactNode } from "react";
import { BoxProps, Stack } from "@ui";
import { Icon, IconName } from "ui/components/Icon";
import * as styles from "./Field.css";
import { FieldLabel } from "./FieldLabel";
import { FieldOutline } from "./FieldOutline";

type FormElementProps = AllHTMLAttributes<HTMLFormElement>;

export const tones = ["neutral", "critical", "positive"] as const;
export type FieldTone = typeof tones[number];

export type FieldBaseProps = {
  tone?: FieldTone;
  background?: BoxProps["background"];
  noBorder?: boolean;
  label?: string;
  secondaryLabel?: string;
  description?: string;
  message?: React.ReactNode;

  id?: NonNullable<FormElementProps["id"]>;
  value?: FormElementProps["value"];
  name?: FormElementProps["name"];
  disabled?: FormElementProps["disabled"];
  autoComplete?: FormElementProps["autoComplete"];
  autoFocus?: boolean;
  icon?: IconName;
  /** JSX node to be appended at the end of the field */
  after?: React.ReactNode;
  /** JSX node to be appended at the start of the field */
  before?: React.ReactNode;
  prefix?: string;
  required?: boolean;

  height?: BoxProps["height"];
  width?: BoxProps["width"];
};

type PassthroughProps =
  | "id"
  | "name"
  | "disabled"
  | "autoComplete"
  | "autoFocus";

interface FieldRenderProps extends Pick<FieldBaseProps, PassthroughProps> {
  background: BoxProps["background"];
  // rounded: BoxProps["rounded"];
  height: BoxProps["height"];
  // padding: BoxProps["padding"];
  grow: true;
  className: string;
}

type Props = FieldBaseProps & {
  children(
    overlays: ReactNode,
    props: FieldRenderProps,
    icon: ReactNode,
    prefix: ReactNode,
  ): ReactNode;
};

export const Field = (props: Props) => {
  const {
    label,
    secondaryLabel,
    description,
    message,
    noBorder,
    tone = "neutral",
    height = "input_lg",
    prefix,
    icon,
    children,
    background,
    after,
    before,
    width,
    ...inputProps
  } = props;

  const className = styles.field;

  const id = props.id || label?.replace(/[^a-z]/gi, "_").toLowerCase() || "";

  return (
    <Stack grow gap="md" width={width} borderRadius="sm">
      {label && (
        <FieldLabel
          label={label}
          secondaryLabel={secondaryLabel}
          description={description}
          for={id}
        />
      )}
      <Stack
        grow
        horizontal
        background={background}
        position="relative"
        alignItems="center"
        paddingX="md"
        gap="sm"
        borderRadius="sm"
      >
        {props.icon && (
          <Icon type={props.icon} size="square_xs" color="gray2" />
        )}
        {before}
        {children(
          !noBorder && <FieldOutline tone={tone} />,
          {
            id,
            height,
            background,
            className,
            grow: true,
            ...inputProps,
          },
          icon,
          prefix,
        )}
        {after}
      </Stack>
      {message}
    </Stack>
  );
};
