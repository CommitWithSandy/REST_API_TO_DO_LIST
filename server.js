require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { TodoRepository, pool } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const fs = require('fs');

// Helper to determine if developer tools (API Console, Schema Inspector, DB Reset) are enabled.
// Reads .env dynamically so toggling ENABLE_DEV_TOOLS in .env takes effect immediately without needing server restart.
const isDevToolsEnabled = () => {
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^\s*ENABLE_DEV_TOOLS\s*=\s*(.+)$/m);
      if (match) {
        const val = match[1].trim().replace(/^['"]|['"]$/g, '').toLowerCase();
        return val === 'true' || val === '1';
      }
    }
  } catch (err) {
    // fallback to process.env
  }
  return String(process.env.ENABLE_DEV_TOOLS || '').toLowerCase() === 'true';
};

// Middleware
app.use(cors());
app.use(express.json());

// Track request duration and log API calls
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Health check endpoint (also reports enabled features to frontend)
 */
app.get('/api/health', async (req, res) => {
  try {
    // Ping MySQL to verify active pool connection
    const [rows] = await pool.query('SELECT 1 as ping');
    const isDbConnected = rows && rows[0]?.ping === 1;

    res.json({
      status: 'online',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        type: 'MySQL (mysql2/promise)',
        status: isDbConnected ? 'connected' : 'disconnected',
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT) || 3306,
        name: process.env.DB_NAME || 'todos_db'
      },
      features: {
        devTools: isDevToolsEnabled()
      },
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      error: 'Database connection failed',
      details: error.message
    });
  }
});

/**
 * GET /api/todos
 * Query params: status (all|active|completed|overdue|today), priority, category, search, sortBy, sortOrder
 */
app.get('/api/todos', async (req, res) => {
  try {
    const { status, priority, category, search, sortBy, sortOrder } = req.query;
    const todos = await TodoRepository.getAll({ status, priority, category, search, sortBy, sortOrder });
    res.json({
      success: true,
      count: todos.length,
      filters: {
        status: status || 'all',
        priority: priority || 'all',
        category: category || 'all',
        search: search || ''
      },
      data: todos
    });
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve todos' });
  }
});

/**
 * GET /api/todos/:id
 */
app.get('/api/todos/:id', async (req, res) => {
  try {
    const todo = await TodoRepository.getById(req.params.id);
    if (!todo) {
      return res.status(404).json({ success: false, error: `Todo with ID ${req.params.id} not found` });
    }
    res.json({ success: true, data: todo });
  } catch (error) {
    console.error('Error fetching todo:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve todo' });
  }
});

/**
 * POST /api/todos
 * Body: { title, description?, priority?, category?, due_date?, estimated_minutes?, tags?, is_pinned? }
 */
app.post('/api/todos', async (req, res) => {
  try {
    const { title, description, status, priority, category, due_date, estimated_minutes, tags, is_pinned } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Validation Error: Title is required' });
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Validation Error: Priority must be one of: ${validPriorities.join(', ')}`
      });
    }

    const newTodo = await TodoRepository.create({
      title,
      description,
      status: status || 'todo',
      priority: priority ? priority.toLowerCase() : 'medium',
      category: category || 'Work',
      due_date: due_date || null,
      estimated_minutes: estimated_minutes || 30,
      tags: tags || [],
      is_pinned: is_pinned || 0
    });

    res.status(201).json({
      success: true,
      message: 'Todo created successfully',
      data: newTodo
    });
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({ success: false, error: 'Failed to create todo' });
  }
});

/**
 * PUT /api/todos/:id - Complete replace / update
 */
app.put('/api/todos/:id', async (req, res) => {
  try {
    const existing = await TodoRepository.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: `Todo with ID ${req.params.id} not found` });
    }

    const { title, description, status, completed, priority, category, due_date, estimated_minutes, tags, is_pinned } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Validation Error: Title is required' });
    }

    const updated = await TodoRepository.update(req.params.id, {
      title,
      description: description || '',
      status: status !== undefined ? status : existing.status,
      completed: completed !== undefined ? Boolean(completed) : existing.completed,
      priority: priority || 'medium',
      category: category || 'Work',
      due_date: due_date || null,
      estimated_minutes: estimated_minutes || 30,
      tags: tags || [],
      is_pinned: Boolean(is_pinned)
    });

    res.json({
      success: true,
      message: 'Todo updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ success: false, error: 'Failed to update todo' });
  }
});

/**
 * PATCH /api/todos/:id - Partial update
 */
app.patch('/api/todos/:id', async (req, res) => {
  try {
    const existing = await TodoRepository.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: `Todo with ID ${req.params.id} not found` });
    }

    const updated = await TodoRepository.update(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Todo patched successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error patching todo:', error);
    res.status(500).json({ success: false, error: 'Failed to patch todo' });
  }
});

/**
 * PATCH /api/todos/:id/toggle - Quick toggle completion
 */
app.patch('/api/todos/:id/toggle', async (req, res) => {
  try {
    const updated = await TodoRepository.toggleComplete(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, error: `Todo with ID ${req.params.id} not found` });
    }

    res.json({
      success: true,
      message: `Todo marked as ${updated.completed ? 'completed' : 'active'}`,
      data: updated
    });
  } catch (error) {
    console.error('Error toggling todo:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle todo status' });
  }
});

/**
 * PATCH /api/todos/:id/pin - Quick toggle pin
 */
app.patch('/api/todos/:id/pin', async (req, res) => {
  try {
    const updated = await TodoRepository.togglePin(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, error: `Todo with ID ${req.params.id} not found` });
    }

    res.json({
      success: true,
      message: `Todo ${updated.is_pinned ? 'pinned' : 'unpinned'}`,
      data: updated
    });
  } catch (error) {
    console.error('Error pinning todo:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle pin state' });
  }
});

/**
 * DELETE /api/todos/:id
 */
app.delete('/api/todos/:id', async (req, res) => {
  try {
    const success = await TodoRepository.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: `Todo with ID ${req.params.id} not found` });
    }

    res.json({
      success: true,
      message: `Todo with ID ${req.params.id} successfully deleted`
    });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ success: false, error: 'Failed to delete todo' });
  }
});

/**
 * POST /api/todos/bulk - Bulk action
 * Body: { action: 'complete' | 'delete', ids: [1, 2, 3] }
 */
app.post('/api/todos/bulk', async (req, res) => {
  try {
    const { action, ids } = req.body;
    if (!['complete', 'delete'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Action must be "complete" or "delete"' });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'ids must be a non-empty array of IDs' });
    }

    const result = await TodoRepository.bulkAction(action, ids);
    res.json({
      success: true,
      message: `Bulk ${action} succeeded for ${result.affected} items`,
      affected: result.affected
    });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({ success: false, error: 'Failed to perform bulk action' });
  }
});

/**
 * GET /api/categories
 */
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await TodoRepository.getCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

/**
 * POST /api/categories
 */
app.post('/api/categories', async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }

    const newCategory = await TodoRepository.addCategory(name, color, icon);
    res.status(201).json({ success: true, message: 'Category added', data: newCategory });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ success: false, error: 'Category name already exists or invalid' });
  }
});

/**
 * DELETE /api/categories/:id
 */
app.delete('/api/categories/:id', async (req, res) => {
  try {
    const success = await TodoRepository.deleteCategory(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
});

/**
 * GET /api/stats
 */
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await TodoRepository.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/activity
 */
app.get('/api/activity', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 15;
    const activities = await TodoRepository.getRecentActivities(limit);
    res.json({ success: true, data: activities });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activity log' });
  }
});

/**
 * GET /api/schema - Database inspector (gated by ENABLE_DEV_TOOLS)
 */
app.get('/api/schema', async (req, res) => {
  if (!isDevToolsEnabled()) {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Database schema inspector is disabled in this environment (ENABLE_DEV_TOOLS=false)'
    });
  }

  try {
    const schema = await TodoRepository.getSchemaInfo();
    res.json({ success: true, data: schema });
  } catch (error) {
    console.error('Error fetching schema info:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch database schema' });
  }
});

/**
 * POST /api/reset - Reset demo sample data (gated by ENABLE_DEV_TOOLS)
 */
app.post('/api/reset', async (req, res) => {
  if (!isDevToolsEnabled()) {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Database reset is disabled in this environment (ENABLE_DEV_TOOLS=false)'
    });
  }

  try {
    await TodoRepository.resetDemo();
    res.json({ success: true, message: 'Database reset to initial demo state successfully' });
  } catch (error) {
    console.error('Error resetting demo database:', error);
    res.status(500).json({ success: false, error: 'Failed to reset database' });
  }
});

// Fallback for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const server = app.listen(PORT, () => {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = process.env.DB_PORT || 3306;
  const dbName = process.env.DB_NAME || 'todos_db';
  const devToolsStatus = isDevToolsEnabled() ? 'ENABLED (API Console & Schema Active)' : 'DISABLED (Production Clean Mode)';

  console.log(`===============================================`);
  console.log(`🚀 REST API Server is running!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🐬 Database: MySQL (${host}:${port}/${dbName})`);
  console.log(`🛠️ Dev Tools: ${devToolsStatus}`);
  console.log(`✨ REST Endpoints available at /api/todos`);
  console.log(`===============================================`);
});

module.exports = app;
