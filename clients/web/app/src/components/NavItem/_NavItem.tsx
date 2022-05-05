import clsx from "clsx";
import React, {
  ComponentProps,
  HTMLAttributes,
  forwardRef,
  useContext,
} from "react";
import { NavLink, useMatch, useResolvedPath } from "react-router-dom";
import { Box, BoxProps, Stack } from "@ui";
import { SidebarContext } from "@components/SideBars/_SideBar";
import * as styles from "./_NavItem.css";

type NavLinkProps = {
  to?: string;
  exact?: boolean;
};

export const NavItem = forwardRef<
  HTMLElement,
  { id?: string; compact?: boolean } & NavLinkProps &
    BoxProps &
    HTMLAttributes<HTMLDivElement>
>(({ id, to, compact, exact, children, ...props }, ref) => {
  const resolved = useResolvedPath(`/${to === "/" ? "" : to}`);

  const match = useMatch({
    path: resolved.pathname || "/",
    end: to === "/" || exact,
  });

  const { activeItem, setActiveItem } = useContext(SidebarContext);

  const onMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    // relays event to custom NavItem implementation (e.g. used by tooltips)
    props.onMouseEnter && props.onMouseEnter(e);
    if (setActiveItem && id) {
      setActiveItem(id);
    }
  };
  const onMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    props.onMouseLeave && props.onMouseLeave(e);
    if (setActiveItem && id && activeItem === id) {
      setActiveItem(null);
    }
  };

  const isHovered = activeItem === id;

  return (
    <ConditionalNavLink end={exact} to={to}>
      <Stack
        position="relative"
        paddingX="xs"
        paddingY="none"
        {...props}
        ref={ref}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* background fill to highlight element */}
        <NavItemHighlight selected={!!match} hovered={isHovered} />
        <Stack
          horizontal
          grow
          position="relative"
          rounded="xs"
          alignItems="center"
          gap={compact ? "xs" : "sm"}
          minHeight={compact ? "x5" : "x6"}
          paddingX="xs"
        >
          {children}
        </Stack>
      </Stack>
    </ConditionalNavLink>
  );
});

/**
 * Highlights selected or hovered item
 */

type HighlightProps = {
  selected: boolean;
  hovered: boolean;
};

const NavItemHighlight = (props: HighlightProps) => {
  const { selected: isSelected, hovered: isHovered } = props;

  // if one item is hovered (current or sibling)
  const { isInteracting } = useContext(SidebarContext);

  // if the element is highlighted
  const isHighlight = isInteracting ? isHovered : isSelected;

  // enables some emphasis for the following conditions:
  // 1/ if the first or last item touched when hovering the menu
  // 2/ if the pre-selected item transitioning back to its initial state
  const isProminentInteraction = isInteracting === isSelected && !isHovered;

  const transition = isInteracting
    ? // minimal effects whilst interacting
      styles.highlightTransitionSwift
    : isSelected
    ? // x-fade between last hovered item and pre-selected
      styles.highlightTransitionSelected
    : styles.highlightTransitionOut;

  return (
    <Box absoluteFill paddingX="xs">
      <Box
        grow
        className={clsx([
          transition,
          isHighlight ? styles.highlightActive : styles.highlightInactive,
          // add scale effect for first hover + selected item
          isProminentInteraction && styles.highlightSelectedInactive,
        ])}
      />
    </Box>
  );
};

/**
 * allows `to` prop to be undefined returning children
 **/
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
