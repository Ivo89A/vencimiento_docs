"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { authClient } from "@/domains/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { InputGroup, InputGroupInput, InputGroupAddon } from "@/components/ui/input-group";

const loginSchema = z.object({ email: z.email("Ingresá un email válido."), password: z.string().min(1, "Ingresá tu contraseña.").max(128) });

export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const submit = form.handleSubmit(async (values) => {
    setMessage("");
    try {
      const result = await authClient.signIn.email({ ...values, rememberMe: false });
      if (result.error) { setMessage("No pudimos iniciar sesión. Revisá tus datos o intentá nuevamente más tarde."); return; }
      router.replace("/inicio"); router.refresh();
    } catch { setMessage("No se pudo conectar al sistema. Intentá nuevamente."); }
  });
  return <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
    <FieldGroup>
      <Field data-invalid={!!form.formState.errors.email}><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" type="email" autoComplete="username" spellCheck={false} placeholder="nombre@empresa.com…" {...form.register("email")} aria-invalid={!!form.formState.errors.email} aria-describedby={form.formState.errors.email ? "email-error" : undefined} />{form.formState.errors.email ? <FieldError id="email-error">{form.formState.errors.email.message}</FieldError> : null}</Field>
      <Field data-invalid={!!form.formState.errors.password}><FieldLabel htmlFor="password">Contraseña</FieldLabel><InputGroup><InputGroupInput id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" {...form.register("password")} aria-invalid={!!form.formState.errors.password} aria-describedby={form.formState.errors.password ? "password-error" : undefined} /><InputGroupAddon><button type="button" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)} className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:text-primary">{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></InputGroupAddon></InputGroup>{form.formState.errors.password ? <FieldError id="password-error">{form.formState.errors.password.message}</FieldError> : null}</Field>
    </FieldGroup>
    {message ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{message}</p> : null}
    <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">{form.formState.isSubmitting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}{form.formState.isSubmitting ? "Ingresando…" : "Ingresar al sistema"}</Button>
    <Link href="/recuperar-acceso" className="flex min-h-11 items-center justify-center text-center text-sm font-medium text-primary hover:underline">¿Olvidaste tu contraseña?</Link>
  </form>;
}

export function PasswordRecoveryForm({ token }: { token?: string }) {
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  return <form className="flex flex-col gap-5" onSubmit={async (event) => {
    event.preventDefault(); setPending(true); setMessage(""); setFailed(false);
    const values = new FormData(event.currentTarget);
    try {
      if (token) {
        const password = z.string().min(12).max(128).safeParse(values.get("password"));
        if (!password.success || password.data !== values.get("confirm")) { setFailed(true); setMessage("Las contraseñas deben coincidir y tener entre 12 y 128 caracteres."); return; }
        const result = await authClient.resetPassword({ token, newPassword: password.data });
        if (result.error) {
          setFailed(true);
          setMessage(result.error.status >= 500
            ? "No pudimos confirmar el cambio. Intentá ingresar con la nueva contraseña antes de solicitar otro enlace."
            : result.error.status === 429
              ? "Se alcanzó el límite de intentos. Esperá unos minutos."
              : "El enlace no es válido o venció. Solicitá uno nuevo.");
          return;
        }
        setDone(true); setMessage("Contraseña actualizada. Ya podés ingresar.");
      } else {
        const email = z.email().safeParse(values.get("email"));
        if (!email.success) { setFailed(true); setMessage("Ingresá un email válido."); return; }
        const result = await authClient.requestPasswordReset({ email: email.data, redirectTo: `${window.location.origin}/restablecer-acceso` });
        if (result.error) { setFailed(true); setMessage("No se pudo procesar la solicitud. Intentá nuevamente más tarde."); return; }
        setDone(true); setMessage("Si la cuenta existe, recibirás un enlace para recuperar el acceso. Revisá también el correo no deseado.");
      }
    } catch {
      setFailed(true);
      setMessage(token
        ? "No se pudo confirmar el cambio. Intentá ingresar con la nueva contraseña antes de reintentar."
        : "No se pudo conectar. Intentá nuevamente.");
    }
    finally { setPending(false); }
  }}>
    {!done ? token ? <><label htmlFor="password" className="text-sm font-medium">Nueva contraseña<Input className="mt-2" id="password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label><label htmlFor="confirm" className="text-sm font-medium">Repetí la contraseña<Input className="mt-2" id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label></> : <label htmlFor="email" className="text-sm font-medium">Email<Input className="mt-2" id="email" name="email" type="email" autoComplete="email" required maxLength={254} /></label> : null}
    {message ? <p role="status" className={`rounded-lg p-3 text-sm ${failed ? "bg-red-50 text-red-800" : "bg-teal-50 text-teal-800"}`}>{message}</p> : null}
    {!done ? <Button className="w-full" type="submit" disabled={pending}>{pending ? "Procesando…" : token ? "Guardar contraseña" : "Solicitar enlace"}</Button> : null}
    <Link href="/ingresar" className="block text-center text-sm text-teal-700 underline">Volver al ingreso</Link>
  </form>;
}
