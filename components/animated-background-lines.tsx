/** Both stripes share one transform so their angle and spacing never diverge. */
export function AnimatedBackgroundLines() {
  return <div className="animated-background-lines" aria-hidden="true">
    <div className="animated-background-lines__motion">
      <div className="animated-background-lines__pair"><span/><span/></div>
    </div>
  </div>;
}
