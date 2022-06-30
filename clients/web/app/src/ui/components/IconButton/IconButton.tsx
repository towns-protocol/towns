import React from "react";
import { Box, BoxProps } from "@ui";
import { Icon, IconName } from "ui/components/Icon";
import { IconAtoms } from "ui/components/Icon/Icon.css";
import * as styles from "./IconButton.css";

type Props = {
  active?: boolean;
  icon: IconName;
  size?: IconAtoms["size"];
} & BoxProps;
export const IconButton = (props: Props) => {
  const { size = "square_sm", icon, active, ...boxProps } = props;
  return (
    <Box
      className={styles.iconButton}
      inset="xxs"
      {...boxProps}
      color={active ? "default" : "gray2"}
    >
      <Icon type={props.icon} size={size} />
    </Box>
  );
};
