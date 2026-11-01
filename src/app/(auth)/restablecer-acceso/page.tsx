import Link from "next/link";
import { PasswordRecoveryForm } from "@/components/auth/auth-form";

export const metadata = { title: "Nueva contraseña" };
export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <><h1 className="text-3xl font-semibold tracking-tight">Nueva contraseña</h1><p className="mb-8 mt-3 text-sm leading-6 text-slate-500">Elegí una contraseña única de al menos 12 caracteres.</p>{token && token.length < 1024 ? <PasswordRecoveryForm token={token} /> : <p className="text-sm text-red-700">El enlace no es válido. <Link className="underline" href="/recuperar-acceso">Solicitá uno nuevo.</Link></p>}</>;
}
