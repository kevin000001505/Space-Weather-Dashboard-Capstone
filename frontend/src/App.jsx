import "./App.css";
import PlaneTracker from "./PlaneTracker";
import { Sidebar } from "./components/ui/Sidebar";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Charts from "./Charts";
import { Toaster } from "react-hot-toast";
import MenuIcon from "@mui/icons-material/Menu";
import { IconButton } from "@mui/material";
import { useDispatch } from "react-redux";
import { toggleSidebar } from "./store/slices/planesSlice";

function App() {
  const dispatch = useDispatch();
  return (
    <Router>
      <Toaster position="top-center" />
      <Sidebar />
      <Routes>
        <Route path="/" element={<PlaneTracker />} />
        <Route path="/charts" element={<Charts />} />
      </Routes>
    </Router>
  );
}

export default App;
