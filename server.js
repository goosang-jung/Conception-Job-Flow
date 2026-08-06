var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
var app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());
var tasks = new Map();
var teamMembers = new Set(['김영희', '박준수', '이민지', '최태호', '관리자']);
// 초기 샘플 데이터
var initSampleData = function () {
    var sampleTasks = [
        {
            id: uuidv4(),
            name: '국제공동연구 정산 증빙',
            description: '지난 연도 공동연구 참여 내역 정산 및 증빙 자료 준비',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            difficulty: 5,
            estimatedDays: 14,
            amount: 95,
            createdAt: new Date().toISOString(),
            status: 'pending',
        },
        {
            id: uuidv4(),
            name: '산업부 연차실적보고서',
            description: '올해 산업부 과제 진행 현황 및 성과 보고서 작성',
            deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            difficulty: 4,
            estimatedDays: 7,
            amount: 65,
            createdAt: new Date().toISOString(),
            status: 'pending',
        },
        {
            id: uuidv4(),
            name: '설비진단 납품검수',
            description: '외주 설비진단 업체 납품물 최종 검수 및 승인',
            deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            difficulty: 2,
            estimatedDays: 3,
            amount: 58,
            createdAt: new Date().toISOString(),
            status: 'pending',
        },
    ];
    sampleTasks.forEach(function (task) {
        tasks.set(task.id, task);
    });
};
initSampleData();
// GET /tasks
app.get('/tasks', function (req, res) {
    res.json(Array.from(tasks.values()));
});
// POST /tasks
app.post('/tasks', function (req, res) {
    var _a = req.body, name = _a.name, description = _a.description, deadline = _a.deadline, difficulty = _a.difficulty, estimatedDays = _a.estimatedDays, amount = _a.amount, assignee = _a.assignee, project = _a.project, status = _a.status;
    var newTask = {
        id: uuidv4(),
        name: name,
        description: description,
        deadline: deadline,
        difficulty: difficulty || 2,
        estimatedDays: estimatedDays || 3,
        amount: amount || 0,
        assignee: assignee,
        project: project,
        status: status || 'pending',
        createdAt: new Date().toISOString(),
    };
    tasks.set(newTask.id, newTask);
    res.status(201).json(newTask);
});
// PATCH /tasks/:id
app.patch('/tasks/:id', function (req, res) {
    var id = req.params.id;
    var task = tasks.get(id);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }
    var updated = __assign(__assign({}, task), req.body);
    tasks.set(id, updated);
    res.json(updated);
});
// DELETE /tasks/:id
app.delete('/tasks/:id', function (req, res) {
    var id = req.params.id;
    tasks.delete(id);
    res.status(204).send();
});
// POST /estimate-difficulty
app.post('/estimate-difficulty', function (req, res) {
    var _a = req.body, name = _a.name, description = _a.description;
    var text = "".concat(name, " ").concat(description).toLowerCase();
    var veryHardKeywords = [
        '국제',
        '공동연구',
        '정산',
        '복잡한',
        '대규모',
        '통합',
    ];
    var hardKeywords = [
        '보고서',
        '검수',
        '분석',
        '개선',
        '설계',
        '구현',
    ];
    var easyKeywords = [
        '검증',
        '확인',
        '정렬',
        '수정',
    ];
    var difficulty = 2;
    var estimatedDays = 3;
    if (veryHardKeywords.some(function (kw) { return text.includes(kw); })) {
        difficulty = 5;
        estimatedDays = 14;
    }
    else if (hardKeywords.some(function (kw) { return text.includes(kw); }) ||
        description.length > 200) {
        difficulty = 4;
        estimatedDays = 7;
    }
    else if (easyKeywords.some(function (kw) { return text.includes(kw); })) {
        difficulty = 1;
        estimatedDays = 1;
    }
    res.json({
        difficulty: difficulty,
        estimatedDays: estimatedDays,
        reasoning: veryHardKeywords.some(function (kw) { return text.includes(kw); })
            ? '국제공동연구, 복잡한 프로세스'
            : hardKeywords.some(function (kw) { return text.includes(kw); })
                ? '리뷰, 분석, 설계 필요'
                : '단순 검증/수정',
    });
});
// POST /calculate-priorities
app.post('/calculate-priorities', function (req, res) {
    var taskList = req.body;
    var now = new Date();
    var scores = taskList.map(function (task) {
        var deadline = new Date(task.deadline);
        var daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        var deadlineScore = Math.max(0, 30 - Math.max(0, daysUntilDeadline) * 2);
        var maxAmount = Math.max.apply(Math, taskList.map(function (t) { return t.amount || 0; }));
        var amountScore = maxAmount > 0 ? ((task.amount || 0) / maxAmount) * 25 : 0;
        var difficultyScore = ((task.difficulty || 1) / 5) * 20;
        return {
            taskId: task.id,
            score: deadlineScore + amountScore + difficultyScore,
            breakdown: {
                deadline: deadlineScore,
                blocking: 0,
                amount: amountScore,
                difficulty: difficultyScore,
            },
            rank: 0,
        };
    });
    var ranked = scores
        .sort(function (a, b) { return b.score - a.score; })
        .map(function (item, idx) { return (__assign(__assign({}, item), { rank: idx + 1 })); });
    res.json(ranked);
});
// POST /upload-image (데이터 URL 저장)
app.post('/upload-image', express.json({ limit: '50mb' }), function (req, res) {
    var _a = req.body, file = _a.file, taskId = _a.taskId;
    // 프로토타입: 데이터 URL 그대로 반환
    res.json({ url: file });
});
// GET /team (담당자 목록 조회)
app.get('/team', function (req, res) {
    res.json(Array.from(teamMembers));
});
// POST /team (담당자 추가)
app.post('/team', function (req, res) {
    var name = req.body.name;
    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Invalid name' });
    }
    if (teamMembers.has(name)) {
        return res.status(400).json({ error: 'Team member already exists' });
    }
    teamMembers.add(name);
    res.status(201).json({ name: name, createdAt: new Date().toISOString() });
});
// DELETE /team/:name (담당자 삭제)
app.delete('/team/:name', function (req, res) {
    var name = req.params.name;
    if (!teamMembers.has(name)) {
        return res.status(404).json({ error: 'Team member not found' });
    }
    teamMembers.delete(name);
    res.status(204).send();
});
var PORT = 3002;
app.listen(PORT, function () {
    console.log("\u2705 Server running at http://localhost:".concat(PORT));
});
