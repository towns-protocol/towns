import create from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  theme?: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  paneSizes: { [id: string]: number };
  setPaneSize: (id: string, size: number) => void;
}

export const useStore = create(
  persist<AppState>(
    (set) => ({
      theme: undefined,
      setTheme: (theme) => {
        set(() => ({ theme }));
      },
      paneSizes: {},
      setPaneSize: (id: string, size: number) =>
        set((state) => {
          return {
            paneSizes: {
              ...state.paneSizes,
              [id]: size,
            },
          };
        }),
    }),
    { name: "zionstate" },
  ),
);
