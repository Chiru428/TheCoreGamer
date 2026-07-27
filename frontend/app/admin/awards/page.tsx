"use client";

import React, { useState, useEffect } from 'react';
import { fetchAdminAwards, createAward, updateAward, deleteAward } from '@/lib/api';
import { Award } from '@/types';
import { Trophy, Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminAwardsPage() {
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAward, setEditingAward] = useState<Award | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    category: '',
    year: new Date().getFullYear(),
    winnerGameId: '',
    isVotingOpen: false,
    nomineesJson: '[]',
  });

  const loadAwards = async () => {
    setLoading(true);
    const res = await fetchAdminAwards(yearFilter);
    if (res.success && res.data) {
      setAwards(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAwards();
  }, [yearFilter]);

  const openModal = (award?: Award) => {
    if (award) {
      setEditingAward(award);
      setFormData({
        category: award.category,
        year: award.year,
        winnerGameId: award.winnerGameId || '',
        isVotingOpen: award.isVotingOpen,
        nomineesJson: typeof award.nomineesJson === 'string' ? award.nomineesJson : JSON.stringify(award.nomineesJson, null, 2),
      });
    } else {
      setEditingAward(null);
      setFormData({
        category: '',
        year: yearFilter,
        winnerGameId: '',
        isVotingOpen: false,
        nomineesJson: '[]',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate JSON
      const parsedNominees = JSON.parse(formData.nomineesJson);
      
      const payload = {
        category: formData.category,
        year: formData.year,
        winnerGameId: formData.winnerGameId || null,
        isVotingOpen: formData.isVotingOpen,
        nomineesJson: parsedNominees,
      };

      let res;
      if (editingAward) {
        res = await updateAward(editingAward.id, payload);
      } else {
        res = await createAward(payload);
      }

      if (res.success) {
        setIsModalOpen(false);
        loadAwards();
      } else {
        alert(`Error: ${res.error}`);
      }
    } catch (err) {
      alert("Invalid JSON in nominees field.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this award category?')) {
      const res = await deleteAward(id);
      if (res.success) {
        loadAwards();
      } else {
        alert(`Failed to delete: ${res.error}`);
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight flex items-center">
            <Trophy className="w-8 h-8 mr-3 text-primary" />
            Awards Management
          </h1>
          <p className="text-gray-400 mt-1">Manage Game of the Year awards categories and nominees.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-primary text-black px-4 py-2 font-bold uppercase text-sm hover:bg-primary/90 flex items-center"
        >
          <Plus className="w-4 h-4 mr-1" /> New Award
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 p-4 mb-6 flex items-center gap-4">
        <label className="font-bold text-gray-300">Filter by Year:</label>
        <select 
          value={yearFilter}
          onChange={(e) => setYearFilter(parseInt(e.target.value))}
          className="bg-gray-800 border border-gray-700 text-white px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        >
          {[...Array(5)].map((_, i) => {
            const y = new Date().getFullYear() + 1 - i;
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>
        
        <Link href={`/awards/${yearFilter}`} target="_blank" className="text-primary hover:underline text-sm ml-auto">
          View Public Page →
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading awards...</div>
      ) : awards.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 border border-gray-800 text-gray-400">
          No awards found for {yearFilter}.
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800 text-gray-300 border-b border-gray-700">
                <th className="p-4 font-bold uppercase text-xs">Category</th>
                <th className="p-4 font-bold uppercase text-xs">Winner</th>
                <th className="p-4 font-bold uppercase text-xs">Voting Open</th>
                <th className="p-4 font-bold uppercase text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {awards.map((award) => (
                <tr key={award.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="p-4 font-medium text-white">{award.category}</td>
                  <td className="p-4 text-gray-400">
                    {award.winnerGame ? (
                      <span className="text-primary font-bold">{award.winnerGame.title}</span>
                    ) : (
                      "None"
                    )}
                  </td>
                  <td className="p-4">
                    {award.isVotingOpen ? (
                      <span className="inline-flex items-center text-green-400"><CheckCircle className="w-4 h-4 mr-1"/> Yes</span>
                    ) : (
                      <span className="inline-flex items-center text-red-400"><XCircle className="w-4 h-4 mr-1"/> No</span>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => openModal(award)}
                      className="p-2 bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(award.id)}
                      className="p-2 bg-red-900/20 border border-red-900/50 text-red-400 hover:bg-red-900/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
              <h2 className="text-xl font-bold uppercase">
                {editingAward ? 'Edit Award' : 'Create Award'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-400 uppercase mb-2">Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                    className="w-full bg-gray-800 border border-gray-700 px-4 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-400 uppercase mb-2">Category Name</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    placeholder="e.g. Game of the Year"
                    className="w-full bg-gray-800 border border-gray-700 px-4 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isVotingOpen}
                    onChange={e => setFormData({...formData, isVotingOpen: e.target.checked})}
                    className="w-5 h-5 accent-primary bg-gray-800 border-gray-700"
                  />
                  <span className="text-white font-medium">Voting is Open</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-8">Allows public users to cast votes.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase mb-2">Winner Game ID (Optional)</label>
                <input
                  type="text"
                  value={formData.winnerGameId}
                  onChange={e => setFormData({...formData, winnerGameId: e.target.value})}
                  placeholder="Paste Game ID when announcing winner"
                  className="w-full bg-gray-800 border border-gray-700 px-4 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase mb-2">
                  Nominees (JSON)
                </label>
                <textarea
                  value={formData.nomineesJson}
                  onChange={e => setFormData({...formData, nomineesJson: e.target.value})}
                  rows={8}
                  className="w-full bg-gray-800 border border-gray-700 px-4 py-2 text-white font-mono text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  placeholder={'[\n  { "gameId": "...", "title": "Game A", "coverImageUrl": "..." }\n]'}
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Provide a JSON array of nominee objects. Must include at least <code>gameId</code> and <code>title</code>.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 border border-gray-700 text-gray-300 hover:bg-gray-800 uppercase font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-black hover:bg-primary/90 uppercase font-bold text-sm"
                >
                  Save Award
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
