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
import CameraTest from './CameraTest';
import CameraQuizPage from './CameraQuizPage';


const App = () => {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/home" element={<Home />}/>
      <Route path="/camera-test" element={<CameraTest />}/>
      <Route path="/camera-quiz" element={<CameraQuizPage />}/>
      <Route path="/beginner-levels" element={<BeginnerLevels tierType="beginner" />}/>
      <Route path="/intermediate-levels" element={<BeginnerLevels tierType="intermediate" />}/>
      <Route path="/expert-levels" element={<BeginnerLevels tierType="expert" />}/>
      <Route path="/pro-levels" element={<BeginnerLevels tierType="pro" />}/>
      <Route path="/beginner" element={<Beginner tierType="beginner" />}/>
      <Route path="/intermediate" element={<Beginner tierType="intermediate" />}/>
      <Route path="/expert" element={<Beginner tierType="expert" />}/>
      <Route path="/pro" element={<Beginner tierType="pro" />}/>
      <Route path="*" element={<h1>404: Page Not Found</h1>} />
    </Routes>
  );
};

export default App;