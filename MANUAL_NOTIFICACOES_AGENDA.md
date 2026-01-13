# 📅 Manual: Sistema de Notificações da Agenda

## 🚀 Nova Funcionalidade: Notificações para Múltiplos Participantes

### 📋 Resumo das Funcionalidades

O sistema de agenda agora permite **notificar múltiplos colaboradores** de forma inteligente e personalizada:

- ✅ **Todos os colaboradores**
- ✅ **Por cargo/hierarquia** (Diretor, Gerente, Engenheiro, etc.)
- ✅ **Seleção individual** (funcionalidade futura)
- ✅ **Sistema anti-spam** (evita notificações duplicadas)
- ✅ **Templates personalizados** por participante
- ✅ **Automação via CRON** (a cada 30 minutos)
- 🎉 **NOVO: Notificação IMEDIATA** quando evento é criado

---

## 🎯 Como Usar

### 1. **Criando um Evento com Notificações**

1. Acesse a **Agenda** no sistema
2. Clique em **"+ Novo Evento"**
3. Preencha as informações básicas:
   - Título
   - Descrição  
   - Tipo (Reunião, Visita Técnica, etc.)
   - Prioridade (Urgente, Alta, Média, Baixa)
   - Data/Hora
   - Local

4. **Na seção "Quem deve ser notificado?":**

   **Opção A: Todos os Colaboradores**
   - ☑️ Marque "Notificar TODOS os colaboradores"
   - Isso enviará notificações para toda a empresa

   **Opção B: Por Cargo/Hierarquia**
   - Selecione os cargos específicos:
     - ☑️ Presidente
     - ☑️ Diretor
     - ☑️ Gerente
     - ☑️ Engenheiro
     - ☑️ Analista
     - ☑️ Técnico/Assistente
     - ☑️ E outros...

5. Clique em **"Criar Evento"**

### 🎉 **NOVO: O que acontece quando você cria um evento?**

**IMEDIATAMENTE após criar o evento:**
- 📧 **E-mail instantâneo** é enviado para todos os participantes selecionados
- 🏷️ **Template especial** "Novo Evento Agendado" 
- ✨ **Badge verde** "EVENTO RECÉM-CRIADO"
- 📅 **Informação clara** sobre quando é o evento (hoje, amanhã, em X dias)
- 🔔 **Aviso sobre lembretes** futuros baseados na prioridade

### 2. **Sistema Duplo de Notificações**

| Tipo | Quando | Template |
|------|--------|----------|
| **🎉 Criação** | **IMEDIATO** | "Novo Evento Agendado" |
| **🔔 Lembretes** | **Baseado na prioridade** | "Lembrete de Agenda" |

### 3. **Horários dos Lembretes por Prioridade**

| Prioridade | Horários de Lembrete |
|------------|----------------------|
| **🚨 Urgente** | 24h, 4h, 1h, 30min antes |
| **⚠️ Alta** | 24h, 2h, 30min antes |
| **📋 Média** | 24h, 1h antes |
| **📌 Baixa** | 24h antes |

### 4. **Sistema de CRON (Automático)**

- **CRON Principal**: A cada 30 minutos das 7h às 20h
- **CRON Urgente**: A cada 15 minutos das 6h às 22h (eventos urgentes)

---

## 🔧 Funcionalidades Técnicas

### **Triggers Automáticos**
- Quando você cria um evento, o sistema automaticamente:
  1. 🔍 Busca todos os colaboradores selecionados
  2. 👥 Adiciona como participantes do evento
  3. 📧 **ENVIA NOTIFICAÇÃO IMEDIATA** para todos
  4. ⏰ Configura lembretes futuros baseados na prioridade

### **Sistema Anti-Duplicação**
- Cada participante recebe apenas 1 e-mail por horário
- Sistema de logs previne spam
- Notificações personalizadas por pessoa
- Separação entre notificação de criação e lembretes

### **Templates Diferenciados**
- **E-mail de Criação**: Badge verde, "Novo Evento Agendado"
- **E-mail de Lembrete**: Badge colorido por prioridade, "Lembrete de Agenda"
- Design responsivo e profissional para ambos

---

## 📧 Exemplos de E-mails

### **📧 E-mail de Criação (IMEDIATO)**

```
🎉 Novo Evento Agendado!

✨ EVENTO RECÉM-CRIADO

🚨 URGENTE 👥 REUNIÃO

Reunião de Emergência - Projeto Alpha

📅 HOJE às 14:00

📋 ID do Evento: event_123abc
🎯 Tipo: Reunião  
👤 Organizador: João Silva
👥 Participante: Maria Santos (Engenheiro)
🕐 Horário: 15/01/2024 14:00 até 15/01/2024 16:00
📍 Local: Sala de Reuniões A
📝 Descrição: Discussão urgente sobre o cronograma

🔔 Lembretes automáticos: Você também receberá lembretes:
• 24h, 4h, 1h e 30min antes do evento

[📱 Acessar Agenda]

Evento criado em 15/01/2024 09:30:45
```

### **📧 E-mail de Lembrete (BASEADO NA PRIORIDADE)**

```
📅 Lembrete de Agenda

🚨 URGENTE 👥 REUNIÃO

Reunião de Emergência - Projeto Alpha

⏰ COMEÇANDO HOJE EM 1 HORA!

📋 ID do Evento: event_123abc
👤 Organizador: João Silva
👥 Participante: Maria Santos (Engenheiro)
🕐 Horário: 15/01/2024 14:00 até 15/01/2024 16:00

[📱 Acessar Agenda]
```

---

## 🧪 Testando o Sistema

### **Teste IMEDIATO - Notificação de Criação**

1. **Crie um evento AGORA** no sistema
2. **Selecione participantes** (todos ou por cargo)
3. **Clique "Criar Evento"**
4. **Aguarde 1-2 minutos** - e-mail será enviado IMEDIATAMENTE
5. **Verifique a caixa de entrada** dos participantes

### **Teste dos Lembretes Automáticos**

1. Crie um evento com **prioridade Urgente**
2. Configure para **1 hora no futuro**
3. Aguarde até 15 minutos para o CRON processar
4. Receberá lembrete automático

### **Teste Manual das Notificações**

```bash
# Teste manual dos lembretes
curl -X POST -H "Authorization: Bearer test-token-cerrado" \
  https://us-central1-cerrado-engenharia.cloudfunctions.net/testAgendaNotifications
```

---

## ❗ Resolução de Problemas

### **Não recebeu notificação IMEDIATA?**

1. **Verifique se o e-mail está correto** na base de colaboradores
2. **Confirme se selecionou participantes** na criação
3. **Aguarde 2-3 minutos** - processamento em background
4. **Verifique a pasta de spam**
5. **Confira os logs** no Firebase Console

### **Não recebeu lembretes automáticos?**

1. **Confirme a prioridade** do evento (Baixa só notifica 24h antes)
2. **Aguarde o CRON** (30 min para normal, 15 min para urgente)
3. **Verifique se já recebeu** para evitar duplicação

### **Como testar tudo rapidamente?**

1. Crie um evento com **prioridade Urgente**
2. Configure para **1 hora no futuro**
3. Selecione **"Todos os colaboradores"**
4. **Imediatamente**: receberá e-mail de criação
5. **Em 15 minutos**: receberá primeiro lembrete automático

---

## 🆕 Próximas Funcionalidades

- [ ] **Seleção individual** de colaboradores específicos
- [ ] **Notificações por SMS** 
- [ ] **Integração com WhatsApp Business**
- [ ] **Confirmação de presença** via e-mail
- [ ] **Lembretes personalizados** por participante
- [ ] **Dashboard de presença** em eventos
- [ ] **Notificações de cancelamento/reagendamento**

---

## 📞 Suporte

Se encontrar algum problema ou tiver dúvidas:

1. Verifique os logs no Firebase Console
2. Teste com eventos de prioridade Urgente
3. Confirme se os colaboradores estão cadastrados corretamente
4. Entre em contato com o suporte técnico

---

**✅ Sistema totalmente funcional com notificações IMEDIATAS e lembretes automáticos!** 