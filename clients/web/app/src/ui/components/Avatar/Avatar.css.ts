import { style } from "@vanilla-extract/css";
import { createSprinkles } from "@vanilla-extract/sprinkles";
import { vcn } from "vanilla-classnames";
import { avatarProperties } from "ui/styles/atoms/properties/avatarProperties.css";
import { vars } from "ui/styles/vars.css";

/**
 * why not use recipes API ?
 * https://github.com/seek-oss/vanilla-extract/discussions/497
 */

export const avatarBaseStyle = style({
  backgroundSize: "cover",
  WebkitMaskImage: `url(/squircle.svg)`,
  WebkitMaskSize: `cover`,
});

export const avatarToggleClasses = vcn({
  border: style({
    border: `2px solid ${vars.color.layer.default}`,
  }),
  circle: style({
    borderRadius: vars.borderRadius.full,
  }),
  stacked: style({
    selectors: {
      "&:not(:first-child)": {
        marginLeft: `calc(-0.33 * var(--size))`,
      },
    },
    border: `2px solid ${vars.color.layer.default}`,
  }),
});

export type ToggleProps = Parameters<typeof avatarToggleClasses>[0];

export const avatarAtoms = createSprinkles(avatarProperties);

export type AvatarAtoms = Parameters<typeof avatarAtoms>[0] & ToggleProps;
