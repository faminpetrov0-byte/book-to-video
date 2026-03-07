import { Routes, Route, Link } from 'react-router-dom';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';

export default function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>
          <Link to="/" style={{ textDecoration: 'none' }}>
            🎬 <span>Book-to-Video AI</span>
          </Link>
        </h1>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/project/:id" element={<ProjectDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
