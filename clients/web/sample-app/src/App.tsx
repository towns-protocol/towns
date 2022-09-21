import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Container } from "@mui/material";
import { Home } from "./routes/Home";
import { Main } from "./components/Main";
import { ZionContextProvider } from "use-zion-client";
import { NotFound } from "./routes/NotFound";
import { RoomSettings } from "./routes/RoomSettings";
import { SpaceInvite } from "./routes/SpaceInvite";
import { Spaces } from "./routes/Spaces";
import { SpacesIndex } from "./routes/SpacesIndex";
import { SpacesNew } from "./routes/SpacesNew";
import { SpacesNewChannel } from "./routes/SpacesNewChannel";
import { ThemeProvider } from "@mui/material/styles";
import { Web3 } from "./routes/Web3";
import theme from "./theme";
import { ChannelsIndex } from "./routes/ChannelsIndex";
import { Channels } from "./routes/Channels";
import { AuthenticatedContent } from "./routes/AuthenticatedContent";

const MATRIX_HOMESERVER_URL = process.env
  .REACT_APP_MATRIX_HOME_SERVER as string;
const SPACE_MANAGER_ADDRESS = process.env
  .REACT_APP_SPACE_MANAGER_ADDRESS as string;
const TOKEN_ENTITLEMENT_ADDRESS = process.env
  .REACT_APP_TOKEN_ENTITLEMENT_ADDRESS as string;
const USER_ENTITLEMENT_ADDRESS = process.env
  .REACT_APP_USER_ENTITLEMENT_ADDRESS as string;
const COUNCIL_NFT_ADDRESS = process.env.REACT_APP_COUNCIL_NFT_ADDRESS as string;
const COUNCIL_STAKING_ADDRESS = process.env
  .REACT_APP_COUNCIL_STAKING_ADDRESS as string;

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <Container maxWidth="md">
          <ZionContextProvider
            homeServerUrl={MATRIX_HOMESERVER_URL}
            spaceManagerAddress={SPACE_MANAGER_ADDRESS}
            tokenEntitlementAddress={TOKEN_ENTITLEMENT_ADDRESS}
            userEntitlementAddress={USER_ENTITLEMENT_ADDRESS}
            councilNFTAddress={COUNCIL_NFT_ADDRESS}
            councilStakingAddress={COUNCIL_STAKING_ADDRESS}
            disableEncryption={true} // TODO remove this when we support olm in the browser https://github.com/HereNotThere/harmony/issues/223
            enableSpaceRootUnreads={true}
          >
            <Routes>
              <Route element={<Main />}>
                <Route element={<AuthenticatedContent />}>
                  <Route index element={<Home />} />
                  <Route path="spaces/new" element={<SpacesNew />} />
                  <Route path="spaces/:spaceSlug" element={<Spaces />}>
                    <Route index element={<SpacesIndex />} />
                    <Route path="settings" element={<RoomSettings />}></Route>
                    <Route path="invite" element={<SpaceInvite />} />
                    <Route path="channels/new" element={<SpacesNewChannel />} />
                    <Route path="channels/:channelSlug" element={<Channels />}>
                      <Route index element={<ChannelsIndex />}></Route>
                      <Route path="settings" element={<RoomSettings />}></Route>
                    </Route>
                  </Route>
                  <Route path="web3" element={<Web3 />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Route>
            </Routes>
          </ZionContextProvider>
        </Container>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
