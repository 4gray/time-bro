import type { ComponentProps } from "react";
import { TicketsView } from "../components/TicketsView";

type TicketsViewProps = ComponentProps<typeof TicketsView>;

export interface AppTicketsRouteProps {
  tickets:
    | {
        inProgress: TicketsViewProps["inProgress"];
        recentlyClosed: TicketsViewProps["recentlyClosed"];
      }
    | undefined;
  ticketFilters: TicketsViewProps["filters"];
  setTicketFilters: TicketsViewProps["onFiltersChange"];
  favoriteKeys: TicketsViewProps["favoriteKeys"];
  hoursByKey: TicketsViewProps["hoursByKey"];
  weekHoursLogged: TicketsViewProps["weekHoursLogged"];
  isConfigured: TicketsViewProps["isConfigured"];
  ticketsLoading: TicketsViewProps["isLoading"];
  ticketsError: TicketsViewProps["error"];
  toggleFavorite: TicketsViewProps["onToggleFavorite"];
  handleLogTicket: TicketsViewProps["onLog"];
}

export const AppTicketsRoute = ({
  tickets,
  ticketFilters,
  setTicketFilters,
  favoriteKeys,
  hoursByKey,
  weekHoursLogged,
  isConfigured,
  ticketsLoading,
  ticketsError,
  toggleFavorite,
  handleLogTicket
}: AppTicketsRouteProps) => (
  <TicketsView
    inProgress={tickets?.inProgress ?? []}
    recentlyClosed={tickets?.recentlyClosed ?? []}
    filters={ticketFilters}
    onFiltersChange={setTicketFilters}
    favoriteKeys={favoriteKeys}
    hoursByKey={hoursByKey}
    weekHoursLogged={weekHoursLogged}
    isConfigured={isConfigured}
    isLoading={ticketsLoading}
    error={ticketsError}
    onToggleFavorite={toggleFavorite}
    onLog={handleLogTicket}
  />
);
