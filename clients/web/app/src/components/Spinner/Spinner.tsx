import React from "react";
import { Box } from "@ui";
import * as style from "./Spinner.css";

export const Spinner = () => {
  return (
    <Box padding aspectRatio="1/1" position="relative" height="input_md">
      <svg className={style.circular} viewBox="25 25 50 50">
        <circle
          className={style.path}
          cx="50"
          cy="50"
          r="23"
          fill="none"
          strokeWidth="4"
          strokeMiterlimit="10"
          stroke="url(#paint0_linear_1205_31033)"
        />
        <defs>
          <linearGradient
            id="paint0_linear_1205_31033"
            x1="107.232"
            y1="38.2975"
            x2="107.232"
            y2="67.4037"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#C9356A" />
            <stop offset="0.364583" stopColor="#BB1B1B" />
            <stop offset="1" stopColor="#FA773F" />
          </linearGradient>
        </defs>
      </svg>
    </Box>
  );
};
