"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useActionState, useEffect, useState } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SubmitButton } from "@/components/auth/submit-button";
import { toast } from "@/components/auth/toast";
import {
  type RegisterActionState,
  register,
  signInWithGoogle,
} from "../actions";

function OAuthErrorToast() {
  const searchParams = useSearchParams();

  // biome-ignore lint/correctness/useExhaustiveDependencies: run only on mount
  useEffect(() => {
    if (searchParams.get("error")) {
      toast({
        type: "error",
        description:
          "Logowanie przez Google nie powiodło się. Spróbuj ponownie.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    { status: "idle" }
  );

  const { update: updateSession } = useSession();

  // biome-ignore lint/correctness/useExhaustiveDependencies: router and updateSession are stable refs
  useEffect(() => {
    if (state.status === "user_exists") {
      toast({ type: "error", description: "Konto już istnieje!" });
    } else if (state.status === "failed") {
      toast({ type: "error", description: "Nie udało się utworzyć konta!" });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Błąd walidacji danych!",
      });
    } else if (state.status === "success") {
      toast({ type: "success", description: "Konto zostało utworzone!" });
      setIsSuccessful(true);
      updateSession();
      router.push("/annotate");
    }
  }, [state.status]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  return (
    <>
      <Suspense>
        <OAuthErrorToast />
      </Suspense>
      <h1 className="text-2xl font-semibold tracking-tight">Utwórz konto</h1>
      <p className="text-sm text-muted-foreground">
        Zacznij korzystać za darmo
      </p>
      <AuthForm action={handleSubmit} defaultEmail={email}>
        <SubmitButton isSuccessful={isSuccessful}>Zarejestruj się</SubmitButton>
      </AuthForm>
      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[12px] text-muted-foreground">lub</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <GoogleSignInButton action={signInWithGoogle} />
      <p className="text-center text-[13px] text-muted-foreground">
        {"Masz już konto? "}
        <Link
          className="text-foreground underline-offset-4 hover:underline"
          href="/login"
        >
          Zaloguj się
        </Link>
      </p>
    </>
  );
}
