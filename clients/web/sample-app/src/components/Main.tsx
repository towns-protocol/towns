import { Login } from "./Login";
import AppDrawer from "./AppDrawer";
import { useMatrixStore } from "use-matrix-client";

export function Main(): JSX.Element {
  const { isAuthenticated } = useMatrixStore();
  return (
    <div>
      {isAuthenticated ? (
        <AppDrawer />
      ) : (
        <Login />
      )}
    </div>
  );
}
