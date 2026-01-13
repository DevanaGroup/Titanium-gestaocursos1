import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FinancialClient } from "@/types";

interface MonthlyCalendarViewProps {
  clients: FinancialClient[];
  currentDate: Date;
}

export const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({ clients, currentDate }) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getClientsForDay = (day: Date) => {
    return clients.filter(client => {
      if (client.status === 'Sem dados financeiros' || client.status === 'Inativo') {
        return false;
      }
      return client.dueDate === day.getDate();
    });
  };

  const getStatusColor = (client: FinancialClient, day: Date) => {
    const today = new Date();
    const lastPayment = client.lastPaymentDate;
    const hasPaidThisMonth = lastPayment && 
      lastPayment.getMonth() === day.getMonth() && 
      lastPayment.getFullYear() === day.getFullYear();

    if (hasPaidThisMonth) {
      return 'bg-green-100 border-green-300 text-green-800';
    }
    if (day < today) {
      return 'bg-red-100 border-red-300 text-red-800';
    }
    if (client.status === 'Inadimplente') {
      return 'bg-red-200 border-red-400 text-red-900';
    }
    return 'bg-blue-100 border-blue-300 text-blue-800';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendário de Vencimentos - {format(currentDate, 'MMMM yyyy', { locale: ptBR })}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center font-semibold p-2 text-gray-600 text-sm">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {/* Espaços em branco para o início do mês */}
          {Array.from({ length: monthStart.getDay() }, (_, i) => (
            <div key={`empty-${i}`} className="h-24 border border-gray-100 bg-gray-50 rounded"></div>
          ))}
          
          {/* Dias do mês */}
          {days.map(day => {
            const dayClients = getClientsForDay(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div 
                key={day.toISOString()} 
                className={`h-24 border rounded p-1 overflow-y-auto ${
                  isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {day.getDate()}
                </div>
                
                <div className="space-y-1">
                  {dayClients.map(client => (
                    <div
                      key={client.id}
                      className={`text-xs p-1 rounded border ${getStatusColor(client, day)}`}
                      title={`${client.name} - ${formatCurrency(client.monthlyValue)}`}
                    >
                      <div className="font-medium truncate">{client.name}</div>
                      <div className="text-xs">{formatCurrency(client.monthlyValue)}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span>Pago</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span>A vencer</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span>Vencido</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 