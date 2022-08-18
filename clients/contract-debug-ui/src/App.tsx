import "./App.css";
import styled from "styled-components";
// import { ClaimUI } from "./components/ClaimUI";
// import { ClaimGsnUI } from "./components/ClaimGsnUI";
// import { BalanceUI } from "./components/BalanceUI";
import { SpacesUI } from "./components/SpacesUI";
import { CouncilNFTUI } from "./components/CouncilNFTUI";
import { useEthers } from "@usedapp/core";

function App() {
  console.log("Loading APP");
  const { activateBrowserWallet, account } = useEthers();
  return (
    <AppBG className="App">
      {!account && <button onClick={activateBrowserWallet}> Connect </button>}
      {/* <BalanceUI />
      <Section>
        <ClaimUI />
      </Section>
      <Section>
        <ClaimGsnUI />
      </Section> */}
      <Section>
        <SpacesUI />
      </Section>
      <Section>
        <CouncilNFTUI />
      </Section>
    </AppBG>
  );
}

const Section = styled.div`
  margin: 40px;
  border: 1px solid #ccc;
  padding: 20px;
`;

const AppBG = styled.div`
  background-color: #333;
  height: 100vh;
  padding: 50px;
  font-size: 18px;
  color: #fff;
`;

export default App;
