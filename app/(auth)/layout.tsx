import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { SparklesIcon } from "@/components/auth/icons";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh w-screen items-center justify-center bg-background">
      <div className="flex w-full max-w-md flex-col gap-6 p-8">
        <Link
          className="flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          href="/annotate"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back
        </Link>
        <div className="flex flex-col gap-2">
          <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/50">
            <SparklesIcon size={14} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
