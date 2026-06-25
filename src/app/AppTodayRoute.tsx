import type { ComponentProps } from "react";
import { TodayView } from "../components/TodayView";

type TodayViewProps = ComponentProps<typeof TodayView>;

export interface AppTodayRouteProps {
  currentDate: TodayViewProps["date"];
  selectedTicket: TodayViewProps["selectedTicket"];
  ticketOptions: TodayViewProps["ticketOptions"];
  todayWorklogs: TodayViewProps["todayWorklogs"];
  todayPersonalNotes: TodayViewProps["personalNotes"];
  issueUrlsByKey: TodayViewProps["issueUrlsByKey"];
  issueTypesByKey: TodayViewProps["issueTypesByKey"];
  todayTrackedHours: TodayViewProps["todayTrackedHours"];
  dailyTargetHours: TodayViewProps["dailyTargetHours"];
  touchedNotLogged: TodayViewProps["touchedNotLogged"];
  reminderTime: TodayViewProps["reminderTime"];
  remindersEnabled: TodayViewProps["remindersEnabled"];
  isConfigured: TodayViewProps["isConfigured"];
  isLogging: TodayViewProps["isLogging"];
  handleAddWorklog: TodayViewProps["onLog"];
  handleAddPersonalNote: TodayViewProps["onAddPersonalNote"];
  openEditWorklog: TodayViewProps["onEditWorklog"];
  openEditPersonalNote: TodayViewProps["onEditPersonalNote"];
  setSelectedTicket: TodayViewProps["onSelectTicket"];
  searchTickets: TodayViewProps["onSearchTickets"];
}

export const AppTodayRoute = ({
  currentDate,
  selectedTicket,
  ticketOptions,
  todayWorklogs,
  todayPersonalNotes,
  issueUrlsByKey,
  issueTypesByKey,
  todayTrackedHours,
  dailyTargetHours,
  touchedNotLogged,
  reminderTime,
  remindersEnabled,
  isConfigured,
  isLogging,
  handleAddWorklog,
  handleAddPersonalNote,
  openEditWorklog,
  openEditPersonalNote,
  setSelectedTicket,
  searchTickets
}: AppTodayRouteProps) => (
  <TodayView
    date={currentDate}
    selectedTicket={selectedTicket}
    ticketOptions={ticketOptions}
    todayWorklogs={todayWorklogs}
    personalNotes={todayPersonalNotes}
    issueUrlsByKey={issueUrlsByKey}
    issueTypesByKey={issueTypesByKey}
    todayTrackedHours={todayTrackedHours}
    dailyTargetHours={dailyTargetHours}
    touchedNotLogged={touchedNotLogged}
    reminderTime={reminderTime}
    remindersEnabled={remindersEnabled}
    isConfigured={isConfigured}
    isLogging={isLogging}
    onLog={handleAddWorklog}
    onAddPersonalNote={handleAddPersonalNote}
    onEditWorklog={openEditWorklog}
    onEditPersonalNote={openEditPersonalNote}
    onSelectTicket={setSelectedTicket}
    onSearchTickets={searchTickets}
  />
);
