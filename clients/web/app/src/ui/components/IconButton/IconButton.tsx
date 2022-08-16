import React from "react";
import { Box, BoxProps } from "@ui";
import { Icon, IconName } from "ui/components/Icon";
import * as styles from "./IconButton.css";
import { IconAtoms } from "../Icon/Icon.css";

type Props = {
  opaque?: boolean;
  active?: boolean;
  icon: IconName;
  size?: IconAtoms["size"];
} & Omit<BoxProps, "size">;

export const IconButton = (props: Props) => {
  const {
    size = "square_sm",
    icon,
    active: isActive,
    opaque: isOpaque,
    ...boxProps
  } = props;
  return (
    <Box
      className={styles.iconButton}
      {...boxProps}
      background={{
        default: !isOpaque ? undefined : isActive ? "level3" : "level2",
        hover: "level3",
      }}
      padding="xs"
      rounded="xs"
      color={isActive ? "default" : "gray2"}
    >
      <Icon type={props.icon} size={size} />
    </Box>
  );
};
