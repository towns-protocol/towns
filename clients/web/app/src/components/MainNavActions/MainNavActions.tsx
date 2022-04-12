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
  { id: "spaces/new", link: "", icon: "plus", label: "New Space" },
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

export const MainAction = (props: {
  id: string;
  label: string;
  link: string | undefined;
  icon: IconName;
}) => {
  const resolved = useResolvedPath(`/${props.link === "/" ? "" : props.id}`);
  const match = useMatch({
    path: resolved.pathname || "/",
    end: props.link === "/",
  });
  return (
    <ConditionalNavLink
      to={props.link}
      key={props.id}
      className={match ? atoms({ background: "accent", color: "onTone" }) : ""}
    >
      <NavItem>
        <Icon
          type={props.icon}
          background={match ? "overlay" : "level2"}
          size={{ desktop: "md", tablet: "lg" }}
        />
        <Paragraph display={{ tablet: "none" }}>{props.label}</Paragraph>
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
