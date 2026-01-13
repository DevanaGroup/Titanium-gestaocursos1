
import { useState } from 'react';
import { ArrowRight, Bookmark } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProjectCardProps {
  title: string;
  description: string;
  image: string;
  tags: string[];
  clientName?: string;
  clientLogo?: string;
}

const ProjectCard = ({
  title,
  description,
  image,
  tags,
  clientName,
  clientLogo,
}: ProjectCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Determinando a tag principal para usar como fallback no alt text
  const mainTag = tags.length > 0 ? tags[0] : 'projeto';
  
  // Fallback image caso a principal falhe
  const fallbackImage = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80";
  
  return (
    <Card 
      className="overflow-hidden group h-full flex flex-col shadow-lg hover:shadow-2xl transition-all duration-500"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="h-56 overflow-hidden relative">
        <img
          src={imageError ? fallbackImage : image}
          alt={`${mainTag} - ${title}`}
          className={`w-full h-full object-cover transition-transform duration-700 ${isHovered ? 'scale-110' : 'scale-100'}`}
          onError={() => setImageError(true)}
        />
        <div className={`absolute inset-0 bg-gradient-to-t from-cerrado-dark/80 to-transparent opacity-0 transition-opacity duration-300 ${isHovered ? 'opacity-100' : ''}`}></div>
        <div className="absolute top-3 right-3">
          <span className="bg-cerrado-green3 text-white text-xs font-semibold px-2 py-1 rounded-full shadow-md">
            Projeto Destacado
          </span>
        </div>
      </div>
      
      <CardContent className="p-6 flex-grow flex flex-col bg-white">
        <h3 className="font-bold text-xl mb-2 text-cerrado-dark group-hover:text-cerrado-green1 transition-colors">{title}</h3>
        <p className="text-gray-600 mb-4 flex-grow">{description}</p>
        
        <div className="mt-auto">
          {clientName && (
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm text-gray-500">
                Cliente:
              </p>
              <div className="flex items-center">
                {clientLogo ? (
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={clientLogo} alt={clientName} />
                    <AvatarFallback>{clientName.charAt(0)}</AvatarFallback>
                  </Avatar>
                ) : null}
                <span className="font-medium text-sm">{clientName}</span>
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag) => (
              <span 
                key={tag}
                className="text-xs bg-cerrado-green1/10 text-cerrado-green1 px-3 py-1 rounded-full transition-all hover:bg-cerrado-green1 hover:text-white cursor-default"
              >
                #{tag}
              </span>
            ))}
          </div>
          
          <Button 
            variant="ghost" 
            className="p-0 h-auto text-cerrado-green1 hover:text-cerrado-green2 hover:bg-transparent group/btn"
          >
            <span>Ver detalhes</span>
            <ArrowRight size={16} className="ml-2 inline-block transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectCard;
