
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ContractStatus } from '@/hooks/useContractProcess';

interface ProgressCardProps {
  status: ContractStatus;
  progress: number;
  getStatusLabel: () => string;
}

export const ProgressCard = ({ status, progress, getStatusLabel }: ProgressCardProps) => {
  if (status === 'form_filling') return null;

  return (
    <Card className="on-card mb-8">
      <CardContent className="pt-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progresso da contratação</span>
            <span className="font-semibold text-on-dark">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-center text-gray-600 mt-2">
            {getStatusLabel()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
