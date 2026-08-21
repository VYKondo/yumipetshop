import { useState, useEffect } from 'react';
import api from '../lib/api';

interface Metrics {
  totalAppointments: number;
  todayAppointments: number;
  monthRevenue: number;
  activeDogs: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/metrics')
      .then(({ data }) => setMetrics(data))
      .catch(() => {
        // Fallback to zeros if metrics endpoint fails
        setMetrics({ totalAppointments: 0, todayAppointments: 0, monthRevenue: 0, activeDogs: 0 });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card loading h-24" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Agendamentos Hoje', value: metrics?.todayAppointments ?? 0, color: 'text-primary' },
    { label: 'Receita do Mês', value: `R$ ${(metrics?.monthRevenue ?? 0).toFixed(2)}`, color: 'text-accent' },
    { label: 'Total de Agendamentos', value: metrics?.totalAppointments ?? 0, color: 'text-primary' },
    { label: 'Cães Cadastrados', value: metrics?.activeDogs ?? 0, color: 'text-primary' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="card">
            <p className="text-sm text-gray-500 mb-1">{card.label}</p>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
