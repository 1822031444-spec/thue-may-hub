import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { isDesktop } from './lib/desktop';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

// Service worker chỉ phục vụ bản web. Trong app desktop, file đã nằm sẵn trên máy
// nên thêm một lớp cache nữa chỉ tạo nguy cơ hiển thị bản cũ sau khi cập nhật.
if (import.meta.env.PROD && !isDesktop && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}
