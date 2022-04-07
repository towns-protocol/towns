import React from "react";
import { NavLink, useMatch, useResolvedPath } from "react-router-dom";
import { Paragraph } from "@ui";
import { Icon, IconName } from "ui/components/Icon";
import { atoms } from "ui/styles/atoms/atoms.css";
import { NavItem } from "./NavItem/NavItem";

const navItems = [
  { id: "", icon: "home", label: "Home" },
  { id: "messages", icon: "message", label: "Messages" },
  { id: "new", icon: "plus", label: "New Space" },
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
  icon: IconName;
}) => {
  const resolved = useResolvedPath(`/${props.id}`);
  const match = useMatch({ path: resolved.pathname, end: true });
  return (
    <NavLink
      key={props.id}
      to={`/${props.id}`}
      className={({ isActive }) =>
        isActive
          ? atoms({ background: "accent", color: "onSemantic" })
          : atoms({})
      }
    >
      <NavItem>
        <Icon
          type={props.icon}
          background={match ? "overlay" : "level2"}
          size={{ desktop: "md", tablet: "lg" }}
        />
        <Paragraph display={{ tablet: "none" }}>{props.label}</Paragraph>
      </NavItem>
    </NavLink>
  );
};
