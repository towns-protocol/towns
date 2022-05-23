import create, { GetState, SetState } from "zustand";
import { SpaceData, emptySpace } from "data/SpaceData";

/**
 * Store of space data
 */
export type SpaceDataStore = {
  spaces: SpaceData[];
  setSpaces: (spaces: SpaceData[]) => void;
  getSpaceData: (spaceId?: string) => SpaceData;
  invites: SpaceData[];
  setInvites: (invites: SpaceData[]) => void;
};

export const useSpaceDataStore = create<SpaceDataStore>(
  (set: SetState<SpaceDataStore>, get: GetState<SpaceDataStore>) => ({
    spaces: [],
    setSpaces: (spaces: SpaceData[]) => set({ spaces: spaces }),
    getSpaceData: (spaceId?: string) => {
      // if space id is valid, check for space in spaces and invites, otherwise return emptySpace
      if (!spaceId) {
        return emptySpace;
      }
      return (
        get().spaces.find((s) => s.id === spaceId) ||
        get().invites.find((s) => s.id === spaceId) ||
        emptySpace
      );
    },
    invites: [],
    setInvites: (invites: SpaceData[]) => set({ invites: invites }),
  }),
);
