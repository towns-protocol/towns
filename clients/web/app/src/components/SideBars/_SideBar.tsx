import React, { createContext, useEffect, useState } from "react";
import { BoxProps, Stack } from "@ui";

type Props = BoxProps;

export const SidebarContext = createContext<{
  isInteracting: boolean;
  activeItem?: string | null;
  setActiveItem?: (key: string | null) => void;
}>({
  isInteracting: false,
});

export const SideBar = (props: Props) => {
  const [activeItem, setActiveItem] = useState<string | null>();

  const isInteracting = typeof activeItem === "string";

  useEffect(() => {
    const onLeave = () => {
      setActiveItem(null);
    };
    if (isInteracting) {
      window.addEventListener("scroll", onLeave);
      window.addEventListener("blur", onLeave);
    }
    return () => {
      window.removeEventListener("scroll", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, [isInteracting]);

  return (
    <SidebarContext.Provider
      value={{
        isInteracting,
        activeItem,
        setActiveItem,
      }}
    >
      <Stack
        borderRight
        shrink={{ tablet: "x0", desktop: "x1" }}
        basis={{ tablet: "auto", desktop: "300" }}
        background="level1"
        overflow="hidden"
        minWidth={{ tablet: "none", desktop: "auto" }}
        {...props}
        gap="xs"
      />
    </SidebarContext.Provider>
  );
};
