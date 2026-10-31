/**
 * TaskFlow REST - API Client Service
 * Encapsulates standard fetch calls, query serialization, and error handling.
 */
const API = {
  baseUrl: window.location.origin,

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const startTime = performance.now();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const duration = Math.round(performance.now() - startTime);

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMsg = (data && data.error) ? data.error : `HTTP ${response.status}: ${response.statusText}`;
        const error = new Error(errorMsg);
        error.status = response.status;
        error.data = data;
        error.duration = duration;
        throw error;
      }

      return {
        ok: true,
        status: response.status,
        statusText: response.statusText,
        duration,
        data
      };
    } catch (err) {
      if (!err.duration) {
        err.duration = Math.round(performance.now() - startTime);
      }
      throw err;
    }
  },

  // Todo Endpoints
  async getTodos(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);
    if (filters.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request(`/api/todos${queryStr}`);
    return res.data;
  },

  async getTodoById(id) {
    const res = await this.request(`/api/todos/${id}`);
    return res.data.data;
  },

  async createTodo(payload) {
    const res = await this.request('/api/todos', {
      method: 'POST',
      body: payload
    });
    return res.data;
  },

  async updateTodo(id, payload) {
    const res = await this.request(`/api/todos/${id}`, {
      method: 'PUT',
      body: payload
    });
    return res.data;
  },

  async patchTodo(id, payload) {
    const res = await this.request(`/api/todos/${id}`, {
      method: 'PATCH',
      body: payload
    });
    return res.data;
  },

  async toggleTodo(id) {
    const res = await this.request(`/api/todos/${id}/toggle`, {
      method: 'PATCH'
    });
    return res.data;
  },

  async togglePin(id) {
    const res = await this.request(`/api/todos/${id}/pin`, {
      method: 'PATCH'
    });
    return res.data;
  },

  async deleteTodo(id) {
    const res = await this.request(`/api/todos/${id}`, {
      method: 'DELETE'
    });
    return res.data;
  },

  async bulkAction(action, ids) {
    const res = await this.request('/api/todos/bulk', {
      method: 'POST',
      body: { action, ids }
    });
    return res.data;
  },

  // Categories Endpoints
  async getCategories() {
    const res = await this.request('/api/categories');
    return res.data.data;
  },

  async createCategory(payload) {
    const res = await this.request('/api/categories', {
      method: 'POST',
      body: payload
    });
    return res.data;
  },

  async deleteCategory(id) {
    const res = await this.request(`/api/categories/${id}`, {
      method: 'DELETE'
    });
    return res.data;
  },

  // Stats & System Endpoints
  async getStats() {
    const res = await this.request('/api/stats');
    return res.data.data;
  },

  async getActivity(limit = 15) {
    const res = await this.request(`/api/activity?limit=${limit}`);
    return res.data.data;
  },

  async getSchema() {
    const res = await this.request('/api/schema');
    return res.data.data;
  },

  async resetDemo() {
    const res = await this.request('/api/reset', {
      method: 'POST'
    });
    return res.data;
  },

  async getHealth() {
    const res = await this.request('/api/health');
    return res.data;
  },

  // Raw request execution for live API console
  async executeRaw(method, endpoint, body) {
    const startTime = performance.now();
    try {
      const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
      const options = {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && body) {
        options.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const duration = Math.round(performance.now() - startTime);

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        duration,
        data
      };
    } catch (err) {
      return {
        ok: false,
        status: 0,
        statusText: 'Network / Connection Error',
        duration: Math.round(performance.now() - startTime),
        data: { error: err.message }
      };
    }
  }
};

window.API = API;
