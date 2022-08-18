import { useState } from "react";
import { ethers } from "ethers";
import ClaimPool from "../../artifacts/ClaimPool.sol/ClaimPool.json";
import { useEthers } from "@usedapp/core";
import styled from "styled-components";

const ClaimPoolAddress = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788";

export function ClaimUI() {
  // store greeting in local state
  const [greeting, setGreetingValue] = useState("start");
  const { activateBrowserWallet, account } = useEthers();
  const [isEligible, setIsEligible] = useState("?");
  const [hasClaimed, setHasClaimed] = useState("?");

  // request access to the user's MetaMask account
  async function requestAccount() {
    await window.ethereum.request({ method: "eth_requestAccounts" });
  }

  async function checkIsEligible() {
    console.log("isEligible");
    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(
        ClaimPoolAddress,
        ClaimPool.abi,
        provider
      );
      try {
        const data = await contract.isEligible(account);
        console.log("data: ", data);
        setIsEligible(data.toString());
      } catch (err) {
        console.log("Error: ", err);
        setIsEligible("NO");
      }
    }
  }
  async function checkHasClaimed() {
    console.log("isEligible");
    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(
        ClaimPoolAddress,
        ClaimPool.abi,
        provider
      );
      try {
        const data = await contract.hasClaimed(account);
        console.log("data: ", data);
        setHasClaimed(data.toString());
      } catch (err) {
        console.log("Error: ", err);
        setHasClaimed("NO");
      }
    }
  }

  async function claim(isDrip: boolean) {
    if (typeof window.ethereum !== "undefined") {
      await requestAccount();
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        ClaimPoolAddress,
        ClaimPool.abi,
        signer
      );
      const transaction = isDrip
        ? await contract.claimUnrestrictedTokens()
        : await contract.claimTokens();
      await transaction.wait();
    }
  }

  console.log(`Account is : ${account}`);

  return (
    <ClaimUIContainer>
      Normal Tx
      <div>
        {account && (
          <>
            <button onClick={checkIsEligible}>Check if eligible</button>
            <p>Is Eligible: {isEligible}</p>
            <button onClick={checkHasClaimed}>Check has claimed</button>
            <p>Has Claimed: {hasClaimed}</p>

            <button onClick={() => claim(false)}>Claim tokens</button>
            <button onClick={() => claim(true)}>Drip tokens</button>
          </>
        )}
      </div>{" "}
    </ClaimUIContainer>
  );
}

const ClaimUIContainer = styled.div``;
