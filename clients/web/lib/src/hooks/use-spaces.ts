import { SpaceIdentifier, ZionClientEvent } from "../client/ZionClientTypes";
import { useEffect, useMemo, useState } from "react";

import { Membership } from "../types/matrix-types";
import { formatRoom } from "./use-space-data";
import { useMatrixStore } from "../store/use-matrix-store";
import { useZionClient } from "./use-zion-client";
import { useZionClientEvent } from "./use-zion-client-event";
import { BigNumber } from "ethers";

export const useSpaces = () => {
  const { rooms } = useMatrixStore();
  return useMemo(
    () =>
      Object.values(rooms ?? [])
        .filter((r) => r.isSpaceRoom && r.membership === Membership.Join)
        .map((r) => formatRoom(r, r.membership, "/placeholders/nft_29.png")),
    [rooms],
  );
};

export const useSpacesFromContract = (): SpaceIdentifier[] => {
  const { getSpaces } = useZionClient();
  const [spaceIdentifiers, setSpaceIdentifiers] = useState<SpaceIdentifier[]>(
    [],
  );
  const onNewSpace = useZionClientEvent(ZionClientEvent.NewSpace);

  useEffect(() => {
    void (async () => {
      const spaces = await getSpaces();
      if (!spaces) {
        return;
      }
      setSpaceIdentifiers(
        spaces.map((x) => ({
          id: x.id,
          key: BigNumber.from(x.id).toString(),
          name: x.name,
        })),
      );
    })();
  }, [getSpaces, onNewSpace]);

  return spaceIdentifiers;
};
