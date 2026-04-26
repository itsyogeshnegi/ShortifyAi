import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isDuplicateEmail, setIsDuplicateEmail] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setIsDuplicateEmail(false);
    try {
      await register(form.name, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.status === 409) {
        setIsDuplicateEmail(true);
        setError('That email already has an account. Please log in instead.');
        return;
      }

      setError(err.response?.data?.message || 'Registration failed.');
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <form onSubmit={submit} className="glass w-full max-w-md rounded-[2rem] p-7">
        <h1 className="font-display text-3xl font-bold">Build your studio</h1>
        <p className="mt-2 text-frost/60">A private, local-first AI shorts setup.</p>
        <div className="mt-6 grid gap-4">
          <input className="field" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="field" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="field" placeholder="Password (8+ chars)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        {error && (
          <div className="mt-4 rounded-2xl bg-ember/15 p-3 text-sm text-ember">
            <p>{error}</p>
            {isDuplicateEmail && (
              <Link
                className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-extrabold text-ink"
                to="/login"
                state={{ email: form.email }}
              >
                Go to login
              </Link>
            )}
          </div>
        )}
        <button className="btn-primary mt-6 w-full">Create account</button>
        <p className="mt-5 text-center text-sm text-frost/60">Already have one? <Link className="font-bold text-mint" to="/login">Login</Link></p>
      </form>
    </main>
  );
}
