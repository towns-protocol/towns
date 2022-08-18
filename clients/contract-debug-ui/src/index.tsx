import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { DAppProvider, Localhost } from "@usedapp/core";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

// const { chainId } = await getDefaultProvider().getNetwork()

const config = {
  networks: [Localhost],
  readOnlyChainId: Localhost.chainId,
  readOnlyUrls: {
    [Localhost.chainId]: "http://127.0.0.1:8545",
  },
  //on localhost you can grab this after its deployed and set it here to remove the deploy wait
  multicallAddresses: {
    [Localhost.chainId]: "0xc3e53f4d16ae77db1c982e75a937b9f60fe63690",
  },
  notifications: {
    expirationPeriod: 1000, //milliseconds
    checkInterval: 1000, // milliseconds
  },
};

// const config = {
//   readOnlyChainId: Rinkeby.chainId,
//   readOnlyUrls: {
//     [Rinkeby.chainId]: getDefaultProvider('rinkeby'),
//   },
// }

root.render(
  <DAppProvider config={config}>
    <App />
  </DAppProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
