import { IZionServerVersions } from "../client/ZionClientTypes";
import { useZionContext } from "../components/ZionContextProvider";
import { useEffect, useState } from "react";

export function useServerVersions(): IZionServerVersions | undefined {
  const { client } = useZionContext();
  const [serverVersions, setServerVersions] = useState<IZionServerVersions>();

  useEffect(() => {
    client
      ?.getServerVersions()
      .then((versions) => {
        setServerVersions(versions);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [client]);

  return serverVersions;
}
