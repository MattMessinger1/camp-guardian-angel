import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function RedirectToCaptchaTest() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/captcha-workflow-test');
  }, [navigate]);
  
  return <div>Redirecting to CAPTCHA test...</div>;
}