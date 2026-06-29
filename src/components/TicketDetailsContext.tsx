import { createContext, useContext } from "react";

export type OpenTicketDetails = (issueKey: string) => void;

const TicketDetailsContext = createContext<OpenTicketDetails | undefined>(undefined);

export const TicketDetailsProvider = TicketDetailsContext.Provider;

export const useTicketDetailsLauncher = () => useContext(TicketDetailsContext);
