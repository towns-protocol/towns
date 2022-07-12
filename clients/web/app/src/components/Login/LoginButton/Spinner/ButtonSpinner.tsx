import React from "react";
import { Box } from "@ui";
import * as style from "./ButtonSpinner.css";

export const ButtonSpinner = () => {
  return (
    <Box position="relative">
      <Box aspectRatio="1/1" height="x2" style={{ height: "12px" }}>
        <svg className={style.circular} viewBox="25 25 50 50">
          <circle
            className={style.path}
            cx="50"
            cy="50"
            r="23"
            fill="none"
            strokeWidth="6"
            strokeMiterlimit="10"
            stroke="currentColor"
          />
        </svg>
      </Box>
    </Box>
  );
};
