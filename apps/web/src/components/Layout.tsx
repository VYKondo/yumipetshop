import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/dogs', label: 'Cães' },
  { to: '/services', label: 'Serviços' },
  { to: '/appointments', label: 'Agendamentos' },
  { to: '/reports', label: 'Relatórios' },
  { to: '/whatsapp', label: 'WhatsApp' },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="container py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold">PetShop Manager</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/80">{user?.email}</span>
            <button
              onClick={logout}
              className="text-sm text-white/80 hover:text-white transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b sticky top-0 z-40">
        <div className="container flex gap-1 overflow-x-auto py-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 container py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-4">
        <div className="container text-center text-sm text-gray-500">
          PetShop Manager &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
