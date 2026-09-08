import { useEffect, useMemo, useRef, useState } from "react";

function easeOutCubic(value) {
  const safeValue = Math.max(0, Math.min(1, value));
  return 1 - Math.pow(1 - safeValue, 3);
}

function extractFirstNumber(text) {
  const value = String(text || "");
  const match = value.match(/-?\d+([.,]\d+)?/);

  if (!match) {
    return null;
  }

  const rawNumber = match[0];
  const number = Number(rawNumber.replace(",", "."));

  if (!Number.isFinite(number)) {
    return null;
  }

  return {
    rawNumber,
    number,
    prefix: value.slice(0, match.index),
    suffix: value.slice(match.index + rawNumber.length),
  };
}

function formatNumber(value, decimals = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  const factor = 10 ** decimals;
  const roundedValue = Math.round(number * factor) / factor;

  const shouldHideDecimals = Number.isInteger(roundedValue);

  return roundedValue.toLocaleString("fr-CH", {
    minimumFractionDigits: shouldHideDecimals ? 0 : decimals,
    maximumFractionDigits: decimals,
  });
}

export default function AnimatedSummaryNumber({
  text,
  duration = 900,
  decimals = 0,
  onRollingChange,
}) {
  const parsed = useMemo(() => extractFirstNumber(text), [text]);

  const [displayValue, setDisplayValue] = useState(parsed?.number ?? 0);
  const [isRolling, setIsRolling] = useState(false);

  const previousValueRef = useRef(parsed?.number ?? 0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!parsed) {
      setIsRolling(false);
      onRollingChange?.(false);
      return undefined;
    }

    const startValue = previousValueRef.current;
    const endValue = parsed.number;

    if (startValue === endValue) {
      setDisplayValue(endValue);
      setIsRolling(false);
      onRollingChange?.(false);
      return undefined;
    }

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    let startTime = null;

    setIsRolling(true);
    onRollingChange?.(true);

    function animate(timestamp) {
      if (startTime === null) {
        startTime = timestamp;
      }

      const rawProgress = Math.min(1, (timestamp - startTime) / duration);
      const easedProgress = easeOutCubic(rawProgress);

      const nextValue = startValue + (endValue - startValue) * easedProgress;

      setDisplayValue(nextValue);

      if (rawProgress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        previousValueRef.current = endValue;
        setIsRolling(false);
        onRollingChange?.(false);
        frameRef.current = null;
      }
    }

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = null;
    };
  }, [parsed, duration]);

  if (!parsed) {
    return <>{text}</>;
  }

  return (
    <span
      className={
        isRolling
          ? "animated-summary-wrapper is-rolling"
          : "animated-summary-wrapper"
      }
    >
      {parsed.prefix}

      <span className="animated-summary-number">
        {formatNumber(displayValue, decimals)}
      </span>

      {parsed.suffix}
    </span>
  );
}
