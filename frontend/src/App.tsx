import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LegoSetList from './pages/LegoSetList';
import LegoSetForm from './pages/LegoSetForm';
import LegoSetView from './pages/LegoSetView';

const App: React.FC = () => {
  return (
    <ToastProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sets" element={<LegoSetList />} />
            <Route path="/add" element={<LegoSetForm />} />
            <Route path="/view/:id" element={<LegoSetView />} />
            <Route path="/edit/:id" element={<LegoSetForm />} />
          </Routes>
        </Layout>
      </Router>
    </ToastProvider>
  );
};

export default App;
