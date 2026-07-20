import { Link, useRouterState } from "@tanstack/react-router";
import { Home, CalendarCheck, User, LayoutDashboard, Shield } from "lucide-react";
import { useSession, useRoles } from "@/lib/session";

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useSession();
  const { data: roles = [] } = useRoles(user);
  const isProvider = roles.includes("provider");
  const isAdmin = roles.includes("admin");

  const items = [
    { to: "/", label: "Home", icon: Home },
    { to: "/bookings", label: "Bookings", icon: CalendarCheck },
    ...(isProvider ? [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
    { to: "/profile", label: "Profile", icon: User },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2 rounded-full border border-brand/10 bg-white/90 p-1.5 shadow-[0_18px_40px_rgba(17,28,58,0.16)] backdrop-blur-xl">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-1 flex-col items-center gap-1 rounded-full px-2 py-2 transition-all ${active ? "bg-gradient-to-br from-brand to-slate-700 text-white shadow-lg shadow-brand/20" : "text-brand/50 hover:bg-brand/5 hover:text-brand"}`}
            >
              <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
