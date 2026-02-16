
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import CustomerSearch from './pages/CustomerSearch';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-ivory-white font-sans">
        <Navbar />
        <main className="container mx-auto py-8">
          <Routes>
            <Route path="/" element={<CustomerSearch />} />
            <Route path="/owner" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
