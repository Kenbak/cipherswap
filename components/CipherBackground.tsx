/** Ambient backdrop — a faint grid, CSS only. Kept quiet so the swap card is the focus. */
export function CipherBackground() {
  return (
    <div className="cipher-bg" aria-hidden>
      <div className="cipher-bg__grid" />
      <div className="cipher-bg__noise" />
    </div>
  );
}
