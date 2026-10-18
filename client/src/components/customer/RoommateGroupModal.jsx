import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Users, UserPlus, Pause, Play, Share2, Sparkles, Copy,
  CheckCircle2, AlertCircle, X, Calendar, ShieldCheck, Plus, ArrowLeft, Building2
} from 'lucide-react';

export const RoommateGroupModal = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const { showToast } = useNotification();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSyncPause, setShowSyncPause] = useState(false);
  const [pauseStartDate, setPauseStartDate] = useState('2026-09-20');
  const [pauseEndDate, setPauseEndDate] = useState('2026-09-25');
  const [pauseReason, setPauseReason] = useState('Semester Mid-Term Break');
  const [syncing, setSyncing] = useState(false);

  // Group join/create entry mode: 'menu' | 'join' | 'create'
  const [entryMode, setEntryMode] = useState('menu');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [joining, setJoining] = useState(false);

  // Create squad state
  const [podNameInput, setPodNameInput] = useState('');
  const [selectedMessId, setSelectedMessId] = useState('');
  const [messes, setMesses] = useState([]);
  const [creating, setCreating] = useState(false);

  const fetchGroup = async () => {
    if (!currentUser?.id) {
      setGroup(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getUserGroup(currentUser.id);
      if (res && res.group) {
        setGroup(res.group);
      } else {
        setGroup(null);
      }
    } catch (e) {
      console.warn('[RoommateGroupModal] Error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGroup();
      setEntryMode('menu');
      api.getMesses().then(res => {
        const list = res?.messes || (Array.isArray(res) ? res : []);
        setMesses(list);
        if (list.length > 0) {
          setSelectedMessId(prev => prev || list[0].id);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyCode = (code) => {
    navigator.clipboard?.writeText(code);
    showToast(`Invite code ${code} copied to clipboard!`, 'info', '📋 Copied');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) {
      showToast('Please sign in as a student to create a pod.', 'info');
      return;
    }
    if (!selectedMessId) {
      showToast('Please select a mess for your squad.', 'error');
      return;
    }
    setCreating(true);
    try {
      const res = await api.createGroup({
        name: podNameInput?.trim() || `${currentUser.name || 'Student'}'s Squad`,
        adminUserId: currentUser.id,
        messId: selectedMessId
      });

      if (res && res.success) {
        showToast(res.message || 'Mess Pod created successfully!', 'success', '🎉 Pod Created');
        fetchGroup();
        setEntryMode('menu');
        setPodNameInput('');
      } else {
        showToast(res?.message || 'Failed to create pod', 'error');
      }
    } catch (err) {
      showToast('Failed to create pod. Try again.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleSyncPause = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    setSyncing(true);
    try {
      const res = await api.syncGroupPause(group.id, {
        startDate: pauseStartDate,
        endDate: pauseEndDate,
        reason: pauseReason,
        daysCount: 5,
        pausedByUserId: currentUser.id
      });

      if (res && res.success) {
        showToast(`Synchronized vacation pause activated for all ${res.syncRecord.membersAffected} roommates!`, 'success', '🏖️ Pod Vacation Paused');
        fetchGroup();
        setShowSyncPause(false);
      }
    } catch (e) {
      showToast('Failed to activate synchronized pause', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) {
      showToast('Please sign in as a student to join a pod.', 'info');
      return;
    }
    setJoining(true);
    try {
      const res = await api.joinGroup({
        inviteCode: inviteCodeInput,
        userId: currentUser.id
      });

      if (res && res.success) {
        showToast(res.message || 'Successfully joined the pod!', 'success', '🤝 Squad Joined');
        fetchGroup();
        setEntryMode('menu');
        setInviteCodeInput('');
      } else {
        showToast(res?.message || 'Invalid invite code or pod not found', 'error');
      }
    } catch (e) {
      showToast('Failed to join group', 'error');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 pb-4 bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3 text-purple-300" />
              Mess Pods (Phase 3)
            </span>
          </div>

          <h2 className="text-lg font-extrabold text-white">
            {group?.name || 'Roommate Mess Squad'}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Flatmate pooling: synchronized vacation pauses, live status & meal sharing.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading squad roster...</div>
          ) : group ? (
            <>
              {/* Pod Summary Card */}
              <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Shared Mess</span>
                    <h4 className="font-bold text-slate-900 text-xs">{group.messName}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Group Code</span>
                    <button
                      onClick={() => handleCopyCode(group.inviteCode)}
                      className="flex items-center gap-1 font-mono font-black text-sm text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200"
                    >
                      <span>{group.inviteCode}</span>
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Roommate Roster */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span>Roommate Dining Roster ({group.members?.length || 0})</span>
                  <span className="text-[10px] text-slate-400">Live Status</span>
                </div>

                <div className="space-y-2">
                  {group.members?.map((member, idx) => (
                    <div
                      key={member.userId || idx}
                      className="p-3 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-xs">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{member.name}</span>
                            {member.role === 'Pod Leader' && (
                              <span className="text-[9px] bg-slate-900 text-white px-1.5 py-0.2 rounded-md font-bold">
                                Leader
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">{member.planName}</div>
                        </div>
                      </div>

                      <div>
                        {member.diningStatus === 'ON_VACATION' ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                            🏖️ On Vacation
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                            🍛 Eating Today
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Synchronized Group Vacation Pause Card */}
              <div className="p-4 rounded-3xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-700" />
                    <span className="font-bold text-xs text-indigo-950">Synchronized Group Pause</span>
                  </div>
                  <button
                    onClick={() => setShowSyncPause(!showSyncPause)}
                    className="text-[11px] font-bold text-indigo-700 hover:underline"
                  >
                    {showSyncPause ? 'Hide' : 'Set Vacation'}
                  </button>
                </div>

                <p className="text-[11px] text-indigo-900 leading-tight">
                  Travelling home for Diwali or exams together? Pause all roommate meal passes in 1 click so no one loses days!
                </p>

                {showSyncPause && (
                  <form onSubmit={handleSyncPause} className="space-y-3 pt-2 border-t border-indigo-200 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">Start Date</label>
                        <input
                          type="date"
                          value={pauseStartDate}
                          onChange={e => setPauseStartDate(e.target.value)}
                          className="w-full p-2 bg-white rounded-xl border border-indigo-200 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">End Date</label>
                        <input
                          type="date"
                          value={pauseEndDate}
                          onChange={e => setPauseEndDate(e.target.value)}
                          className="w-full p-2 bg-white rounded-xl border border-indigo-200 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">Holiday Reason</label>
                      <input
                        type="text"
                        value={pauseReason}
                        onChange={e => setPauseReason(e.target.value)}
                        placeholder="e.g. Diwali Vacation"
                        className="w-full p-2 bg-white rounded-xl border border-indigo-200 text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={syncing}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>{syncing ? 'Pausing Squad...' : 'Pause Passes for All Roommates'}</span>
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="py-4 space-y-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-100 shadow-xs">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Roommate Mess Pod</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Team up with 2–4 flatmates for synchronized vacation pauses, live status tracking, and buddy meal gifting.
                </p>
              </div>

              {entryMode === 'create' ? (
                <form onSubmit={handleCreate} className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-800">Start a New Mess Pod</span>
                    <button
                      type="button"
                      onClick={() => setEntryMode('menu')}
                      className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" /> Back
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Squad / Flat Name</label>
                    <input
                      type="text"
                      required
                      value={podNameInput}
                      onChange={e => setPodNameInput(e.target.value)}
                      placeholder="e.g. Flat 302 Squad"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Shared Mess</label>
                    <select
                      value={selectedMessId}
                      onChange={e => setSelectedMessId(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      {messes.length === 0 ? (
                        <option value="">Loading available messes...</option>
                      ) : (
                        messes.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.location || 'Pune'})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={creating || !selectedMessId}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{creating ? 'Creating Squad...' : 'Create Squad & Get Invite Code'}</span>
                  </button>
                </form>
              ) : entryMode === 'join' ? (
                <form onSubmit={handleJoin} className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-800">Join Roommate's Pod</span>
                    <button
                      type="button"
                      onClick={() => setEntryMode('menu')}
                      className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" /> Back
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Pod Invite Code</label>
                    <input
                      type="text"
                      required
                      value={inviteCodeInput}
                      onChange={e => setInviteCodeInput(e.target.value)}
                      placeholder="e.g. POD402"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase text-center tracking-wider font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Ask your roommate (Pod Leader) for their 6-character code.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={joining || !inviteCodeInput.trim()}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{joining ? 'Joining Pod...' : 'Join Roommate Pod'}</span>
                  </button>
                </form>
              ) : (
                <div className="space-y-2.5 pt-2">
                  <button
                    onClick={() => setEntryMode('create')}
                    className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-between hover:from-purple-700 hover:to-indigo-700 transition shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 text-left">
                      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-bold">Create a New Mess Pod</div>
                        <div className="text-[10px] text-purple-200 font-normal">Become Pod Leader & invite flatmates</div>
                      </div>
                    </div>
                    <span className="text-xs">➔</span>
                  </button>

                  <button
                    onClick={() => setEntryMode('join')}
                    className="w-full p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between hover:bg-slate-50 hover:border-purple-300 transition shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 text-left">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold">Join Pod with Code</div>
                        <div className="text-[10px] text-slate-500 font-normal">Enter roommate's invite code</div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">➔</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
