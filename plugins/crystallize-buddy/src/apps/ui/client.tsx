import "@/ui/styles/global.css";
import { registerAllIslands } from "virtual:islands";
import { hydrateIslands, registerIsland } from "virtual:islands/runtime";

registerAllIslands(registerIsland);
hydrateIslands();
