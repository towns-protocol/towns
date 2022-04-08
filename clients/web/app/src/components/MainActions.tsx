import React from "react";
import { NavLink, useMatch, useResolvedPath } from "react-router-dom";
import { Paragraph } from "@ui";
import { Icon, IconName } from "ui/components/Icon";
import { atoms } from "ui/styles/atoms/atoms.css";
import { NavItem } from "./NavItem/NavItem";

const navItems = [
  { id: "home", link: "/", icon: "home", label: "Home" },
  { id: "messages", link: "/messages", icon: "message", label: "Messages" },
  { id: "spaces/new", link: "", icon: "plus", label: "New Space" },
] as const;

export const MainActions = () => {
  return (
    <>
      {navItems.map((n) => {
        return <MainAction {...n} />;
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
  const resolved = useResolvedPath(`/${props.id}`);
  const match = useMatch({ path: resolved.pathname, end: true });
  return (
    <ConditionalLink link={props.link} key={props.id}>
      <NavItem>
        <Icon
          type={props.icon}
          background={match ? "overlay" : "level2"}
          size={{ desktop: "md", tablet: "lg" }}
        />
        <Paragraph display={{ tablet: "none" }}>{props.label}</Paragraph>
      </NavItem>
    </ConditionalLink>
  );
};

type ConditionalLinkProps = {
  children: JSX.Element;
  link?: string;
};

const ConditionalLink = ({ children, link }: ConditionalLinkProps) =>
  !link ? (
    children
  ) : (
    <NavLink
      to={link ? link : ""}
      className={({ isActive }) =>
        isActive
          ? atoms({ background: "accent", color: "onSemantic" })
          : atoms({})
      }
    >
      {children}
    </NavLink>
  );
