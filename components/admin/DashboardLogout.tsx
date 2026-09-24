"use client";

import { useRouter } from "next/navigation";

export default function DashboardLogout() {
  const router = useRouter();
  return (
    <button
      className="dashboard-logout"
      type="button"
      onClick={async () => {
        await fetch("/api/dashboard-login", { method: "DELETE" });
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}
