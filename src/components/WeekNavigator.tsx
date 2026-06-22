interface WeekNavigatorProps {
  onPreviousWeek: () => void;
  onCurrentWeek: () => void;
  onNextWeek: () => void;
  className?: string;
}

export const WeekNavigator = ({ onPreviousWeek, onCurrentWeek, onNextWeek, className }: WeekNavigatorProps) => (
  <div className={`week-nav${className ? ` ${className}` : ""}`} aria-label="Week navigation">
    <button type="button" className="week-nav-arrow" onClick={onPreviousWeek} aria-label="Previous week">
      ‹
    </button>
    <button type="button" className="pill" onClick={onCurrentWeek}>
      THIS WEEK
    </button>
    <button type="button" className="week-nav-arrow" onClick={onNextWeek} aria-label="Next week">
      ›
    </button>
  </div>
);
