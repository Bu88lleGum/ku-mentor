"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Toast from "./toast";

export default function ToastProvider() {
  const [toastMessage, setToastMessage] = useState("");
  const pathname = usePathname();

  // Исчезать при переходе
  useEffect(() => {
    setToastMessage("");
  }, [pathname]);

  // Слушаем событие
  useEffect(() => {
    const handleToast = (e: any) => setToastMessage(e.detail);
    window.addEventListener("show-toast", handleToast);
    return () => window.removeEventListener("show-toast", handleToast);
  }, []);

  return (
    <Toast 
      message={toastMessage} 
      onClose={() => setToastMessage("")} 
    />
  );
}