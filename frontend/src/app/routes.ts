import { createBrowserRouter } from 'react-router';
import { Home } from './pages/Home.tsx';
import { Dashboard } from './pages/Dashboard';
import { Simulate } from './pages/Simulate';
import { Forecast } from './pages/Forecast';
import { Zones } from './pages/Zones';
import { History } from './pages/History';
import { RootLayout } from './components/RootLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Home,
  },
  {
    path: '/app',
    Component: RootLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'simulate', Component: Simulate },
      { path: 'forecast', Component: Forecast },
      { path: 'zones', Component: Zones },
      { path: 'history', Component: History },
    ],
  },
]);
