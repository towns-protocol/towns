import { Membership, isRoom, useMatrixStore } from "use-matrix-client";
import { useEffect } from "react";
import { fakeChannelGroups } from "data/ChannelData";
import { SpaceData, fakeSpaces } from "data/SpaceData";
import { useSpaceDataStore } from "store/spaceDataStore";

export function useSpaceDataListener() {
  const { rooms } = useMatrixStore();
  const { setSpaces } = useSpaceDataStore();

  useEffect(() => {
    const spaces: SpaceData[] = [];
    if (rooms) {
      for (const r of Object.values(rooms)) {
        if (isRoom(r) && r.membership === Membership.Join) {
          spaces.push({
            id: r.roomId,
            name: r.name,
            avatarSrc: "/placeholders/nft_29.png",
            pinned: false,
            channels: fakeChannelGroups,
          });
        }
      }
    }
    for (const s of fakeSpaces) {
      spaces.push(s);
    }
    console.log(
      "useSpaceDataLister",
      spaces.map((space) => space.name)
    );
    setSpaces(spaces);
  }, [rooms, setSpaces]);
}
