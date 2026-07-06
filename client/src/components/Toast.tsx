import { useEffect, useState } from "react";

let showToastFn: ((msg: string) => void) | null = null;

export function toast(message: string) {
  showToastFn?.(message);
}

export function ToastContainer() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    showToastFn = (msg: string) => {
      setMessage(msg);
      setTimeout(() => setMessage(""), 2500);
    };
    return () => {
      showToastFn = null;
    };
  }, []);

  if (!message) return null;
  return <div className="toast">{message}</div>;
}