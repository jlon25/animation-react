import { useEffect, useRef, useState } from "react";

export function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({
    width: 1190,
    height: 620,
  });

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    function updateSize() {
      const rect = element.getBoundingClientRect();

      setSize({
        width: Math.max(360, rect.width),
        height: Math.max(520, rect.height),
      });
    }

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(element);

    window.addEventListener("resize", updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  return { ref, size };
}
