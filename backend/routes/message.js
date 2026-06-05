const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Message = require('../models/Message');
const User = require('../models/User');

// POST /api/messages — Send a message (company can initiate, both can reply)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content || !content.trim()) {
      return res.status(400).json({ error: 'Receiver and content are required.' });
    }

    const sender = await User.findById(req.user.id);
    const receiver = await User.findById(receiverId);
    if (!sender || !receiver) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Companies can message students. Students can only reply (must have existing conversation).
    if (sender.role === 'student') {
      const existingConversation = await Message.findOne({
        $or: [
          { sender: req.user.id, receiver: receiverId },
          { sender: receiverId, receiver: req.user.id },
        ],
      });
      if (!existingConversation) {
        return res.status(403).json({ error: 'Students can only reply to company messages.' });
      }
    } else if (sender.role !== 'company') {
      return res.status(403).json({ error: 'Only companies can initiate messages.' });
    }

    const message = new Message({
      sender: req.user.id,
      receiver: receiverId,
      content: content.trim(),
    });
    await message.save();

    res.status(201).json({ message: 'Message sent successfully', data: message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/messages/conversations — List all conversation threads
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all messages involving this user
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'username role companyName')
      .populate('receiver', 'username role companyName');

    // Group by conversation partner
    const conversationMap = {};
    messages.forEach((msg) => {
      const partnerId =
        msg.sender._id.toString() === userId
          ? msg.receiver._id.toString()
          : msg.sender._id.toString();

      if (!conversationMap[partnerId]) {
        const partner =
          msg.sender._id.toString() === userId ? msg.receiver : msg.sender;
        conversationMap[partnerId] = {
          partnerId,
          partnerName: partner.companyName || partner.username,
          partnerRole: partner.role,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unreadCount: 0,
        };
      }

      // Count unread messages FROM the partner
      if (
        msg.receiver._id.toString() === userId &&
        msg.sender._id.toString() === partnerId &&
        !msg.read
      ) {
        conversationMap[partnerId].unreadCount++;
      }
    });

    const conversations = Object.values(conversationMap).sort(
      (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
    );

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/messages/conversation/:userId — Get full message thread with a user
router.get('/conversation/:userId', authMiddleware, async (req, res) => {
  try {
    const myId = req.user.id;
    const partnerId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: partnerId },
        { sender: partnerId, receiver: myId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'username role companyName')
      .populate('receiver', 'username role companyName');

    // Auto-mark messages from partner as read
    await Message.updateMany(
      { sender: partnerId, receiver: myId, read: false },
      { $set: { read: true } }
    );

    res.json({ messages });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/messages/read/:userId — Mark all messages from a user as read
router.put('/read/:userId', authMiddleware, async (req, res) => {
  try {
    await Message.updateMany(
      { sender: req.params.userId, receiver: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/messages/unread-count — Get count of unread messages
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user.id,
      read: false,
    });
    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
