import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Home from './pages/Home';
import Meeting from './pages/Meeting';
import './index.css';
import { Divide } from 'lucide-react';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home/>}/>
            <Route path="/meeting" element={<Meeting/>}/>
          </Routes>
        </div>
      </Router>
    </ThemeProvider>


    
  );
}

export default App;