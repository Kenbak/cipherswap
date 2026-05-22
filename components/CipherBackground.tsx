/**
 * Ambient cipherpunk backdrop — CSS only, no canvas.
 * Sits behind all UI; keep opacity low so the swap card stays the focus.
 */
export function CipherBackground() {
  return (
    <div className="cipher-bg" aria-hidden>
      <div className="cipher-bg__grid" />
      <div className="cipher-bg__orb cipher-bg__orb--cyan" />
      <div className="cipher-bg__orb cipher-bg__orb--green" />
      <div className="cipher-bg__orb cipher-bg__orb--yellow" />
      <div className="cipher-bg__noise" />
      <div className="cipher-bg__scanlines" />
      <div className="cipher-bg__vignette" />
    </div>
  );
}
