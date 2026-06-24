import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import type { AppView } from "../components/Sidebar";

interface UseWelcomeFlowOptions {
  isDemo: boolean;
  isBooting: boolean;
  isConfigured: boolean;
  setView: Dispatch<SetStateAction<AppView>>;
}

export const useWelcomeFlow = ({ isDemo, isBooting, isConfigured, setView }: UseWelcomeFlowOptions) => {
  const [welcomeConnected, setWelcomeConnected] = useState(false);
  const isWelcomeVisible = !isDemo && !isBooting && (!isConfigured || welcomeConnected);

  const enterApp = useCallback(() => {
    setWelcomeConnected(false);
    setView("week");
  }, [setView]);

  return {
    enterApp,
    isWelcomeVisible,
    setWelcomeConnected,
    welcomeConnected
  };
};
