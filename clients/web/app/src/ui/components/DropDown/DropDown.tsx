import React, { useCallback } from "react";
import { Stack } from "../Stack/Stack";

type Props<T> = {
  selected?: string;
  defaultValue?: string;
  items: T[];
  renderSelected?: (selected?: string) => JSX.Element;
};

export const Dropdown = <T,>({ selected, renderSelected }: Props<T>) => {
  const Selected = useCallback(() => {
    return typeof renderSelected === "function" ? (
      renderSelected(selected)
    ) : (
      <>{selected}</>
    );
  }, [renderSelected, selected]);

  // renderSelected ?? (({ selected?: string }) => <>{props.selected}</>);

  return (
    <Stack
      horizontal
      background="level2"
      alignItems="center"
      height="x4"
      paddingX="sm"
      rounded="sm"
      fontSize="md"
      gap="xs"
    >
      <Selected />
    </Stack>
  );
};
