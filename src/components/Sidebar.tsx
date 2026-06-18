import { LayoutDashboard, Settings } from "lucide-react";
import appIcon from "../assets/app-icon.png";

interface SidebarProps {
  view: "dashboard" | "settings";
  onViewChange: (view: "dashboard" | "settings") => void;
}

export const Sidebar = ({ view, onViewChange }: SidebarProps) => {
  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark">
          <img src={appIcon} alt="" aria-hidden="true" />
        </div>
        <div>
          <strong>Jira Week Tracker</strong>
          <span>Local time ledger</span>
        </div>
      </div>

      <nav className="side-nav" aria-label="Primary">
        <button
          className={view === "dashboard" ? "active" : ""}
          type="button"
          onClick={() => onViewChange("dashboard")}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>
        <button
          className={view === "settings" ? "active" : ""}
          type="button"
          onClick={() => onViewChange("settings")}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </nav>

      <div className="side-note">
        <span>Storage</span>
        <strong>IndexedDB only</strong>
      </div>
    </aside>
  );
};
