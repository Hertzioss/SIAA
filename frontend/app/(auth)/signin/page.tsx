import { LoginForm } from "@/components/login-form";

/**
 * Página de inicio de sesión.
 * Reutiliza el LoginForm de la ruta raíz.
 */
export default function Signin() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm />
      </div>
    </div>
  );
}