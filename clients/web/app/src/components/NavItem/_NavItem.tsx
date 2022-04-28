import { motion } from "framer-motion";
import React, {
  ComponentProps,
  HTMLAttributes,
  forwardRef,
  useState,
} from "react";
import { NavLink, useMatch, useResolvedPath } from "react-router-dom";
import { BoxProps, Stack } from "@ui";

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
  const [hover, setHover] = useState(false);
  const onMouseEnter = () => {
    setHover(true);
  };
  const onMouseLeave = () => {
    setHover(false);
  };
  return (
    <ConditionalNavLink end={exact} to={to}>
      <Stack
        paddingX="xs"
        paddingY={compact ? "none" : "none"}
        {...props}
        ref={ref}
      >
        <MotionStack
          horizontal
          grow
          position="relative"
          background={match || hover ? "level2" : undefined}
          rounded="xs"
          alignItems="center"
          gap={compact ? "xs" : "sm"}
          minHeight={compact ? "x5" : "x6"}
          paddingX="xs"
          initial="initial"
          whileHover="hover"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          {children}
        </MotionStack>
      </Stack>
    </ConditionalNavLink>
  );
});

const MotionStack = motion(Stack);

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
