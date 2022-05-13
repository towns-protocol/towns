import { useCallback } from "react";
import { useStore } from "store/store";

/**
 * TODO: keep track on individual panes and map size array depending on setup,
 * A:[menu, main] / B:[menu / menu2 / main]
 * A.1(main) should be equal to B.2(main)
 */
export const usePersistPanes = (id: string) => {
  const { sizes, setPaneData } = useStore((state) => ({
    sizes: state.paneSizes[id] ?? [],
    setPaneData: state.setPaneSizes,
  }));

  const onSizesChange = useCallback(
    (sizes: number[]) => {
      setPaneData(id, sizes);
    },
    [id, setPaneData]
  );

  return {
    onSizesChange,
    sizes: sizes.map((s) => s ?? 0),
  };
};
