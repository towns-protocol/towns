import React, { ComponentProps, HTMLAttributes, forwardRef } from "react";
import { NavLink } from "react-router-dom";
import { Box, BoxProps } from "@ui";
import { atoms } from "ui/styles/atoms/atoms.css";

type NavLinkProps = {
  to?: string;
  exact?: boolean;
};

export const NavItem = forwardRef<
  HTMLElement,
  { compact?: boolean } & NavLinkProps &
    BoxProps &
    HTMLAttributes<HTMLDivElement>
>((props, ref) => (
  <ConditionalNavLink
    end={props.exact}
    to={props.to}
    className={({ isActive }) =>
      isActive ? atoms({ background: "accent", color: "onTone" }) : atoms({})
    }
  >
    <Box
      direction="row"
      alignItems="center"
      paddingX="sm"
      paddingY={props.compact ? "xxs" : "xs"}
      gap={props.compact ? "xxs" : "xs"}
      minHeight={props.compact ? "sm" : "md"}
      {...props}
      ref={ref}
    />
  </ConditionalNavLink>
));

/** allows `to` prop to be undefined returning children */
export const ConditionalNavLink = ({
  children,
  to,
  ...props
}: Omit<ComponentProps<typeof NavLink>, "to" | "children"> & {
  to?: string;
  children: JSX.Element;
}) =>
  !to ? (
    children
  ) : (
    <NavLink to={to ? to : ""} {...props}>
      {children}
    </NavLink>
  );
