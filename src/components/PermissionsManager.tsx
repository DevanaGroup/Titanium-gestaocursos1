import React from 'react';
import { CustomPermissions } from '@/types';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PermissionsManagerProps {
  permissions: CustomPermissions;
  onPermissionChange: (permission: keyof CustomPermissions, value: boolean) => void;
  disabled?: boolean;
}

export const PermissionsManager: React.FC<PermissionsManagerProps> = ({
  permissions,
  onPermissionChange,
  disabled = false
}) => {
  const permissionGroups = [
    {
      title: "👥 Colaboradores",
      description: "Permissões relacionadas ao gerenciamento de colaboradores",
      permissions: [
        { key: 'canCreateCollaborators' as const, label: 'Criar colaboradores', description: 'Pode adicionar novos colaboradores ao sistema' },
        { key: 'canViewAllCollaborators' as const, label: 'Ver todos colaboradores', description: 'Pode visualizar todos os colaboradores' },
        { key: 'canEditAllCollaborators' as const, label: 'Editar colaboradores', description: 'Pode editar dados de colaboradores' },
        { key: 'canDeleteCollaborators' as const, label: 'Deletar colaboradores', description: 'Pode remover colaboradores do sistema' },
      ]
    },
    {
      title: "🏢 Clientes",
      description: "Permissões relacionadas ao gerenciamento de clientes",
      permissions: [
        { key: 'canCreateClients' as const, label: 'Criar clientes', description: 'Pode adicionar novos clientes' },
        { key: 'canViewAllClients' as const, label: 'Ver todos clientes', description: 'Pode visualizar todos os clientes (senão, só os atribuídos)' },
        { key: 'canEditAllClients' as const, label: 'Editar clientes', description: 'Pode editar dados de clientes' },
        { key: 'canDeleteClients' as const, label: 'Deletar clientes', description: 'Pode remover clientes do sistema' },
      ]
    },
    {
      title: "📋 Tarefas",
      description: "Permissões relacionadas ao gerenciamento de tarefas",
      permissions: [
        { key: 'canViewAllTasks' as const, label: 'Ver todas as tarefas', description: 'Pode visualizar todas as tarefas (senão, só as próprias)' },
      ]
    },
    {
      title: "⚙️ Sistema",
      description: "Permissões administrativas do sistema",
      permissions: [
        { key: 'canManagePermissions' as const, label: 'Gerenciar permissões', description: 'Pode alterar permissões de outros usuários' },
        { key: 'canApproveExpenses' as const, label: 'Aprovar despesas', description: 'Pode aprovar solicitações de despesas' },
        { key: 'canViewFinancialReports' as const, label: 'Ver relatórios financeiros', description: 'Pode visualizar relatórios financeiros' },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Permissões Customizadas</h3>
        <p className="text-sm text-muted-foreground">
          Configure as permissões específicas para este usuário. As permissões customizadas substituem as permissões padrão do cargo.
        </p>
      </div>

      {permissionGroups.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle className="text-base">{group.title}</CardTitle>
            <CardDescription>{group.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.permissions.map((permission) => (
              <div key={permission.key} className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor={permission.key} className="text-sm font-medium">
                    {permission.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {permission.description}
                  </p>
                </div>
                <Switch
                  id={permission.key}
                  checked={permissions[permission.key]}
                  onCheckedChange={(value) => onPermissionChange(permission.key, value)}
                  disabled={disabled}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}; 