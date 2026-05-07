const express = require('express');
const store = require('../db/store');
const { requireSameUser, requireUser } = require('../middleware/auth');
const router = express.Router();

const toId = (value) => {
    const id = Number.parseInt(value, 10);
    return Number.isFinite(id) && id >= 1 ? id : null;
};

const buildApplicationMessage = (username, job) => {
    const companyText = job.company ? ` tại ${job.company}` : '';
    return `Xin chào, mình là ${username}. Mình muốn ứng tuyển vị trí "${job.title}"${companyText}.`;
};

router.get('/', async (req, res) => {
    try {
        res.json(await store.listJobs());
    } catch (e) {
        console.error('❌ Error fetching jobs:', e.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const jobId = toId(req.params.id);
        if (!jobId) {
            return res.status(400).json({ error: 'Valid job id required' });
        }

        const job = await store.findJobById(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json(job);
    } catch (e) {
        console.error('❌ Error fetching job:', e.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', requireUser, requireSameUser((req) => req.body.postedBy), async (req, res) => {
    try {
        const { title, company, salary, type, level, location, skills, description, postedBy } = req.body;
        if (!title || !company || !postedBy) {
            return res.status(400).json({ error: 'Title, company, and postedBy required' });
        }
        const job = await store.createJob({
            title,
            company,
            salary: salary || 'Thỏa thuận',
            type: type || 'Toàn thời gian',
            level: level || 'Fresher',
            location: location || 'Hà Nội',
            skills: skills || [],
            description: description || '',
            postedBy
        });
        await store.addUserReputation(postedBy, 20);

        await store.createActivity({
            username: postedBy,
            action: 'đã đăng tuyển',
            target: title,
            icon: '💼'
        });

        res.json(job);
    } catch (e) {
        console.error('❌ Error creating job:', e.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:id/apply', requireUser, requireSameUser((req) => req.body.username), async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'Username required' });
        }

        const jobId = toId(req.params.id);
        if (!jobId) {
            return res.status(400).json({ error: 'Valid job id required' });
        }

        const job = await store.findJobById(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        await store.createActivity({
            username,
            action: 'đã ứng tuyển',
            target: job.title,
            icon: '📋'
        });
        await store.addUserReputation(username, 10);

        let room = null;
        let message = null;
        if (job.postedBy && job.postedBy !== username) {
            room = await store.ensurePrivateRoom(username, job.postedBy);
            if (room) {
                message = await store.createMessage({
                    room: room.id,
                    username,
                    message: buildApplicationMessage(username, job),
                });
                req.app.get('io')?.to(room.id).emit('newMessage', message);
            }
        }

        res.json({ msg: 'Application submitted', room, message });
    } catch (e) {
        console.error('❌ Error applying:', e.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
