import React, { useState, useEffect } from 'react';
import { Users, UserPlus, ShieldAlert, ToggleLeft, ToggleRight } from 'lucide-react';
import { apiRequest } from '../lib/api';

export default function Settings() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New user form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('STAFF');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/users');
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !fullName.trim()) return;
    setLoading(true);

    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, fullName, role }),
      });
      setUsername('');
      setPassword('');
      setFullName('');
      setRole('STAFF');
      fetchUsers();
      alert('User created successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: number, currentActive: boolean) => {
    try {
      await apiRequest(`/users/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Add User Form */}
      <div className="md:col-span-1 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <UserPlus className="text-primary" />
          Register New Staff
        </h2>
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Username / Login ID</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. john.doe"
              required
              className="w-full bg-muted border border-border focus:border-primary rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-muted border border-border focus:border-primary rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              required
              className="w-full bg-muted border border-border focus:border-primary rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Role Type</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-muted border border-border focus:border-primary rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
            >
              <option value="STAFF">ICT Staff</option>
              <option value="DIRECTOR">ICT Director</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
          >
            Create Account
          </button>
        </form>
      </div>

      {/* User Directory */}
      <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="text-emerald-500" />
          Department Directory
        </h2>
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <th className="p-3">Full Name</th>
                <th className="p-3">Role</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-3">
                    <div className="font-semibold text-xs">{u.fullName}</div>
                    <div className="text-[10px] text-muted-foreground">@{u.username}</div>
                  </td>
                  <td className="p-3">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                      u.role === 'SUPER_ADMIN'
                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        : u.role === 'DIRECTOR'
                        ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleToggleStatus(u.id, u.active)}
                      className="p-1 text-muted-foreground hover:text-primary transition-all"
                      title={u.active ? 'Deactivate User' : 'Activate User'}
                    >
                      {u.active ? (
                        <ToggleRight className="text-primary" size={24} />
                      ) : (
                        <ToggleLeft size={24} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
