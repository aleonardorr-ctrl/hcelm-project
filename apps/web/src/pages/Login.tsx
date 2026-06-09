import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('admin@amehealth.pe');
  const [password, setPassword] = useState('AME2026');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ruc: '20611138777', 
          email, 
          password 
        })
      });

      if (res.ok) {
        const data = await res.json();

const token = data.access_token || data.accessToken || data.token;

console.log('✅ Respuesta completa del backend:', data);
console.log('✅ Token detectado:', token);

if (!token) {
  setError('El backend respondió, pero no envió token válido.');
  return;
}

localStorage.setItem('ame_token', token);
console.log('✅ Token guardado en localStorage:', localStorage.getItem('ame_token'));

navigate('/'); 
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || 'Credenciales inválidas.');
      }
    } catch (err) {
      console.error('❌ Error de conexión:', err);
      setError('Error de conexión. Verifique que el backend esté activo.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-emerald-700">🏥 AME HEALTH SAC</h1>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Usuario (Email)</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-2 rounded mt-1" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border p-2 rounded mt-1" required />
          </div>
          <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700">Ingresar</button>
        </form>
      </div>
    </div>
  );
}