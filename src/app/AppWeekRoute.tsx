import type { ComponentProps } from "react";
import { WeekView } from "../components/WeekView";

type WeekViewProps = ComponentProps<typeof WeekView>;

export interface AppWeekRouteProps {
  weekState: WeekViewProps["weekState"];
  syncResult: WeekViewProps["syncResult"];
  currentDate: WeekViewProps["currentDate"];
  isSyncing: WeekViewProps["isSyncing"];
  isSyncingReviews: WeekViewProps["isSyncing"];
  isConfigured: WeekViewProps["isConfigured"];
  dockTickets: WeekViewProps["dockTickets"];
  activeTicketCount: WeekViewProps["activeTicketCount"];
  isLogging: WeekViewProps["isLogging"];
  handleSync: WeekViewProps["onSync"];
  goToPreviousWeek: WeekViewProps["onPreviousWeek"];
  goToCurrentWeek: WeekViewProps["onCurrentWeek"];
  goToNextWeek: WeekViewProps["onNextWeek"];
  openAddTime: WeekViewProps["onAddTime"];
  openEditWorklog: WeekViewProps["onEditWorklog"];
  openEditPersonalNote: WeekViewProps["onEditPersonalNote"];
  handleToggleSkipped: WeekViewProps["onToggleSkipped"];
  handleAddWorklog: NonNullable<WeekViewProps["onDockLog"]>;
  handleConfirmRecurring: WeekViewProps["onConfirmRecurring"];
  handleSkipRecurring: WeekViewProps["onSkipRecurring"];
  handleDeleteRecurringOccurrence: WeekViewProps["onDeleteRecurring"];
}

export const AppWeekRoute = ({
  weekState,
  syncResult,
  currentDate,
  isSyncing,
  isSyncingReviews,
  isConfigured,
  dockTickets,
  activeTicketCount,
  isLogging,
  handleSync,
  goToPreviousWeek,
  goToCurrentWeek,
  goToNextWeek,
  openAddTime,
  openEditWorklog,
  openEditPersonalNote,
  handleToggleSkipped,
  handleAddWorklog,
  handleConfirmRecurring,
  handleSkipRecurring,
  handleDeleteRecurringOccurrence
}: AppWeekRouteProps) => (
  <WeekView
    weekState={weekState}
    syncResult={syncResult}
    currentDate={currentDate}
    isSyncing={isSyncing || isSyncingReviews}
    isConfigured={isConfigured}
    dockTickets={dockTickets}
    activeTicketCount={activeTicketCount}
    isLogging={isLogging}
    onSync={handleSync}
    onPreviousWeek={goToPreviousWeek}
    onCurrentWeek={goToCurrentWeek}
    onNextWeek={goToNextWeek}
    onAddTime={openAddTime}
    onEditWorklog={openEditWorklog}
    onEditPersonalNote={openEditPersonalNote}
    onToggleSkipped={handleToggleSkipped}
    onDockLog={handleAddWorklog}
    onConfirmRecurring={handleConfirmRecurring}
    onSkipRecurring={handleSkipRecurring}
    onDeleteRecurring={handleDeleteRecurringOccurrence}
  />
);
