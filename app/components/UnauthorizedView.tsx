import type { User } from "@supabase/supabase-js";
import AdminGate from "./AdminGate";
import AdminHeader, { type AdminRouteTab } from "./AdminHeader";

export default function UnauthorizedView({
  status,
  user,
  active,
  nextPath,
}: {
  status: "unauthenticated" | "forbidden" | "authorized";
  user: User | null;
  active: AdminRouteTab;
  nextPath: string;
}) {
  return (
    <div className="page-wrap">
      <AdminHeader user={user} active={active} isSuperadmin={false} />
      <main className="main-content">
        <AdminGate
          status={status === "unauthenticated" ? "unauthenticated" : "forbidden"}
          user={user}
          nextPath={nextPath}
        />
      </main>
    </div>
  );
}
