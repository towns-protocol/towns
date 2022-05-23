import create from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  theme?: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  paneSizes: { [id: string]: number[] };
  setPaneSizes: (id: string, sizes: number[]) => void;
}

export const useStore = create(
  persist<AppState>(
    (set) => ({
      theme: undefined,
      setTheme: (theme) => {
        set(() => ({ theme }));
      },
      paneSizes: {},
      setPaneSizes: (id: string, sizes: number[]) =>
        set((state) => {
          return {
            paneSizes: {
              ...state.paneSizes,
              [id]: sizes,
            },
          };
        }),
    }),
    { name: "zionstate" },
  ),
);
