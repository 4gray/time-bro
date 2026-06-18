interface ProgressRingProps {
  value: number;
  label: string;
}

export const ProgressRing = ({ value, label }: ProgressRingProps) => {
  const bounded = Math.min(Math.max(value, 0), 100);
  const style = {
    "--progress": `${bounded}%`
  } as React.CSSProperties;

  return (
    <div className="progress-ring" style={style} aria-label={label}>
      <div>
        <strong>{Math.round(bounded)}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
};
