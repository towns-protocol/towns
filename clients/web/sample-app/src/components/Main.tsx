import AppDrawer from "./AppDrawer";
import { Login } from "./Login";
import { LoginUsernamePassword } from "./LoginUsernamePassword";
import { useMatrixStore } from "use-matrix-client";

const debugWithPassword = false;

export function Main(): JSX.Element {
  const { isAuthenticated } = useMatrixStore();
  return (
    <div>
      {isAuthenticated ? (
        <AppDrawer />
      ) : debugWithPassword ? (
        <LoginUsernamePassword />
      ) : (
        <Login />
      )}
    </div>
  );
}
