import { Divider } from "@mui/material";
import { Outlet, useParams } from "react-router-dom";
import { useSpace } from "use-zion-client";

export const Spaces = () => {
  const { spaceSlug } = useParams();
  const space = useSpace(spaceSlug);

  return space ? (
    <>
      <h1>{space.name}</h1>
      <h3>id: {space.id.matrixRoomId}</h3>
      <Divider />
      <Outlet />
    </>
  ) : (
    <h1> Space {spaceSlug} not found</h1>
  );
};
