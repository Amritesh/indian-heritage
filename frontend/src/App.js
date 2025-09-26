import './index.css';
import CollectionDetail from './CollectionDetail';
import MyCollections from './MyCollections';
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="min-h-screen bg-cream">
      <Routes>
        <Route path="/" element={<MyCollections />} />
        <Route path="/collections/:id" element={<CollectionDetail />} />
      </Routes>
    </div>
  )
}

export default App;
