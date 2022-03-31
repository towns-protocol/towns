import { Box, BoxProps } from "@ui";
import React, { forwardRef } from "react";

export const ListRow = forwardRef<HTMLElement, BoxProps>((props, ref) => (
  <Box
    direction="row"
    alignItems="center"
    paddingY="xxs"
    paddingX="sm"
    gap="xs"
    minHeight="md"
    {...props}
    ref={ref}
  />
));
