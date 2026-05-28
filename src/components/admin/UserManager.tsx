import React, { useState, useEffect } from 'react';
import { User, UserFormData } from '../../types';
import { getAllUsers, createUser, updateUser, deleteUser } from '../../services/userService';
import { Plus, Trash2, Edit2, Save, X, Users, Shield } from 'lucide-react';

const UserManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<UserFormData>>({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    isAdmin: false,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch {
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ email: '', firstName: '', lastName: '', password: '', isAdmin: false });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.firstName || !formData.lastName) {
      setError('Tous les champs sont requis');
      return;
    }

    if (!editingId && !formData.password) {
      setError('Le mot de passe est requis pour la création');
      return;
    }

    try {
      if (editingId) {
        await updateUser(editingId, formData);
      } else {
        await createUser(formData as UserFormData);
      }
      await loadUsers();
      resetForm();
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (user: User) => {
    setFormData({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: '', // Don't show password
      isAdmin: user.isAdmin,
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return;
    try {
      await deleteUser(id);
      await loadUsers();
    } catch {
      setError('Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Gestion des Utilisateurs</h2>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Annuler' : 'Nouvel utilisateur'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">{error}</div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Email *</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Mot de passe {editingId ? '(laisser vide pour ne pas changer)' : '*'}</label>
              <input
                type="password"
                value={formData.password || ''}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text focus:ring-2 focus:ring-primary focus:outline-none"
                required={!editingId}
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Prénom *</label>
              <input
                type="text"
                value={formData.firstName || ''}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Nom *</label>
              <input
                type="text"
                value={formData.lastName || ''}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAdmin"
              checked={formData.isAdmin || false}
              onChange={e => setFormData({ ...formData, isAdmin: e.target.checked })}
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="isAdmin" className="text-sm text-text-secondary flex items-center gap-1">
              <Shield className="w-3 h-3" /> Administrateur
            </label>
          </div>
          
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Save className="w-4 h-4" />
              {editingId ? 'Mettre à jour' : 'Créer'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-surface-secondary text-text-secondary rounded-lg hover:bg-surface-tertiary transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Users List */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-secondary">Chargement...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">Aucun utilisateur</div>
        ) : (
          <table className="w-full">
            <thead className="bg-surface-secondary">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Utilisateur</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Rôle</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Créé</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-surface-secondary/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-text">
                      {user.firstName} {user.lastName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.isAdmin ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                        <Shield className="w-3 h-3" /> Admin
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-surface-secondary text-text-secondary text-xs rounded-full">
                        Utilisateur
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UserManager;
