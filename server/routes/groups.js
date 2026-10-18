const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/groups/user - Get active student group/pod
router.get('/user', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.json({ success: true, group: null, allGroups: [] });
  }
  const groups = db.getGroups(userId);
  const activeGroup = groups.length > 0 ? groups[0] : null;

  res.json({
    success: true,
    group: activeGroup,
    allGroups: groups
  });
});

// POST /api/groups/create - Create a new roommate pod
router.post('/create', (req, res) => {
  const { name, adminUserId, messId } = req.body;
  if (!adminUserId || !messId) {
    return res.status(400).json({ success: false, message: 'Missing adminUserId or messId' });
  }
  const group = db.createGroup({
    name: name || 'Flatmate Meal Squad',
    adminUserId,
    messId
  });

  res.status(201).json({
    success: true,
    message: `Mess Pod "${group.name}" created! Share invite code: ${group.inviteCode}`,
    group
  });
});

// POST /api/groups/join - Join a pod with invite code
router.post('/join', (req, res) => {
  const { inviteCode, userId } = req.body;
  if (!inviteCode || !userId) {
    return res.status(400).json({ success: false, message: 'Please provide invite code and userId' });
  }

  const group = db.joinGroup({
    inviteCode,
    userId
  });

  if (!group) {
    return res.status(404).json({ success: false, message: 'Invalid invite code or pod not found' });
  }

  res.json({
    success: true,
    message: `Joined "${group.name}"! Roommate pod connected.`,
    group
  });
});

// POST /api/groups/:id/sync-pause - Synchronized group vacation pause
router.post('/:id/sync-pause', (req, res) => {
  const { startDate, endDate, reason, daysCount, pausedByUserId } = req.body;
  if (!pausedByUserId) {
    return res.status(400).json({ success: false, message: 'Missing pausedByUserId' });
  }
  const result = db.syncGroupPause(req.params.id, {
    startDate,
    endDate,
    reason,
    daysCount,
    pausedByUserId
  });

  if (!result) {
    return res.status(404).json({ success: false, message: 'Group not found' });
  }

  res.json({
    success: true,
    message: `Synchronized vacation pause activated for all ${result.syncRecord.membersAffected} roommates!`,
    ...result
  });
});

// POST /api/groups/:id/gift-meal - Buddy meal gift
router.post('/:id/gift-meal', (req, res) => {
  const { fromUserId, toName, toPhone, mealType, message } = req.body;
  if (!fromUserId) {
    return res.status(400).json({ success: false, message: 'Missing fromUserId' });
  }
  const gift = db.giftMealPass(req.params.id, {
    fromUserId,
    toName,
    toPhone,
    mealType,
    message
  });

  res.status(201).json({
    success: true,
    message: `Buddy Pass generated for ${gift.toName}! Secret PIN: ${gift.giftPin}`,
    gift
  });
});

module.exports = router;
