import { Outlet } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';

export const AppLayout = () => (
  <div className="app-shell">
    <header className="app-header">
      <h1>PocketBrain</h1>
      <p>Your local-first memory assistant</p>
    </header>
    <main className="app-main">
      <Outlet />
    </main>
    <BottomNav />
  </div>
);
