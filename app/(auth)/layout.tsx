import { SparklesIcon } from "@/components/auth/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh w-screen items-center justify-center bg-background">
      <div className="flex w-full max-w-md flex-col gap-6 p-8">
        <div className="flex flex-col gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mb-2 flex size-9 cursor-default items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/50">
                  <SparklesIcon size={14} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Zaloguj się, aby wypróbować aplikację do analizy zdjęć dermatologicznych</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {children}
        </div>
      </div>
    </div>
  );
}
