import { PasswordRecoveryForm } from "@/components/auth/auth-form";

export const metadata = { title: "Recuperar acceso" };
export default function RecoveryPage() {
  return <><h1 className="text-3xl font-semibold tracking-tight">Recuperá tu acceso</h1><p className="mb-8 mt-3 text-sm leading-6 text-slate-500">Te enviaremos un enlace de un solo uso, válido durante 30 minutos.</p><PasswordRecoveryForm /></>;
}
