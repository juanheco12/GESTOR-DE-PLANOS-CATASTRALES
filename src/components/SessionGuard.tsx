"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

const FLAG = "nxa-alive";
const CH   = "nxa";

export default function SessionGuard() {
  useEffect(() => {
    const hasBroadcast = typeof BroadcastChannel !== "undefined";

    if (sessionStorage.getItem(FLAG)) {
      // Active tab: respond to new tabs asking if session is alive
      if (!hasBroadcast) return;
      const bc = new BroadcastChannel(CH);
      bc.onmessage = ({ data }) => { if (data === "ping") bc.postMessage("pong"); };
      return () => bc.close();
    }

    // No flag in this tab — ask other open tabs for confirmation
    if (!hasBroadcast) {
      signOut({ callbackUrl: "/login" });
      return;
    }

    const bc = new BroadcastChannel(CH);
    let confirmed = false;

    bc.onmessage = ({ data }) => {
      if (data === "pong") {
        confirmed = true;
        sessionStorage.setItem(FLAG, "1");
        bc.close();
      }
    };
    bc.postMessage("ping");

    const timer = setTimeout(() => {
      bc.close();
      if (!confirmed) signOut({ callbackUrl: "/login" });
    }, 250);

    return () => { clearTimeout(timer); bc.close(); };
  }, []);

  return null;
}
