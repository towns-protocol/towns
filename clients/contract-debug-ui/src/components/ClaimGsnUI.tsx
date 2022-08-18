import { useEffect, useState } from "react";
import { ethers } from "ethers";
import ClaimPoolGSN from "../../artifacts/ClaimPoolGSN.sol/ClaimPoolGSN.json";
import { useEthers } from "@usedapp/core";
import styled from "styled-components";
import { RelayProvider } from "@opengsn/provider";

const ClaimPoolGSNAddress = "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e";

export function ClaimGsnUI() {
  const { activateBrowserWallet, account } = useEthers();
  const [isEligible, setIsEligible] = useState("?");
  const [hasClaimed, setHasClaimed] = useState("?");
  const [
    provider,
    setProvider,
  ] = useState<null | ethers.providers.Web3Provider>(null);

  // request access to the user's MetaMask account
  async function requestAccount() {
    await window.ethereum.request({ method: "eth_requestAccounts" });
  }

  useEffect(() => {
    initContract();
  }, []);

  async function initContract() {
    console.log("init contract");
    const gsnProvider = await RelayProvider.newProvider({
      provider: window.ethereum,
      config: {
        loggerConfiguration: { logLevel: "error" },
        //Update this on localhost
        paymasterAddress: "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1",
      },
    }).init();

    const provider = new ethers.providers.Web3Provider(gsnProvider as any);
    setProvider(provider);
  }

  async function checkIsEligible() {
    console.log("isEligible ", account);
    if (!provider) {
      console.log("no provider!");
      return;
    }
    if (typeof window.ethereum !== "undefined") {
      //   const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(
        ClaimPoolGSNAddress,
        ClaimPoolGSN.abi,
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
    if (!provider) {
      return;
    }
    if (typeof window.ethereum !== "undefined") {
      const contract = new ethers.Contract(
        ClaimPoolGSNAddress,
        ClaimPoolGSN.abi,
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
    if (!provider) {
      return;
    }
    if (typeof window.ethereum !== "undefined") {
      await requestAccount();
      //   const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        ClaimPoolGSNAddress,
        ClaimPoolGSN.abi,
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
      Meta Tx
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
