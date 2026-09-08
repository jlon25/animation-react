export function wrapSvgText(text, maxCharsPerLine = 12, maxLines = 2) {
  const words = String(text).split(" ");
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length <= maxCharsPerLine) {
      currentLine = nextLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }

      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  const limitedLines = lines.slice(0, maxLines);

  if (lines.length > maxLines) {
    limitedLines[maxLines - 1] = `${limitedLines[maxLines - 1].slice(
      0,
      Math.max(1, maxCharsPerLine - 1)
    )}…`;
  }

  return limitedLines;
}

export function WrappedSvgText({
  text,
  x,
  y,
  className,
  maxWidth,
  lineHeight = 13,
  maxLines = 2,
  textAnchor = "middle",
}) {
  const maxCharsPerLine = Math.max(4, Math.floor(maxWidth / 7.2));
  const lines = wrapSvgText(text, maxCharsPerLine, maxLines);
  const totalHeight = (lines.length - 1) * lineHeight;
  const startY = y - totalHeight / 2;

  return (
    <text className={className} x={x} y={startY} textAnchor={textAnchor}>
      {lines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}
