import AppDrawer from "./AppDrawer";
import { Login } from "./Login";
import { LoginUsernamePassword } from "./LoginUsernamePassword";
import { useMatrixStore } from "use-matrix-client";
import { Outlet } from "react-router";

const debugWithPassword = false;

export function Main(): JSX.Element {
  const { isAuthenticated } = useMatrixStore();
  return (
    <div>
      {isAuthenticated ? (
        <Outlet />
      ) : debugWithPassword ? (
        <LoginUsernamePassword />
      ) : (
        <Login />
      )}
    </div>
  );
}
