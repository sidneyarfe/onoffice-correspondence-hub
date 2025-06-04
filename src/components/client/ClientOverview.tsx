
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, FileText, CreditCard, Clock, Download, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const ClientOverview = () => {
  const stats = [
    {
      title: 'Correspondências',
      value: '12',
      subtitle: '3 não lidas',
      icon: Mail,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Documentos',
      value: '3',
      subtitle: 'Disponíveis',
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Próximo Vencimento',
      value: '15 dias',
      subtitle: 'R$ 129,00',
      icon: CreditCard,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Conta Ativa',
      value: '2 anos',
      subtitle: 'Cliente desde 2022',
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  const recentCorrespondences = [
    {
      id: 1,
      sender: 'Receita Federal',
      subject: 'Notificação Fiscal',
      date: '2024-06-01',
      isNew: true,
    },
    {
      id: 2,
      sender: 'Prefeitura Municipal',
      subject: 'IPTU 2024',
      date: '2024-05-28',
      isNew: true,
    },
    {
      id: 3,
      sender: 'SEFAZ-SP',
      subject: 'Alteração Cadastral',
      date: '2024-05-25',
      isNew: false,
    },
  ];

  const recentActivities = [
    {
      action: 'Correspondência visualizada',
      details: 'Notificação Fiscal - Receita Federal',
      time: 'Há 2 horas',
    },
    {
      action: 'Documento baixado',
      details: 'IPTU 2024',
      time: 'Ontem',
    },
    {
      action: 'Nova correspondência',
      details: 'SEFAZ-SP - Alteração Cadastral',
      time: '3 dias atrás',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-on-dark mb-2">Dashboard</h1>
        <p className="text-gray-600">Acompanhe suas correspondências e documentos</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="on-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-on-dark">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.subtitle}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Content */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Correspondences */}
        <Card className="on-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Correspondências Recentes</span>
              <Link to="/cliente/correspondencias">
                <Button variant="outline" size="sm">Ver todas</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCorrespondences.map((correspondence) => (
                <div key={correspondence.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-on-dark">{correspondence.sender}</h4>
                      {correspondence.isNew && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">Nova</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{correspondence.subject}</p>
                    <p className="text-xs text-gray-500">{correspondence.date}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="on-card">
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-on-lime rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="font-medium text-on-dark">{activity.action}</p>
                    <p className="text-sm text-gray-600">{activity.details}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Acesse rapidamente os recursos mais utilizados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <Link to="/cliente/documentos">
              <Button className="w-full h-16 on-button flex flex-col gap-2">
                <FileText className="w-6 h-6" />
                <span>Baixar Documentos</span>
              </Button>
            </Link>
            <Link to="/cliente/correspondencias">
              <Button className="w-full h-16 bg-gray-800 hover:bg-gray-700 text-white flex flex-col gap-2">
                <Mail className="w-6 h-6" />
                <span>Ver Correspondências</span>
              </Button>
            </Link>
            <Link to="/cliente/financeiro">
              <Button className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white flex flex-col gap-2">
                <CreditCard className="w-6 h-6" />
                <span>Área Financeira</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientOverview;
