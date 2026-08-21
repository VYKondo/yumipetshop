import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import Modal from '../components/Modal';

interface Service {
  id: string;
  name: string;
  basePrice: string;
  defaultDurationMin: number;
  active: boolean;
}

const emptyService = { name: '', basePrice: '', defaultDurationMin: '60' };

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyService);
  const [saving, setSaving] = useState(false);

  const loadServices = useCallback(async () => {
    try {
      const { data } = await api.get('/services');
      setServices(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadServices(); }, [loadServices]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyService);
    setModalOpen(true);
  };

  const openEdit = (svc: Service) => {
    setEditingId(svc.id);
    setForm({ name: svc.name, basePrice: String(svc.basePrice), defaultDurationMin: String(svc.defaultDurationMin) });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (editingId) {
        await api.patch(`/services/${editingId}`, payload);
      } else {
        await api.post('/services', payload);
      }
      setModalOpen(false);
      loadServices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    try {
      await api.delete(`/services/${id}`);
      loadServices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao excluir');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Serviços</h1>
        <button onClick={openCreate} className="btn-primary px-4 py-2 rounded-md text-sm">
          Cadastrar Serviço
        </button>
      </div>

      {loading ? (
        <div className="card loading h-48" />
      ) : services.length === 0 ? (
        <div className="card empty-state">
          <p className="empty-state-title">Nenhum serviço cadastrado</p>
          <p className="empty-state-description">Clique em "Cadastrar Serviço" para adicionar o primeiro.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Preço Base</th>
                <th>Duração (min)</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc) => (
                <tr key={svc.id}>
                  <td className="font-medium">{svc.name}</td>
                  <td>R$ {Number(svc.basePrice).toFixed(2)}</td>
                  <td>{svc.defaultDurationMin}</td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs ${svc.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {svc.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="text-right space-x-2">
                    <button onClick={() => openEdit(svc)} className="text-primary text-sm hover:underline">Editar</button>
                    <button onClick={() => handleDelete(svc.id)} className="text-red-600 text-sm hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Serviço' : 'Cadastrar Serviço'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Nome *</label>
            <input type="text" required className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Preço Base (R$) *</label>
            <input type="number" step="0.01" min="0" required className="form-input" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Duração Padrão (minutos)</label>
            <input type="number" min="1" className="form-input" value={form.defaultDurationMin} onChange={(e) => setForm({ ...form, defaultDurationMin: e.target.value })} />
          </div>
          <button type="submit" disabled={saving} className="w-full btn-primary py-2">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
