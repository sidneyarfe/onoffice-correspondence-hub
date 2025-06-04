
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/datepicker';
import { Calendar, FileText, Download, BarChart4, PieChart, TrendingUp, Mail, Users } from 'lucide-react';

const AdminReports = () => {
  const [reportType, setReportType] = useState('clientActivity');
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const reports = [
    {
      id: 'clientActivity',
      name: 'Atividade dos Clientes',
      description: 'Relatório de acessos e visualizações de correspondências',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'correspondenceMetrics',
      name: 'Métricas de Correspondências',
      description: 'Volume e tipos de correspondências processadas',
      icon: Mail,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      id: 'financialSummary',
      name: 'Resumo Financeiro',
      description: 'Receitas, pagamentos e inadimplência',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      id: 'clientsOverview',
      name: 'Panorama de Clientes',
      description: 'Distribuição de planos e estados',
      icon: PieChart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  const handleGenerate = () => {
    console.log('Gerando relatório:', {
      type: reportType,
      dateRange,
      startDate,
      endDate,
    });
    // Em produção, geraria o relatório com os parâmetros selecionados
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-on-dark mb-2">Relatórios</h1>
        <p className="text-gray-600">
          Gere relatórios detalhados sobre clientes e operações
        </p>
      </div>

      {/* Report Generator */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle>Gerador de Relatórios</CardTitle>
          <CardDescription>
            Selecione o tipo de relatório e o período desejado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Relatório</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o relatório" />
                </SelectTrigger>
                <SelectContent>
                  {reports.map(report => (
                    <SelectItem key={report.id} value={report.id}>
                      {report.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                  <SelectItem value="quarter">Este Trimestre</SelectItem>
                  <SelectItem value="year">Este Ano</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {dateRange === 'custom' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Inicial</label>
                <DatePicker
                  date={startDate}
                  setDate={setStartDate}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Final</label>
                <DatePicker
                  date={endDate}
                  setDate={setEndDate}
                />
              </div>
            </div>
          )}
          
          <Button className="on-button w-full" onClick={handleGenerate}>
            <FileText className="w-4 h-4 mr-2" />
            Gerar Relatório
          </Button>
        </CardContent>
      </Card>

      {/* Report Types */}
      <div className="grid md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <Card key={report.id} className={`${report.id === reportType ? 'ring-2 ring-on-lime' : ''} hover:shadow-lg transition-all duration-300`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${report.bgColor}`}>
                  <report.icon className={`w-6 h-6 ${report.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{report.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setReportType(report.id)}
                  >
                    Selecionar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Reports */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle>Relatórios Recentes</CardTitle>
          <CardDescription>
            Relatórios gerados anteriormente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <FileText className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {item === 1 && 'Relatório de Atividade - Maio 2024'}
                      {item === 2 && 'Métricas Financeiras - Q1 2024'}
                      {item === 3 && 'Panorama de Clientes - 2024'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Gerado em: {item === 1 ? '01/06/2024' : item === 2 ? '15/04/2024' : '02/01/2024'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Baixar
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReports;
