import create from "zustand";
import { persist } from "zustand/middleware";

// TODO: Space access token requirements should be saved in the Space contract.
// Once this is implemented in the contract, the sample-app store can be removed.
// https://github.com/HereNotThere/harmony/issues/274
// https://github.com/HereNotThere/harmony/issues/275
interface SpaceSettings {
  spaceId: string;
  requireToken: boolean; // require token to access space
}

interface AllSpaceSettings {
  [spaceId: string]: SpaceSettings;
}

interface AppStates {
  allSpaceSettings: AllSpaceSettings;
  deleteSpaceSettings: (spaceId: string) => void;
  setRequireToken: (spaceId: string, requireToken: boolean) => void;
}

export const useStore = create(
  persist<AppStates>(
    (set) => ({
      allSpaceSettings: {},
      deleteSpaceSettings: (spaceId: string) =>
        set((states: AppStates) => deleteSpaceSettings(states, spaceId)),
      setRequireToken: (spaceId: string, requireToken: boolean) =>
        set((states: AppStates) =>
          setRequireToken(states, spaceId, requireToken),
        ),
    }),
    { name: "sampleAppStates" },
  ),
);

function deleteSpaceSettings(states: AppStates, spaceId: string) {
  const changedStates = { ...states };
  delete changedStates.allSpaceSettings[spaceId];
  return changedStates;
}

function setRequireToken(
  states: AppStates,
  spaceId: string,
  requireToken: boolean,
) {
  const settings = states.allSpaceSettings[spaceId];
  let changedSettings: SpaceSettings;

  if (settings) {
    changedSettings = { ...settings, requireToken };
  } else {
    changedSettings = {
      spaceId,
      requireToken,
    };
  }

  const changedStates = { ...states };
  changedStates.allSpaceSettings[spaceId] = changedSettings;

  return changedStates;
}
