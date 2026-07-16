import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Routes>
      <Route path="/" element={<div className="p-8 text-center text-2xl font-bold">FitManager</div>} />
    </Routes>
  )
}

export default App
