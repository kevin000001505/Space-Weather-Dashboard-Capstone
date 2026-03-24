import React, { useEffect, useState } from 'react';
import './DateTimeViewer.css';

const DateTimeViewer = () => {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setDateTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  const year = dateTime.getFullYear();
  const month = dateTime.toLocaleString(undefined, { month: 'long' });
  const day = getOrdinal(dateTime.getDate());
  const hour = String(dateTime.getHours()).padStart(2, '0');
  const minute = String(dateTime.getMinutes()).padStart(2, '0');
  const second = String(dateTime.getSeconds()).padStart(2, '0');

  const dateStr = `${day} ${month}, ${year}`;
  const timeStr = `${hour}:${minute}:${second}`;

  return (
    <div className="datetime-viewer">
      <span className="dtv-date">{dateStr}</span>
      <span className="dtv-sep"> &nbsp;|&nbsp; </span>
      <span className="dtv-time">{timeStr}</span>
    </div>
  );
};

export default DateTimeViewer;
