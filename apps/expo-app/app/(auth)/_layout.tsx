import { Stack } from "expo-router";
import { useEffect, useState } from "react";

import { initSync } from "~/lib/data-stores/data-store";
import { useUser } from "~/lib/useUser";

export default function Layout() {
  const [syncDone, setSyncDone] = useState(false);
  const user = useUser();
  useEffect(() => {
    if (user.user) {
      initSync(user.user?.userId).then(() => setSyncDone(true));
    }
  }, [user]);

  if (!syncDone) {
    return <div>omg</div>;
  }

  return (
    <Stack
      screenOptions={{
        contentStyle: {
          overflow: "hidden",
        },
      }}
    />
  );
}
