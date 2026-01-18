// src/App.js
// 
import { Routes, Route } from 'react-router-dom';
import WelcomePage from './WelcomePage';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import ResetPasswordPage from './ResetPasswordPage';
import VerifyEmailPage from './VerifyEmailPage';
import Home from './Home';
import Beginner from './Beginner';
import BeginnerLevels from './BeginnerLevels';


const App = () => {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/home" element={<Home />}/>
      <Route path="/beginner-levels" element={<BeginnerLevels />}/>
      <Route path="/beginner" element={<Beginner />}/>
      <Route path="*" element={<h1>404: Page Not Found</h1>} />
    </Routes>
  );
};

export default App;