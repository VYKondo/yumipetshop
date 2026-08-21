import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import Modal from '../components/Modal';

interface Appointment {
  id: string;
  dogId: string;
  serviceId: string;
  scheduledAt: string;
  durationMin: number;
  price: string;
  taxidogPrice: string;
  notes: string | null;
  contactPhone: string;
  status: string;
  dog?: { name: string; tutorName: string };
  service?: { name: string };
}

interface Dog { id: string; name: string; tutorName: string; tutorPhone: string; }
interface Service { id: string; name: string; basePrice: string; defaultDurationMin: number; }

const statusLabels: Record<string, string> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  DONE: 'Concluído',
  CANCELED: 'Cancelado',
  NO_SHOW: 'Não Compareceu',
};

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  DONE: 'bg-gray-100 text-gray-700',
  CANCELED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-yellow-100 text-yellow-700',
};

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    dogId: '', serviceId: '', scheduledAt: '', durationMin: '60',
    price: '', taxidogPrice: '0', notes: '', contactPhone: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [aptRes, dogRes, svcRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/dogs'),
        api.get('/services'),
      ]);
      setAppointments(aptRes.data);
      setDogs(dogRes.data);
      setServices(svcRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ dogId: '', serviceId: '', scheduledAt: '', durationMin: '60', price: '', taxidogPrice: '0', notes: '', contactPhone: '' });
    setModalOpen(true);
  };

  const openEdit = (apt: Appointment) => {
    setEditingId(apt.id);
    const dt = new Date(apt.scheduledAt);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({
      dogId: apt.dogId, serviceId: apt.serviceId, scheduledAt: local,
      durationMin: String(apt.durationMin), price: String(apt.price),
      taxidogPrice: String(apt.taxidogPrice || 0), notes: apt.notes || '',
      contactPhone: apt.contactPhone,
    });
    setModalOpen(true);
  };

  const handleDogChange = (dogId: string) => {
    const dog = dogs.find(d => d.id === dogId);
    setForm(f => ({ ...f, dogId, contactPhone: dog?.tutorPhone || f.contactPhone }));
  };

  const handleServiceChange = (serviceId: string) => {
    const svc = services.find(s => s.id === serviceId);
    setForm(f => ({
      ...f, serviceId,
      price: svc ? svc.basePrice : f.price,
      durationMin: svc ? String(svc.defaultDurationMin) : f.durationMin,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMin: Number(form.durationMin),
        price: Number(form.price),
        taxidogPrice: Number(form.taxidogPrice),
      };
      if (editingId) {
        await api.patch(`/appointments/${editingId}`, payload);
      } else {
        await api.post('/appointments', payload);
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.patch(`/appointments/${id}`, { status });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao atualizar status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;
    try {
      await api.delete(`/appointments/${id}`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao excluir');
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Agendamentos</h1>
        <button onClick={openCreate} className="btn-primary px-4 py-2 rounded-md text-sm">
          Novo Agendamento
        </button>
      </div>

      {loading ? (
        <div className="card loading h-48" />
      ) : appointments.length === 0 ? (
        <div className="card empty-state">
          <p className="empty-state-title">Nenhum agendamento</p>
          <p className="empty-state-description">Clique em "Novo Agendamento" para criar o primeiro.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Cão</th>
                <th>Serviço</th>
                <th>Preço</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((apt) => (
                <tr key={apt.id}>
                  <td className="font-medium">{formatDateTime(apt.scheduledAt)}</td>
                  <td>{apt.dog?.name || apt.dogId}</td>
                  <td>{apt.service?.name || apt.serviceId}</td>
                  <td>R$ {Number(apt.price).toFixed(2)}</td>
                  <td>
                    <select
                      value={apt.status}
                      onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs border-0 ${statusColors[apt.status] || 'bg-gray-100'}`}
                    >
                      {Object.entries(statusLabels).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="text-right space-x-2">
                    <button onClick={() => openEdit(apt)} className="text-primary text-sm hover:underline">Editar</button>
                    <button onClick={() => handleDelete(apt.id)} className="text-red-600 text-sm hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Agendamento' : 'Novo Agendamento'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Cão *</label>
            <select required className="form-input" value={form.dogId} onChange={(e) => handleDogChange(e.target.value)}>
              <option value="">Selecione um cão</option>
              {dogs.map(d => <option key={d.id} value={d.id}>{d.name} — {d.tutorName}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Serviço *</label>
            <select required className="form-input" value={form.serviceId} onChange={(e) => handleServiceChange(e.target.value)}>
              <option value="">Selecione um serviço</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Data e Hora *</label>
            <input type="datetime-local" required className="form-input" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Duração (min) *</label>
              <input type="number" min="1" required className="form-input" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Preço (R$) *</label>
              <input type="number" step="0.01" min="0" required className="form-input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label">Taxidog (R$)</label>
            <input type="number" step="0.01" min="0" className="form-input" value={form.taxidogPrice} onChange={(e) => setForm({ ...form, taxidogPrice: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Telefone de Contato *</label>
            <input type="tel" required className="form-input" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Observações</label>
            <textarea className="form-input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" disabled={saving} className="w-full btn-primary py-2">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
