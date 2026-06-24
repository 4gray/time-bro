import { useState } from "react";
import type { JiraWorklog } from "../../shared/types";

export const useAppTimeEntryModalState = () => {
  const [addModalDate, setAddModalDate] = useState<Date | undefined>();
  const [editingWorklog, setEditingWorklog] = useState<JiraWorklog | undefined>();

  return {
    addModalDate,
    setAddModalDate,
    editingWorklog,
    setEditingWorklog
  };
};
