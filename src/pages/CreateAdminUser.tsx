import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "@/config/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const CreateAdminUser = () => {
  const [formData, setFormData] = useState({
    firstName: "Admin",
    lastName: "Devana",
    email: "contato@devana.com.br",
    password: "devdev",
    birthDate: "1990-01-01"
  });
  
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.birthDate) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }
    
    setLoading(true);

    try {
      // 1. Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;
      
      // 2. Atualizar o displayName (usar apenas firstName para exibição)
      await updateProfile(user, {
        displayName: formData.firstName
      });
      
      // 3. Criar documento na coleção users
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: formData.firstName,
        hierarchyLevel: "Nível 1",
        photoURL: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      toast.success("Usuário criado com sucesso!");
      
      // Fazer logout para que o usuário possa entrar com a nova conta
      await auth.signOut();
      
      // Redirecionar para a página de login
      navigate("/login");
      
    } catch (error: any) {
      console.error("Erro ao criar gerente:", error);
      toast.error(`Erro ao criar usuário: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cerrado-cream to-white p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold text-center text-cerrado-green1">
            Criar Conta Administrativa
          </CardTitle>
          <CardDescription className="text-center">
            Crie um usuário com permissões máximas (Nível 1) para administrar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Nome"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Sobrenome"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="exemplo@email.com"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Senha (mínimo 6 caracteres)"
                minLength={6}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de Nascimento</Label>
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={handleChange}
                required
              />
            </div>
            
            <Button
              type="submit"
              className="w-full bg-cerrado-green2 hover:bg-cerrado-green1 text-white"
              disabled={loading}
            >
              {loading ? "Criando Usuário..." : "Criar Usuário"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="ghost" onClick={() => navigate("/login")}>
            Voltar para o Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CreateAdminUser; 