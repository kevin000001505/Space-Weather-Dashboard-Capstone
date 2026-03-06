import './App.css'
import PlaneTracker from './PlaneTracker'
import { Sidebar } from './components/ui/Sidebar';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Charts from './Charts';

function App() {
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
