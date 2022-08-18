import { useEffect, useState } from "react";
import { ethers } from "ethers";
import ZionSpaceManager from "../../../../artifacts/ZionSpaceManager.sol/ZionSpaceManager.json";
import { useEthers } from "@usedapp/core";
import styled from "styled-components";

const ZionSpaceManagerAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
interface SpaceNameID {
  name: string;
  id: string;
}

export const SpacesUI = () => {
  // // store greeting in local state
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newModuleAddress, setNewModuleAddress] = useState("");
  const [spaceNameIds, setSpaceNameIds] = useState<SpaceNameID[]>([]);
  const { activateBrowserWallet, account } = useEthers();

  useEffect(() => {
    getSpaceNames();
  }, []);

  // request access to the user's MetaMask account
  async function requestAccount() {
    await window.ethereum.request({ method: "eth_requestAccounts" });
  }

  async function getSpaceNames() {
    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(
        ZionSpaceManagerAddress,
        ZionSpaceManager.abi,
        provider
      );
      try {
        const data = contract.getSpaceNames().then((res: SpaceNameID[]) => {
          const spaceNameIds: SpaceNameID[] = [];
          res.forEach((r: SpaceNameID) => {
            const val: string = r.id.toString();
            spaceNameIds.push({ name: r.name, id: val });
          });
          setSpaceNameIds(spaceNameIds);
        });
        // setIsEligible(data.toString());
      } catch (err) {}
    }
  }

  async function createSpace() {
    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        ZionSpaceManagerAddress,
        ZionSpaceManager.abi,
        signer
      );

      const moduleAddressArr = [newModuleAddress];
      try {
        const tx = await contract.createSpace(newSpaceName, moduleAddressArr);
        await tx.wait();
      } catch (err) {
        console.log("Error: ", err);
      }
    }
  }
  return (
    <SpaceUIContainer>
      Spaces!!!
      <CreateSpaceContainer>
        <input
          onChange={(e) => setNewSpaceName(e.target.value)}
          placeholder="Space Name"
        />
        <input
          onChange={(e) => setNewModuleAddress(e.target.value)}
          placeholder="User Module Address"
        />
        <button onClick={createSpace}>Create Space</button>
      </CreateSpaceContainer>
      <button onClick={getSpaceNames}>Refresh Space Names</button>
      <SpaceListContainer>
        {spaceNameIds.map((spaceNameId: SpaceNameID) => {
          return (
            <div key={spaceNameId.id}>
              <SpaceAttr>Name: {spaceNameId.name}</SpaceAttr>
              <SpaceAttr>ID: {spaceNameId.id}</SpaceAttr>
            </div>
          );
        })}
      </SpaceListContainer>
    </SpaceUIContainer>
  );
};

const SpaceUIContainer = styled.div``;

const CreateSpaceContainer = styled.div``;

const SpaceListContainer = styled.div``;

const SpaceAttr = styled.div`
  color: #FF;
`;
