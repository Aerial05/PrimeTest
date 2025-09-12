import React, { useEffect, useState } from "react";
import styles from "./JoinedDate.module.css";
import { Calendar } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "/src/config/firebase-config";

export function JoinedDate() {
  const [joinedText, setJoinedText] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user?.metadata?.creationTime) {
        const dt = new Date(user.metadata.creationTime);
        const formatted = dt.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        setJoinedText(`Joined ${formatted}`);
      } else {
        setJoinedText("");
      }
    });
    return () => unsub();
  }, []);

  if (!joinedText) return null;

  return (
    <div className={styles.wrapper} aria-hidden>
      <div className={styles.badge}>
        <Calendar size={16} />
        <span>{joinedText}</span>
      </div>
    </div>
  );
}

