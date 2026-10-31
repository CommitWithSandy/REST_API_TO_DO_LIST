/**
 * TaskFlow REST - Frontend Application Controller
 * High-performance state management, reactive DOM rendering, and API synchronization.
 */

// Application State
const state = {
  tasks: [],
  categories: [],
  stats: null,
  currentView: 'all',       // 'all', 'today', 'active', 'overdue', 'completed', or category name
  activeTab: 'tasks',       // 'tasks', 'api-explorer', 'db-schema', 'analytics'
  viewMode: 'list',         // 'list' (default single-column) or 'kanban'
  draggedTaskId: null,
  filters: {
    priority: 'all',
    search: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  },
  bulkMode: false,
  selectedTaskIds: new Set(),
  activeModalTags: [],
  lastDeletedTask: null,
  searchDebounceTimer: null,
  devToolsEnabled: true
};

// DOM Element Cache
const dom = {};

/**
 * Initialize Application
 */
document.addEventListener('DOMContentLoaded', async () => {
  cacheDOMElements();
  initTheme();
  initLiveClock();
  setupEventListeners();
  setupKeyboardShortcuts();
  
  // Check health & environment feature flags first, then load data
  await checkApiHealth();
  await loadAppData();

  // Periodic health check
  setInterval(checkApiHealth, 30000);
});

/**
 * Cache frequently accessed DOM nodes
 */
function cacheDOMElements() {
  dom.themeToggleBtn = document.getElementById('themeToggleBtn');
  dom.mobileMenuToggle = document.getElementById('mobileMenuToggle');
  dom.sidebar = document.getElementById('sidebar');
  dom.navClock = document.getElementById('navClock');
  dom.apiStatusPill = document.getElementById('apiStatusPill');
  dom.apiLatencyBadge = document.getElementById('apiLatencyBadge');
  dom.globalSearchInput = document.getElementById('globalSearchInput');
  dom.clearSearchBtn = document.getElementById('clearSearchBtn');
  
  // Navigation
  dom.navItems = document.querySelectorAll('[data-view]');
  dom.toolItems = document.querySelectorAll('[data-tab]');
  dom.prioritiesNavList = document.getElementById('prioritiesNavList');
  dom.priorityNavItems = document.querySelectorAll('.priority-nav-item');
  dom.countPriorityUrgent = document.getElementById('countPriorityUrgent');
  dom.countPriorityHigh = document.getElementById('countPriorityHigh');
  dom.countPriorityMedium = document.getElementById('countPriorityMedium');
  dom.countPriorityLow = document.getElementById('countPriorityLow');
  dom.resetDemoBtn = document.getElementById('resetDemoBtn');
  dom.navTabApi = document.getElementById('navTabApi');
  dom.navTabDb = document.getElementById('navTabDb');
  dom.sidebarFooter = document.querySelector('.sidebar-footer');
  
  // Counts
  dom.countAll = document.getElementById('countAll');
  dom.countToday = document.getElementById('countToday');
  dom.countActive = document.getElementById('countActive');
  dom.countOverdue = document.getElementById('countOverdue');
  dom.countCompleted = document.getElementById('countCompleted');

  // Metrics
  dom.metricTotal = document.getElementById('metricTotal');
  dom.metricActive = document.getElementById('metricActive');
  dom.metricActiveSub = document.getElementById('metricActiveSub');
  dom.metricRate = document.getElementById('metricRate');
  dom.metricCompletedSub = document.getElementById('metricCompletedSub');
  dom.metricOverdue = document.getElementById('metricOverdue');
  dom.metricOverdueSub = document.getElementById('metricOverdueSub');
  dom.progressRingBar = document.getElementById('progressRingBar');

  // Toolbar & View Controls
  dom.currentViewTitle = document.getElementById('currentViewTitle');
  dom.viewTaskCounter = document.getElementById('viewTaskCounter');
  dom.boardProgressFill = document.getElementById('boardProgressFill');
  dom.boardProgressText = document.getElementById('boardProgressText');
  dom.viewModeKanban = document.getElementById('viewModeKanban');
  dom.viewModeList = document.getElementById('viewModeList');
  dom.priorityFilterSelect = document.getElementById('priorityFilterSelect');
  dom.sortSelect = document.getElementById('sortSelect');
  dom.sortDirBtn = document.getElementById('sortDirBtn');
  dom.toggleBulkModeBtn = document.getElementById('toggleBulkModeBtn');

  // Quick Add
  dom.quickAddForm = document.getElementById('quickAddForm');
  dom.quickAddTitle = document.getElementById('quickAddTitle');
  dom.quickAddPriority = document.getElementById('quickAddPriority');
  dom.quickAddDueDate = document.getElementById('quickAddDueDate');

  // Bulk Toolbar
  dom.bulkToolbar = document.getElementById('bulkToolbar');
  dom.bulkSelectedCount = document.getElementById('bulkSelectedCount');
  dom.bulkSelectAllBtn = document.getElementById('bulkSelectAllBtn');
  dom.bulkCompleteBtn = document.getElementById('bulkCompleteBtn');
  dom.bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
  dom.bulkCancelBtn = document.getElementById('bulkCancelBtn');

  // Tasks & Kanban Area
  dom.tasksContainer = document.getElementById('tasksContainer');
  dom.tasksSkeleton = document.getElementById('tasksSkeleton');
  dom.kanbanBoard = document.getElementById('kanbanBoard');
  dom.colTodo = document.getElementById('colTodo');
  dom.colInProgress = document.getElementById('colInProgress');
  dom.colCompleted = document.getElementById('colCompleted');
  dom.cardsColTodo = document.getElementById('cardsColTodo');
  dom.cardsColInProgress = document.getElementById('cardsColInProgress');
  dom.cardsColCompleted = document.getElementById('cardsColCompleted');
  dom.badgeColTodo = document.getElementById('badgeColTodo');
  dom.badgeColInProgress = document.getElementById('badgeColInProgress');
  dom.badgeColCompleted = document.getElementById('badgeColCompleted');
  dom.btnAddColTodo = document.getElementById('btnAddColTodo');
  dom.tasksList = document.getElementById('tasksList');
  dom.tasksEmptyState = document.getElementById('tasksEmptyState');
  dom.emptyStateTitle = document.getElementById('emptyStateTitle');
  dom.emptyStateDesc = document.getElementById('emptyStateDesc');
  dom.emptyStateActionBtn = document.getElementById('emptyStateActionBtn');

  // Tabs
  dom.tabPanels = document.querySelectorAll('.tab-panel');

  // REST API Explorer Elements
  dom.apiMethodSelect = document.getElementById('apiMethodSelect');
  dom.apiPresetSelect = document.getElementById('apiPresetSelect');
  dom.apiEndpointInput = document.getElementById('apiEndpointInput');
  dom.apiRequestBody = document.getElementById('apiRequestBody');
  dom.btnExecuteApi = document.getElementById('btnExecuteApi');
  dom.formatJsonBtn = document.getElementById('formatJsonBtn');
  dom.responseStatusBadge = document.getElementById('responseStatusBadge');
  dom.responseTimePill = document.getElementById('responseTimePill');
  dom.apiResponseViewer = document.getElementById('apiResponseViewer');
  dom.btnCopyApiResponse = document.getElementById('btnCopyApiResponse');

  // DB Schema Elements
  dom.schemaCardsGrid = document.getElementById('schemaCardsGrid');
  dom.btnRefreshSchema = document.getElementById('btnRefreshSchema');

  // Analytics Elements
  dom.categoryAnalyticsBars = document.getElementById('categoryAnalyticsBars');
  dom.priorityAnalyticsBars = document.getElementById('priorityAnalyticsBars');
  dom.auditLogList = document.getElementById('auditLogList');

  // Modals
  dom.openCreateModalBtn = document.getElementById('openCreateModalBtn');
  dom.taskModalOverlay = document.getElementById('taskModalOverlay');
  dom.closeTaskModalBtn = document.getElementById('closeTaskModalBtn');
  dom.cancelTaskModalBtn = document.getElementById('cancelTaskModalBtn');
  dom.taskForm = document.getElementById('taskForm');
  dom.taskModalTitle = document.getElementById('taskModalTitle');
  dom.editTaskId = document.getElementById('editTaskId');
  dom.taskTitleInput = document.getElementById('taskTitleInput');
  dom.taskDescInput = document.getElementById('taskDescInput');
  dom.taskCategorySelect = document.getElementById('taskCategorySelect');
  dom.taskDueDateInput = document.getElementById('taskDueDateInput');
  dom.taskEstMinutesInput = document.getElementById('taskEstMinutesInput');
  dom.taskPinnedInput = document.getElementById('taskPinnedInput');
  dom.tagsInputContainer = document.getElementById('tagsInputContainer');
  dom.tagsChipsList = document.getElementById('tagsChipsList');
  dom.taskTagsInput = document.getElementById('taskTagsInput');



  // Confirm Modal
  dom.confirmModalOverlay = document.getElementById('confirmModalOverlay');
  dom.confirmModalTitle = document.getElementById('confirmModalTitle');
  dom.confirmModalMessage = document.getElementById('confirmModalMessage');
  dom.confirmCancelBtn = document.getElementById('confirmCancelBtn');
  dom.confirmProceedBtn = document.getElementById('confirmProceedBtn');
  dom.closeConfirmModalBtn = document.getElementById('closeConfirmModalBtn');

  // Toast Container
  dom.toastContainer = document.getElementById('toastContainer');
}

/**
 * Theme Management
 */
function initTheme() {
  const savedTheme = localStorage.getItem('taskflow_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeColorMeta(savedTheme);

  if (dom.themeToggleBtn) {
    dom.themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('taskflow_theme', next);
      updateThemeColorMeta(next);
      showToast(next === 'light' ? 'Switched to Warm Coffee theme ☕' : 'Switched to Crimson Noir theme 🍷🖤', 'info', 2200);
    });
  }
}

function updateThemeColorMeta(theme) {
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'light' ? '#f5efe6' : '#170e0e');
  }
}

/**
 * Live Clock in Header (if present)
 */
function initLiveClock() {
  if (!dom.navClock) return;
  const updateClock = () => {
    const now = new Date();
    dom.navClock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  updateClock();
  setInterval(updateClock, 1000);
}

/**
 * Health Check Indicator
 */
async function checkApiHealth() {
  try {
    const res = await API.getHealth();
    if (dom.apiStatusPill) dom.apiStatusPill.classList.remove('status-offline');
    const statusLabel = document.getElementById('apiStatusLabel');
    if (statusLabel) statusLabel.textContent = 'Online';
    if (dom.apiLatencyBadge) dom.apiLatencyBadge.textContent = 'Active';

    if (res && res.features) {
      applyDevToolsVisibility(res.features.devTools);
    }
  } catch (err) {
    if (dom.apiStatusPill) dom.apiStatusPill.classList.add('status-offline');
    const statusLabel = document.getElementById('apiStatusLabel');
    if (statusLabel) statusLabel.textContent = 'Connecting...';
    if (dom.apiLatencyBadge) dom.apiLatencyBadge.textContent = 'Retry';
  }
}

/**
 * Apply visibility for Developer Tools based on server feature flag
 */
function applyDevToolsVisibility(enabled) {
  state.devToolsEnabled = Boolean(enabled);

  if (dom.navTabApi) dom.navTabApi.style.display = state.devToolsEnabled ? '' : 'none';
  if (dom.navTabDb) dom.navTabDb.style.display = state.devToolsEnabled ? '' : 'none';
  if (dom.resetDemoBtn) dom.resetDemoBtn.style.display = state.devToolsEnabled ? '' : 'none';
  if (dom.sidebarFooter) dom.sidebarFooter.style.display = state.devToolsEnabled ? '' : 'none';

  if (!state.devToolsEnabled && (state.activeTab === 'api-explorer' || state.activeTab === 'db-schema')) {
    switchTab('tasks');
  }
}

/**
 * Load all application data
 */
async function loadAppData() {
  try {
    showLoading(true);

    const [todosResponse, categories, stats] = await Promise.all([
      API.getTodos(getQueryParams()),
      API.getCategories(),
      API.getStats()
    ]);

    state.tasks = todosResponse.data;
    state.categories = categories;
    state.stats = stats;

    renderStats();
    renderTasks();

    showLoading(false);
  } catch (err) {
    showLoading(false);
    showToast(`Error loading data: ${err.message}`, 'error');
  }
}

/**
 * Refresh task list based on current filters
 */
async function refreshTasksOnly() {
  try {
    const todosResponse = await API.getTodos(getQueryParams());
    state.tasks = todosResponse.data;
    const stats = await API.getStats();
    state.stats = stats;

    renderStats();
    renderTasks();
  } catch (err) {
    showToast(`Error loading tasks: ${err.message}`, 'error');
  }
}

/**
 * Helper to construct query filters
 */
function getQueryParams() {
  const params = {
    priority: state.filters.priority,
    search: state.filters.search,
    sortBy: state.filters.sortBy,
    sortOrder: state.filters.sortOrder
  };

  if (state.currentView.startsWith('priority-')) {
    params.status = 'all';
    params.priority = state.currentView.replace('priority-', '');
  } else if (['all', 'today', 'active', 'overdue', 'completed'].includes(state.currentView)) {
    params.status = state.currentView;
  } else {
    params.status = 'all';
  }

  return params;
}

/**
 * Priority Label & Icon Helper
 */
function getPriorityLabel(priority) {
  const map = {
    urgent: '🔥 Urgent',
    high: '⚡ High',
    medium: '🔷 Medium',
    low: '🌱 Low'
  };
  return map[priority] || (priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Medium');
}

/**
 * Render Header & Overview Stats
 */
function renderStats() {
  if (!state.stats) return;

  const { total = 0, completed = 0, active = 0, overdue = 0, dueToday = 0, completionRate = 0, priorityBreakdown = [] } = state.stats;

  // Sidebar counters
  if (dom.countAll) dom.countAll.textContent = total;
  if (dom.countToday) dom.countToday.textContent = dueToday;
  if (dom.countActive) dom.countActive.textContent = active;
  if (dom.countOverdue) dom.countOverdue.textContent = overdue;
  if (dom.countCompleted) dom.countCompleted.textContent = completed;

  // Top metric cards (if present in DOM)
  if (dom.metricTotal) dom.metricTotal.textContent = total;
  if (dom.metricActive) dom.metricActive.textContent = active;
  if (dom.metricRate) dom.metricRate.textContent = `${completionRate}%`;
  if (dom.metricOverdue) dom.metricOverdue.textContent = overdue;

  const urgentCount = priorityBreakdown.find(p => p.priority === 'urgent')?.count || 0;
  const highCount = priorityBreakdown.find(p => p.priority === 'high')?.count || 0;
  const mediumCount = priorityBreakdown.find(p => p.priority === 'medium')?.count || 0;
  const lowCount = priorityBreakdown.find(p => p.priority === 'low')?.count || 0;

  // Sidebar priority counters
  if (dom.countPriorityUrgent) dom.countPriorityUrgent.textContent = urgentCount;
  if (dom.countPriorityHigh) dom.countPriorityHigh.textContent = highCount;
  if (dom.countPriorityMedium) dom.countPriorityMedium.textContent = mediumCount;
  if (dom.countPriorityLow) dom.countPriorityLow.textContent = lowCount;

  if (dom.metricActiveSub) dom.metricActiveSub.textContent = `${urgentCount} urgent attention required`;
  if (dom.metricCompletedSub) dom.metricCompletedSub.textContent = `${completed} of ${total} resolved`;
  if (dom.metricOverdueSub) dom.metricOverdueSub.textContent = overdue > 0 ? `${overdue} overdue items require action` : `No past due items`;

  // Circular progress ring (if present in DOM)
  if (dom.progressRingBar) {
    const circumference = 113.1;
    const offset = circumference - (completionRate / 100) * circumference;
    dom.progressRingBar.style.strokeDashoffset = offset;
  }
}

/**
 * Render Tasks: Distributes tasks across Kanban Columns or Streamlined List
 */
function renderTasks() {
  const tasks = state.tasks;
  dom.viewTaskCounter.textContent = `${tasks.length} task${tasks.length === 1 ? '' : 's'}`;

  // Mini Board Progress Calculation
  const completedCount = tasks.filter(t => t.completed || t.status === 'completed').length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  if (dom.boardProgressFill) dom.boardProgressFill.style.width = `${progressPct}%`;
  if (dom.boardProgressText) dom.boardProgressText.textContent = `${progressPct}% Complete (${completedCount}/${tasks.length})`;

  // Entire Board Empty State Check
  if (tasks.length === 0) {
    if (dom.kanbanBoard) dom.kanbanBoard.classList.add('hidden');
    if (dom.tasksList) dom.tasksList.classList.add('hidden');
    dom.tasksEmptyState.classList.remove('hidden');

    if (state.filters.search) {
      if (dom.emptyStateTitle) dom.emptyStateTitle.textContent = 'No matching tasks';
      if (dom.emptyStateDesc) dom.emptyStateDesc.textContent = `No tasks found matching "${state.filters.search}". Try clearing your search.`;
    } else {
      const viewName = dom.currentViewTitle ? dom.currentViewTitle.textContent : 'current view';
      if (dom.emptyStateTitle) dom.emptyStateTitle.textContent = `No tasks in "${viewName}"`;
      if (dom.emptyStateDesc) dom.emptyStateDesc.textContent = 'All caught up! Add a new task above or select another view from the sidebar.';
    }
    return;
  }

  dom.tasksEmptyState.classList.add('hidden');

  // Mode 1: Kanban Board View
  if (state.viewMode === 'kanban') {
    if (dom.kanbanBoard) dom.kanbanBoard.classList.remove('hidden');
    if (dom.tasksList) dom.tasksList.classList.add('hidden');

    // Split tasks by Kanban column status
    const todoTasks = tasks.filter(t => (t.status === 'todo' || !t.status) && !t.completed);
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress' && !t.completed);
    const completedTasks = tasks.filter(t => t.status === 'completed' || t.completed);

    // Update column counters
    if (dom.badgeColTodo) dom.badgeColTodo.textContent = todoTasks.length;
    if (dom.badgeColInProgress) dom.badgeColInProgress.textContent = inProgressTasks.length;
    if (dom.badgeColCompleted) dom.badgeColCompleted.textContent = completedTasks.length;

    // Render columns
    renderColumnCards(dom.cardsColTodo, todoTasks, 'todo', 'No tasks to do. Click + to add one!');
    renderColumnCards(dom.cardsColInProgress, inProgressTasks, 'in_progress', 'No tasks in progress. Drag one here!');
    renderColumnCards(dom.cardsColCompleted, completedTasks, 'completed', 'Completed tasks will appear here.');
  } 
  // Mode 2: List View
  else {
    if (dom.kanbanBoard) dom.kanbanBoard.classList.add('hidden');
    if (dom.tasksList) dom.tasksList.classList.remove('hidden');

    dom.tasksList.innerHTML = '';
    tasks.forEach(task => {
      const card = createTaskCard(task, false);
      dom.tasksList.appendChild(card);
    });
  }
}

/**
 * Render cards into a Kanban column dropzone
 */
function renderColumnCards(container, colTasks, status, emptyText) {
  if (!container) return;
  container.innerHTML = '';

  if (colTasks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'kanban-col-empty';
    empty.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      <span>${emptyText}</span>
    `;
    container.appendChild(empty);
    return;
  }

  colTasks.forEach(task => {
    const card = createTaskCard(task, true);
    container.appendChild(card);
  });
}

/**
 * Move Task across Kanban columns with live API synchronization
 */
async function moveTaskStatus(taskId, newStatus) {
  try {
    const numericId = Number(taskId);
    const task = state.tasks.find(t => t.id === numericId);
    if (!task) return;

    const oldStatus = task.status;
    const oldCompleted = task.completed;

    // Optimistic UI update
    task.status = newStatus;
    task.completed = newStatus === 'completed';
    renderTasks();
    renderStats();

    // Call REST API PATCH endpoint
    const response = await fetch(`/api/todos/${numericId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        completed: newStatus === 'completed'
      })
    });

    const result = await response.json();
    if (!result.success) {
      // Revert on failure
      task.status = oldStatus;
      task.completed = oldCompleted;
      renderTasks();
      renderStats();
      throw new Error(result.error || 'Failed to update task status');
    }

    // Refresh application stats & sync
    await refreshTasksOnly();

    if (newStatus === 'completed') {
      showToast(`Task marked as Completed! 🎉`, 'success', 2200);
    } else if (newStatus === 'in_progress') {
      showToast(`Task moved to In Progress ⚡`, 'info', 2000);
    } else {
      showToast(`Task moved back to To Do 📋`, 'info', 2000);
    }
  } catch (err) {
    console.error('Error moving task status:', err);
    showToast(err.message, 'error');
    await refreshTasksOnly();
  }
}

/**
 * Build Single Task Card Node
 */
function createTaskCard(task, isKanban = true) {
  const card = document.createElement('div');
  const taskStatus = task.status || (task.completed ? 'completed' : 'todo');
  card.className = `task-card priority-card-${task.priority} status-${taskStatus} ${task.completed ? 'is-completed' : ''} ${task.is_pinned ? 'is-pinned' : ''}`;
  card.dataset.id = task.id;
  card.dataset.status = taskStatus;

  // Make draggable
  card.setAttribute('draggable', 'true');

  // Due date badge formatting
  let dueBadgeHtml = '';
  if (task.due_date) {
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = !task.completed && task.due_date < today;
    const isDueToday = !task.completed && task.due_date === today;
    
    let dueLabel = task.due_date;
    if (isDueToday) dueLabel = 'Today';
    else if (isOverdue) dueLabel = `Overdue (${task.due_date})`;

    const dueClass = isOverdue ? 'badge-due-overdue' : (isDueToday ? 'badge-due-today' : '');
    dueBadgeHtml = `
      <span class="badge-due ${dueClass}" title="Due Date">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        ${dueLabel}
      </span>
    `;
  }

  // Tags list HTML
  let tagsHtml = '';
  if (Array.isArray(task.tags) && task.tags.length > 0) {
    tagsHtml = task.tags.map(tag => `<span class="badge-tag">#${escapeHtml(tag)}</span>`).join('');
  }

  // Estimated minutes
  const estHtml = task.estimated_minutes ? `
    <span class="badge-due" title="Estimated Time">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 14 10"></polyline></svg>
      ${task.estimated_minutes}m
    </span>
  ` : '';

  // Bulk mode checkbox vs standard checkbox
  const checkControlHtml = state.bulkMode ? `
    <input type="checkbox" class="bulk-select-cb" data-id="${task.id}" ${state.selectedTaskIds.has(task.id) ? 'checked' : ''}>
  ` : `
    <div class="task-check-wrapper" title="${task.completed ? 'Mark Active' : 'Mark Completed'}">
      <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.completed ? 'checked' : ''}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </div>
  `;

  // Quick move buttons in Kanban mode
  let moveBarHtml = '';
  if (isKanban) {
    if (taskStatus === 'todo') {
      moveBarHtml = `
        <div class="card-move-bar">
          <span class="move-hint">Move:</span>
          <button class="btn-move-col" data-move="in_progress" title="Move to In Progress">
            <span>In Progress</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      `;
    } else if (taskStatus === 'in_progress') {
      moveBarHtml = `
        <div class="card-move-bar">
          <button class="btn-move-col btn-move-back" data-move="todo" title="Move back to To Do">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>To Do</span>
          </button>
          <button class="btn-move-col btn-move-done" data-move="completed" title="Mark Completed">
            <span>Done</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </button>
        </div>
      `;
    } else if (taskStatus === 'completed') {
      moveBarHtml = `
        <div class="card-move-bar">
          <button class="btn-move-col btn-move-back" data-move="todo" title="Reopen to To Do">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
            <span>Reopen</span>
          </button>
        </div>
      `;
    }
  }

  card.innerHTML = `
    ${checkControlHtml}

    <div class="task-content">
      <div class="task-header-row">
        <h3 class="task-title" data-action="edit" data-id="${task.id}">${escapeHtml(task.title)}</h3>
        <div class="task-actions">
          <button class="btn-task-action ${task.is_pinned ? 'pinned' : ''}" data-action="pin" data-id="${task.id}" title="${task.is_pinned ? 'Unpin' : 'Pin to top'}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="${task.is_pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
          </button>
          <button class="btn-task-action" data-action="edit" data-id="${task.id}" title="Edit Task">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn-task-action btn-delete-task" data-action="delete" data-id="${task.id}" title="Delete Task">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>

      ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}

      <div class="task-meta-row">
        <span class="badge-priority badge-priority-${task.priority}">${getPriorityLabel(task.priority)}</span>
        ${dueBadgeHtml}
        ${estHtml}
        ${tagsHtml}
      </div>

      ${moveBarHtml}
    </div>
  `;

  // Attach card drag events
  card.addEventListener('dragstart', (e) => {
    card.classList.add('is-dragging');
    e.dataTransfer.setData('text/plain', String(task.id));
    e.dataTransfer.effectAllowed = 'move';
    state.draggedTaskId = task.id;
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('is-dragging');
    document.querySelectorAll('.kanban-cards-track').forEach(track => track.classList.remove('drag-over'));
    state.draggedTaskId = null;
  });

  // Attach quick move button handlers
  card.querySelectorAll('[data-move]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const targetStatus = btn.dataset.move;
      await moveTaskStatus(task.id, targetStatus);
    });
  });

  // Attach card event listeners
  const checkbox = card.querySelector('.task-checkbox');
  if (checkbox) {
    checkbox.addEventListener('change', async (e) => {
      e.stopPropagation();
      await toggleTaskStatus(task.id);
    });
  }

  const bulkCb = card.querySelector('.bulk-select-cb');
  if (bulkCb) {
    bulkCb.addEventListener('change', (e) => {
      e.stopPropagation();
      toggleSelectTask(task.id, bulkCb.checked);
    });
  }

  card.querySelectorAll('[data-action="pin"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await toggleTaskPin(task.id);
    });
  });

  card.querySelectorAll('[data-action="edit"]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditTaskModal(task.id);
    });
  });

  card.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      promptDeleteTask(task);
    });
  });

  return card;
}

/**
 * Helper to get Category color
 */
function getCategoryColor(catName) {
  const found = state.categories.find(c => c.name.toLowerCase() === (catName || '').toLowerCase());
  return found ? found.color : '#6366f1';
}

/**
 * Toggle Task Completion
 */
async function toggleTaskStatus(id) {
  try {
    const res = await API.toggleTodo(id);
    const updated = res.data;

    // Local update
    const idx = state.tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      state.tasks[idx] = updated;
    }

    state.stats = await API.getStats();
    renderStats();
    renderTasks();

    showToast(`Task marked as ${updated.completed ? 'completed' : 'active'}`, 'success', 2000);
  } catch (err) {
    showToast(`Failed to update task: ${err.message}`, 'error');
    await refreshTasksOnly();
  }
}

/**
 * Toggle Task Pin
 */
async function toggleTaskPin(id) {
  try {
    const res = await API.togglePin(id);
    const updated = res.data;

    showToast(updated.is_pinned ? 'Task pinned to top' : 'Task unpinned', 'info', 2000);
    await refreshTasksOnly();
  } catch (err) {
    showToast(`Failed to pin task: ${err.message}`, 'error');
  }
}

/**
 * Prompt Delete Single Task
 */
function promptDeleteTask(task) {
  openConfirmModal(
    'Delete Task',
    `Are you sure you want to delete "${task.title}"? This will be recorded in the audit log.`,
    async () => {
      try {
        await API.deleteTodo(task.id);
        state.lastDeletedTask = task;
        
        showToast(
          `Task "${task.title}" deleted`,
          'info',
          5000,
          true /* hasUndo */,
          async () => {
            // Undo handler
            delete task.id; // Let DB assign new ID or re-insert
            await API.createTodo(task);
            showToast('Task restored!', 'success');
            await refreshTasksOnly();
          }
        );

        await refreshTasksOnly();
      } catch (err) {
        showToast(`Failed to delete: ${err.message}`, 'error');
      }
    }
  );
}

/**
 * Bulk Mode Selection
 */
function toggleBulkMode() {
  state.bulkMode = !state.bulkMode;
  state.selectedTaskIds.clear();

  if (state.bulkMode) {
    dom.bulkToolbar.classList.remove('hidden');
    dom.toggleBulkModeBtn.classList.add('active');
  } else {
    dom.bulkToolbar.classList.add('hidden');
    dom.toggleBulkModeBtn.classList.remove('active');
  }

  updateBulkToolbar();
  renderTasks();
}

function toggleSelectTask(id, isSelected) {
  if (isSelected) {
    state.selectedTaskIds.add(id);
  } else {
    state.selectedTaskIds.delete(id);
  }
  updateBulkToolbar();
}

function updateBulkToolbar() {
  dom.bulkSelectedCount.textContent = state.selectedTaskIds.size;
}

/**
 * Select / Filter Navigation
 */
function selectView(viewKey, displayName) {
  state.currentView = viewKey;

  // Update active state in view tabs
  if (dom.navItems) {
    dom.navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewKey);
    });
  }

  if (dom.priorityNavItems) {
    dom.priorityNavItems.forEach(item => {
      item.classList.toggle('active', `priority-${item.dataset.priority}` === viewKey);
    });
  }

  // Switch to tasks tab if in explorer/db tab
  switchTab('tasks');

  if (dom.currentViewTitle) dom.currentViewTitle.textContent = displayName;
  refreshTasksOnly();

  // Close mobile sidebar if present and open
  if (dom.sidebar) dom.sidebar.classList.remove('mobile-open');
}

/**
 * Switch Primary Stage Tabs
 */
function switchTab(tabId) {
  // Prevent navigating to developer tools when disabled in environment
  if (!state.devToolsEnabled && (tabId === 'api-explorer' || tabId === 'db-schema')) {
    tabId = 'tasks';
  }

  state.activeTab = tabId;

  // Toggle active tab panels
  if (dom.tabPanels) {
    dom.tabPanels.forEach(panel => {
      panel.classList.remove('active');
    });
  }

  const targetPanel = document.getElementById(tabId === 'tasks' ? 'tabTasks' : (tabId === 'api-explorer' ? 'tabApiExplorer' : (tabId === 'db-schema' ? 'tabDbSchema' : 'tabAnalytics')));
  if (targetPanel) targetPanel.classList.add('active');

  if (tabId === 'api-explorer') {
    loadApiConsoleDefault();
  } else if (tabId === 'db-schema') {
    loadDatabaseSchema();
  } else if (tabId === 'analytics') {
    loadAnalyticsTab();
  }

  // Update active tool indicators
  if (dom.toolItems) {
    dom.toolItems.forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabId);
    });
  }

  if (tabId !== 'tasks') {
    if (dom.navItems) dom.navItems.forEach(item => item.classList.remove('active'));
    if (dom.priorityNavItems) dom.priorityNavItems.forEach(item => item.classList.remove('active'));
  }

  if (dom.sidebar) dom.sidebar.classList.remove('mobile-open');
}

/**
 * Setup All Event Listeners
 */
function setupEventListeners() {
  // Mobile menu toggle
  if (dom.mobileMenuToggle && dom.sidebar) {
    dom.mobileMenuToggle.addEventListener('click', () => {
      dom.sidebar.classList.toggle('mobile-open');
    });
  }

  // View navigation clicks
  if (dom.navItems) {
    dom.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        const textEl = item.querySelector('.nav-item-text');
        const text = textEl ? textEl.textContent : (item.textContent || view);
        selectView(view, text);
      });
    });
  }

  // Priority navigation clicks
  if (dom.priorityNavItems) {
    dom.priorityNavItems.forEach(item => {
      item.addEventListener('click', () => {
        const priority = item.dataset.priority;
        const label = getPriorityLabel(priority);
        selectView(`priority-${priority}`, `${label} Tasks`);
      });
    });
  }

  // Tools tab clicks
  dom.toolItems.forEach(item => {
    item.addEventListener('click', () => {
      switchTab(item.dataset.tab);
    });
  });

  // Search input with debounce
  dom.globalSearchInput.addEventListener('input', (e) => {
    clearTimeout(state.searchDebounceTimer);
    const query = e.target.value;
    dom.clearSearchBtn.classList.toggle('hidden', !query);

    state.searchDebounceTimer = setTimeout(() => {
      state.filters.search = query;
      refreshTasksOnly();
    }, 250);
  });

  dom.clearSearchBtn.addEventListener('click', () => {
    dom.globalSearchInput.value = '';
    state.filters.search = '';
    dom.clearSearchBtn.classList.add('hidden');
    refreshTasksOnly();
    dom.globalSearchInput.focus();
  });

  // Priority Filter
  dom.priorityFilterSelect.addEventListener('change', (e) => {
    state.filters.priority = e.target.value;
    refreshTasksOnly();
  });

  // Sort Field
  dom.sortSelect.addEventListener('change', (e) => {
    state.filters.sortBy = e.target.value;
    refreshTasksOnly();
  });

  // Sort Direction Toggle
  dom.sortDirBtn.addEventListener('click', () => {
    state.filters.sortOrder = state.filters.sortOrder === 'asc' ? 'desc' : 'asc';
    dom.sortDirBtn.querySelector('svg').style.transform = state.filters.sortOrder === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)';
    refreshTasksOnly();
  });

  // View Switcher (Kanban Board vs Streamlined List)
  if (dom.viewModeKanban) {
    dom.viewModeKanban.addEventListener('click', () => {
      state.viewMode = 'kanban';
      dom.viewModeKanban.classList.add('active');
      if (dom.viewModeList) dom.viewModeList.classList.remove('active');
      renderTasks();
    });
  }

  if (dom.viewModeList) {
    dom.viewModeList.addEventListener('click', () => {
      state.viewMode = 'list';
      dom.viewModeList.classList.add('active');
      if (dom.viewModeKanban) dom.viewModeKanban.classList.remove('active');
      renderTasks();
    });
  }

  // Kanban Drag and Drop Drop-zones
  const kanbanTracks = [
    { el: dom.cardsColTodo, status: 'todo' },
    { el: dom.cardsColInProgress, status: 'in_progress' },
    { el: dom.cardsColCompleted, status: 'completed' }
  ];

  kanbanTracks.forEach(({ el, status }) => {
    if (!el) return;

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      el.classList.add('drag-over');
    });

    el.addEventListener('dragleave', (e) => {
      if (!el.contains(e.relatedTarget)) {
        el.classList.remove('drag-over');
      }
    });

    el.addEventListener('drop', async (e) => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const taskId = e.dataTransfer.getData('text/plain') || state.draggedTaskId;
      if (taskId) {
        await moveTaskStatus(taskId, status);
      }
    });
  });

  // Kanban Column Inline "+ Add" button
  if (dom.btnAddColTodo) {
    dom.btnAddColTodo.addEventListener('click', () => {
      openCreateTaskModal('todo');
    });
  }

  // Bulk Mode Toggle
  dom.toggleBulkModeBtn.addEventListener('click', toggleBulkMode);

  dom.bulkCancelBtn.addEventListener('click', () => {
    toggleBulkMode();
  });

  dom.bulkSelectAllBtn.addEventListener('click', () => {
    state.tasks.forEach(t => state.selectedTaskIds.add(t.id));
    updateBulkToolbar();
    renderTasks();
  });

  dom.bulkCompleteBtn.addEventListener('click', async () => {
    const ids = Array.from(state.selectedTaskIds);
    if (ids.length === 0) return;

    try {
      await API.bulkAction('complete', ids);
      showToast(`Marked ${ids.length} tasks as completed`, 'success');
      toggleBulkMode();
      await refreshTasksOnly();
    } catch (err) {
      showToast(`Bulk action failed: ${err.message}`, 'error');
    }
  });

  dom.bulkDeleteBtn.addEventListener('click', () => {
    const ids = Array.from(state.selectedTaskIds);
    if (ids.length === 0) return;

    openConfirmModal(
      'Bulk Delete Tasks',
      `Are you sure you want to permanently delete these ${ids.length} selected tasks?`,
      async () => {
        try {
          await API.bulkAction('delete', ids);
          showToast(`Deleted ${ids.length} tasks`, 'info');
          toggleBulkMode();
          await refreshTasksOnly();
        } catch (err) {
          showToast(`Bulk delete failed: ${err.message}`, 'error');
        }
      }
    );
  });

  // Quick Add Form
  dom.quickAddForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = dom.quickAddTitle.value.trim();
    if (!title) return;

    const payload = {
      title,
      category: 'General',
      priority: dom.quickAddPriority.value,
      due_date: dom.quickAddDueDate.value || null,
      tags: []
    };

    try {
      await API.createTodo(payload);
      dom.quickAddTitle.value = '';
      dom.quickAddDueDate.value = '';
      showToast('Task created successfully!', 'success');
      await refreshTasksOnly();
    } catch (err) {
      showToast(`Failed to create task: ${err.message}`, 'error');
    }
  });

  // Modal Open / Close buttons
  dom.openCreateModalBtn.addEventListener('click', () => openCreateTaskModal());
  dom.emptyStateActionBtn.addEventListener('click', () => openCreateTaskModal());
  dom.closeTaskModalBtn.addEventListener('click', closeTaskModal);
  dom.cancelTaskModalBtn.addEventListener('click', closeTaskModal);

  // Task Form Submit
  dom.taskForm.addEventListener('submit', handleTaskFormSubmit);

  // Tag Input in Modal
  dom.taskTagsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = dom.taskTagsInput.value.replace(',', '').trim();
      if (val && !state.activeModalTags.includes(val)) {
        state.activeModalTags.push(val);
        renderActiveModalTags();
      }
      dom.taskTagsInput.value = '';
    }
  });

  // Modal backdrop click handlers
  dom.taskModalOverlay.addEventListener('click', (e) => {
    if (e.target === dom.taskModalOverlay) closeTaskModal();
  });
  dom.confirmModalOverlay.addEventListener('click', (e) => {
    if (e.target === dom.confirmModalOverlay) closeConfirmModal();
  });

  // Confirm Modal
  dom.closeConfirmModalBtn.addEventListener('click', closeConfirmModal);
  dom.confirmCancelBtn.addEventListener('click', closeConfirmModal);
  dom.confirmProceedBtn.addEventListener('click', async () => {
    if (currentConfirmAction) {
      const action = currentConfirmAction;
      closeConfirmModal();
      await action();
    }
  });

  // Reset Demo DB
  dom.resetDemoBtn.addEventListener('click', () => {
    openConfirmModal(
      'Reset Demo Database',
      'This will reset all tasks and categories back to sample seed data. Are you sure?',
      async () => {
        try {
          await API.resetDemo();
          showToast('Database reset to fresh sample data!', 'success');
          await loadAppData();
        } catch (err) {
          showToast(`Reset failed: ${err.message}`, 'error');
        }
      }
    );
  });

  // REST API Explorer Controls
  initApiExplorerEvents();

  // DB Schema Refresh
  dom.btnRefreshSchema.addEventListener('click', loadDatabaseSchema);
}

/**
 * Keyboard Shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // If currently typing in an input, don't trigger shortcuts
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      if (e.key === 'Escape') {
        document.activeElement.blur();
        closeTaskModal();
        closeCategoryModal();
        closeConfirmModal();
      }
      return;
    }

    // '/' or 'Ctrl+K' focuses search
    if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
      e.preventDefault();
      dom.globalSearchInput.focus();
    }

    // 'n' or 'N' opens new task modal
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      openCreateTaskModal();
    }

    // Escape closes any open modals
    if (e.key === 'Escape') {
      closeTaskModal();
      closeCategoryModal();
      closeConfirmModal();
    }
  });
}

/**
 * Task Modal Functions
 */
function openCreateTaskModal(defaultStatus = 'todo') {
  dom.taskModalTitle.textContent = 'Create New Task';
  dom.editTaskId.value = '';
  dom.taskForm.reset();
  state.activeModalTags = [];
  renderActiveModalTags();

  // Workflow status
  const statusRadio = dom.taskForm.querySelector(`input[name="status"][value="${defaultStatus}"]`);
  if (statusRadio) statusRadio.checked = true;

  // Pre-select priority if currently viewing a priority view
  if (state.currentView.startsWith('priority-')) {
    const p = state.currentView.replace('priority-', '');
    const radio = dom.taskForm.querySelector(`input[name="priority"][value="${p}"]`);
    if (radio) radio.checked = true;
  }

  dom.taskModalOverlay.classList.remove('hidden');
  setTimeout(() => dom.taskTitleInput.focus(), 50);
}

function openEditTaskModal(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  dom.taskModalTitle.textContent = 'Edit Task';
  dom.editTaskId.value = task.id;
  dom.taskTitleInput.value = task.title;
  dom.taskDescInput.value = task.description || '';
  dom.taskDueDateInput.value = task.due_date || '';
  dom.taskEstMinutesInput.value = task.estimated_minutes || 30;
  dom.taskPinnedInput.checked = Boolean(task.is_pinned);

  // Set status radio
  const taskStatus = task.status || (task.completed ? 'completed' : 'todo');
  const statusRadio = dom.taskForm.querySelector(`input[name="status"][value="${taskStatus}"]`);
  if (statusRadio) statusRadio.checked = true;

  // Set priority radio
  const radio = dom.taskForm.querySelector(`input[name="priority"][value="${task.priority}"]`);
  if (radio) radio.checked = true;

  // Tags
  state.activeModalTags = Array.isArray(task.tags) ? [...task.tags] : [];
  renderActiveModalTags();

  dom.taskModalOverlay.classList.remove('hidden');
  setTimeout(() => dom.taskTitleInput.focus(), 50);
}

function closeTaskModal() {
  dom.taskModalOverlay.classList.add('hidden');
}

function renderActiveModalTags() {
  dom.tagsChipsList.innerHTML = '';
  state.activeModalTags.forEach((tag, idx) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `
      #${escapeHtml(tag)}
      <span class="tag-chip-remove" data-idx="${idx}">✕</span>
    `;

    chip.querySelector('.tag-chip-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      state.activeModalTags.splice(idx, 1);
      renderActiveModalTags();
    });

    dom.tagsChipsList.appendChild(chip);
  });
}

async function handleTaskFormSubmit(e) {
  e.preventDefault();
  const id = dom.editTaskId.value;
  const title = dom.taskTitleInput.value.trim();
  if (!title) return;

  const priorityRadio = dom.taskForm.querySelector('input[name="priority"]:checked');
  const statusRadio = dom.taskForm.querySelector('input[name="status"]:checked');
  const selectedStatus = statusRadio ? statusRadio.value : 'todo';

  const payload = {
    title,
    description: dom.taskDescInput.value.trim(),
    category: 'General',
    status: selectedStatus,
    completed: selectedStatus === 'completed' ? 1 : 0,
    priority: priorityRadio ? priorityRadio.value : 'medium',
    due_date: dom.taskDueDateInput.value || null,
    estimated_minutes: Number(dom.taskEstMinutesInput.value) || 30,
    tags: state.activeModalTags,
    is_pinned: dom.taskPinnedInput.checked ? 1 : 0
  };

  try {
    if (id) {
      await API.updateTodo(id, payload);
      showToast('Task updated successfully!', 'success');
    } else {
      await API.createTodo(payload);
      showToast('New task added successfully!', 'success');
    }

    closeTaskModal();
    await refreshTasksOnly();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}


/**
 * Confirmation Modal
 */
let currentConfirmAction = null;
function openConfirmModal(title, message, onProceed) {
  dom.confirmModalTitle.textContent = title;
  dom.confirmModalMessage.textContent = message;
  currentConfirmAction = onProceed;
  dom.confirmModalOverlay.classList.remove('hidden');
}

function closeConfirmModal() {
  dom.confirmModalOverlay.classList.add('hidden');
  currentConfirmAction = null;
}



/**
 * REST API Explorer & Live Console
 */
function initApiExplorerEvents() {
  // Method selection change
  dom.apiMethodSelect.addEventListener('change', () => {
    updatePayloadVisibility();
  });

  // Preset selector
  dom.apiPresetSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val.includes('[POST]')) {
      dom.apiMethodSelect.value = 'POST';
      dom.apiEndpointInput.value = '/api/todos';
      dom.apiRequestBody.value = JSON.stringify({
        title: "Test REST API Integration",
        description: "Created via interactive in-app REST API console",
        priority: "high",
        category: "Development",
        tags: ["api-test", "rest", "fullstack"]
      }, null, 2);
    } else if (val.includes('[PATCH]')) {
      dom.apiMethodSelect.value = 'PATCH';
      dom.apiEndpointInput.value = '/api/todos/1/toggle';
      dom.apiRequestBody.value = '';
    } else {
      dom.apiMethodSelect.value = 'GET';
      dom.apiEndpointInput.value = val.split(' ')[0];
      dom.apiRequestBody.value = '';
    }
    updatePayloadVisibility();
  });

  // Execute button
  dom.btnExecuteApi.addEventListener('click', executeApiTest);

  // Format JSON
  dom.formatJsonBtn.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(dom.apiRequestBody.value);
      dom.apiRequestBody.value = JSON.stringify(parsed, null, 2);
    } catch (err) {
      showToast('Invalid JSON in request body', 'error');
    }
  });

  // Copy Response JSON
  dom.btnCopyApiResponse.addEventListener('click', () => {
    const text = dom.apiResponseViewer.textContent;
    navigator.clipboard.writeText(text).then(() => {
      showToast('Response JSON copied to clipboard!', 'info');
    });
  });
}

function updatePayloadVisibility() {
  const method = dom.apiMethodSelect.value;
  const needsPayload = ['POST', 'PUT', 'PATCH'].includes(method);
  document.getElementById('payloadEditorWrapper').style.display = needsPayload ? 'flex' : 'none';
}

function loadApiConsoleDefault() {
  updatePayloadVisibility();
  if (dom.apiResponseViewer.textContent.includes('Press "Send Request"')) {
    executeApiTest();
  }
}

async function executeApiTest() {
  const method = dom.apiMethodSelect.value;
  const endpoint = dom.apiEndpointInput.value.trim() || '/api/todos';
  let body = null;

  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const bodyText = dom.apiRequestBody.value.trim();
    if (bodyText) {
      try {
        body = JSON.parse(bodyText);
      } catch (err) {
        showToast('Syntax Error: Request body is not valid JSON', 'error');
        return;
      }
    }
  }

  dom.responseStatusBadge.textContent = 'Sending...';
  dom.responseStatusBadge.className = 'response-badge';
  dom.responseTimePill.textContent = '...';

  const res = await API.executeRaw(method, endpoint, body);

  dom.responseStatusBadge.textContent = `${res.status} ${res.statusText || ''}`;
  dom.responseTimePill.textContent = `${res.duration} ms`;

  if (res.status >= 200 && res.status < 300) {
    dom.responseStatusBadge.className = 'response-badge response-status-2xx';
  } else {
    dom.responseStatusBadge.className = 'response-badge response-status-4xx';
  }

  dom.apiResponseViewer.innerHTML = syntaxHighlightJson(res.data);
}

/**
 * Syntax highlighter for JSON preview
 */
function syntaxHighlightJson(json) {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, null, 2);
  }
  json = escapeHtml(json);
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
    let cls = 'json-number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'json-key';
      } else {
        cls = 'json-string';
      }
    } else if (/true|false/.test(match)) {
      cls = 'json-boolean';
    } else if (/null/.test(match)) {
      cls = 'json-null';
    }
    return `<span class="${cls}">${match}</span>`;
  });
}

/**
 * Database Schema Inspector Tab
 */
async function loadDatabaseSchema() {
  dom.schemaCardsGrid.innerHTML = '<div class="loading-shimmer" style="grid-column: 1/-1; height: 120px;"></div>';

  try {
    const schema = await API.getSchema();
    dom.schemaCardsGrid.innerHTML = '';

    for (const [tableName, info] of Object.entries(schema)) {
      const card = document.createElement('div');
      card.className = 'schema-card';

      let rowsHtml = info.columns.map(col => `
        <tr>
          <td>
            <strong>${col.name}</strong>
            ${col.pk ? '<span class="schema-pk">PRIMARY KEY</span>' : ''}
          </td>
          <td><code>${col.type || 'TEXT'}</code></td>
          <td>${col.notnull ? '<span style="color:#f43f5e">NOT NULL</span>' : '<span style="color:#94a3b8">NULLABLE</span>'}</td>
          <td><code>${col.dflt_value !== null ? col.dflt_value : '—'}</code></td>
        </tr>
      `).join('');

      card.innerHTML = `
        <div class="schema-card-header">
          <div class="schema-table-name">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
            ${tableName}
          </div>
          <span class="schema-row-badge">${info.rowCount} rows</span>
        </div>
        <table class="schema-table">
          <thead>
            <tr>
              <th>Column</th>
              <th>Type</th>
              <th>Constraint</th>
              <th>Default</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      dom.schemaCardsGrid.appendChild(card);
    }
  } catch (err) {
    dom.schemaCardsGrid.innerHTML = `<div class="empty-state-desc">Failed to load schema: ${err.message}</div>`;
  }
}

/**
 * Analytics & Audit Log Tab
 */
async function loadAnalyticsTab() {
  try {
    const [stats, activities] = await Promise.all([
      API.getStats(),
      API.getActivity(15)
    ]);

    // Render Priority Completion Rates
    dom.categoryAnalyticsBars.innerHTML = '';
    const priorityColors = {
      urgent: 'var(--color-urgent)',
      high: 'var(--color-high)',
      medium: 'var(--color-medium)',
      low: 'var(--color-low)'
    };

    ['urgent', 'high', 'medium', 'low'].forEach(p => {
      const pData = stats.priorityBreakdown.find(item => item.priority === p);
      const totalCount = pData ? pData.count : 0;
      const completedCount = pData ? pData.completed_count : 0;
      const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      const row = document.createElement('div');
      row.className = 'bar-row';
      row.innerHTML = `
        <div class="bar-labels">
          <span>${getPriorityLabel(p)}</span>
          <span>${completedCount} / ${totalCount} completed (${rate}%)</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${rate}%; background-color: ${priorityColors[p]};"></div>
        </div>
      `;
      dom.categoryAnalyticsBars.appendChild(row);
    });

    // Render Priority Distribution Bars
    dom.priorityAnalyticsBars.innerHTML = '';

    stats.priorityBreakdown.forEach(p => {
      const percentage = Math.round((p.count / totalTasks) * 100);
      const row = document.createElement('div');
      row.className = 'bar-row';
      row.innerHTML = `
        <div class="bar-labels">
          <span style="text-transform: capitalize;">${p.priority}</span>
          <span>${p.count} tasks (${percentage}%)</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${percentage}%; background-color: ${priorityColors[p.priority] || 'var(--accent-primary)'};"></div>
        </div>
      `;
      dom.priorityAnalyticsBars.appendChild(row);
    });

    // Render Recent Audit Logs
    dom.auditLogList.innerHTML = '';
    activities.forEach(act => {
      const item = document.createElement('div');
      item.className = 'audit-item';

      const actionColors = {
        CREATED: 'bg-indigo-soft',
        UPDATED: 'bg-blue-soft',
        COMPLETED: 'bg-emerald-soft',
        DELETED: 'bg-rose-soft'
      };

      item.innerHTML = `
        <div class="audit-item-left">
          <span class="audit-badge-action ${actionColors[act.action] || 'bg-indigo-soft'}">${act.action}</span>
          <span>${escapeHtml(act.details)}</span>
        </div>
        <span class="audit-time">${formatRelativeTime(act.created_at)}</span>
      `;
      dom.auditLogList.appendChild(item);
    });
  } catch (err) {
    showToast(`Error loading analytics: ${err.message}`, 'error');
  }
}

/**
 * Toast Notification System
 */
function showToast(message, type = 'info', duration = 3500, hasUndo = false, onUndo = null) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  toast.innerHTML = `
    <span class="toast-message">${escapeHtml(message)}</span>
    ${hasUndo ? `<button class="toast-undo-btn">Undo</button>` : ''}
  `;

  if (hasUndo && onUndo) {
    toast.querySelector('.toast-undo-btn').addEventListener('click', () => {
      onUndo();
      toast.remove();
    });
  }

  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

/**
 * Loading Skeleton Helper
 */
function showLoading(isLoading) {
  if (isLoading) {
    dom.tasksSkeleton.classList.remove('hidden');
    dom.tasksList.classList.add('hidden');
  } else {
    dom.tasksSkeleton.classList.add('hidden');
  }
}

/**
 * Utility: HTML Escape
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Utility: Format relative timestamp
 */
function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}
