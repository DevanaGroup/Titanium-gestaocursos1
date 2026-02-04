import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarProvider } from "@/contexts/SidebarContext";
import CustomSidebar from "@/components/CustomSidebar";
import { CourseDetails } from "@/components/CourseDetails";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useEffect, useState } from "react";
import { useTabCloseLogout } from "@/hooks/useTabCloseLogout";
import { signOut } from "firebase/auth";

const getAvatarInitials = (name: string) => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

interface UserData {
  name: string;
  role: string;
  avatar: string;
}

const CourseDetailsPage = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData>({
    name: "Usuário",
    role: "Gerente",
    avatar: "/placeholder.svg",
  });

  useTabCloseLogout();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "collaborators_unified", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const displayName = data.firstName || "Usuário";
            setUserData({
              name: displayName,
              role: data.hierarchyLevel || "Gerente",
              avatar: data.avatar || data.photoURL || "/placeholder.svg",
            });
          }
        } catch {
          setUserData((prev) => ({ ...prev, name: user.displayName || "Usuário" }));
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth);
    navigate("/login");
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <CustomSidebar
          activeTab="courses"
          onTabChange={() => {}}
        />
        <div className="flex flex-col flex-1">
          <header className="sticky top-0 z-20 flex items-center justify-between h-[80px] border-b bg-background text-foreground px-4">
            <div className="text-xl font-semibold">Detalhes do Curso</div>
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-4 cursor-pointer">
                    <div className="flex flex-col items-end mr-2">
                      <span className="font-medium">{userData.name}</span>
                      <span className="text-xs opacity-80">{userData.role}</span>
                    </div>
                    <Avatar>
                      <AvatarImage src={userData.avatar} alt={userData.name} />
                      <AvatarFallback>{getAvatarInitials(userData.name)}</AvatarFallback>
                    </Avatar>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/courses")}>
                    Voltar aos Cursos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>Sair</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 dashboard-content bg-background p-6 overflow-auto h-[calc(100vh-80px)]">
            <CourseDetails />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CourseDetailsPage;
