import create, { GetState, SetState } from "zustand";
import { SpaceData, emptySpace } from "data/SpaceData";

/**
 * Store of space data
 */
export type SpaceDataStore = {
  spaces: SpaceData[];
  setSpaces: (spaces: SpaceData[]) => void;
  getSpaceData: (spaceId?: string) => SpaceData;
};

export const useSpaceDataStore = create<SpaceDataStore>(
  (set: SetState<SpaceDataStore>, get: GetState<SpaceDataStore>) => ({
    spaces: [],
    setSpaces: (spaces: SpaceData[]) =>
      set({
        spaces: spaces,
      }),
    getSpaceData: (spaceId?: string) => {
      return (
        (spaceId ? get().spaces.find((s) => s.id === spaceId) : undefined) ||
        emptySpace
      );
    },
  })
);
