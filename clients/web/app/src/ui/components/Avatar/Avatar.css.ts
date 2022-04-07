import { style } from "@vanilla-extract/css";
import { createSprinkles } from "@vanilla-extract/sprinkles";
import { vcn } from "vanilla-classnames";
import { vars } from "ui/styles/vars.css";
import { avatarProperties } from "ui/styles/atoms/properties/avatarProperties.css";

/**
 * why not use recipes API ?
 * https://github.com/seek-oss/vanilla-extract/discussions/497
 */

export const avatarBaseStyle = style({
  backgroundSize: "cover",
  backgroundPosition: "center center",
});

export const avatarToggleClasses = vcn({
  nft: style({
    WebkitMaskImage: `url(/nftmask.svg)`,
    WebkitMaskOrigin: `center`,
    WebkitMaskRepeat: `no-repeat`,
    WebkitMaskSize: `cover`,
  }),
  border: style({
    border: `2px solid ${vars.color.layer.default}`,
  }),
  circle: style({
    borderRadius: vars.borderRadius.full,
  }),
  stacked: style({
    selectors: {
      "&:not(:first-child)": {
        marginLeft: `calc(-1 * ${vars.space.xs})`,
      },
    },
    border: `2px solid ${vars.color.layer.default}`,
  }),
});

export type ToggleProps = Parameters<typeof avatarToggleClasses>[0];

export const avatarAtoms = createSprinkles(avatarProperties);

export type AvatarAtoms = Parameters<typeof avatarAtoms>[0] & ToggleProps;
