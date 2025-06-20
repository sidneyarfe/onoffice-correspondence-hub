
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PlanSummaryCardProps {
  selectedPlan: string;
}

export const PlanSummaryCard = ({ selectedPlan }: PlanSummaryCardProps) => {
  return (
    <Card className="on-card mb-8">
      <CardHeader>
        <CardTitle className="text-center text-on-dark">
          Plano Selecionado: {selectedPlan}
        </CardTitle>
        <CardDescription className="text-center">
          Complete os dados para finalizar a contratação
        </CardDescription>
      </CardHeader>
    </Card>
  );
};
