import React, { useCallback } from "react";
import { Stack } from "../Stack/Stack";

type Props = {
  selected?: string;
  defaultValue?: string;
  options: { label: string; value: string }[];
  renderSelected?: (selected?: string) => JSX.Element;
  onChange?: (value: string) => void;
};
// & HTMLAttributes<HTMLSelectElement>;

export function Dropdown(props: Props) {
  const { selected, options: items } = props;
  // const Selected = useCallback(() => {
  //   return typeof renderSelected === "function"
  //     ? renderSelected(selected)
  //     : selected;
  // }, [renderSelected, selected]);

  // renderSelected ?? (({ selected?: string }) => <>{props.selected}</>);

  const onChange = useCallback(
    (e: React.FormEvent) => {
      const selectEvent = e as React.FormEvent<HTMLSelectElement>;
      props.onChange && props.onChange(selectEvent.currentTarget.value);
    },
    [props]
  );

  return (
    <Stack
      horizontal
      as="select"
      background="level2"
      alignItems="center"
      height="x4"
      paddingX="md"
      rounded="sm"
      fontSize="md"
      onChange={onChange}
    >
      {/* <Selected /> */}
      {items.map((o) => (
        <option
          key={o.value}
          value={o.value}
          selected={String(o.value) === String(selected)}
        >
          {String(o.label)}
        </option>
      ))}
    </Stack>
  );
}
