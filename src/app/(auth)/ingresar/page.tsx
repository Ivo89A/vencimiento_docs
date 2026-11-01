import { LoginForm } from "@/components/auth/auth-form";

export const metadata = { title: "Ingresar" };
export default function LoginPage() {
  return <><p className="mb-3 text-sm font-medium text-primary">Bienvenido a tu espacio de trabajo</p><h1 className="text-3xl font-bold tracking-[-.04em]">Ingresá a tu cuenta</h1><p className="mb-8 mt-3 text-sm leading-6 text-muted-foreground">Usá las credenciales habilitadas por el administrador.</p><LoginForm /></>;
}
