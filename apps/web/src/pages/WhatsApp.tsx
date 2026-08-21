import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import Modal from '../components/Modal';

interface Template {
  id: string;
  name: string;
  content: string;
  active: boolean;
}

const emptyTemplate = { name: '', content: '', active: true };

export default function WhatsApp() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyTemplate);
  const [saving, setSaving] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      const { data } = await api.get('/whatsapp/templates');
      setTemplates(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyTemplate);
    setModalOpen(true);
  };

  const openEdit = (tpl: Template) => {
    setEditingId(tpl.id);
    setForm({ name: tpl.name, content: tpl.content, active: tpl.active });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/whatsapp/templates/${editingId}`, form);
      } else {
        await api.post('/whatsapp/templates', form);
      }
      setModalOpen(false);
      loadTemplates();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;
    try {
      await api.delete(`/whatsapp/templates/${id}`);
      loadTemplates();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao excluir');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">WhatsApp</h1>
        <button onClick={openCreate} className="btn-primary px-4 py-2 rounded-md text-sm">
          Novo Template
        </button>
      </div>

      <div className="card">
        <h2 className="card-title">Templates de Mensagem</h2>
        <p className="text-sm text-gray-500 mb-4">
          Configure os templates de mensagem enviados como lembretes de agendamento.
          Use {'{tutorName}'}, {'{dogName}'}, {'{serviceName}'}, {'{date}'} e {'{time}'} como variáveis.
        </p>

        {loading ? (
          <div className="loading h-24" />
        ) : templates.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">Nenhum template cadastrado</p>
            <p className="empty-state-description">Clique em "Novo Template" para criar o primeiro.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((tpl) => (
              <div key={tpl.id} className="border rounded-lg p-4 flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-800">{tpl.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${tpl.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {tpl.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{tpl.content}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => openEdit(tpl)} className="text-primary text-sm hover:underline">Editar</button>
                  <button onClick={() => handleDelete(tpl.id)} className="text-red-600 text-sm hover:underline">Excluir</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Template' : 'Novo Template'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Nome *</label>
            <input type="text" required className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Conteúdo *</label>
            <textarea required rows={6} className="form-input" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Olá {tutorName}! Lembrete: {dogName} tem um {serviceName} agendado para {date} às {time}."
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            <label htmlFor="active" className="text-sm text-gray-700">Ativo</label>
          </div>
          <button type="submit" disabled={saving} className="w-full btn-primary py-2">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
