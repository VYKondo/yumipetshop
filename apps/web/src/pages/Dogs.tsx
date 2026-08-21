import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import Modal from '../components/Modal';

interface Dog {
  id: string;
  name: string;
  breed: string | null;
  tutorName: string;
  tutorPhone: string;
  createdAt: string;
}

const emptyDog = { name: '', breed: '', tutorName: '', tutorPhone: '' };

export default function Dogs() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyDog);
  const [saving, setSaving] = useState(false);

  const loadDogs = useCallback(async () => {
    try {
      const { data } = await api.get('/dogs');
      setDogs(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDogs(); }, [loadDogs]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyDog);
    setModalOpen(true);
  };

  const openEdit = (dog: Dog) => {
    setEditingId(dog.id);
    setForm({ name: dog.name, breed: dog.breed || '', tutorName: dog.tutorName, tutorPhone: dog.tutorPhone });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/dogs/${editingId}`, form);
      } else {
        await api.post('/dogs', form);
      }
      setModalOpen(false);
      loadDogs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cão?')) return;
    try {
      await api.delete(`/dogs/${id}`);
      loadDogs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao excluir');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Cães</h1>
        <button onClick={openCreate} className="btn-primary px-4 py-2 rounded-md text-sm">
          Cadastrar Cão
        </button>
      </div>

      {loading ? (
        <div className="card loading h-48" />
      ) : dogs.length === 0 ? (
        <div className="card empty-state">
          <p className="empty-state-title">Nenhum cão cadastrado</p>
          <p className="empty-state-description">Clique em "Cadastrar Cão" para adicionar o primeiro.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Raça</th>
                <th>Tutor</th>
                <th>Telefone</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {dogs.map((dog) => (
                <tr key={dog.id}>
                  <td className="font-medium">{dog.name}</td>
                  <td>{dog.breed || '-'}</td>
                  <td>{dog.tutorName}</td>
                  <td>{dog.tutorPhone}</td>
                  <td className="text-right space-x-2">
                    <button onClick={() => openEdit(dog)} className="text-primary text-sm hover:underline">Editar</button>
                    <button onClick={() => handleDelete(dog.id)} className="text-red-600 text-sm hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Cão' : 'Cadastrar Cão'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Nome *</label>
            <input type="text" required className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Raça</label>
            <input type="text" className="form-input" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Nome do Tutor *</label>
            <input type="text" required className="form-input" value={form.tutorName} onChange={(e) => setForm({ ...form, tutorName: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Telefone do Tutor *</label>
            <input type="tel" required className="form-input" value={form.tutorPhone} onChange={(e) => setForm({ ...form, tutorPhone: e.target.value })} />
          </div>
          <button type="submit" disabled={saving} className="w-full btn-primary py-2">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
