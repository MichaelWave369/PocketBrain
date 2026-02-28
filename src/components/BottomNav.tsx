import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Chat' },
  { to: '/memory', label: 'Memory' },
  { to: '/settings', label: 'Settings' }
];

export const BottomNav = () => (
  <nav className="bottom-nav" aria-label="Primary">
    {links.map((link) => (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.to === '/'}
        className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}
      >
        {link.label}
      </NavLink>
    ))}
  </nav>
);
