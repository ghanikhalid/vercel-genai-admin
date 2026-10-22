"use client";

import { createClient } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export default function AuthButton({
  user,
  nextPath = "/",
}: {
  user: User | null;
  nextPath?: string;
}) {
  const supabase = createClient();
  const router = useRouter();

  const handleLogin = async () => {
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (nextPath && nextPath !== "/") {
      callbackUrl.searchParams.set("next", nextPath);
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  if (user) {
    return (
      <div className="auth-cluster">
        {user.email && <span className="auth-chip">{user.email}</span>}
        <button className="btn-ghost" onClick={handleLogout} type="button">
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button className="btn-primary" onClick={handleLogin} type="button">
      Sign in with Google
    </button>
  );
}
