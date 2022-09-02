import { SpaceIdentifier, ZionClientEvent } from "../client/ZionClientTypes";
import { useEffect, useMemo, useState } from "react";

import { DataTypes } from "@harmony/contracts/governance/src/contracts/zion-governance/contracts/spaces/ZionSpaceManager";
import { Membership } from "../types/matrix-types";
import { formatRoom } from "./use-space-data";
import { useMatrixStore } from "../store/use-matrix-store";
import { useZionClient } from "./use-zion-client";
import { useZionClientEvent } from "./use-zion-client-event";

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
      if (spaces) {
        setSpaceIdentifiers(
          spaces.map((x: DataTypes.SpaceInfoStructOutput) => {
            return {
              id: x.spaceId,
              key: x.spaceId.toString(),
              name: x.name,
            };
          }),
        );
      }
    })();
  }, [getSpaces, onNewSpace]);

  return spaceIdentifiers;
};
