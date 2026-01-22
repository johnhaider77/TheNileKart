import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

type ResetMethod = 'email' | 'phone';
type Step = 'method' | 'input' | 'code' | 'password';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('method');
  const [resetMethod, setResetMethod] = useState<ResetMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Format phone number for display (UAE format)
  const formatPhoneDisplay = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (clean.startsWith('971')) {
      const number = clean.slice(3);
      return `+971 ${number.slice(0, 1)} ${number.slice(1, 4)} ${number.slice(4)}`;
    }
    return phone;
  };

  // Validate UAE phone number
  const isValidUAEPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    // UAE mobile formats:
    // - +971505523717 (971 + 9 digits starting with 5,6,7,9)
    // - 0505523717 (10 digits starting with 05,06,07,09) 
    // - 505523717 (9 digits starting with 5,6,7,9)
    return /^(971[5679]\d{8}|0[5679]\d{8}|[5679]\d{8})$/.test(clean);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let response;
      if (resetMethod === 'email') {
        response = await api.post('/auth/forgot-password', { email });
      } else {
        if (!isValidUAEPhone(phone)) {
          setError('Please enter a valid UAE phone number (e.g., +971501234567 or 0501234567)');
          setLoading(false);
          return;
        }
        response = await api.post('/auth/forgot-password-mobile', { phone });
      }
      
      if (response.data.success) {
        setSuccess(
          resetMethod === 'email' 
            ? 'Verification code sent to your email' 
            : 'OTP sent to your mobile phone'
        );
        setStep('code');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/verify-reset-code', { 
        email: resetMethod === 'email' ? email : undefined,
        phone: resetMethod === 'phone' ? phone : undefined,
        code,
        resetType: resetMethod
      });
      if (response.data.success) {
        setSuccess('Code verified successfully');
        setStep('password');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/reset-password', {
        email: resetMethod === 'email' ? email : undefined,
        phone: resetMethod === 'phone' ? phone : undefined,
        code,
        newPassword,
        resetType: resetMethod
      });
      if (response.data.success) {
        setSuccess('Password reset successfully');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError(null);

    try {
      let response;
      if (resetMethod === 'email') {
        response = await api.post('/auth/forgot-password', { email });
      } else {
        response = await api.post('/auth/forgot-password-mobile', { phone });
      }
      
      if (response.data.success) {
        setSuccess(
          resetMethod === 'email' 
            ? 'New verification code sent to your email' 
            : 'New OTP sent to your mobile phone'
        );
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to resend verification code');
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'method': return 'Choose Reset Method';
      case 'input': return resetMethod === 'email' ? 'Enter Email' : 'Enter Phone Number';
      case 'code': return 'Enter Verification Code';
      case 'password': return 'Reset Password';
      default: return 'Forgot Password';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'method': return 'Choose how you would like to receive your password reset code';
      case 'input': 
        return resetMethod === 'email' 
          ? 'Enter your email address to receive a verification code'
          : 'Enter your UAE mobile number to receive an OTP';
      case 'code': 
        return resetMethod === 'email'
          ? 'Check your email and enter the verification code'
          : 'Check your mobile phone and enter the OTP';
      case 'password': return 'Enter your new password';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {getStepTitle()}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {getStepDescription()}
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <span>{success}</span>
          </div>
        )}

        {/* Step 1: Choose reset method */}
        {step === 'method' && (
          <div className="mt-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                   onClick={() => setResetMethod('email')}>
                <input
                  type="radio"
                  name="resetMethod"
                  value="email"
                  checked={resetMethod === 'email'}
                  onChange={(e) => setResetMethod(e.target.value as ResetMethod)}
                  className="radio radio-primary"
                />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Email Address</h3>
                  <p className="text-sm text-gray-600">Receive verification code via email</p>
                </div>
                <span className="text-2xl">📧</span>
              </div>

              <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                   onClick={() => setResetMethod('phone')}>
                <input
                  type="radio"
                  name="resetMethod"
                  value="phone"
                  checked={resetMethod === 'phone'}
                  onChange={(e) => setResetMethod(e.target.value as ResetMethod)}
                  className="radio radio-primary"
                />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Mobile Phone</h3>
                  <p className="text-sm text-gray-600">Receive OTP via SMS (UAE numbers)</p>
                </div>
                <span className="text-2xl">📱</span>
              </div>
            </div>

            <button
              onClick={() => setStep('input')}
              className="btn btn-primary w-full"
            >
              Continue
            </button>

            <div className="text-center">
              <Link to="/login" className="text-primary hover:underline">
                Back to Login
              </Link>
            </div>
          </div>
        )}

        {/* Step 2: Enter email or phone */}
        {step === 'input' && (
          <form className="mt-8 space-y-6" onSubmit={handleSendCode}>
            <div>
              {resetMethod === 'email' ? (
                <>
                  <label htmlFor="email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input input-bordered w-full"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </>
              ) : (
                <>
                  <label htmlFor="phone" className="sr-only">
                    Phone number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    className="input input-bordered w-full"
                    placeholder="UAE Phone number (e.g., +971501234567 or 0501234567)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    UAE mobile numbers starting with 05, 06, 07, or 09
                  </p>
                </>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? 'Sending...' : resetMethod === 'email' ? 'Send Verification Code' : 'Send OTP'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setStep('method')}
                className="text-gray-600 hover:underline"
              >
                Choose Different Method
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Enter verification code */}
        {step === 'code' && (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyCode}>
            <div>
              <label htmlFor="code" className="sr-only">
                Verification Code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                required
                className="input input-bordered w-full text-center text-2xl tracking-widest"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading}
                maxLength={6}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="btn btn-primary w-full"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                className="text-primary hover:underline"
              >
                Resend Code
              </button>
              <br />
              <button
                type="button"
                onClick={() => setStep('input')}
                className="text-gray-600 hover:underline"
              >
                {resetMethod === 'email' ? 'Change Email Address' : 'Change Phone Number'}
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Reset password */}
        {step === 'password' && (
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="sr-only">
                  New Password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  className="input input-bordered w-full"
                  placeholder="New Password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="input input-bordered w-full"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Password reset for: {resetMethod === 'email' ? email : formatPhoneDisplay(phone)}
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;