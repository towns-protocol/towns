import { useEffect, useState } from "react";
import { ethers } from "ethers";
import CouncilNFT from "../../../../artifacts/CouncilNFT.sol/CouncilNFT.json";
import { useEthers, useTokenBalance } from "@usedapp/core";
import styled from "styled-components";
import { formatEther } from "ethers/lib/utils";

const CouncilNFTAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
interface SpaceNameID {
  name: string;
  id: string;
}

export const CouncilNFTUI = () => {
  const { activateBrowserWallet, account } = useEthers();
  const [nftBalance, setNftBalance] = useState("0");
  const [nftName, setNftName] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [nftImage, setNftImage] = useState("");

  console.log(`Account is : ${account}`);

  // request access to the user's MetaMask account
  async function requestAccount() {
    await window.ethereum.request({ method: "eth_requestAccounts" });
  }

  async function getCouncilNFTBalance() {
    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(
        CouncilNFTAddress,
        CouncilNFT.abi,
        provider
      );
      try {
        const data = contract.balanceOf(account).then((res: any) => {
          console.log(`Result of balancheOf is : ${res}`);
          setNftBalance(res + "");
        });
        // setIsEligible(data.toString());
      } catch (err) {}
    }
  }

  async function getCouncilNFTMetadata() {
    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(
        CouncilNFTAddress,
        CouncilNFT.abi,
        provider
      );
      try {
        const data = contract.tokenURI(1).then((res: any) => {
          console.log(`Result of tokenURI is : ${res}`);

          fetch(res)
            .then(async (res) => {
              return res.json();
            })
            .then((res) => {
              setNftDescription(res.description);
              setNftImage(res.image);
              setNftName(res.name);
              console.log(res);
            })
            .catch((err) => {
              console.log(`error`);
            });
        });
        // setIsEligible(data.toString());
      } catch (err) {}
    }
  }

  async function mintNFT() {
    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        CouncilNFTAddress,
        CouncilNFT.abi,
        signer
      );

      try {
        const tx = await contract.mint({
          value: ethers.utils.parseUnits(".08", "ether"),
        });
        await tx.wait();
      } catch (err) {
        console.log("Error: ", err);
      }
    }
  }

  //   const nftBalanceFormatted = nftBalance ? formatEther(nftBalance) : "0.00";
  return (
    <SpaceUIContainer>
      .Council NFT.
      <NFTContainer>
        <button onClick={mintNFT}>Mint Council NFT</button>
      </NFTContainer>
      <button onClick={getCouncilNFTBalance}>Refresh NFT Balance</button>
      <button onClick={getCouncilNFTMetadata}>Get Council NFT Metadata</button>
      <br />
      <br />
      <NFTContainer>Council NFT Balance: {nftBalance}</NFTContainer>
      <br />
      <br />
      <br />
      <NFTContainer>
        Name: {nftName}
        <br />
        Description: {nftDescription}
        <br />
        <img width={100} src={nftImage} />
        <br />
      </NFTContainer>
    </SpaceUIContainer>
  );
};

const SpaceUIContainer = styled.div``;

const NFTContainer = styled.div``;

const SpaceListContainer = styled.div``;

const SpaceAttr = styled.div`
  color: #000;
`;
