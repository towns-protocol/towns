import { useEtherBalance, useEthers, useTokenBalance } from "@usedapp/core";
import styled from "styled-components";
import { formatEther } from "ethers/lib/utils";

const ZionTokenAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

export function BalanceUI() {
  const { account } = useEthers();

  console.log(`Account is : ${account}`);
  const zionBalance = useTokenBalance(ZionTokenAddress, account);
  const zionBalanceFormatted = zionBalance ? formatEther(zionBalance) : "0.00";

  const ethBalance = useEtherBalance(account);
  const ethFormatted = ethBalance ? formatEther(ethBalance) : "0.00";
  const ethBalanceFormatted = ethFormatted
    ? parseFloat(ethFormatted).toFixed(5)
    : 0;

  const ethSymbol = "\u27E0";
  const zionSymbol = "\u0224";
  return (
    <div>
      {account && (
        <Container>
          <Account>{account}</Account>
          <Balance>
            Zion: {zionSymbol} &nbsp;&nbsp; {zionBalanceFormatted}
          </Balance>

          <Balance>
            ETH: {ethSymbol} &nbsp;&nbsp; {ethBalanceFormatted}
          </Balance>
        </Container>
      )}
    </div>
  );
}

const Container = styled.div`
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  width: 100%;
`;
const Balance = styled.div`
  font-size: 18pt;
`;
const Account = styled.div`
  font-size: 14pt;
  margin-bottom: 22px;
`;
