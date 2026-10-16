/** Logo oficial do design system (NibbsLogo.dc.html). */

type Props = {
  variant?: "lockup" | "wordmark" | "symbol";
  size?: number;
  ink?: string;
  accent?: string;
};

export function NibbsLogo({
  variant = "lockup",
  size = 28,
  ink = "#261714",
  accent = "#B3202F",
}: Props) {
  const showSymbol = variant !== "wordmark";
  const showWord = variant !== "symbol";
  const fs = size;
  const sym = variant === "symbol" ? size : Math.round(size * 0.82);
  const gap = Math.round(size * 0.28);

  const dots: Array<[string, string, string]> = [
    ["83%", "43%", ink],
    ["71%", "71%", ink],
    ["43%", "83%", ink],
    ["15%", "71%", ink],
    ["3%", "43%", ink],
    ["15%", "15%", ink],
    ["43%", "3%", accent],
    ["71%", "15%", ink],
  ];

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap, color: ink }}>
      {showSymbol && (
        <span style={{ position: "relative", width: sym, height: sym, flex: "none", display: "block" }}>
          {dots.map(([left, top, bg], i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                left,
                top,
                width: "15%",
                height: "15%",
                borderRadius: "50%",
                background: bg,
              }}
            />
          ))}
        </span>
      )}
      {showWord && (
        <span
          style={{
            fontFamily: '"Hedvig Letters Serif", serif',
            fontSize: fs,
            lineHeight: 0.9,
            letterSpacing: "-0.03em",
            whiteSpace: "nowrap",
          }}
        >
          nibbs<span style={{ color: accent }}>.</span>
        </span>
      )}
    </span>
  );
}
