import { useState } from 'react'
import './App.css'
import PlaneTracker from './PlaneTracker'

function App() {
  const [count, setCount] = useState(0)
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  return (
    <div className='App'>
      <PlaneTracker/>
    </div>
  )
}

export default App
