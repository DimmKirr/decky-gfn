/* Lightweight stand-ins for @decky/ui — real components only render inside Steam. */
export const staticClasses = { Title: "deckyTitle", PanelSectionTitle: "deckyPanelSectionTitle" };

export function PanelSection({ title, children }: any) {
  return (
    <section>
      {title && <h3>{title}</h3>}
      {children}
    </section>
  );
}

export function PanelSectionRow({ children }: any) {
  return <div>{children}</div>;
}

export function ButtonItem({ children, onClick, disabled }: any) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function DialogButton({ children, onClick, disabled, style }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  );
}

export function Focusable({ children, onActivate, onCancel, ...rest }: any) {
  return (
    <div
      tabIndex={0}
      role={onActivate ? "button" : undefined}
      onClick={onActivate}
      onKeyDown={(e: any) => {
        if (e.key === "Enter") onActivate?.(e);
        if (e.key === "Escape") onCancel?.(e);
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function TextField({ value, onChange, label, ...rest }: any) {
  return <input aria-label={label ?? "text"} value={value} onChange={onChange} {...rest} />;
}

export function Dropdown({ rgOptions, selectedOption, onChange }: any) {
  return (
    <select
      aria-label="dropdown"
      value={String(selectedOption)}
      onChange={(e) => onChange?.(rgOptions.find((o: any) => String(o.data) === e.target.value))}
    >
      {rgOptions.map((o: any) => (
        <option key={String(o.data)} value={String(o.data)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function SteamSpinner() {
  return <div role="progressbar">Loading…</div>;
}

export function ProgressBarWithInfo({ nProgress, sOperationText }: any) {
  return (
    <div role="progressbar" aria-valuenow={nProgress}>
      {sOperationText}
    </div>
  );
}

export const Navigation = {
  Navigate: (_path: string) => {},
  CloseSideMenus: () => {},
};
