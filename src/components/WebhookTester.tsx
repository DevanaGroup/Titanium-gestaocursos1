import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Play, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const WebhookTester: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    response?: any;
    error?: string;
  } | null>(null);

  const testWebhook = async () => {
    setIsLoading(true);
    setTestResult(null);

    const testMessages = [
      {
        content: "Dados iniciais coletados para elaboração de estudo ambiental",
        role: "user"
      }
    ];

    const testPayload = {
      data: {
        agentId: "23448",
        thread: "thread_test_" + Date.now(),
        assistantId: "seia-master-test",
        assistantName: "SEIA-MASTER",
        messages: testMessages,
        wait_execution: false,
        timestamp: new Date().toISOString()
      },
      form: {
        nomeempresa: "Cerrado Engenharia Ltda",
        nomeprojeto: "Expansão da Unidade Industrial de Beneficiamento",
        localizacao: "Rodovia GO-060, Km 15, Zona Industrial Norte, Goiânia/GO\nCoordenadas: -16.6869° S, -49.2648° W\nUTM: 22L 0206789 8154321",
        tipoestudo: "EIA/RIMA - Estudo de Impacto Ambiental",
        termoreferencia: "TR_SEMA_2024_001.pdf",
        documentacaotecnica: "Memorial_Descritivo_Projeto.pdf",
        planilhasdados: "Dados_Monitoramento_Agua.xlsx",
        fotoscampo: "Vista_Geral_Terreno_001.jpg",
        messages: testMessages,
        file_ids: [73325, 73326, 73327, 73328],
        wait_execution: false
      }
    };

    try {
      const response = await fetch('https://devana-tecnologia-n8n.yrd2ng.easypanel.host/webhook-test/f7cdd969-03f4-456d-ac2d-1315ccb2fc24', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        const result = await response.json();
        setTestResult({ success: true, response: result });
        toast.success('✅ Webhook testado com sucesso!');
      } else {
        const errorText = await response.text();
        setTestResult({ success: false, error: `${response.status}: ${errorText}` });
        toast.error('❌ Erro no teste do webhook');
      }
    } catch (error) {
      setTestResult({ success: false, error: `Erro de conexão: ${error}` });
      toast.error('❌ Erro de conexão com o webhook');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Testador de Webhook
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Estrutura: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">data</code> + <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">form</code> (com novo modelo form)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Endpoint</Badge>
          <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            webhook-test/f7cdd969-03f4-456d-ac2d-1315ccb2fc24
          </code>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-medium text-blue-600">Dados do Sistema (data)</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• agentId: 23448</li>
              <li>• thread: gerado automaticamente</li>
              <li>• assistantId & assistantName</li>
              <li>• messages array</li>
              <li>• timestamp</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-green-600">Dados do Formulário (form)</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• nomeempresa, nomeprojeto, localizacao</li>
              <li>• tipoestudo, termoreferencia</li>
              <li>• messages: array de mensagens</li>
              <li>• file_ids: IDs do Tess Pareto</li>
              <li>• wait_execution: false</li>
            </ul>
          </div>
        </div>

        <Button
          onClick={testWebhook}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testando...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Testar Webhook
            </>
          )}
        </Button>

        {testResult && (
          <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {testResult.success ? 'Sucesso' : 'Erro'}
              </span>
            </div>
            
            {testResult.success && testResult.response && (
              <div className="space-y-2">
                <p className="text-sm text-green-700">
                  Template ID: {testResult.response.template_id}
                </p>
                <p className="text-sm text-green-700">
                  Response ID: {testResult.response.responses?.[0]?.id}
                </p>
                <p className="text-sm text-green-700">
                  Status: {testResult.response.responses?.[0]?.status}
                </p>
                <details className="text-sm">
                  <summary className="cursor-pointer text-green-700 hover:text-green-800">
                    Ver resposta completa
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                    {JSON.stringify(testResult.response, null, 2)}
                  </pre>
                </details>
              </div>
            )}
            
            {!testResult.success && testResult.error && (
              <p className="text-sm text-red-700">
                {testResult.error}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WebhookTester; 