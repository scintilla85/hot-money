"use client";

import { useEffect, useState } from "react";
import { registerPushSubscription } from "@/lib/push-client";

type PushNotificationsProps = {
  role: "director" | "contestant";
  className: string;
};

export default function PushNotifications({ role, className }: PushNotificationsProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean(navigator.standalone));
    setVisible(installed && "Notification" in window && Notification.permission === "default");
  }, []);

  async function enableNotifications() {
    await registerPushSubscription(role);
    setVisible(Notification.permission === "default");
  }

  if (!visible) return null;

  return (
    <button className={className} type="button" onClick={() => void enableNotifications()}>
      Attiva notifiche
    </button>
  );
}
