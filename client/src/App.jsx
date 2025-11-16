import { Routes, Route } from 'react-router-dom';
import TemplateEditor from './pages/TemplateEditor';
import InvoiceSelection from './pages/InvoiceSelection';

function App() {
  return (
    <Routes>
      <Route path="/editor" element={<TemplateEditor />} />
      <Route path="/invoice" element={<InvoiceSelection />} />
      <Route path="*" element={<InvoiceSelection />} />
    </Routes>
  );
}

export default App;