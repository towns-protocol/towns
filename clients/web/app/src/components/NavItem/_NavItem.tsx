import { clsx } from "clsx";
import React, {
  ComponentProps,
  HTMLAttributes,
  forwardRef,
  useContext,
} from "react";
import { useMatch, useResolvedPath } from "react-router";
import { NavLink } from "react-router-dom";
import { Box, BoxProps, Stack } from "@ui";
import { SidebarContext } from "@components/SideBars/_SideBar";
import * as styles from "./_NavItem.css";

type NavLinkProps = {
  to?: string;
  exact?: boolean;
  active?: boolean;
  forceMatch?: boolean;
};

export const NavItem = forwardRef<
  HTMLElement,
  { id?: string; highlight?: boolean } & NavLinkProps &
    BoxProps &
    HTMLAttributes<HTMLDivElement>
>(
  (
    { id, to, exact, highlight: isHighlight, forceMatch, children, ...props },
    ref,
  ) => {
    const resolved = useResolvedPath(`/${to === "/" ? "" : to}`);
    console.log({ id, to, resolved });

    const match =
      useMatch({
        path: resolved.pathname || "/",
        end: to === "/" || exact,
      }) || forceMatch;

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
      <ConditionalNavLink to={to}>
        <Box onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
          <Stack position="relative" paddingX="sm" {...props} ref={ref}>
            {/* background fill to highlight element */}
            <NavItemHighlight selected={!!match} hovered={isHovered} />
            <Stack
              horizontal
              grow
              position="relative"
              rounded="xs"
              alignItems="center"
              gap="sm"
              minHeight="x6"
              paddingX="sm"
              fontWeight={match ? "strong" : "normal"}
              color={isHighlight || match ? "gray1" : "gray2"}
            >
              {children}
            </Stack>
          </Stack>
        </Box>
      </ConditionalNavLink>
    );
  },
);

/**
 * Highlights selected or hovered item
 */

type HighlightProps = {
  selected: boolean;
  hovered: boolean;
};

const NavItemHighlight = (props: HighlightProps) => {
  const { selected: isSelected } = props;

  // if one item is hovered (current or sibling)
  const { isInteracting } = useContext(SidebarContext);

  // if the element is highlighted
  const isHighlight = isSelected;

  // enables some emphasis for the following conditions:
  // 1/ if the first or last item touched when hovering the menu
  // 2/ if the pre-selected item transitioning back to its initial state
  const isProminentInteraction = false; //!isInteracting === isSelected && !isHovered;

  const transition = isInteracting
    ? // minimal effects whilst interacting
      styles.highlightTransitionSwift
    : isSelected
    ? // x-fade between last hovered item and pre-selected
      styles.highlightTransitionSelected
    : styles.highlightTransitionOut;

  return (
    <Box absoluteFill paddingX="sm">
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
