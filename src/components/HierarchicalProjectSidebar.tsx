import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, FileText, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ProjectModule } from '@/types/checklist';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface HierarchicalProjectSidebarProps {
  modules: ProjectModule[];
  currentModuleId: string;
  currentItemId: string;
  currentNcId: string;
  onNavigate: (moduleId: string, itemId: string, ncId: string) => void;
  className?: string;
  showMobileButton?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const HierarchicalProjectSidebar: React.FC<HierarchicalProjectSidebarProps> = ({
  modules,
  currentModuleId,
  currentItemId,
  currentNcId,
  onNavigate,
  className = '',
  showMobileButton = true,
  isOpen = false,
  onOpenChange,
}) => {
  const isMobile = useIsMobile();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  const sidebarIsOpen = isOpen !== undefined ? isOpen : internalIsOpen;
  const setSidebarIsOpen = onOpenChange || setInternalIsOpen;
  
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set([currentModuleId])
  );
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    new Set([currentItemId])
  );

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const newSet = new Set<string>();
      // Se o módulo já estava expandido, fecha. Senão, fecha todos e abre apenas este
      if (!prev.has(moduleId)) {
        newSet.add(moduleId);
        // Fechar todos os itens ao abrir um novo módulo
        setExpandedItems(new Set<string>());
      }
      return newSet;
    });
  };

  const toggleItem = (itemId: string, moduleId: string, item: any) => {
    setExpandedItems((prev) => {
      const newSet = new Set<string>();
      // Se o item já estava expandido, fecha. Senão, fecha todos os outros e abre apenas este
      if (!prev.has(itemId)) {
        newSet.add(itemId);
        // Garantir que o módulo pai está aberto
        setExpandedModules(new Set([moduleId]));
        
        // Selecionar automaticamente a primeira NC do item
        if (item.ncs && item.ncs.length > 0) {
          const firstNC = item.ncs[0];
          handleNCClick(moduleId, itemId, firstNC.id);
        }
      }
      return newSet;
    });
  };

  const handleNCClick = (moduleId: string, itemId: string, ncId: string) => {
    onNavigate(moduleId, itemId, ncId);
    if (isMobile && setSidebarIsOpen) {
      setSidebarIsOpen(false);
    }
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-[95%] px-4 pt-2 pb-4 md:p-6 md:m-4 md:border md:border-gray-350 md:rounded-lg md:shadow-md bg-white">
      <div className="border-b border-gray-200 pb-2 mb-2 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900">Estrutura do Projeto</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0">
        {modules.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            Nenhum módulo adicionado
          </div>
        ) : (
          <div className="space-y-1">
            {modules.map((module) => {
              const isModuleExpanded = expandedModules.has(module.id);
              const isCurrentModule = module.id === currentModuleId;

              return (
                <div key={module.id} className="space-y-1">
                  {/* Módulo */}
                  <button
                    onClick={() => toggleModule(module.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isCurrentModule
                        ? 'bg-cerrado-green1 text-white hover:bg-cerrado-green1/90'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    {isModuleExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <FolderOpen className="h-4 w-4" />
                    <span className="flex-1 text-left truncate">{module.titulo}</span>
                    <span className="text-xs opacity-70">
                      {module.itens.length}
                    </span>
                  </button>

                  {/* Itens do Módulo */}
                  {isModuleExpanded && (
                    <div className="ml-6 space-y-1">
                      {module.itens.map((item) => {
                        const isItemExpanded = expandedItems.has(item.id);
                        const isCurrentItem = item.id === currentItemId;

                        return (
                          <div key={item.id} className="space-y-1">
                            {/* Item */}
                            <button
                              onClick={() => toggleItem(item.id, module.id, item)}
                              className={cn(
                                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                                isCurrentItem
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'text-gray-600 hover:bg-gray-50'
                              )}
                            >
                              {isItemExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              <FileText className="h-3 w-3" />
                              <span className="flex-1 text-left truncate text-xs">
                                {item.titulo}
                              </span>
                              <span className="text-xs opacity-70">
                                {item.ncs.length} NC
                              </span>
                            </button>

                            {/* NCs do Item */}
                            {isItemExpanded && (
                              <div className="ml-6 space-y-0.5">
                                {item.ncs.map((nc) => {
                                  const isCurrentNC = nc.id === currentNcId;

                                  return (
                                    <button
                                      key={nc.id}
                                      onClick={() =>
                                        handleNCClick(module.id, item.id, nc.id)
                                      }
                                      className={cn(
                                        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors',
                                        isCurrentNC
                                          ? 'bg-cerrado-green1 text-white font-medium'
                                          : 'text-gray-600 hover:bg-gray-100'
                                      )}
                                    >
                                      <div className="h-1.5 w-1.5 rounded-full bg-current" />
                                      <span className="flex-1 text-left truncate">
                                        {nc.ncTitulo}
                                      </span>
                                      {nc.status === 'completed' && (
                                        <span className="text-xs">✓</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // Mobile: Sempre renderizar Sheet como drawer
  if (isMobile) {
    return (
      <>
        {/* Botão Flutuante Mobile - se habilitado */}
        {showMobileButton && !sidebarIsOpen && (
          <Button
            onClick={() => setSidebarIsOpen(true)}
            className="fixed right-0 top-[26%] -translate-y-1/2 z-40 h-20 w-12 rounded-l-full bg-cerrado-green1/60 hover:bg-cerrado-green1/80 backdrop-blur-lg shadow-lg p-0 flex items-center justify-center transition-all touch-manipulation"
            type="button"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </Button>
        )}
        
        {/* Mobile Sheet */}
        <Sheet open={sidebarIsOpen} onOpenChange={setSidebarIsOpen}>
          <SheetContent side="right" className="w-[85vw] sm:w-[400px] p-0 [&>button]:hidden">
            <div className="flex flex-col h-full">
              {renderSidebarContent()}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: Sidebar fixa
  return (
    <aside className={cn('hidden md:block h-full overflow-hidden flex flex-col', className)}>
      {renderSidebarContent()}
    </aside>
  );
};

