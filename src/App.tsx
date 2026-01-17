// src/App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage.tsx'; // Assume these components are created
import SignupPage from './SignupPage.tsx';
import VerifyPage from './VerifyPage.tsx'


const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<VerifyPage />} />
      <Route path="*" element={<h1>404: Page Not Found</h1>} />
    </Routes>
  );
};

export default App;
