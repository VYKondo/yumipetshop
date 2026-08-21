import { useState } from 'react';
import { useAuth } from '../lib/auth-context';

export default function Login() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [petshopName, setPetshopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [petshopPhone, setPetshopPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register({ petshopName, petshopPhone, ownerName, email, password });
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-primary mb-2 text-center">
          PetShop Manager
        </h1>
        <p className="text-center text-sm text-gray-500 mb-6">
          {isRegister ? 'Crie sua conta' : 'Entre na sua conta'}
        </p>

        {error && (
          <div className="error-state mb-4">
            <p className="error-state-title">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="form-label">Nome do Petshop</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={petshopName}
                  onChange={(e) => setPetshopName(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Seu Nome</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Telefone do Petshop</label>
                <input
                  type="tel"
                  className="form-input"
                  value={petshopPhone}
                  onChange={(e) => setPetshopPhone(e.target.value)}
                />
              </div>
            </>
          )}
          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              required
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-2"
          >
            {loading ? 'Carregando...' : isRegister ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          {isRegister ? 'Já tem conta?' : 'Não tem conta?'}{' '}
          <button
            type="button"
            className="text-primary font-medium hover:underline"
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
          >
            {isRegister ? 'Entrar' : 'Cadastre-se'}
          </button>
        </p>
      </div>
    </div>
  );
}
