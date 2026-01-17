// src/App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage.tsx'; // Assume these components are created
import SignupPage from './SignupPage.tsx';


const App = () => {
  return (
    <Routes>
      {/* Main UI */}
      <Route path="/" element={<Home />} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      {/* <Route path="/contact" element={<Contact />} /> */}
      
      {/* Add a fallback route for "page not found" */}
      <Route path="*" element={<h1>404: Page Not Found</h1>} />
    </Routes>
  )
}
