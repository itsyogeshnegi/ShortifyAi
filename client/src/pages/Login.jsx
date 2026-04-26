import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: location.state?.email || '', password: '' });
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <form onSubmit={submit} className="glass w-full max-w-md rounded-[2rem] p-7">
        <h1 className="font-display text-3xl font-bold">Welcome back</h1>
        <p className="mt-2 text-frost/60">Open your local shorts command center.</p>
        <div className="mt-6 grid gap-4">
          <input className="field" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="field" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        {error && <p className="mt-4 rounded-2xl bg-ember/15 p-3 text-sm text-ember">{error}</p>}
        <button className="btn-primary mt-6 w-full">Login</button>
        <p className="mt-5 text-center text-sm text-frost/60">New here? <Link className="font-bold text-mint" to="/register">Create account</Link></p>
      </form>
    </main>
  );
}
