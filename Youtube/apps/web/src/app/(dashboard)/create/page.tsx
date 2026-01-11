"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function CreatePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Mission Control with quick-create mode
    router.replace("/mission-control?mode=quick-create");
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Mission Control로 이동 중...</p>
      </div>
    </div>
  );
}
