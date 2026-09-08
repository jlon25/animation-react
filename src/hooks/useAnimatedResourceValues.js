import { useEffect, useMemo, useRef, useState } from "react";

import { resourceColors } from "../constants/colors";
import {
  buildResourceItems,
  getDefaultValues,
  parseList,
  parseWeights,
  rebalanceValues,
} from "../utils/resourceCalculations";
import { getAnimatedValue } from "../utils/animationUtils";

export function useAnimatedResourceValues(filters, isAnimating) {
  const animationFrameRef = useRef(null);
  const animationStartRef = useRef(null);

  const resourceCount = Math.max(1, Number(filters.resourceCount) || 1);
  const totalResources = Number(filters.totalResources) || 0;

  const names = useMemo(() => {
    return parseList(filters.activityNames, resourceCount);
  }, [filters.activityNames, resourceCount]);

  const weights = useMemo(() => {
    return parseWeights(filters.weightsQ1, names.length, 1);
  }, [filters.weightsQ1, names.length]);

  const defaultValues = useMemo(() => {
    return getDefaultValues(weights);
  }, [weights]);

  const [values, setValues] = useState(defaultValues);

  useEffect(() => {
    setValues(defaultValues);
  }, [defaultValues]);

  useEffect(() => {
    if (!isAnimating) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = null;
      animationStartRef.current = null;
      setValues(defaultValues);
      return;
    }

    const duration = 10000;
    const pause = 1200;
    const fullDuration = duration + pause;

    function animate(timestamp) {
      if (animationStartRef.current === null) {
        animationStartRef.current = timestamp;
      }

      const elapsed = timestamp - animationStartRef.current;
      const loopTime = elapsed % fullDuration;

      if (loopTime <= duration) {
        const progress = loopTime / duration;
        const firstDefaultValue = defaultValues[0] ?? 50;
        const animatedValue = getAnimatedValue(progress, firstDefaultValue);

        setValues((currentValues) =>
          rebalanceValues(currentValues, weights, 0, animatedValue)
        );
      } else {
        setValues((currentValues) =>
          rebalanceValues(currentValues, weights, 0, defaultValues[0] ?? 50)
        );
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = null;
      animationStartRef.current = null;
    };
  }, [isAnimating, defaultValues, weights]);

  function handleSliderChange(index, value) {
    setValues((currentValues) =>
      rebalanceValues(currentValues, weights, index, Number(value))
    );
  }

  const items = useMemo(() => {
    return buildResourceItems({
      names,
      weights,
      values,
      totalResources,
      colors: resourceColors,
    });
  }, [names, weights, values, totalResources]);

  const totalPercent = values.reduce((sum, value) => sum + Number(value), 0);
  const totalAllocatedlResources = (totalPercent / 100) * totalResources;

  return {
    resourceCount,
    totalResources,
    names,
    weights,
    values,
    defaultValues,
    items,
    totalPercent,
    totalAllocatedlResources,
    setValues,
    handleSliderChange,
  };
}
