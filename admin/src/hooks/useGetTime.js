import { useEffect, useState } from "react";

const useGetTime = (time) => {
  const [literalTime, setLiteralTime] = useState("");

  // Returns label and milliseconds until that label would change
  const computeLabelAndNext = (diffMs) => {
    const second = 1000;
    const minute = 60 * second;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const year = 365 * day; // simple (no leap handling needed for relative label)

    if (diffMs < 60 * second) {
      const next = second - (diffMs % second) || second;
      return ["just now", next];
    }
    if (diffMs < hour) {
      const minutes = Math.floor(diffMs / minute);
      const next = minute - (diffMs % minute) || minute;
      return [`${minutes}m`, next];
    }
    if (diffMs < day) {
      const hours = Math.floor(diffMs / hour);
      const next = hour - (diffMs % hour) || hour;
      return [`${hours}h`, next];
    }
    if (diffMs < week) {
      const days = Math.floor(diffMs / day);
      const next = day - (diffMs % day) || day;
      return [`${days}d`, next];
    }
    if (diffMs < year) {
      const weeks = Math.floor(diffMs / week);
      const next = week - (diffMs % week) || week;
      return [`${weeks}w`, next];
    }
    const years = Math.floor(diffMs / year);
    const next = year - (diffMs % year) || year;
    return [`${years}y`, Math.min(next, week)]; // cap updates (no need to wait a whole year)
  };

  useEffect(() => {
    if (!time) return;
    let timerId;
    const schedule = () => {
      const diff = Date.now() - time;
      const [label, nextMs] = computeLabelAndNext(diff);
      setLiteralTime(label);
      // Safety bounds: at least 1s, at most 1 week (to avoid too-long timers)
      const delay = Math.min(Math.max(nextMs, 1000), 7 * 24 * 60 * 60 * 1000);
      timerId = setTimeout(schedule, delay);
    };
    schedule();
    return () => timerId && clearTimeout(timerId);
  }, [time]);

  return literalTime;
};

export default useGetTime;
