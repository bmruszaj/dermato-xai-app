"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useActionState, useEffect, useState } from "react";

import { AuthForm } from "@/components/auth/auth-form";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SubmitButton } from "@/components/auth/submit-button";
import { toast } from "@/components/auth/toast";
import { type LoginActionState, login, signInWithGoogle } from "../actions";

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    { status: "idle" }
  );

  const { update: updateSession } = useSession();

  // biome-ignore lint/correctness/useExhaustiveDependencies: router and updateSession are stable refs
  useEffect(() => {
    if (state.status === "failed") {
      toast({ type: "error", description: "Nieprawidłowe dane logowania!" });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Błąd walidacji danych!",
      });
    } else if (state.status === "success") {
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
      <h1 className="text-2xl font-semibold tracking-tight">Witaj ponownie</h1>
      <p className="text-sm text-muted-foreground">
        Zaloguj się, aby kontynuować
      </p>
      <AuthForm action={handleSubmit} defaultEmail={email}>
        <SubmitButton isSuccessful={isSuccessful}>Zaloguj się</SubmitButton>
        <div className="relative flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[12px] text-muted-foreground">lub</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <GoogleSignInButton action={signInWithGoogle} />
        <p className="text-center text-[13px] text-muted-foreground">
          {"Nie masz konta? "}
          <Link
            className="text-foreground underline-offset-4 hover:underline"
            href="/register"
          >
            Zarejestruj się
          </Link>
        </p>
      </AuthForm>
    </>
  );
}
