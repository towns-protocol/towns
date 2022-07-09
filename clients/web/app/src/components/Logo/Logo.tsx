import React, { HTMLAttributes, forwardRef } from "react";

export const Logo = forwardRef<SVGSVGElement, HTMLAttributes<SVGSVGElement>>(
  (props, ref) => (
    <svg
      height="32"
      viewBox="0 0 200 67"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      ref={ref}
    >
      <path
        d="M71.8719 66.7008V2.51172H59.4158V66.7008H71.8719Z"
        fill="currentColor"
      />
      <path
        d="M155.499 66.7008V10.6484H157.207L159.417 25.5153L181.115 66.7008H200V2.51172H188.147V58.5642H186.439L184.128 43.6972L162.531 2.51172H143.646V66.7008H155.499Z"
        fill="currentColor"
      />
      <path
        d="M-5.18128e-07 14.3651L49.6235 14.3651L49.6235 16.0728L34.7566 25.8167L-2.0286e-06 48.9207L-2.8058e-06 66.7008L57.7602 66.7008L57.7602 55.9524L8.13666 55.9524L8.13666 54.2447L17.981 51.9343L57.7602 26.4194L57.7602 2.51172L0 2.51172L-5.18128e-07 14.3651Z"
        fill="currentColor"
      />
      <circle
        cx="107.232"
        cy="33.7018"
        r="33.7018"
        fill="url(#paint0_linear_1205_31033)"
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
  ),
);

export const MinimalLogo = forwardRef<
  SVGSVGElement,
  HTMLAttributes<SVGSVGElement>
>((props, ref) => (
  <svg
    height="32"
    viewBox="0 0 200 66"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
    ref={ref}
  >
    <circle cx="33" cy="33" r="33" fill="url(#paint0_linear_1205_31033)" />
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
));
