import { useEffect, useState } from "react";

export default function useDebounce<T>(value: T, delay: number = 500) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      setDebouncedValue(value);
      setInitialized(true);
      return;
    }
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, initialized]);
  return debouncedValue;
}
