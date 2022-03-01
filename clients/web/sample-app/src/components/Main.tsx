import { Login } from "./Login";
import AppDrawer from "./AppDrawer";
import { useStore } from "use-matrix-client";

export function Main(): JSX.Element {
  const { isAuthenticated } = useStore();
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
