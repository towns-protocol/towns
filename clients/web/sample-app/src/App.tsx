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
import { Me } from "./components/Me";

const MATRIX_HOMESERVER_URL =
  process.env.MATRIX_HOME_SERVER ?? "https://node1.hntlabs.com";

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <Container maxWidth="md">
          <MatrixContextProvider homeServerUrl={MATRIX_HOMESERVER_URL}>
            <Routes>
              <Route element={<Main />}>
                <Route element={<AppDrawer />}>
                  <Route index element={<Me />} />
                  <Route path="spaces/new" element={<SpacesNew />} />
                  <Route path="spaces/:spaceId" element={<Spaces />} />
                  <Route path="*" element={<Home />} />
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
