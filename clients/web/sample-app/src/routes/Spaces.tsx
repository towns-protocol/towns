import { Divider } from "@mui/material";
import { Outlet } from "react-router-dom";
import { useSpaceData } from "use-zion-client";

export const Spaces = () => {
  const space = useSpaceData();
  console.log("SPACE CONTENT", space);
  return space ? (
    <>
      <h1>{space.name}</h1>
      <h3>id: {space.id.matrixRoomId}</h3>
      <Divider />
      <Outlet />
    </>
  ) : (
    <>Space not found!</>
  );
};
