import { useParams } from "react-router-dom";

export const SpacesIndex = () => {
  const { spaceId } = useParams();
  return <h1>Spaces Index {spaceId}</h1>;
};
