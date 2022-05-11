import create, { SetState } from "zustand";
import { SpaceData } from "data/SpaceData";

/**
 * Store of space data
 */
export type SpaceDataStore = {
  spaces: SpaceData[];
  setSpaces: (spaces: SpaceData[]) => void;
  spaceCache: { [key: string]: SpaceData };
};

export const useSpaceDataStore = create<SpaceDataStore>(
  (set: SetState<SpaceDataStore>) => ({
    spaces: [],
    setSpaces: (spaces: SpaceData[]) =>
      set({
        spaces: spaces,
        spaceCache: spaces.reduce(
          (keep, current) => (keep = { ...keep, [current.id]: current }),
          {} as { [key: string]: SpaceData }
        ),
      }),
    spaceCache: {},
  })
);
