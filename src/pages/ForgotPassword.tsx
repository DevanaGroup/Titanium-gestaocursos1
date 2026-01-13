import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, User, ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import { sendPasswordResetEmail } from "@/services/passwordResetService";

const ForgotPassword = () => {
  const [formData, setFormData] = useState({
    email: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(formData.email);
      setEmailSent(true);
      toast.success("Email de recuperação enviado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao enviar email:", error);
      const errorMessage = error.message || "Erro ao enviar email de recuperação. Tente novamente.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo section */}
        <div className="text-center mb-8">
          <div className="mb-6 flex justify-center">
            <Logo variant="default" />
          </div>
        </div>

        <Card className="bg-white border-gray-200 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">
              {emailSent ? "Email Enviado!" : "Recuperar Senha"}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {emailSent 
                ? "Verifique sua caixa de entrada e siga as instruções" 
                : "Digite seu email cadastrado no sistema"
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!emailSent ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-900 font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-red-500"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-lg transition-all duration-300 hover:scale-105"
                  disabled={isLoading}
                >
                  {isLoading ? "Enviando..." : "Enviar Email de Recuperação"}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="text-red-500" size={32} />
                </div>
                <p className="text-gray-700 text-sm">
                  Enviamos um email para <strong>{formData.email}</strong> com instruções para redefinir sua senha.
                </p>
                <p className="text-gray-600 text-xs">
                  <strong>Importante:</strong> O email pode demorar alguns minutos para chegar. 
                  Verifique sua caixa de spam e a pasta de lixo eletrônico.
                </p>
                <p className="text-gray-600 text-xs">
                  O link de recuperação expira em 1 hora por motivos de segurança.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            {!emailSent && (
              <div className="text-center">
                <p className="text-gray-600 text-sm">
                  Lembrou da senha?{" "}
                  <Link to="/login" className="text-red-500 hover:text-red-600 font-medium transition-colors">
                    Voltar ao login
                  </Link>
                </p>
              </div>
            )}
            
            {emailSent && (
              <div className="flex flex-col space-y-3 w-full">
                <Button 
                  onClick={() => setEmailSent(false)}
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 bg-white hover:border-gray-400"
                >
                  Tentar outro email
                </Button>
                <Link to="/login" className="w-full">
                  <Button 
                    variant="ghost"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    Voltar ao login
                  </Button>
                </Link>
              </div>
            )}
          </CardFooter>
        </Card>

        {/* Additional decorative elements */}
        <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-red-500/20 rounded-full blur-xl"></div>
        <div className="absolute -top-4 -left-4 w-16 h-16 bg-white/20 rounded-full blur-xl"></div>
      </div>
    </div>
  );
};

export default ForgotPassword;
