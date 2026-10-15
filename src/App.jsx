import { useState } from 'react'
import './App.css'
import { Route, Routes } from 'react-router-dom'
import Login from './pages/login/Login'
import Home from './pages/home/Home'
import MainLayout from './components/MainLayout'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Login />} />

        <Route element={<MainLayout />}>
        <Route path="/welcome" element={<Home />} />
        </Route>

      </Routes>
    </div>
  )
}

export default App
