import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { signIn, clearAuthSession } from "@/services/authService";
import { auth } from "@/config/firebase";
import { useAuthContext } from "@/contexts/AuthContext";

const Login = () => {
  const [formData, setFormData] = useState({
    usernameOrEmail: "",
    password: "",
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { userData, loading: authLoading } = useAuthContext();

  // Se já existir uma sessão ativa, redirecionar para a área interna
  useEffect(() => {
    if (!authLoading && userData) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, userData, navigate]);

  // Limpar sessão antiga ao carregar a página de login (apenas para contas legadas/não autorizadas)
  useEffect(() => {
    const clearOldSession = async () => {
      try {
        // Verificar se há um usuário logado
        if (auth.currentUser) {
          const currentEmail = auth.currentUser.email;
          console.log('🔍 Usuário logado detectado:', currentEmail);
          
          // Se o email não for do domínio correto ou for uma conta antiga, limpar
          if (currentEmail && !currentEmail.includes('@devana.com.br') && !currentEmail.includes('@titanium')) {
            console.log('🧹 Limpando sessão de conta antiga:', currentEmail);
            await clearAuthSession();
            toast.info('Sessão anterior foi limpa. Por favor, faça login novamente.');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
      }
    };
    
    clearOldSession();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signIn(formData.usernameOrEmail, formData.password);
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Erro ao fazer login:", err);
      const errorMessage = err?.message || "Credenciais inválidas. Por favor tente novamente.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="rounded-lg border bg-card text-card-foreground shadow-sm w-full max-w-md">
        <div className="flex flex-col space-y-1.5 p-6 text-center pb-8">
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="Titaniumfix" className="h-16 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sistema Gestão de Cursos</h1>
          <p className="text-muted-foreground">Faça login para continuar</p>
        </div>
        <CardContent className="p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="usernameOrEmail" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Username ou Email
              </Label>
              <Input
                id="usernameOrEmail"
                name="usernameOrEmail"
                type="text"
                placeholder="Seu username (ex: ADOCOSTA) ou email"
                value={formData.usernameOrEmail}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                required
              />
              <p className="text-xs text-muted-foreground">
                Use seu username (gerado automaticamente) ou email para administradores
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Mostrar senha"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="bg-red-600 text-white hover:bg-red-700 h-10 px-4 py-2 w-full"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="p-6 pt-0">
          <Button
            type="button"
            variant="ghost"
            asChild
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-primary underline-offset-4 hover:underline h-10 px-4 py-2 w-full text-sm"
          >
            <Link to="/forgot-password">Esqueci minha senha</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
