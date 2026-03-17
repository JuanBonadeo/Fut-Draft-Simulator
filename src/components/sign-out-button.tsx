"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/16"
      onClick={async () => {
        await signOut({
          fetchOptions: {
            onSuccess: () => {
              router.push("/sign-in");
              router.refresh();
            },
          },
        });
      }}
    >
      Sign out
    </button>
  );
}