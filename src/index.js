import '@fortawesome/fontawesome-free/css/all.min.css'; // Importa o CSS do Font Awesome
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Importa estilos globais básicos
import App from './App'; // Importa o componente principal da aplicação
import reportWebVitals from './reportWebVitals'; // Função para métricas de performance (opcional)

// Cria a raiz da aplicação React no elemento com id 'root' no HTML
const root = ReactDOM.createRoot(document.getElementById('root'));

// Renderiza o componente App dentro da raiz
root.render(
  // <React.StrictMode> // <-- StrictMode comentado para teste
    <App />
  // </React.StrictMode> // <-- StrictMode comentado para teste
);

// Se você quiser medir a performance no seu app, passe uma função
// para logar resultados (por exemplo: reportWebVitals(console.log))
// ou envie para um endpoint de analytics. Saiba mais: https://bit.ly/CRA-vitals
reportWebVitals();