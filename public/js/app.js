/**
 * ProjectCamp — Comprehensive Frontend Application
 */

// ============================================================================
// State Management
// ============================================================================
const state = {
  token: localStorage.getItem("pc_token") || null,
  user: null,
  projects: [],
  currentProject: null,
  currentRole: null, // "admin" | "project_admin" | "member"
  tasks: [],
  activeTask: null,
  notes: [],
  members: [],
  activeTab: "tasks"
};

// ============================================================================
// Toast Notification Utility
// ============================================================================
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  const icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";
  toast.innerHTML = `
    <span style="font-weight: 700;">${icon}</span>
    <div class="toast-message">${escapeHtml(message)}</div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================================
// Centralized API Client
// ============================================================================
async function apiCall(endpoint, { method = "GET", body = null, isFormData = false } = {}) {
  const headers = {};
  if (state.token) {
    headers["Authorization"] = `Bearer ${state.token}`;
  }

  let fetchBody = body;
  if (body && !isFormData) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }

  try {
    const res = await fetch(endpoint, {
      method,
      headers,
      body: fetchBody
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        // If session expired or unauthorized on protected route
        if (state.token) {
          logoutUser(false);
          showToast("Session expired. Please log in again.", "error");
        }
      }
      const errorMsg = data.message || (data.errors && data.errors[0] ? Object.values(data.errors[0])[0] : "Request failed");
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    throw err;
  }
}

// ============================================================================
// System Health Monitoring
// ============================================================================
async function checkSystemHealth() {
  const dot = document.getElementById("health-dot");
  const text = document.getElementById("health-text");

  try {
    const res = await fetch("/api/v1/healthcheck");
    if (res.ok) {
      dot.className = "pulse-dot online";
      text.textContent = "API Online";
      text.style.color = "var(--success)";
    } else {
      throw new Error();
    }
  } catch {
    dot.className = "pulse-dot";
    text.textContent = "API Offline";
    text.style.color = "var(--danger)";
  }
}
checkSystemHealth();
setInterval(checkSystemHealth, 20000);

// ============================================================================
// Modal Management
// ============================================================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("active");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

document.querySelectorAll(".modal-close").forEach((btn) => {
  btn.addEventListener("click", () => {
    const modalId = btn.getAttribute("data-modal");
    if (modalId) closeModal(modalId);
  });
});

document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.remove("active");
    }
  });
});

// ============================================================================
// Authentication Flow
// ============================================================================
const authScreen = document.getElementById("auth-screen");
const appWorkspace = document.getElementById("app-workspace");
const navUserSection = document.getElementById("nav-user-section");

const tabBtnLogin = document.getElementById("tab-btn-login");
const tabBtnRegister = document.getElementById("tab-btn-register");
const formLogin = document.getElementById("form-login");
const formRegister = document.getElementById("form-register");
const formForgotPassword = document.getElementById("form-forgot-password");
const linkForgotPassword = document.getElementById("link-forgot-password");
const linkBackToLogin = document.getElementById("link-back-to-login");

// Auth Tabs
tabBtnLogin.addEventListener("click", () => {
  tabBtnLogin.classList.add("active");
  tabBtnRegister.classList.remove("active");
  formLogin.style.display = "block";
  formRegister.style.display = "none";
  formForgotPassword.style.display = "none";
});

tabBtnRegister.addEventListener("click", () => {
  tabBtnRegister.classList.add("active");
  tabBtnLogin.classList.remove("active");
  formRegister.style.display = "block";
  formLogin.style.display = "none";
  formForgotPassword.style.display = "none";
});

linkForgotPassword.addEventListener("click", (e) => {
  e.preventDefault();
  formLogin.style.display = "none";
  formRegister.style.display = "none";
  formForgotPassword.style.display = "block";
});

linkBackToLogin.addEventListener("click", (e) => {
  e.preventDefault();
  tabBtnLogin.click();
});

// Register
formRegister.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("reg-username").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const fullName = document.getElementById("reg-fullname").value.trim();
  const password = document.getElementById("reg-password").value;

  try {
    const res = await apiCall("/api/v1/auth/register", {
      method: "POST",
      body: { username, email, fullName, password }
    });
    showToast("Registration successful! Check email for verification link.", "success");
    formRegister.reset();
    tabBtnLogin.click();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// Login
formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const res = await apiCall("/api/v1/auth/login", {
      method: "POST",
      body: { email, password }
    });

    state.token = res.data.accessToken;
    state.user = res.data.user;
    localStorage.setItem("pc_token", state.token);
    localStorage.setItem("pc_user", JSON.stringify(state.user));

    showToast(`Welcome back, ${state.user.username}!`, "success");
    showAppUI();
    loadProjects();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// Logout
function logoutUser(notify = true) {
  if (state.token) {
    apiCall("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
  }
  state.token = null;
  state.user = null;
  state.projects = [];
  state.currentProject = null;
  localStorage.removeItem("pc_token");
  localStorage.removeItem("pc_user");
  showAuthUI();
  if (notify) showToast("Logged out successfully");
}

document.getElementById("btn-logout").addEventListener("click", () => logoutUser(true));

// Forgot Password
formForgotPassword.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("forgot-email").value.trim();
  try {
    await apiCall("/api/v1/auth/forgot-password", {
      method: "POST",
      body: { email }
    });
    showToast("Password reset link sent to your email.", "success");
    tabBtnLogin.click();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// Change Password
document.getElementById("btn-change-password-nav").addEventListener("click", () => {
  document.getElementById("form-change-password").reset();
  openModal("modal-change-password");
});

document.getElementById("form-change-password").addEventListener("submit", async (e) => {
  e.preventDefault();
  const oldPassword = document.getElementById("cp-old").value;
  const newPassword = document.getElementById("cp-new").value;

  try {
    await apiCall("/api/v1/auth/change-password", {
      method: "POST",
      body: { oldPassword, newPassword }
    });
    showToast("Password changed successfully!", "success");
    closeModal("modal-change-password");
  } catch (err) {
    showToast(err.message, "error");
  }
});

function showAuthUI() {
  authScreen.style.display = "flex";
  appWorkspace.style.display = "none";
  navUserSection.style.display = "none";
}

function showAppUI() {
  authScreen.style.display = "none";
  appWorkspace.style.display = "flex";
  navUserSection.style.display = "flex";

  if (state.user) {
    document.getElementById("nav-username").textContent = state.user.fullName || state.user.username;
    document.getElementById("nav-email").textContent = state.user.email;
    document.getElementById("nav-avatar").textContent = (state.user.username || "U")[0].toUpperCase();
  }
}

// Initial session check
async function initSession() {
  if (!state.token) {
    showAuthUI();
    return;
  }
  try {
    const res = await apiCall("/api/v1/auth/current-user");
    state.user = res.data;
    localStorage.setItem("pc_user", JSON.stringify(state.user));
    showAppUI();
    loadProjects();
  } catch {
    logoutUser(false);
  }
}

// ============================================================================
// Projects Flow
// ============================================================================
const projectsListEl = document.getElementById("projects-list");
const currentProjectNameEl = document.getElementById("current-project-name");
const currentProjectDescEl = document.getElementById("current-project-desc");
const currentRoleBadgeEl = document.getElementById("current-user-role-badge");

async function loadProjects() {
  try {
    const res = await apiCall("/api/v1/projects");
    state.projects = res.data || [];
    renderProjectsList();

    if (state.projects.length > 0) {
      // Keep existing project or select first
      const currentId = state.currentProject?._id;
      const found = state.projects.find((p) => p._id === currentId);
      selectProject(found ? found._id : state.projects[0]._id);
    } else {
      renderEmptyWorkspace();
    }
  } catch (err) {
    showToast("Failed to load projects: " + err.message, "error");
  }
}

function renderProjectsList() {
  projectsListEl.innerHTML = "";
  if (state.projects.length === 0) {
    projectsListEl.innerHTML = `<div class="empty-state" style="padding: 1rem;"><p>No projects yet.</p></div>`;
    return;
  }

  state.projects.forEach((proj) => {
    const item = document.createElement("div");
    item.className = `project-item ${state.currentProject?._id === proj._id ? "active" : ""}`;
    item.innerHTML = `
      <div class="project-item-title">
        <span>📁</span>
        <span>${escapeHtml(proj.name)}</span>
      </div>
      <span class="project-item-count" title="Members">${proj.membersCount || 1}</span>
    `;
    item.addEventListener("click", () => selectProject(proj._id));
    projectsListEl.appendChild(item);
  });
}

async function selectProject(projectId) {
  const proj = state.projects.find((p) => p._id === projectId);
  if (!proj) return;

  state.currentProject = proj;
  state.currentRole = proj.role || "member";

  renderProjectsList();

  // Update Topbar
  currentProjectNameEl.textContent = proj.name;
  currentProjectDescEl.textContent = proj.description || "No description provided.";
  
  currentRoleBadgeEl.textContent = state.currentRole.replace("_", " ");
  currentRoleBadgeEl.className = `badge badge-${state.currentRole}`;

  // Apply Role Permissions to UI controls
  updateRolePermissionsUI();

  // Load project items
  loadTasks();
  loadNotes();
  loadMembers();
}

function updateRolePermissionsUI() {
  const isAdmin = state.currentRole === "admin";
  const isProjAdmin = state.currentRole === "project_admin";
  const canManageProject = isAdmin;
  const canManageTasks = isAdmin || isProjAdmin;

  document.getElementById("btn-edit-project").style.display = canManageProject ? "inline-flex" : "none";
  document.getElementById("btn-delete-project").style.display = canManageProject ? "inline-flex" : "none";
  document.getElementById("btn-create-task").style.display = canManageTasks ? "inline-flex" : "none";
  document.getElementById("btn-add-note").style.display = isAdmin ? "inline-flex" : "none";
  document.getElementById("btn-add-member").style.display = isAdmin ? "inline-flex" : "none";
}

function renderEmptyWorkspace() {
  state.currentProject = null;
  currentProjectNameEl.textContent = "No Projects";
  currentProjectDescEl.textContent = "Create a new project from the sidebar to get started.";
  currentRoleBadgeEl.textContent = "";
  document.getElementById("project-actions-area").style.display = "none";
  document.getElementById("col-todo-cards").innerHTML = "";
  document.getElementById("col-in-progress-cards").innerHTML = "";
  document.getElementById("col-done-cards").innerHTML = "";
  document.getElementById("notes-grid").innerHTML = "";
  document.getElementById("members-table-body").innerHTML = "";
}

// Create Project
document.getElementById("btn-new-project").addEventListener("click", () => {
  document.getElementById("modal-project-title").textContent = "Create Project";
  document.getElementById("project-id").value = "";
  document.getElementById("project-name").value = "";
  document.getElementById("project-description").value = "";
  openModal("modal-project");
});

// Edit Project
document.getElementById("btn-edit-project").addEventListener("click", () => {
  if (!state.currentProject) return;
  document.getElementById("modal-project-title").textContent = "Edit Project";
  document.getElementById("project-id").value = state.currentProject._id;
  document.getElementById("project-name").value = state.currentProject.name;
  document.getElementById("project-description").value = state.currentProject.description || "";
  openModal("modal-project");
});

// Save Project Form
document.getElementById("form-project").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("project-id").value;
  const name = document.getElementById("project-name").value.trim();
  const description = document.getElementById("project-description").value.trim();

  try {
    if (id) {
      // Update
      const res = await apiCall(`/api/v1/projects/${id}`, {
        method: "PUT",
        body: { name, description }
      });
      showToast("Project updated successfully!");
    } else {
      // Create
      const res = await apiCall("/api/v1/projects", {
        method: "POST",
        body: { name, description }
      });
      showToast("Project created successfully!");
    }
    closeModal("modal-project");
    loadProjects();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// Delete Project
document.getElementById("btn-delete-project").addEventListener("click", async () => {
  if (!state.currentProject) return;
  if (!confirm(`Are you sure you want to permanently delete "${state.currentProject.name}"?`)) return;

  try {
    await apiCall(`/api/v1/projects/${state.currentProject._id}`, { method: "DELETE" });
    showToast("Project deleted successfully");
    loadProjects();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// ============================================================================
// Workspace Tabs (Tasks, Notes, Members)
// ============================================================================
document.querySelectorAll(".ws-tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".ws-tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => (c.style.display = "none"));

    btn.classList.add("active");
    const target = btn.getAttribute("data-tab");
    state.activeTab = target;
    document.getElementById(`view-${target}`).style.display = "block";
  });
});

// ============================================================================
// Tasks Kanban Board Flow
// ============================================================================
const colTodo = document.getElementById("col-todo-cards");
const colInProgress = document.getElementById("col-in-progress-cards");
const colDone = document.getElementById("col-done-cards");

async function loadTasks() {
  if (!state.currentProject) return;
  try {
    const res = await apiCall(`/api/v1/tasks/${state.currentProject._id}`);
    state.tasks = res.data || [];
    renderKanbanBoard();
  } catch (err) {
    showToast("Failed to load tasks: " + err.message, "error");
  }
}

function renderKanbanBoard() {
  colTodo.innerHTML = "";
  colInProgress.innerHTML = "";
  colDone.innerHTML = "";

  const todoTasks = state.tasks.filter((t) => t.status === "todo");
  const inProgressTasks = state.tasks.filter((t) => t.status === "in_progress");
  const doneTasks = state.tasks.filter((t) => t.status === "done");

  document.getElementById("count-todo").textContent = todoTasks.length;
  document.getElementById("count-in-progress").textContent = inProgressTasks.length;
  document.getElementById("count-done").textContent = doneTasks.length;
  document.getElementById("count-tasks").textContent = state.tasks.length;

  todoTasks.forEach((task) => colTodo.appendChild(createTaskCard(task)));
  inProgressTasks.forEach((task) => colInProgress.appendChild(createTaskCard(task)));
  doneTasks.forEach((task) => colDone.appendChild(createTaskCard(task)));
}

function createTaskCard(task) {
  const card = document.createElement("div");
  card.className = "task-card";

  const assigneeName = task.assignedTo?.fullName || task.assignedTo?.username || "Unassigned";
  const attachmentsCount = task.attachments ? task.attachments.length : 0;
  const subtasksCount = task.subtasksCount || 0;
  const completedSubtasks = task.completedSubtasksCount || 0;

  card.innerHTML = `
    <div class="task-card-title">${escapeHtml(task.title)}</div>
    ${task.description ? `<div class="task-card-desc">${escapeHtml(task.description)}</div>` : ""}
    <div class="task-card-footer">
      <span title="Assignee">👤 ${escapeHtml(assigneeName)}</span>
      <div class="task-meta-icons">
        ${attachmentsCount > 0 ? `<span title="Attachments">📎 ${attachmentsCount}</span>` : ""}
        ${subtasksCount > 0 ? `<span class="subtask-progress" title="Subtasks">☑ ${completedSubtasks}/${subtasksCount}</span>` : ""}
      </div>
    </div>
  `;

  card.addEventListener("click", () => openTaskDetailModal(task._id));
  return card;
}

// Create Task Modal
document.getElementById("btn-create-task").addEventListener("click", () => {
  if (!state.currentProject) return;
  document.getElementById("modal-task-title").textContent = "Create Task";
  document.getElementById("form-task").reset();
  document.getElementById("task-id").value = "";
  populateAssigneeSelect();
  openModal("modal-task");
});

function populateAssigneeSelect(selectedUserId = "") {
  const select = document.getElementById("task-assigned-to");
  select.innerHTML = '<option value="">Unassigned</option>';
  state.members.forEach((m) => {
    const user = m.user;
    if (user) {
      const opt = document.createElement("option");
      opt.value = user._id;
      opt.textContent = `${user.fullName || user.username} (${user.email || ""})`;
      if (user._id === selectedUserId) opt.selected = true;
      select.appendChild(opt);
    }
  });
}

// Save Task
document.getElementById("form-task").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("task-id").value;
  const title = document.getElementById("task-title").value.trim();
  const description = document.getElementById("task-description").value.trim();
  const assignedTo = document.getElementById("task-assigned-to").value;
  const status = document.getElementById("task-status").value;
  const fileInput = document.getElementById("task-attachments");

  const formData = new FormData();
  formData.append("title", title);
  formData.append("description", description);
  if (assignedTo) formData.append("assignedTo", assignedTo);
  formData.append("status", status);

  if (fileInput.files) {
    for (let i = 0; i < fileInput.files.length; i++) {
      formData.append("attachments", fileInput.files[i]);
    }
  }

  try {
    if (id) {
      // Update
      await apiCall(`/api/v1/tasks/${state.currentProject._id}/t/${id}`, {
        method: "PUT",
        body: formData,
        isFormData: true
      });
      showToast("Task updated successfully!");
    } else {
      // Create
      await apiCall(`/api/v1/tasks/${state.currentProject._id}`, {
        method: "POST",
        body: formData,
        isFormData: true
      });
      showToast("Task created successfully!");
    }
    closeModal("modal-task");
    loadTasks();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// Task Detail & Subtasks Modal
async function openTaskDetailModal(taskId) {
  try {
    const res = await apiCall(`/api/v1/tasks/${state.currentProject._id}/t/${taskId}`);
    const task = res.data;
    state.activeTask = task;

    document.getElementById("detail-task-title").textContent = task.title;
    document.getElementById("detail-task-desc").textContent = task.description || "No description provided.";
    
    const statusBadge = document.getElementById("detail-task-status");
    statusBadge.textContent = task.status.replace("_", " ");
    statusBadge.className = `badge badge-${task.status}`;

    document.getElementById("detail-task-assignee").textContent =
      task.assignedTo?.fullName || task.assignedTo?.username || "Unassigned";
    document.getElementById("detail-task-creator").textContent =
      task.assignedBy?.fullName || task.assignedBy?.username || "-";

    // Render attachments
    const attWrapper = document.getElementById("detail-attachments-wrapper");
    const attList = document.getElementById("detail-attachments-list");
    attList.innerHTML = "";
    if (task.attachments && task.attachments.length > 0) {
      attWrapper.style.display = "block";
      task.attachments.forEach((att, idx) => {
        const link = document.createElement("a");
        link.className = "attachment-pill";
        link.href = att.url;
        link.target = "_blank";
        link.textContent = `📎 File ${idx + 1} (${Math.round((att.size || 0) / 1024)} KB)`;
        attList.appendChild(link);
      });
    } else {
      attWrapper.style.display = "none";
    }

    // Role permissions for Delete/Edit in detail modal
    const canManageTasks = state.currentRole === "admin" || state.currentRole === "project_admin";
    document.getElementById("btn-delete-task-from-detail").style.display = canManageTasks ? "inline-flex" : "none";
    document.getElementById("btn-edit-task-from-detail").style.display = canManageTasks ? "inline-flex" : "none";
    document.getElementById("form-add-subtask").style.display = canManageTasks ? "flex" : "none";

    renderSubtasksList(task.subtasks || []);
    openModal("modal-task-detail");
  } catch (err) {
    showToast("Failed to open task details: " + err.message, "error");
  }
}

function renderSubtasksList(subtasks) {
  const list = document.getElementById("detail-subtasks-list");
  list.innerHTML = "";
  const completed = subtasks.filter((s) => s.isCompleted).length;
  document.getElementById("detail-subtasks-count").textContent = `${completed}/${subtasks.length}`;

  if (subtasks.length === 0) {
    list.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); padding: 0.5rem 0;">No subtasks added yet.</div>`;
    return;
  }

  const canManageSubtasks = state.currentRole === "admin" || state.currentRole === "project_admin";

  subtasks.forEach((st) => {
    const item = document.createElement("div");
    item.className = "subtask-item";
    item.innerHTML = `
      <div class="subtask-left">
        <input type="checkbox" class="subtask-checkbox" ${st.isCompleted ? "checked" : ""} />
        <span class="subtask-title ${st.isCompleted ? "completed" : ""}">${escapeHtml(st.title)}</span>
      </div>
      ${canManageSubtasks ? `<button class="btn btn-danger-outline btn-sm" style="padding: 2px 6px; font-size: 0.7rem;" data-id="${st._id}">✕</button>` : ""}
    `;

    // Toggle completion (Allowed for ALL project members!)
    const checkbox = item.querySelector(".subtask-checkbox");
    checkbox.addEventListener("change", async () => {
      try {
        await apiCall(`/api/v1/tasks/${state.currentProject._id}/st/${st._id}`, {
          method: "PUT",
          body: { isCompleted: checkbox.checked }
        });
        st.isCompleted = checkbox.checked;
        const titleSpan = item.querySelector(".subtask-title");
        if (checkbox.checked) titleSpan.classList.add("completed");
        else titleSpan.classList.remove("completed");
        loadTasks(); // Update task count on board
      } catch (err) {
        checkbox.checked = !checkbox.checked;
        showToast(err.message, "error");
      }
    });

    // Delete subtask
    if (canManageSubtasks) {
      const delBtn = item.querySelector("button");
      delBtn.addEventListener("click", async () => {
        try {
          await apiCall(`/api/v1/tasks/${state.currentProject._id}/st/${st._id}`, {
            method: "DELETE"
          });
          showToast("Subtask deleted");
          openTaskDetailModal(state.activeTask._id);
          loadTasks();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    }

    list.appendChild(item);
  });
}

// Add Subtask Form
document.getElementById("form-add-subtask").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!state.activeTask) return;
  const input = document.getElementById("input-subtask-title");
  const title = input.value.trim();

  try {
    await apiCall(`/api/v1/tasks/${state.currentProject._id}/t/${state.activeTask._id}/subtasks`, {
      method: "POST",
      body: { title }
    });
    input.value = "";
    openTaskDetailModal(state.activeTask._id);
    loadTasks();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// Edit Task From Detail Modal
document.getElementById("btn-edit-task-from-detail").addEventListener("click", () => {
  if (!state.activeTask) return;
  closeModal("modal-task-detail");

  document.getElementById("modal-task-title").textContent = "Edit Task";
  document.getElementById("task-id").value = state.activeTask._id;
  document.getElementById("task-title").value = state.activeTask.title;
  document.getElementById("task-description").value = state.activeTask.description || "";
  document.getElementById("task-status").value = state.activeTask.status;
  populateAssigneeSelect(state.activeTask.assignedTo?._id);

  openModal("modal-task");
});

// Delete Task From Detail Modal
document.getElementById("btn-delete-task-from-detail").addEventListener("click", async () => {
  if (!state.activeTask) return;
  if (!confirm(`Delete task "${state.activeTask.title}"?`)) return;

  try {
    await apiCall(`/api/v1/tasks/${state.currentProject._id}/t/${state.activeTask._id}`, {
      method: "DELETE"
    });
    showToast("Task deleted successfully");
    closeModal("modal-task-detail");
    loadTasks();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// ============================================================================
// Notes Flow
// ============================================================================
const notesGridEl = document.getElementById("notes-grid");

async function loadNotes() {
  if (!state.currentProject) return;
  try {
    const res = await apiCall(`/api/v1/notes/${state.currentProject._id}`);
    state.notes = res.data || [];
    renderNotes();
  } catch (err) {
    showToast("Failed to load notes: " + err.message, "error");
  }
}

function renderNotes() {
  notesGridEl.innerHTML = "";
  document.getElementById("count-notes").textContent = state.notes.length;

  if (state.notes.length === 0) {
    notesGridEl.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">📝</div>
        <p>No project notes yet.</p>
      </div>
    `;
    return;
  }

  const isAdmin = state.currentRole === "admin";

  state.notes.forEach((note) => {
    const card = document.createElement("div");
    card.className = "note-card";
    const author = note.createdBy?.fullName || note.createdBy?.username || "Admin";
    const date = new Date(note.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });

    card.innerHTML = `
      <div class="note-content">${escapeHtml(note.content)}</div>
      <div class="note-footer">
        <span>By ${escapeHtml(author)} on ${date}</span>
        ${
          isAdmin
            ? `<div style="display: flex; gap: 0.35rem;">
                <button class="btn btn-secondary btn-sm btn-edit-note" data-id="${note._id}">Edit</button>
                <button class="btn btn-danger-outline btn-sm btn-del-note" data-id="${note._id}">✕</button>
              </div>`
            : ""
        }
      </div>
    `;

    if (isAdmin) {
      card.querySelector(".btn-edit-note").addEventListener("click", () => {
        document.getElementById("modal-note-title").textContent = "Edit Note";
        document.getElementById("note-id").value = note._id;
        document.getElementById("note-content").value = note.content;
        openModal("modal-note");
      });

      card.querySelector(".btn-del-note").addEventListener("click", async () => {
        if (!confirm("Delete this note?")) return;
        try {
          await apiCall(`/api/v1/notes/${state.currentProject._id}/n/${note._id}`, {
            method: "DELETE"
          });
          showToast("Note deleted");
          loadNotes();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    }

    notesGridEl.appendChild(card);
  });
}

document.getElementById("btn-add-note").addEventListener("click", () => {
  document.getElementById("modal-note-title").textContent = "Add Project Note";
  document.getElementById("form-note").reset();
  document.getElementById("note-id").value = "";
  openModal("modal-note");
});

document.getElementById("form-note").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("note-id").value;
  const content = document.getElementById("note-content").value.trim();

  try {
    if (id) {
      await apiCall(`/api/v1/notes/${state.currentProject._id}/n/${id}`, {
        method: "PUT",
        body: { content }
      });
      showToast("Note updated successfully");
    } else {
      await apiCall(`/api/v1/notes/${state.currentProject._id}`, {
        method: "POST",
        body: { content }
      });
      showToast("Note created successfully");
    }
    closeModal("modal-note");
    loadNotes();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// ============================================================================
// Team Members Flow
// ============================================================================
const membersTableBodyEl = document.getElementById("members-table-body");

async function loadMembers() {
  if (!state.currentProject) return;
  try {
    const res = await apiCall(`/api/v1/projects/${state.currentProject._id}/members`);
    state.members = res.data || [];
    renderMembers();
  } catch (err) {
    showToast("Failed to load members: " + err.message, "error");
  }
}

function renderMembers() {
  membersTableBodyEl.innerHTML = "";
  document.getElementById("count-members").textContent = state.members.length;

  const isAdmin = state.currentRole === "admin";

  state.members.forEach((m) => {
    const user = m.user;
    if (!user) return;
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        <div class="member-cell">
          <div class="user-avatar" style="width: 28px; height: 28px; font-size: 0.75rem;">${(user.username || "U")[0].toUpperCase()}</div>
          <span style="font-weight: 600;">${escapeHtml(user.fullName || user.username)}</span>
        </div>
      </td>
      <td>${escapeHtml(user.email)}</td>
      <td>
        ${
          isAdmin && user._id !== state.user._id
            ? `<select class="form-control member-role-select" style="padding: 2px 8px; font-size: 0.8rem; width: auto;" data-uid="${user._id}">
                <option value="member" ${m.role === "member" ? "selected" : ""}>Member</option>
                <option value="project_admin" ${m.role === "project_admin" ? "selected" : ""}>Project Admin</option>
                <option value="admin" ${m.role === "admin" ? "selected" : ""}>Admin</option>
              </select>`
            : `<span class="badge badge-${m.role}">${m.role.replace("_", " ")}</span>`
        }
      </td>
      <td style="text-align: right;">
        ${
          isAdmin && user._id !== state.user._id
            ? `<button class="btn btn-danger-outline btn-sm btn-del-member" data-uid="${user._id}">Remove</button>`
            : ""
        }
      </td>
    `;

    // Role update
    const roleSelect = tr.querySelector(".member-role-select");
    if (roleSelect) {
      roleSelect.addEventListener("change", async () => {
        try {
          await apiCall(`/api/v1/projects/${state.currentProject._id}/members/${user._id}`, {
            method: "PUT",
            body: { role: roleSelect.value }
          });
          showToast("Member role updated");
          loadMembers();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    }

    // Member remove
    const delBtn = tr.querySelector(".btn-del-member");
    if (delBtn) {
      delBtn.addEventListener("click", async () => {
        if (!confirm(`Remove ${user.fullName || user.username} from this project?`)) return;
        try {
          await apiCall(`/api/v1/projects/${state.currentProject._id}/members/${user._id}`, {
            method: "DELETE"
          });
          showToast("Member removed");
          loadMembers();
          loadProjects();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    }

    membersTableBodyEl.appendChild(tr);
  });
}

document.getElementById("btn-add-member").addEventListener("click", () => {
  document.getElementById("form-member").reset();
  openModal("modal-member");
});

document.getElementById("form-member").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("member-email").value.trim();
  const role = document.getElementById("member-role").value;

  try {
    await apiCall(`/api/v1/projects/${state.currentProject._id}/members`, {
      method: "POST",
      body: { email, role }
    });
    showToast("Member added to project!");
    closeModal("modal-member");
    loadMembers();
    loadProjects();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// Check for resetToken in URL (e.g. ?resetToken=xxxx)
function checkUrlResetToken() {
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get("resetToken") || params.get("token");
  if (resetToken) {
    const tokenInput = document.getElementById("reset-token");
    if (tokenInput) tokenInput.value = resetToken;
    const newPassInput = document.getElementById("reset-new-password");
    if (newPassInput) newPassInput.value = "";
    openModal("modal-reset-password");
  }
}

// Reset Password Form submission
const formResetPassword = document.getElementById("form-reset-password");
if (formResetPassword) {
  formResetPassword.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = document.getElementById("reset-token").value;
    const newPassword = document.getElementById("reset-new-password").value;

    if (!token) {
      showToast("Reset token is missing or invalid.", "error");
      return;
    }

    try {
      await apiCall(`/api/v1/auth/reset-password/${encodeURIComponent(token)}`, {
        method: "POST",
        body: { newPassword }
      });
      showToast("Password reset successfully! Please sign in with your new password.", "success");
      closeModal("modal-reset-password");
      window.history.replaceState({}, document.title, window.location.pathname);
      showAuthUI();
      tabBtnLogin.click();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

// Initialize on page load
checkUrlResetToken();
initSession();

