import { useEffect } from "react";
import { Outlet, useParams } from "react-router-dom";
import { useMatrixClient, useMatrixStore } from "use-matrix-client";

export const Spaces = () => {
  const { spaceId } = useParams();

  const { rooms } = useMatrixStore();
  const space = spaceId && rooms ? rooms[spaceId] : undefined;

  const { syncSpace } = useMatrixClient();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (spaceId) {
          const hierarchy = await syncSpace(spaceId);
          if (!cancelled) {
            console.log("space hierarchy", hierarchy);
          }
        }
      } catch (reason: any) {
        console.log("SpacesIndex error:", reason);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [spaceId, syncSpace]);

  return space ? (
    <>
      <h1>{space.name}</h1>
      <h3>id: {spaceId}</h3>
      <Outlet />;
    </>
  ) : (
    <h1> Space {spaceId} not found</h1>
  );
};
