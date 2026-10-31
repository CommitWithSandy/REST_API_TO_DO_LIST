require('dotenv').config();
const mysql = require('mysql2/promise');

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'todos_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

/**
 * Format raw database row to application Todo model
 */
function formatTodoRow(row) {
  if (!row) return null;
  let parsedTags = [];
  if (row.tags) {
    if (typeof row.tags === 'string') {
      try {
        parsedTags = JSON.parse(row.tags);
      } catch {
        parsedTags = [];
      }
    } else if (Array.isArray(row.tags)) {
      parsedTags = row.tags;
    }
  }
  const completed = Boolean(row.completed);
  let status = row.status;
  if (!status) {
    status = completed ? 'completed' : 'todo';
  }
  return {
    ...row,
    status,
    completed,
    is_pinned: Boolean(row.is_pinned),
    tags: parsedTags
  };
}

/**
 * Initialize MySQL database and tables
 */
async function initDatabase() {
  try {
    // 1. Ensure target database exists
    const adminConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });
    await adminConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await adminConnection.end();

    // 2. Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        color VARCHAR(30) NOT NULL,
        icon VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        completed TINYINT(1) DEFAULT 0,
        status ENUM('todo', 'in_progress', 'completed') DEFAULT 'todo',
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        category VARCHAR(100) DEFAULT 'Work',
        due_date VARCHAR(20) DEFAULT NULL,
        estimated_minutes INT DEFAULT 30,
        tags JSON DEFAULT NULL,
        is_pinned TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        completed_at VARCHAR(50) DEFAULT NULL,
        INDEX idx_todos_completed (completed),
        INDEX idx_todos_status (status),
        INDEX idx_todos_priority (priority),
        INDEX idx_todos_category (category),
        INDEX idx_todos_due_date (due_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure status column exists if table was created previously without it
    const [statusCols] = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'todos' AND COLUMN_NAME = 'status'",
      [dbConfig.database]
    );
    if (statusCols.length === 0) {
      await pool.query("ALTER TABLE todos ADD COLUMN status ENUM('todo', 'in_progress', 'completed') DEFAULT 'todo' AFTER completed");
      await pool.query("UPDATE todos SET status = 'completed' WHERE completed = 1");
      await pool.query("ALTER TABLE todos ADD INDEX idx_todos_status (status)");
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(50) NOT NULL,
        todo_id INT DEFAULT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Seed default categories if none exist
    const [catRows] = await pool.query('SELECT COUNT(*) as count FROM categories');
    if (catRows[0].count === 0) {
      await seedCategories();
    }

    console.log(`✅ MySQL database "${dbConfig.database}" and tables initialized successfully.`);
  } catch (err) {
    console.error('❌ Failed to initialize MySQL database:', err.message);
  }
}

/**
 * Default categories seed
 */
async function seedCategories() {
  const defaultCategories = [
    { name: 'Work', color: '#6366f1', icon: 'briefcase' },
    { name: 'Personal', color: '#ec4899', icon: 'user' },
    { name: 'Development', color: '#06b6d4', icon: 'code' },
    { name: 'Design', color: '#8b5cf6', icon: 'palette' },
    { name: 'Health', color: '#10b981', icon: 'heart-pulse' },
    { name: 'Finance', color: '#f59e0b', icon: 'wallet' },
    { name: 'Learning', color: '#3b82f6', icon: 'book-open' }
  ];

  for (const cat of defaultCategories) {
    await pool.execute(
      'INSERT INTO categories (name, color, icon) VALUES (?, ?, ?)',
      [cat.name, cat.color, cat.icon]
    );
  }
}

/**
 * Sample todos seed
 */
async function seedSampleTodos() {
  const now = new Date();
  const formatOffsetDate = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const initialTodos = [
    {
      title: 'Architect RESTful API Endpoints & Routes',
      description: 'Design clean CRUD endpoints with query parameter filters, sorting, and standardized JSON error envelopes.',
      completed: 1,
      priority: 'urgent',
      category: 'Development',
      due_date: formatOffsetDate(-1),
      estimated_minutes: 60,
      tags: JSON.stringify(['backend', 'rest', 'express']),
      is_pinned: 1,
      completed_at: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      title: 'Implement MySQL Database Schema & Indexes',
      description: 'Create normalized MySQL tables for todos, categories, and activity audit logging with connection pooling.',
      completed: 1,
      priority: 'high',
      category: 'Development',
      due_date: formatOffsetDate(0),
      estimated_minutes: 45,
      tags: JSON.stringify(['database', 'mysql', 'sql']),
      is_pinned: 1,
      completed_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      title: 'Craft Modern Responsive CSS with Glassmorphism',
      description: 'Design dark & light theme styling with vibrant gradients, responsive flex/grid layouts, and sleek micro-interactions.',
      completed: 0,
      priority: 'urgent',
      category: 'Design',
      due_date: formatOffsetDate(0),
      estimated_minutes: 90,
      tags: JSON.stringify(['ui', 'css', 'responsive', 'aesthetics']),
      is_pinned: 1
    },
    {
      title: 'Build Live REST API Console & Explorer',
      description: 'Allow users and reviewers to test all REST endpoints directly in the UI with live latency and response status.',
      completed: 0,
      priority: 'high',
      category: 'Development',
      due_date: formatOffsetDate(1),
      estimated_minutes: 60,
      tags: JSON.stringify(['rest-api', 'testing', 'interactive']),
      is_pinned: 0
    },
    {
      title: 'Review Sprint Deliverables & Code Standards',
      description: 'Conduct thorough code quality check, WCAG accessibility audit, and responsive mobile testing.',
      completed: 0,
      priority: 'medium',
      category: 'Work',
      due_date: formatOffsetDate(2),
      estimated_minutes: 40,
      tags: JSON.stringify(['qa', 'review']),
      is_pinned: 0
    },
    {
      title: 'Schedule 30-min HIIT Workout Session',
      description: 'Cardio intervals followed by mobility stretches and hydration routine.',
      completed: 0,
      priority: 'low',
      category: 'Health',
      due_date: formatOffsetDate(1),
      estimated_minutes: 30,
      tags: JSON.stringify(['fitness', 'wellness']),
      is_pinned: 0
    },
    {
      title: 'Quarterly Cloud Infrastructure Budget Review',
      description: 'Analyze database tier usage, bandwidth metrics, and optimize idle compute reservations.',
      completed: 0,
      priority: 'medium',
      category: 'Finance',
      due_date: formatOffsetDate(4),
      estimated_minutes: 45,
      tags: JSON.stringify(['finance', 'cloud', 'budget']),
      is_pinned: 0
    }
  ];

  for (const t of initialTodos) {
    const [res] = await pool.execute(
      `INSERT INTO todos (title, description, completed, priority, category, due_date, estimated_minutes, tags, is_pinned, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        t.title,
        t.description,
        t.completed,
        t.priority,
        t.category,
        t.due_date,
        t.estimated_minutes,
        t.tags,
        t.is_pinned,
        t.completed_at || null
      ]
    );

    await logActivity('CREATED', res.insertId, `Initialized task: ${t.title}`);
  }
}

/**
 * Activity logger helper
 */
async function logActivity(action, todoId, details) {
  try {
    await pool.execute(
      'INSERT INTO activity_logs (action, todo_id, details) VALUES (?, ?, ?)',
      [action, todoId || null, details || '']
    );
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
}

/**
 * Todo Model Query Helpers
 */
const TodoRepository = {
  async getAll(filters = {}) {
    let sql = 'SELECT * FROM todos WHERE 1=1';
    const params = [];

    // Filter by completion / kanban status
    if (filters.status === 'completed') {
      sql += ' AND (completed = 1 OR status = "completed")';
    } else if (filters.status === 'in_progress') {
      sql += ' AND status = "in_progress" AND completed = 0';
    } else if (filters.status === 'todo') {
      sql += ' AND (status = "todo" OR status IS NULL) AND completed = 0';
    } else if (filters.status === 'active') {
      sql += ' AND completed = 0';
    } else if (filters.status === 'overdue') {
      const today = new Date().toISOString().split('T')[0];
      sql += ' AND completed = 0 AND due_date IS NOT NULL AND due_date != "" AND due_date < ?';
      params.push(today);
    } else if (filters.status === 'today') {
      const today = new Date().toISOString().split('T')[0];
      sql += ' AND due_date = ?';
      params.push(today);
    }

    // Filter by priority
    if (filters.priority && filters.priority !== 'all') {
      sql += ' AND priority = ?';
      params.push(filters.priority);
    }

    // Filter by category
    if (filters.category && filters.category !== 'all') {
      sql += ' AND category = ?';
      params.push(filters.category);
    }

    // Search query across title, description, and tags
    if (filters.search && filters.search.trim()) {
      sql += ' AND (title LIKE ? OR description LIKE ? OR CAST(tags AS CHAR) LIKE ?)';
      const term = `%${filters.search.trim()}%`;
      params.push(term, term, term);
    }

    // Sorting
    const sortFieldMap = {
      created_at: 'created_at',
      due_date: 'CASE WHEN due_date IS NULL OR due_date = "" THEN 1 ELSE 0 END, due_date',
      priority: `CASE priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
        ELSE 5 END`,
      title: 'title'
    };

    const sortBy = sortFieldMap[filters.sortBy] || 'is_pinned DESC, created_at';
    const sortOrder = filters.sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    if (filters.sortBy) {
      sql += ` ORDER BY is_pinned DESC, ${sortBy} ${sortOrder}`;
    } else {
      sql += ' ORDER BY is_pinned DESC, created_at DESC';
    }

    const [rows] = await pool.query(sql, params);
    return rows.map(formatTodoRow);
  },

  async getById(id) {
    const [rows] = await pool.query('SELECT * FROM todos WHERE id = ?', [Number(id)]);
    if (rows.length === 0) return null;
    return formatTodoRow(rows[0]);
  },

  async create(data) {
    const {
      title,
      description = '',
      status = 'todo',
      priority = 'medium',
      category = 'Work',
      due_date = null,
      estimated_minutes = 30,
      tags = [],
      is_pinned = 0
    } = data;

    const normalizedStatus = ['todo', 'in_progress', 'completed'].includes(status) ? status : 'todo';
    const completed = normalizedStatus === 'completed' || data.completed ? 1 : 0;
    const finalStatus = completed ? 'completed' : normalizedStatus;
    const completed_at = completed ? new Date().toISOString() : null;

    const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
    const [result] = await pool.execute(
      `INSERT INTO todos (title, description, completed, status, priority, category, due_date, estimated_minutes, tags, is_pinned, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        description.trim(),
        completed,
        finalStatus,
        priority,
        category,
        due_date || null,
        Number(estimated_minutes) || 30,
        tagsJson,
        is_pinned ? 1 : 0,
        completed_at
      ]
    );

    const newId = result.insertId;
    await logActivity('CREATED', newId, `Created task: "${title.trim()}"`);
    return await this.getById(newId);
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) return null;

    const title = data.title !== undefined ? data.title.trim() : current.title;
    const description = data.description !== undefined ? data.description.trim() : current.description;
    
    // Status & Completed synchronization
    let status = current.status || 'todo';
    let completed = current.completed ? 1 : 0;

    if (data.status !== undefined) {
      if (['todo', 'in_progress', 'completed'].includes(data.status)) {
        status = data.status;
        completed = status === 'completed' ? 1 : 0;
      }
    } else if (data.completed !== undefined) {
      completed = data.completed ? 1 : 0;
      if (completed) {
        status = 'completed';
      } else if (status === 'completed') {
        status = 'todo';
      }
    }

    const priority = data.priority !== undefined ? data.priority : current.priority;
    const category = data.category !== undefined ? data.category : current.category;
    const due_date = data.due_date !== undefined ? (data.due_date || null) : current.due_date;
    const estimated_minutes = data.estimated_minutes !== undefined ? Number(data.estimated_minutes) : current.estimated_minutes;
    const tags = data.tags !== undefined ? JSON.stringify(data.tags) : JSON.stringify(current.tags);
    const is_pinned = data.is_pinned !== undefined ? (data.is_pinned ? 1 : 0) : (current.is_pinned ? 1 : 0);
    const completed_at = completed ? (current.completed_at || new Date().toISOString()) : null;

    await pool.execute(
      `UPDATE todos 
       SET title = ?, description = ?, completed = ?, status = ?, priority = ?, category = ?, 
           due_date = ?, estimated_minutes = ?, tags = ?, is_pinned = ?, 
           completed_at = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title,
        description,
        completed,
        status,
        priority,
        category,
        due_date,
        estimated_minutes,
        tags,
        is_pinned,
        completed_at,
        Number(id)
      ]
    );

    await logActivity('UPDATED', id, `Updated task ID ${id} (status: ${status})`);
    return await this.getById(id);
  },

  async toggleComplete(id) {
    const current = await this.getById(id);
    if (!current) return null;

    const newCompleted = current.completed ? 0 : 1;
    const newStatus = newCompleted ? 'completed' : 'todo';
    const completedAt = newCompleted ? new Date().toISOString() : null;

    await pool.execute(
      `UPDATE todos 
       SET completed = ?, status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [newCompleted, newStatus, completedAt, Number(id)]
    );

    await logActivity(newCompleted ? 'COMPLETED' : 'REOPENED', id, `${newCompleted ? 'Completed' : 'Reopened'} task "${current.title}"`);
    return await this.getById(id);
  },

  async togglePin(id) {
    const current = await this.getById(id);
    if (!current) return null;

    const newPinned = current.is_pinned ? 0 : 1;
    await pool.execute('UPDATE todos SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newPinned, Number(id)]);

    await logActivity('PINNED', id, `${newPinned ? 'Pinned' : 'Unpinned'} task "${current.title}"`);
    return await this.getById(id);
  },

  async delete(id) {
    const current = await this.getById(id);
    if (!current) return false;

    await pool.execute('DELETE FROM todos WHERE id = ?', [Number(id)]);
    await logActivity('DELETED', id, `Deleted task: "${current.title}"`);
    return true;
  },

  async bulkAction(action, ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return { affected: 0 };
    const numericIds = ids.map(id => Number(id)).filter(id => !isNaN(id));
    if (numericIds.length === 0) return { affected: 0 };

    const placeholders = numericIds.map(() => '?').join(',');
    let affected = 0;

    if (action === 'complete') {
      const [res] = await pool.query(
        `UPDATE todos 
         SET completed = 1, status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
         WHERE id IN (${placeholders})`,
        numericIds
      );
      affected = res.affectedRows;
      await logActivity('BULK_COMPLETED', null, `Bulk marked ${affected} tasks completed`);
    } else if (action === 'delete') {
      const [res] = await pool.query(
        `DELETE FROM todos WHERE id IN (${placeholders})`,
        numericIds
      );
      affected = res.affectedRows;
      await logActivity('BULK_DELETED', null, `Bulk deleted ${affected} tasks`);
    }

    return { affected };
  },

  async getStats() {
    const today = new Date().toISOString().split('T')[0];

    const [[totalRes]] = await pool.query('SELECT COUNT(*) as count FROM todos');
    const total = Number(totalRes.count) || 0;

    const [[completedRes]] = await pool.query('SELECT COUNT(*) as count FROM todos WHERE completed = 1 OR status = "completed"');
    const completed = Number(completedRes.count) || 0;

    const [[todoRes]] = await pool.query("SELECT COUNT(*) as count FROM todos WHERE completed = 0 AND (status = 'todo' OR status IS NULL)");
    const todoCount = Number(todoRes.count) || 0;

    const [[inProgRes]] = await pool.query("SELECT COUNT(*) as count FROM todos WHERE completed = 0 AND status = 'in_progress'");
    const inProgressCount = Number(inProgRes.count) || 0;

    const active = total - completed;

    const [[overdueRes]] = await pool.query(
      'SELECT COUNT(*) as count FROM todos WHERE completed = 0 AND due_date IS NOT NULL AND due_date != "" AND due_date < ?',
      [today]
    );
    const overdue = Number(overdueRes.count) || 0;

    const [[dueTodayRes]] = await pool.query(
      'SELECT COUNT(*) as count FROM todos WHERE completed = 0 AND due_date = ?',
      [today]
    );
    const dueToday = Number(dueTodayRes.count) || 0;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const [priorityBreakdown] = await pool.query(`
      SELECT priority, COUNT(*) as count, COALESCE(SUM(completed), 0) as completed_count 
      FROM todos 
      GROUP BY priority
    `);

    const [categoryBreakdown] = await pool.query(`
      SELECT category, COUNT(*) as total, COALESCE(SUM(completed), 0) as completed
      FROM todos 
      GROUP BY category
    `);

    return {
      total,
      completed,
      todoCount,
      inProgressCount,
      active,
      overdue,
      dueToday,
      completionRate,
      priorityBreakdown,
      categoryBreakdown
    };
  },

  async getCategories() {
    const [rows] = await pool.query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM todos t WHERE t.category = c.name AND t.completed = 0) as active_count,
        (SELECT COUNT(*) FROM todos t WHERE t.category = c.name) as total_count
      FROM categories c
      ORDER BY c.name ASC
    `);
    return rows;
  },

  async addCategory(name, color, icon) {
    const [res] = await pool.execute(
      'INSERT INTO categories (name, color, icon) VALUES (?, ?, ?)',
      [name.trim(), color || '#6366f1', icon || 'folder']
    );
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [res.insertId]);
    return rows[0];
  },

  async deleteCategory(id) {
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [Number(id)]);
    if (rows.length === 0) return false;
    await pool.execute('DELETE FROM categories WHERE id = ?', [Number(id)]);
    return true;
  },

  async getRecentActivities(limit = 15) {
    const numLimit = Number(limit) || 15;
    const [rows] = await pool.query(
      'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?',
      [numLimit]
    );
    return rows;
  },

  async resetDemo() {
    await pool.query('DELETE FROM todos');
    await pool.query('DELETE FROM categories');
    await pool.query('DELETE FROM activity_logs');
    await seedCategories();
    await seedSampleTodos();
    return true;
  },

  async getSchemaInfo() {
    const dbName = dbConfig.database;
    const tables = ['todos', 'categories', 'activity_logs'];
    const info = {};

    for (const tbl of tables) {
      const [colRows] = await pool.query(`
        SELECT 
          COLUMN_NAME as name,
          COLUMN_TYPE as type,
          CASE WHEN IS_NULLABLE = 'NO' THEN 1 ELSE 0 END as notnull,
          COLUMN_DEFAULT as dflt_value,
          CASE WHEN COLUMN_KEY = 'PRI' THEN 1 ELSE 0 END as pk
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `, [dbName, tbl]);

      const [[countRow]] = await pool.query(`SELECT COUNT(*) as count FROM \`${tbl}\``);
      info[tbl] = {
        columns: colRows,
        rowCount: countRow ? countRow.count : 0
      };
    }

    return info;
  }
};

// Auto-initialize DB on module load
initDatabase();

module.exports = {
  pool,
  TodoRepository,
  initDatabase
};
