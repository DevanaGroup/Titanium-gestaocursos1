import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Save, 
  Trash2,
  Eye,
  EyeOff,
  QrCode,
  Phone,
  Settings as SettingsIcon,
  Send,
  MessageSquare,
  FileText,
  Clock,
  User,
  AlertCircle
} from 'lucide-react';
import { toast } from "sonner";
import { zapiService, ZApiConfig, ZApiStatus } from '@/services/zapiService';
import { whatsappNotificationService } from '@/services/whatsappNotificationService';
import { whatsappLogService } from '@/services/whatsappLogService';

const WhatsAppSettings: React.FC = () => {
  const [config, setConfig] = useState<ZApiConfig>({
    instance: '',
    token: '',
    clientToken: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [status, setStatus] = useState<ZApiStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Olá! Esta é uma mensagem de teste do Sistema Cerrado Engenharia. 📱✅');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);

  // Carregar configurações existentes ao montar o componente
  useEffect(() => {
    loadExistingConfig();
  }, []);

  const loadExistingConfig = async () => {
    try {
      const existingConfig = await zapiService.loadConfig();
      if (existingConfig) {
        setConfig(existingConfig);
        setIsConfigured(true);
        await checkStatus();
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    try {
      // Testar conexão primeiro
      const testResult = await zapiService.testConnection(config);
      
      if (!testResult.success) {
        toast.error(`Erro ao testar conexão: ${testResult.error}`);
        setIsLoading(false);
        return;
      }

      // Salvar se o teste passou
      await zapiService.saveConfig(config);
      setIsConfigured(true);
      toast.success('Configurações salvas com sucesso!');
      
      // Verificar status após salvar
      await checkStatus();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!isConfigured) return;
    
    setIsLoading(true);
    try {
      const currentStatus = await zapiService.getStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      toast.error('Erro ao verificar status da conexão');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetQrCode = async () => {
    setIsLoading(true);
    try {
      const qrResponse = await zapiService.getQRCode();
      
      if (qrResponse.error) {
        toast.error(`Erro ao obter QR Code: ${qrResponse.error}`);
        return;
      }
      
      if (qrResponse.qrcode) {
        setQrCode(qrResponse.qrcode);
        setShowQrCode(true);
        toast.success('QR Code obtido com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      toast.error('Erro ao obter QR Code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetPhoneCode = async () => {
    if (!phoneNumber) {
      toast.error('Por favor, informe o número do telefone');
      return;
    }

    setIsLoading(true);
    try {
      const codeResponse = await zapiService.getPhoneCode(phoneNumber);
      
      if (codeResponse.error) {
        toast.error(`Erro ao obter código: ${codeResponse.error}`);
        return;
      }
      
      if (codeResponse.code) {
        toast.success(`Código obtido: ${codeResponse.code}`);
      }
    } catch (error) {
      console.error('Erro ao obter código:', error);
      toast.error('Erro ao obter código por telefone');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearConfig = async () => {
    if (!confirm('Tem certeza que deseja remover todas as configurações do WhatsApp?')) {
      return;
    }

    setIsLoading(true);
    try {
      await zapiService.clearConfig();
      setConfig({ instance: '', token: '', clientToken: '' });
      setIsConfigured(false);
      setStatus(null);
      setQrCode(null);
      setShowQrCode(false);
      toast.success('Configurações removidas com sucesso');
    } catch (error) {
      console.error('Erro ao remover configurações:', error);
      toast.error('Erro ao remover configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!status) return null;

    if (status.connected && status.smartphoneConnected) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Conectado</Badge>;
    } else if (status.connected && !status.smartphoneConnected) {
      return <Badge variant="secondary"><Wifi className="w-3 h-3 mr-1" />Aguardando Smartphone</Badge>;
    } else {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Desconectado</Badge>;
    }
  };

  const handleTestNotification = async () => {
    if (!testPhone.trim()) {
      toast.error('Digite um número de telefone para teste');
      return;
    }

    if (!testMessage.trim()) {
      toast.error('Digite uma mensagem para teste');
      return;
    }

    setIsSendingTest(true);
    const formattedPhone = zapiService.formatPhoneNumber(testPhone);
    
    try {
      const result = await zapiService.sendText({
        phone: formattedPhone,
        message: testMessage,
        delayTyping: 2,
        delayMessage: 1
      });

      // Log do sucesso
      await whatsappLogService.logSuccess(
        'manual_test',
        'Teste Manual',
        formattedPhone,
        'manual_test',
        '🧪 Teste Manual WhatsApp',
        testMessage,
        {
          testType: 'manual_interface',
          originalPhone: testPhone
        },
        result
      );

      toast.success('✅ Mensagem de teste enviada com sucesso!', {
        description: `ID: ${result.messageId}`
      });
      
    } catch (error) {
      console.error('Erro ao enviar mensagem de teste:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Log da falha
      try {
        await whatsappLogService.logFailure(
          'manual_test',
          'Teste Manual',
          formattedPhone,
          'manual_test',
          '🧪 Teste Manual WhatsApp',
          testMessage,
          errorMessage,
          {
            testType: 'manual_interface',
            originalPhone: testPhone
          }
        );
      } catch (logError) {
        console.error('Erro ao registrar log de teste:', logError);
      }
      
      toast.error('❌ Erro ao enviar mensagem de teste', {
        description: errorMessage
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const [recentLogs, stats] = await Promise.all([
        whatsappLogService.getRecentLogs(50),
        whatsappLogService.getStatistics()
      ]);
      
      setLogs(recentLogs);
      setStatistics(stats);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      toast.error('Erro ao carregar logs do WhatsApp');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getMessageTypeLabel = (type: string) => {
    const labels = {
      'task_assignment': '📋 Atribuição de Tarefa',
      'task_deadline': '⏰ Lembrete de Prazo',
      'meeting_reminder': '📅 Lembrete de Reunião',
      'expense_approval': '💰 Aprovação de Despesa',
      'system_announcement': '📢 Comunicado',
      'manual_test': '🧪 Teste Manual'
    };
    return labels[type] || type;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <SettingsIcon className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Configurações do WhatsApp</h1>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="connection">Conexão</TabsTrigger>
          <TabsTrigger value="test">Teste</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5" />
                <span>Configurações Z-API</span>
              </CardTitle>
              <CardDescription>
                Configure sua instância Z-API para integração com WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instance">ID da Instância</Label>
                  <Input
                    id="instance"
                    placeholder="Ex: 3C4B2A1D"
                    value={config.instance}
                    onChange={(e) => setConfig({ ...config, instance: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="token">Token da API</Label>
                  <div className="relative">
                    <Input
                      id="token"
                      type={showTokens ? "text" : "password"}
                      placeholder="Ex: A1B2C3D4E5F6G7H8..."
                      value={config.token}
                      onChange={(e) => setConfig({ ...config, token: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowTokens(!showTokens)}
                    >
                      {showTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="clientToken">Client Token</Label>
                  <Input
                    id="clientToken"
                    type={showTokens ? "text" : "password"}
                    placeholder="Ex: B2C3D4E5F6G7H8I9..."
                    value={config.clientToken}
                    onChange={(e) => setConfig({ ...config, clientToken: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex space-x-2">
                <Button 
                  onClick={handleSaveConfig} 
                  disabled={isLoading || !config.instance || !config.token || !config.clientToken}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Salvando...' : 'Salvar Configurações'}
                </Button>

                {isConfigured && (
                  <Button 
                    variant="destructive" 
                    onClick={handleClearConfig}
                    disabled={isLoading}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar
                  </Button>
                )}
              </div>

              {isConfigured && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Configurações salvas e criptografadas no Firebase.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wifi className="w-5 h-5" />
                  <span>Status da Conexão</span>
                </div>
                {getStatusBadge()}
              </CardTitle>
              <CardDescription>
                Verifique o status atual da sua instância WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={checkStatus} 
                disabled={!isConfigured || isLoading}
                className="w-full"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Verificando...' : 'Verificar Status'}
              </Button>

              {status && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                          <Wifi className={`w-5 h-5 ${status.connected ? 'text-green-500' : 'text-red-500'}`} />
                          <div>
                            <p className="text-sm font-medium">API Conectada</p>
                            <p className="text-xs text-muted-foreground">
                              {status.connected ? 'Conectado' : 'Desconectado'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                          <Smartphone className={`w-5 h-5 ${status.smartphoneConnected ? 'text-green-500' : 'text-orange-500'}`} />
                          <div>
                            <p className="text-sm font-medium">Smartphone</p>
                            <p className="text-xs text-muted-foreground">
                              {status.smartphoneConnected ? 'Conectado' : 'Desconectado'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {status.error && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>{status.error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {!isConfigured && (
                <Alert>
                  <AlertDescription>
                    Configure primeiro suas credenciais Z-API na aba "Configuração".
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <QrCode className="w-5 h-5" />
                <span>Conectar WhatsApp</span>
              </CardTitle>
              <CardDescription>
                Use QR Code ou código via telefone para conectar seu WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <Button 
                  onClick={handleGetQrCode} 
                  disabled={!isConfigured || isLoading}
                  className="w-full"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  {isLoading ? 'Obtendo QR Code...' : 'Obter QR Code'}
                </Button>

                {showQrCode && qrCode && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Escaneie este QR Code com seu WhatsApp
                        </p>
                        <div className="flex justify-center">
                          <img 
                            src={qrCode} 
                            alt="QR Code WhatsApp" 
                            className="max-w-xs max-h-xs border rounded-lg"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          WhatsApp → Configurações → Dispositivos conectados → Conectar dispositivo
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="phone">Ou obter código via telefone</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="phone"
                      placeholder="Ex: 5561999999999"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                    <Button 
                      onClick={handleGetPhoneCode}
                      disabled={!isConfigured || !phoneNumber || isLoading}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Obter Código
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Digite o número com código do país (Ex: 5561999999999)
                  </p>
                </div>
              </div>

              {!isConfigured && (
                <Alert>
                  <AlertDescription>
                    Configure primeiro suas credenciais Z-API na aba "Configuração".
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Teste de Notificações</h3>
            </div>
            
            <Alert>
              <Send className="h-4 w-4" />
              <AlertDescription>
                Use esta seção para testar o envio de mensagens WhatsApp. Certifique-se de que o Z-API está configurado e conectado.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="testPhone">Número de Telefone (com código do país)</Label>
                <Input
                  id="testPhone"
                  type="tel"
                  placeholder="5561999999999"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Formato: 55 + DDD + número (exemplo: 5561999999999)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="testMessage">Mensagem de Teste</Label>
                <textarea
                  id="testMessage"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Digite sua mensagem de teste..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Caracteres: {testMessage.length}/1000
                </p>
              </div>

                               <Button
                   onClick={handleTestNotification}
                   disabled={isSendingTest || !status?.connected}
                   className="w-full"
                 >
                {isSendingTest ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Mensagem de Teste
                  </>
                )}
              </Button>

                             {!status?.connected && (
                 <Alert variant="destructive">
                   <XCircle className="h-4 w-4" />
                   <AlertDescription>
                     Z-API não está conectado. Configure e conecte primeiro na aba "Configuração".
                   </AlertDescription>
                 </Alert>
               )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold">Histórico de Envios</h3>
              </div>
              <Button 
                onClick={loadLogs} 
                disabled={isLoadingLogs}
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                {isLoadingLogs ? 'Carregando...' : 'Atualizar'}
              </Button>
            </div>

            {statistics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{statistics.total}</p>
                      <p className="text-xs text-muted-foreground">Total de Envios</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{statistics.successful}</p>
                      <p className="text-xs text-muted-foreground">Bem-sucedidos</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{statistics.failed}</p>
                      <p className="text-xs text-muted-foreground">Falhas</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{statistics.successRate}%</p>
                      <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardContent className="p-0">
                {logs.length === 0 && !isLoadingLogs ? (
                  <div className="p-6 text-center">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum log encontrado</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Os logs aparecem aqui após enviar notificações WhatsApp
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {logs.map((log, index) => (
                      <div key={log.id || index} className="p-4 hover:bg-muted/50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(log.status)}
                              <span className="font-medium text-sm">{log.messageTitle}</span>
                              <Badge variant="secondary" className="text-xs">
                                {getMessageTypeLabel(log.messageType)}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <User className="w-3 h-3" />
                                <span>{log.recipientName}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Phone className="w-3 h-3" />
                                <span>{log.recipientPhone}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(log.sentAt).toLocaleString('pt-BR')}</span>
                              </div>
                            </div>
                            {log.error && (
                              <div className="flex items-center space-x-1 text-xs text-red-600">
                                <AlertCircle className="w-3 h-3" />
                                <span>{log.error}</span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <Badge 
                              variant={log.status === 'success' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {log.status === 'success' ? 'Sucesso' : 'Falha'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppSettings; 