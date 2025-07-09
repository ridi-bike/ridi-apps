import { Slot } from "expo-router";
import { useEffect } from "react";

import { initSync } from "~/lib/data-stores/data-store";
import { useUser } from "~/lib/useUser";

export default function Layout() {
  const user = useUser();
  useEffect(() => {
    if (user.user) {
      initSync(user.user?.userId);
    }
  }, [user]);
  return <Slot />;
}
