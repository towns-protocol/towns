import React, { ComponentProps, HTMLAttributes, forwardRef } from "react";
import { NavLink, useMatch, useResolvedPath } from "react-router-dom";
import { Box, BoxProps, Stack } from "@ui";

type NavLinkProps = {
  to?: string;
  exact?: boolean;
};

export const NavItem = forwardRef<
  HTMLElement,
  { compact?: boolean } & NavLinkProps &
    BoxProps &
    HTMLAttributes<HTMLDivElement>
>(({ to, compact, exact, children, ...props }, ref) => {
  const resolved = useResolvedPath(`/${to === "/" ? "" : to}`);
  const match = useMatch({
    path: resolved.pathname || "/",
    end: to === "/" || exact,
  });
  return (
    <ConditionalNavLink end={exact} to={to}>
      <Box
        direction="row"
        paddingX="xs"
        paddingY={compact ? "none" : "none"}
        {...props}
        ref={ref}
      >
        <Stack
          horizontal
          grow
          background={match ? "level2" : undefined}
          rounded="xs"
          alignItems="center"
          gap={compact ? "xs" : "sm"}
          minHeight={compact ? "x5" : "x6"}
          paddingX="xs"
        >
          {children}
        </Stack>
      </Box>
    </ConditionalNavLink>
  );
});

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
