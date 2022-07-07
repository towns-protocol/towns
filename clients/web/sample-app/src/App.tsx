import { Container } from "@mui/material";
import { Main } from "./components/Main";
import { MatrixContextProvider } from "use-matrix-client";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "./routes/Home";
import { Spaces } from "./routes/Spaces";
import { SpacesNew } from "./routes/SpacesNew";
import AppDrawer from "./components/AppDrawer";
import { SpacesIndex } from "./routes/SpacesIndex";
import { Rooms } from "./routes/Rooms";
import { RoomsIndex } from "./routes/RoomsIndex";
import { RoomsNew } from "./routes/RoomsNew";
import { SpacesNewChannel } from "./routes/SpacesNewChannel";
import { NotFound } from "./routes/NotFound";

const MATRIX_HOMESERVER_URL = process.env
  .REACT_APP_MATRIX_HOME_SERVER as string;

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <Container maxWidth="md">
          <MatrixContextProvider homeServerUrl={MATRIX_HOMESERVER_URL}>
            <Routes>
              <Route element={<Main />}>
                <Route element={<AppDrawer />}>
                  <Route index element={<Home />} />
                  <Route path="rooms/new" element={<RoomsNew />} />
                  <Route path="rooms/:roomSlug" element={<Rooms />}>
                    <Route index element={<RoomsIndex />}></Route>
                  </Route>
                  <Route path="spaces/new" element={<SpacesNew />} />
                  <Route path="spaces/:spaceSlug" element={<Spaces />}>
                    <Route index element={<SpacesIndex />} />
                    <Route path="channels/new" element={<SpacesNewChannel />} />
                    <Route path="channels/:roomSlug" element={<Rooms />}>
                      <Route index element={<RoomsIndex />}></Route>
                    </Route>
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Route>
            </Routes>
          </MatrixContextProvider>
        </Container>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
