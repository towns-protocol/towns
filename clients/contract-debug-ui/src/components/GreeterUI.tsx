import { useState } from "react";
import { ethers } from "ethers";
import Greeter from "../../artifacts/Greeter.sol/Greeter.json";

// Update with the contract address logged out to the CLI when it was deployed
const greeterAddress = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";

export function GreeterUI() {
  // store greeting in local state
  const [greeting, setGreetingValue] = useState("start");

  // request access to the user's MetaMask account
  async function requestAccount() {
    await window.ethereum.request({ method: "eth_requestAccounts" });
  }

  // call the smart contract, read the current greeting value
  async function fetchGreeting() {
    console.log("fetchGreeting");
    if (typeof window.ethereum !== "undefined") {
      console.log(`here we go!`);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(
        greeterAddress,
        Greeter.abi,
        provider
      );
      try {
        const data = await contract.greet();
        console.log("data: ", data);
      } catch (err) {
        console.log("Error: ", err);
      }
    }
  }

  // call the smart contract, send an update
  async function setGreeting() {
    if (!greeting) return;
    if (typeof window.ethereum !== "undefined") {
      await requestAccount();
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(greeterAddress, Greeter.abi, signer);
      const transaction = await contract.setGreeting(greeting);
      await transaction.wait();
      fetchGreeting();
    }
  }

  return (
    <div>
      <button onClick={fetchGreeting}>Fetch Greeting</button>
      <button onClick={setGreeting}>Set Greeting</button>
      <input
        onChange={(e) => setGreetingValue(e.target.value)}
        placeholder="Set greeting"
      />
    </div>
  );
}
