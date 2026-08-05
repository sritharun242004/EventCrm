export function Meter({
  value,
  kind,
  style,
}: {
  value: number; // 0-100
  kind?: "success" | "warn" | "info";
  style?: React.CSSProperties;
}) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className={"meter" + (kind ? " " + kind : "")} style={style}>
      <i style={{ width: width + "%" }} />
    </div>
  );
}
