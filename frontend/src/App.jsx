import { useState } from 'react'
import './App.css'
import PlaneTracker from './PlaneTracker'
import { Sidebar } from './components/ui/Sidebar';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Charts from './Charts';

function App() {
  const [count, setCount] = useState(0)
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  return (
    <Router>
        <Sidebar />
          <Routes>
            <Route path="/" element={<PlaneTracker />} />
            <Route path="/charts" element={<Charts />} />
          </Routes>
    </Router>
  )
}

export default App
