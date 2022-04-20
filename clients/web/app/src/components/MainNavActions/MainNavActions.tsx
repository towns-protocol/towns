import React, { ComponentProps } from "react";
import { NavLink, useMatch, useResolvedPath } from "react-router-dom";
import { Paragraph } from "@ui";
import { Icon, IconName } from "ui/components/Icon";
import { atoms } from "ui/styles/atoms/atoms.css";
import { NavItem } from "../NavItem/NavItem";

const navItems = [
  { id: "home", link: "/", icon: "home", label: "Home" },
  {
    id: "messages",
    link: "/messages/latest",
    icon: "message",
    label: "Messages",
  },
  { id: "spaces/new", icon: "plus", label: "New Space" },
] as const;

export const MainNavActions = () => {
  return (
    <>
      {navItems.map((n) => {
        return <MainAction key={n.id} {...n} />;
      })}
    </>
  );
};

export const MainAction = ({
  compact: isCompact,
  icon,
  link,
  id,
  highlight: isHighlight,
  label,
}: {
  id: string;
  label: string;
  link?: string;
  icon?: IconName;
  highlight?: boolean;
  compact?: boolean;
}) => {
  const resolved = useResolvedPath(`/${link === "/" ? "" : link}`);
  const match = useMatch({
    path: resolved.pathname || "/",
    end: link === "/",
  });
  return (
    <ConditionalNavLink
      to={link}
      key={id}
      className={match ? atoms({ background: "accent", color: "onTone" }) : ""}
    >
      <NavItem compact={isCompact}>
        {icon && (
          <Icon
            type={icon}
            background={isCompact ? "none" : match ? "overlay" : "level2"}
            size={
              isCompact
                ? { desktop: "xs", tablet: "lg" }
                : { desktop: "md", tablet: "lg" }
            }
          />
        )}
        <Paragraph
          display={{ tablet: "none" }}
          fontWeight={isHighlight ? "strong" : "normal"}
        >
          {label}
        </Paragraph>
      </NavItem>
    </ConditionalNavLink>
  );
};

/** allows `to` prop to be undefined returning children */
const ConditionalNavLink = ({
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
