import { useEffect, useState, useCallback } from "react";

const Time = (props) => {
  const { date, withDate, forChat } = props;
  const [literalTime, setLiteralTime] = useState("");

  const getLiteralTime = useCallback(() => {
    if (!date) {
      setLiteralTime("");
      return;
    }

    const targetDate = new Date(date);
    const currentDate = new Date();

    // Reset time to compare only dates
    const targetDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate()
    );
    const currentDay = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate()
    );

    // Calculate difference in days
    const timeDiff = currentDay.getTime() - targetDay.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

    // If just time is needed or it's today
    if (!withDate || daysDiff === 0) {
      if (forChat) {
        setLiteralTime("Today");
        return;
      }

      let time = targetDate.toLocaleTimeString("default", {
        hourCycle: "h24",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Fix 24:00 issue (should be 00:00)
      if (time.startsWith("24")) {
        time = time.replace("24", "00");
      }

      setLiteralTime(time);
      return;
    }

    // Yesterday
    if (daysDiff === 1) {
      setLiteralTime("Yesterday");
      return;
    }

    // Within the same week (but not today or yesterday)
    if (daysDiff > 1 && daysDiff < 7) {
      const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayName = daysOfWeek[targetDate.getDay()];
      setLiteralTime(dayName);
      return;
    }

    // Same year but not within the same week
    if (targetDate.getFullYear() === currentDate.getFullYear()) {
      const month = targetDate.toLocaleDateString("default", {
        month: "short",
      });
      setLiteralTime(`${targetDate.getDate()} ${month}`);
      return;
    }

    // Different year
    const day = targetDate.getDate().toString().padStart(2, "0");
    const month = (targetDate.getMonth() + 1).toString().padStart(2, "0"); // Fix: add 1 to month
    const year = targetDate.getFullYear().toString().slice(2, 4);
    setLiteralTime(`${day}/${month}/${year}`);
  }, [date, withDate, forChat]);

  useEffect(() => {
    getLiteralTime();
  }, [getLiteralTime]);

  return <div className="text-xs whitespace-nowrap">{literalTime}</div>;
};

export default Time;
