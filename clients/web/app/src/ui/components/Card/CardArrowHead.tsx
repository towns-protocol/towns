import React, { useContext } from "react";
import { Box } from "../Box/Box";
import { TooltipContext } from "../Tooltip/TooltipRenderer";

export const ArrowHead = () => {
  const context = useContext(TooltipContext);
  const horizontal = context?.placement === "horizontal";
  return (
    <Box
      centerContent
      justifyContent="center"
      position="absolute"
      width="x3"
      height="x3"
      overflow="hidden"
      style={
        horizontal
          ? {
              top: "50%",
              left: 2,
              transform: ` translateY(-50%) translateX(-100%)`,
            }
          : {
              left: "50%",
              top: 2,
              transform: `translateX(-50%) translateY(-100%)`,
            }
      }
    >
      <Box
        position="absolute"
        background="level2"
        borderLeft="default"
        borderTop="default"
        width="x2"
        height="x2"
        style={
          horizontal
            ? {
                transform: ` translateX(66%) rotate(-45deg)`,
              }
            : {
                transform: ` translateY(66%) rotate(45deg)`,
              }
        }
      />
    </Box>
  );
};
