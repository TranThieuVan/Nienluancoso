// src/App.jsx
import React from 'react';
import AppRoutes from './routes'; // Import file router bạn vừa tạo

function App() {
    return (
        <div className="app-container">
            {/* Nếu sau này bạn có Global Modals, Toast Notification thì đặt ở đây */}
            <AppRoutes />
        </div>
    );
}

export default App;