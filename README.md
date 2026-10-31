# TaskFlow REST • Full-Stack To-Do & API Platform (MySQL Edition)

A modern, responsive Full-Stack To-Do Application engineered to demonstrate clean RESTful API design, persistent MySQL database integration with connection pooling, reactive state management, and modern UI principles.

---

## 🌟 Key Highlights

- **RESTful API Backend**: Built with Node.js & Express, featuring complete CRUD operations (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), filtering (status, priority, category, search), multi-field sorting, and batch actions.
- **Persistent MySQL Database**: High-performance MySQL 8.0+ integration with `mysql2/promise` connection pooling, normalized schema, indexes, automated database/table bootstrap, seed data, and an audit trail (`activity_logs`).
- **Modern Vanilla CSS Design System**: Rich obsidian dark theme & crisp light theme with glassmorphism, glowing accents, harmonious HSL palettes, and fluid micro-animations (no heavy CSS frameworks).
- **Responsive Layout**: Fluid flexbox and CSS Grid layout adapting seamlessly across mobile (<600px), tablet (600–1024px), and desktop (1024px+).
- **In-App REST API Console & Explorer**: Interactive request builder with real-time response latency (ms), HTTP status indicators, JSON syntax highlighting, and endpoint specifications.
- **Live Database Schema Inspector**: Real-time visualization of MySQL tables, column datatypes, primary keys, and record counts directly via `INFORMATION_SCHEMA`.
- **Productivity & UX Features**: Inline quick-add, multi-item bulk selection, debounced live search, keyboard shortcuts (`/` for search, `N` for new task, `Esc` to close), and soft undo toasts.

---

## 🏗️ Architecture

```
RESTAPI/
├── server.js              # Express server, REST endpoints, error handling & static serving
├── db.js                  # MySQL database connection pool, schema init, indexes & repository
├── .env                   # Environment variables (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)
├── .env.example           # Template for environment configuration
├── public/
│   ├── index.html         # Accessible HTML5 structure & semantic layout
│   ├── css/
│   │   └── style.css      # Vanilla CSS design system, dark & light themes, animations
│   └── js/
│       ├── api.js         # Frontend REST API client wrapper
│       └── app.js         # Reactive UI controller, state sync & console runner
├── package.json           # Project metadata, dependencies & scripts
└── README.md              # Technical documentation & API guide
```

---

## 📡 REST API Reference

All API routes return standardized JSON payloads:

### Todo Endpoints

| Method | Endpoint | Description | Query / Body Parameters |
|---|---|---|---|
| `GET` | `/api/todos` | List all tasks with filters & sorting | `status` (all, active, completed, overdue, today)<br>`priority` (all, low, medium, high, urgent)<br>`category`<br>`search` (query title, description, tags)<br>`sortBy` (created_at, due_date, priority, title)<br>`sortOrder` (asc, desc) |
| `GET` | `/api/todos/:id` | Get single task by ID | - |
| `POST` | `/api/todos` | Create new task | **Body**: `{ title, description?, priority?, category?, due_date?, estimated_minutes?, tags?, is_pinned? }` |
| `PUT` | `/api/todos/:id` | Full update of existing task | **Body**: Full todo object |
| `PATCH` | `/api/todos/:id` | Partial update | **Body**: Partial fields |
| `PATCH` | `/api/todos/:id/toggle` | Toggle completion status | - |
| `PATCH` | `/api/todos/:id/pin` | Toggle pin to top | - |
| `DELETE` | `/api/todos/:id` | Permanently delete task | - |
| `POST` | `/api/todos/bulk` | Batch action on multiple tasks | **Body**: `{ action: "complete" \| "delete", ids: [1, 2, 3] }` |

### System & Database Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/categories` | Retrieve all categories with active task counts |
| `POST` | `/api/categories` | Add custom category (`{ name, color, icon }`) |
| `DELETE` | `/api/categories/:id` | Remove a category |
| `GET` | `/api/stats` | Aggregated metrics, completion rate & priority breakdowns |
| `GET` | `/api/activity` | Recent audit trail logs from MySQL |
| `GET` | `/api/schema` | MySQL database schema introspection |
| `POST` | `/api/reset` | Reset database to clean sample dataset |
| `GET` | `/api/health` | Healthcheck and MySQL server status |

---

## 🗄️ Database Schema (MySQL)

### 1. `todos` Table
```sql
CREATE TABLE todos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  completed TINYINT(1) DEFAULT 0,
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
  INDEX idx_todos_priority (priority),
  INDEX idx_todos_category (category),
  INDEX idx_todos_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. `categories` Table
```sql
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  color VARCHAR(30) NOT NULL,
  icon VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3. `activity_logs` Table
```sql
CREATE TABLE activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(50) NOT NULL,
  todo_id INT DEFAULT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 🚀 Running Locally

### Prerequisites
- Node.js v18+ (Node v20+ or v25 recommended)
- MySQL Server running on `localhost:3306`

### Configuration (`.env`)
Create or edit `.env` in the root directory:
```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=todos_db
```

### Installation & Launch
```bash
# Navigate to the project directory
cd "RESTAPI"

# Install dependencies (express, cors, mysql2, dotenv)
npm install

# Start the REST API server & web app
npm start
```

Open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## ⌨️ Keyboard Shortcuts

- <kbd>/</kbd> or <kbd>Ctrl</kbd> + <kbd>K</kbd> : Quick Search
- <kbd>N</kbd> : Open Create Task Modal
- <kbd>Esc</kbd> : Close Modals / Exit Search Focus
