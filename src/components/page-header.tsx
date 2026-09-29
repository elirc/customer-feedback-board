export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className="toolbar"
      style={{ justifyContent: "space-between", alignItems: "flex-start" }}
    >
      <div>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <p className="muted">{description}</p>
      </div>
      {actions ? <div className="toolbar">{actions}</div> : null}
    </div>
  );
}
