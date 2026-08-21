import { useState } from 'react';
import api from '../lib/api';

export default function Reports() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadReport = async (format: 'csv' | 'pdf') => {
    if (!startDate || !endDate) {
      alert('Selecione o período');
      return;
    }
    setDownloading(format);
    try {
      const response = await api.get(`/appointments/report/${format}`, {
        params: { startDate, endDate },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-agendamentos.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao gerar relatório');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>

      <div className="card">
        <h2 className="card-title">Relatório de Agendamentos</h2>
        <p className="text-sm text-gray-500 mb-4">
          Gere relatórios de agendamentos filtrados por período.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="form-label">Data Início</label>
            <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Data Fim</label>
            <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => downloadReport('csv')}
            disabled={downloading === 'csv'}
            className="btn-primary px-4 py-2 rounded-md text-sm"
          >
            {downloading === 'csv' ? 'Gerando...' : 'Baixar CSV'}
          </button>
          <button
            onClick={() => downloadReport('pdf')}
            disabled={downloading === 'pdf'}
            className="btn-accent px-4 py-2 rounded-md text-sm"
          >
            {downloading === 'pdf' ? 'Gerando...' : 'Baixar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
