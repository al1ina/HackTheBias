// src/App.js
// 
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage.tsx'; // Assume these components are created
import SignupPage from './SignupPage.tsx';
import ResetPasswordPage from './ResetPasswordPage.tsx'
import VerifyEmailPage from './VerifyEmailPage.tsx';
import Home from './Home.tsx'
import Beginner from './Beginner.tsx'


const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/home" element={<Home />}/>
      <Route path="/beginner" element={<Beginner />}/>
      <Route path="*" element={<h1>404: Page Not Found</h1>} />
    </Routes>
  );
};

export default App;