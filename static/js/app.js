/**
 * HabitFlow - Frontend JavaScript
 * Handles all client-side logic, API calls, and UI interactions
 */

// ============ STATE ============
const state = {
    currentPage: 'dashboard',
    currentDate: new Date(),
    calendarDate: new Date(),
    reportDate: new Date(),
    weekOffset: 0, // 0 = current week, -1 = last week, etc.
    habits: [],
    tasks: [],
    stats: {},
    theme: localStorage.getItem('theme') || 'light',
    sidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true',
    musicService: 'youtube'
};

// ============ API HELPERS ============
async function api(endpoint, options = {}) {
    const response = await fetch(endpoint, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    return response.json();
}

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSidebar();
    initNavigation();
    loadDashboard();
});

function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeButton();
}

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (state.sidebarCollapsed && sidebar) {
        sidebar.classList.add('collapsed');
        document.body.classList.add('sidebar-collapsed');
    }
    updateSidebarIcon();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
        state.sidebarCollapsed = sidebar.classList.contains('collapsed');
        document.body.classList.toggle('sidebar-collapsed', state.sidebarCollapsed);
        localStorage.setItem('sidebarCollapsed', state.sidebarCollapsed);
        updateSidebarIcon();
    }
}

function updateSidebarIcon() {
    const icon = document.getElementById('sidebarToggleIcon');
    if (icon) {
        icon.setAttribute('data-lucide', state.sidebarCollapsed ? 'panel-left-open' : 'panel-left-close');
        lucide.createIcons();
    }
}

function updateThemeButton() {
    const btn = document.getElementById('themeBtn');
    if (btn) {
        btn.innerHTML = state.theme === 'dark'
            ? '<i data-lucide="sun"></i><span class="nav-text">Light Mode</span>'
            : '<i data-lucide="moon"></i><span class="nav-text">Dark Mode</span>';
        lucide.createIcons();
    }
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', state.theme);
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeButton();

    // Update chart colors if on dashboard
    if (state.currentPage === 'dashboard' && window.weeklyChart) {
        updateChartTheme();
    }
}

// ============ NAVIGATION ============
function initNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            if (page) {
                // Play navigation sound
                if (typeof soundManager !== 'undefined') {
                    soundManager.playNav();
                }
                navigateTo(page);
            }
        });
    });
}

function navigateTo(page) {
    state.currentPage = page;

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });

    // Update pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === `${page}Page`);
    });

    // Load page data
    switch (page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'habits':
            loadHabits();
            break;
        case 'tasks':
            loadTasks();
            break;
        case 'music':
            loadMusic();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

// ============ DASHBOARD ============
async function loadDashboard() {
    const stats = await api('/api/stats');
    state.stats = stats;
    state.weekOffset = 0; // Reset to current week

    // Update stat cards
    document.getElementById('streakValue').textContent = stats.streak;
    document.getElementById('completionValue').textContent = `${stats.completion_rate}%`;
    document.getElementById('tasksValue').textContent = `${stats.today_tasks_done}/${stats.today_tasks_total}`;
    document.getElementById('habitsValue').textContent = stats.total_habits;

    // Initialize week range title and render chart
    updateWeekRangeTitle();
    renderWeeklyChart(stats.weekly_data);
    lucide.createIcons();
}

function renderWeeklyChart(data) {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js library not loaded');
        const container = document.getElementById('weeklyChart')?.parentElement;
        if (container) {
            container.innerHTML = '<div style="color:red; display:flex; align-items:center; justify-content:center; height:100%;">Error: Chart library not loaded</div>';
        }
        return;
    }

    const canvas = document.getElementById('weeklyChart');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get 2D context');
        return;
    }

    try {
        const isDark = state.theme === 'dark';
        const textColor = isDark ? '#CBD5E1' : '#475569';
        const gridColor = isDark ? '#334155' : '#E2E8F0';

        if (window.weeklyChart && typeof window.weeklyChart.destroy === 'function') {
            window.weeklyChart.destroy();
        } else if (window.weeklyChart) {
            window.weeklyChart = null;
        }

        console.log('Rendering chart with data:', data);

        window.weeklyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.day_num ? `${d.day} ${d.day_num}` : d.day),
                datasets: [{
                    label: 'Completion %',
                    data: data.map(d => d.percentage),
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        titleColor: isDark ? '#F1F5F9' : '#0F172A',
                        bodyColor: isDark ? '#CBD5E1' : '#475569',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: textColor,
                            stepSize: 20
                        },
                        grid: {
                            color: gridColor
                        }
                    },
                    x: {
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Chart rendering error:', err);
        const container = canvas.parentElement;
        if (container) {
            container.innerHTML = `<div style="color:red; padding:20px;">Error rendering chart: ${err.message}</div>`;
        }
    }
}

function updateChartTheme() {
    if (state.stats.weekly_data) {
        renderWeeklyChart(state.stats.weekly_data);
    }
}

// Week navigation for dashboard chart
function getWeekDates(offset = 0) {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust to Monday start

    const monday = new Date(today);
    monday.setDate(today.getDate() - diff + (offset * 7));

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return { start: monday, end: sunday };
}

function formatWeekRange(start, end) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startMonth = months[start.getMonth()];
    const endMonth = months[end.getMonth()];
    const year = end.getFullYear();

    if (startMonth === endMonth) {
        return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`;
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`;
}

function updateWeekRangeTitle() {
    const { start, end } = getWeekDates(state.weekOffset);
    const titleEl = document.getElementById('weekRangeTitle');
    if (titleEl) {
        titleEl.textContent = formatWeekRange(start, end);
    }
}

async function loadWeekData() {
    const { start, end } = getWeekDates(state.weekOffset);
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;

    const weeklyData = await api(`/api/stats/weekly?start_date=${startStr}`);
    state.stats.weekly_data = weeklyData;

    updateWeekRangeTitle();
    renderWeeklyChart(weeklyData);
}

function prevWeek() {
    state.weekOffset--;
    if (typeof soundManager !== 'undefined') {
        soundManager.playNav();
    }
    loadWeekData();
}

function nextWeek() {
    state.weekOffset++;
    if (typeof soundManager !== 'undefined') {
        soundManager.playNav();
    }
    loadWeekData();
}

// ============ HABITS ============
async function loadHabits() {
    state.habits = await api('/api/habits');
    const year = state.calendarDate.getFullYear();
    const month = state.calendarDate.getMonth() + 1;
    const completions = await api(`/api/habits/calendar/${year}/${month}`);

    renderCalendarHeader();
    renderHabitCalendar(completions);
}

function renderCalendarHeader() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    document.getElementById('calendarTitle').textContent =
        `${monthNames[state.calendarDate.getMonth()]} ${state.calendarDate.getFullYear()}`;
}

function prevMonth() {
    state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
    loadHabits();
}

function nextMonth() {
    state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
    loadHabits();
}

function renderHabitCalendar(completions) {
    const container = document.getElementById('habitCalendar');
    if (!container) return;

    const year = state.calendarDate.getFullYear();
    const month = state.calendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const todayDay = today.getDate();

    // Calculate grid columns - wider habit name column, wider date cells
    let html = `<div class="calendar-grid" style="grid-template-columns: 220px repeat(${daysInMonth}, 48px);">`;

    // Header row - no highlighting on header
    html += `<div class="calendar-cell header habit-header">Habit</div>`;
    for (let d = 1; d <= daysInMonth; d++) {
        html += `<div class="calendar-cell header">${d}</div>`;
    }

    // Habit rows
    if (state.habits.length === 0) {
        html += `</div><div class="empty-state mt-lg">
            <div class="empty-state-icon">📝</div>
            <div class="empty-state-text">No habits yet. Add your first habit!</div>
        </div>`;
    } else {
        state.habits.forEach(habit => {
            const habitCompletions = completions[habit.id] || [];

            html += `<div class="calendar-cell habit-name" title="${escapeHtml(habit.name)}">
                <span class="habit-icon">${habit.icon}</span>
                <span class="habit-name-text">${escapeHtml(habit.name)}</span>
            </div>`;

            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isCompleted = habitCompletions.includes(d);
                const isToday = isCurrentMonth && d === todayDay;

                html += `<div class="calendar-cell date-cell clickable ${isCompleted ? 'completed' : ''} ${isToday ? 'today' : ''}" 
                         onclick="toggleHabitDay(${habit.id}, '${dateStr}')"
                         style="${isCompleted ? `--habit-color: ${habit.color};` : ''}">
                    <div class="habit-circle ${isCompleted ? 'checked' : ''}" style="${isCompleted ? `background: ${habit.color}; border-color: ${habit.color};` : ''}">
                        ${isCompleted ? '<i data-lucide="check" style="width: 14px; height: 14px; color: white;"></i>' : ''}
                    </div>
                </div>`;
            }
        });
        html += `</div>`;
    }

    container.innerHTML = html;
    lucide.createIcons();
}

async function toggleHabitDay(habitId, dateStr) {
    await api(`/api/habits/${habitId}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ date: dateStr })
    });
    // Play completion sound
    if (typeof soundManager !== 'undefined') {
        soundManager.playComplete();
    }
    loadHabits();
}

async function deleteHabit(habitId) {
    if (confirm('Are you sure you want to delete this habit?')) {
        await api(`/api/habits/${habitId}`, { method: 'DELETE' });
        loadHabits();
    }
}

// ============ ADD HABIT MODAL ============
const habitEmojis = [
    // Checkmarks & Stars
    '✓', '⭐', '🌟', '💫', '✨', '🎯',
    // Fitness & Health
    '🏃', '💪', '🧘', '🚴', '🏋️', '🤸', '🏊', '⚽', '🎾', '🏀',
    // Food & Drink
    '💧', '🍎', '🥗', '🥦', '🍳', '🥛', '☕', '🍵',
    // Study & Work
    '📚', '📖', '✏️', '💻', '🎓', '📝', '🧠', '💡',
    // Health & Wellness
    '💊', '😴', '🛌', '🧘‍♀️', '❤️', '🩺', '🦷', '👁️',
    // Productivity & Goals
    '🔥', '⏰', '📅', '✅', '🚀', '💰', '🎨', '🎵'
];
const habitColors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#14B8A6', '#F97316'];

let selectedEmoji = '✓';
let selectedColor = '#6366F1';

function openAddHabitModal() {
    selectedEmoji = '✓';
    selectedColor = '#6366F1';
    document.getElementById('habitName').value = '';
    renderEmojiPicker();
    renderColorPicker();
    // Play open sound
    if (typeof soundManager !== 'undefined') {
        soundManager.playOpen();
    }
    document.getElementById('habitModal').classList.add('active');
}

function closeHabitModal() {
    // Play close sound
    if (typeof soundManager !== 'undefined') {
        soundManager.playClose();
    }
    document.getElementById('habitModal').classList.remove('active');
}

function renderEmojiPicker() {
    const container = document.getElementById('emojiPicker');
    container.innerHTML = habitEmojis.map(emoji =>
        `<div class="emoji-option ${emoji === selectedEmoji ? 'selected' : ''}" onclick="selectEmoji('${emoji}')">${emoji}</div>`
    ).join('');
}

function renderColorPicker() {
    const container = document.getElementById('colorPicker');
    container.innerHTML = habitColors.map(color =>
        `<div class="color-option ${color === selectedColor ? 'selected' : ''}" 
              style="background: ${color}"
              onclick="selectColor('${color}')"></div>`
    ).join('');
}

function selectEmoji(emoji) {
    selectedEmoji = emoji;
    renderEmojiPicker();
}

function selectColor(color) {
    selectedColor = color;
    renderColorPicker();
}

async function saveHabit() {
    const name = document.getElementById('habitName').value.trim();
    if (!name) {
        alert('Please enter a habit name');
        return;
    }

    await api('/api/habits', {
        method: 'POST',
        body: JSON.stringify({
            name: name,
            icon: selectedEmoji,
            color: selectedColor
        })
    });

    closeHabitModal();
    loadHabits();
}

// ============ MANAGE HABITS MODAL ============
let draggedHabitId = null;

function openManageHabitsModal() {
    renderManageHabitsList();
    // Play open sound
    if (typeof soundManager !== 'undefined') {
        soundManager.playOpen();
    }
    document.getElementById('manageHabitsModal').classList.add('active');
}

async function closeManageHabitsModal() {
    // Save the new order to database
    const habitIds = state.habits.map(h => h.id);
    await api('/api/habits/reorder', {
        method: 'POST',
        body: JSON.stringify({ habit_ids: habitIds })
    });

    // Play close sound
    if (typeof soundManager !== 'undefined') {
        soundManager.playClose();
    }
    document.getElementById('manageHabitsModal').classList.remove('active');
    loadHabits(); // Refresh calendar after changes
}

function renderManageHabitsList() {
    const container = document.getElementById('manageHabitsList');

    if (state.habits.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-text">No habits yet. Add your first habit!</div>
            </div>`;
        return;
    }

    container.innerHTML = state.habits.map(habit => `
        <div class="manage-habit-item" draggable="true" data-habit-id="${habit.id}"
             ondragstart="onHabitDragStart(event, ${habit.id})"
             ondragend="onHabitDragEnd(event)"
             ondragover="onHabitDragOver(event)"
             ondrop="onHabitDrop(event, ${habit.id})">
            <div class="manage-habit-drag-handle">
                <i data-lucide="grip-vertical"></i>
            </div>
            <span class="manage-habit-icon">${habit.icon}</span>
            <span class="manage-habit-name">${escapeHtml(habit.name)}</span>
            <div class="manage-habit-color" style="background: ${habit.color}"></div>
            <button class="manage-habit-delete" onclick="deleteHabitFromModal(${habit.id})" title="Delete habit">
                <i data-lucide="trash-2"></i>
            </button>
        </div>
    `).join('');

    lucide.createIcons();
}

function onHabitDragStart(event, habitId) {
    draggedHabitId = habitId;
    event.target.classList.add('dragging');
    // Play drag sound
    if (typeof soundManager !== 'undefined') {
        soundManager.playDrag();
    }
}

function onHabitDragEnd(event) {
    event.target.classList.remove('dragging');
    document.querySelectorAll('.manage-habit-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function onHabitDragOver(event) {
    event.preventDefault();
    const item = event.target.closest('.manage-habit-item');
    if (item) {
        document.querySelectorAll('.manage-habit-item').forEach(i => i.classList.remove('drag-over'));
        item.classList.add('drag-over');
    }
}

function onHabitDrop(event, targetId) {
    event.preventDefault();
    if (draggedHabitId === null || draggedHabitId === targetId) return;

    // Reorder in state
    const draggedIndex = state.habits.findIndex(h => h.id === draggedHabitId);
    const targetIndex = state.habits.findIndex(h => h.id === targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
        const [movedHabit] = state.habits.splice(draggedIndex, 1);
        state.habits.splice(targetIndex, 0, movedHabit);
        // Play drop sound
        if (typeof soundManager !== 'undefined') {
            soundManager.playDrop();
        }
        renderManageHabitsList();
    }

    draggedHabitId = null;
}

async function deleteHabitFromModal(habitId) {
    const confirmed = await showConfirm(
        'Delete Habit',
        'Are you sure you want to delete this habit? All completion data will be lost.'
    );
    if (confirmed) {
        await api(`/api/habits/${habitId}`, { method: 'DELETE' });
        state.habits = state.habits.filter(h => h.id !== habitId);
        // Play delete sound
        if (typeof soundManager !== 'undefined') {
            soundManager.playDelete();
        }
        renderManageHabitsList();
    }
}

// ============ TASKS ============
async function loadTasks() {
    updateTaskDateDisplay();
    const dateStr = formatDate(state.currentDate);
    state.tasks = await api(`/api/tasks/${dateStr}`);
    renderTasks();
}

function updateTaskDateDisplay() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('taskDateDisplay').textContent =
        state.currentDate.toLocaleDateString('en-US', options);
    document.getElementById('taskDateInput').value = formatDate(state.currentDate);
}

function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function changeTaskDate(offset) {
    state.currentDate.setDate(state.currentDate.getDate() + offset);
    loadTasks();
}

function onTaskDateChange(value) {
    state.currentDate = new Date(value + 'T00:00:00');
    loadTasks();
}

function goToToday() {
    state.currentDate = new Date();
    loadTasks();
}

function renderTasks() {
    const container = document.getElementById('taskList');

    if (state.tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-text">No tasks for this day. Add one!</div>
            </div>`;
        return;
    }

    container.innerHTML = state.tasks.map(task => {
        const timeSlot = task.start_time && task.end_time
            ? `<span class="task-time"><i data-lucide="clock" style="width: 12px; height: 12px;"></i> ${task.start_time} - ${task.end_time}</span>`
            : (task.start_time ? `<span class="task-time"><i data-lucide="clock" style="width: 12px; height: 12px;"></i> ${task.start_time}</span>` : '');

        return `
        <div class="task-item ${task.completed ? 'completed' : ''} animate-fade-in">
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${task.id})">
                ${task.completed ? '<i data-lucide="check" style="width: 14px; height: 14px;"></i>' : ''}
            </div>
            <div class="task-content">
                <div class="task-title">${escapeHtml(task.title)}</div>
                ${timeSlot}
            </div>
            <span class="task-priority ${task.priority}">${task.priority}</span>
            <div class="task-delete" onclick="deleteTask(${task.id})">
                <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
            </div>
        </div>
    `}).join('');

    lucide.createIcons();
}

async function toggleTask(taskId) {
    await api(`/api/tasks/${taskId}/toggle`, { method: 'POST' });
    // Play completion sound
    if (typeof soundManager !== 'undefined') {
        soundManager.playComplete();
    }
    loadTasks();
}

async function deleteTask(taskId) {
    await api(`/api/tasks/${taskId}`, { method: 'DELETE' });
    // Play delete sound
    if (typeof soundManager !== 'undefined') {
        soundManager.playDelete();
    }
    loadTasks();
}

// ============ ADD TASK MODAL ============
function openAddTaskModal() {
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskStartTime').value = '';
    document.getElementById('taskEndTime').value = '';
    // Play open sound
    if (typeof soundManager !== 'undefined') {
        soundManager.playOpen();
    }
    document.getElementById('taskModal').classList.add('active');
}

function closeTaskModal() {
    document.getElementById('taskModal').classList.remove('active');
}

async function saveTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const startTime = document.getElementById('taskStartTime').value || null;
    const endTime = document.getElementById('taskEndTime').value || null;

    if (!title) {
        alert('Please enter a task title');
        return;
    }

    await api('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
            title: title,
            date: formatDate(state.currentDate),
            priority: priority,
            start_time: startTime,
            end_time: endTime
        })
    });

    closeTaskModal();
    loadTasks();
}

// ============ MUSIC ============
function loadMusic() {
    // Music page now uses external launcher, no iframe to load
    lucide.createIcons();
}

function openMusicService(service) {
    let url;
    if (service === 'youtube') {
        url = 'https://music.youtube.com/';
    } else {
        url = 'https://open.spotify.com/';
    }
    // Open in system default browser
    window.open(url, '_blank');
}

// ============ UTILITIES ============
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Custom confirmation modal (replaces browser confirm())
function showConfirm(title, message, confirmText = 'Delete') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOk');
        const cancelBtn = document.getElementById('confirmCancel');

        titleEl.textContent = title;
        messageEl.textContent = message;
        okBtn.textContent = confirmText;

        // Play open sound
        if (typeof soundManager !== 'undefined') {
            soundManager.playOpen();
        }
        modal.classList.add('active');

        // Cleanup function
        const cleanup = () => {
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            // Play close sound
            if (typeof soundManager !== 'undefined') {
                soundManager.playClose();
            }
            modal.classList.remove('active');
        };

        const onOk = () => {
            cleanup();
            resolve(true);
        };

        const onCancel = () => {
            cleanup();
            resolve(false);
        };

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
    });
}

// Close modals on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    }
});

// ============ REPORTS ============
let monthlyTrendChart = null;

async function loadReports() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Set date picker to today
    const datePicker = document.getElementById('reportDateInput');
    if (datePicker) datePicker.value = todayStr;

    // Update month title
    updateReportMonthTitle();

    // Load all data
    const [analytics, monthlyData, dailyReport] = await Promise.all([
        api('/api/reports/analytics'),
        api(`/api/reports/monthly/${state.reportDate.getFullYear()}/${state.reportDate.getMonth() + 1}`),
        api(`/api/reports/daily/${todayStr}`)
    ]);

    // Update circular progress
    updateCircularProgress('todayProgress', analytics.today_completion_rate);
    updateCircularProgress('habitProgress', monthlyData.avg_habit_rate);
    updateCircularProgress('taskProgress', monthlyData.avg_task_rate);

    // Update stats
    document.getElementById('bestStreakValue').textContent = analytics.best_streak;
    document.getElementById('totalHabitCompletions').textContent = analytics.total_habit_completions;
    document.getElementById('totalTasksCompleted').textContent = analytics.total_tasks_completed;

    // Render chart
    renderMonthlyTrendChart(monthlyData);

    // Render streaks
    renderStreaksGrid(analytics.habit_streaks);

    // Render daily report
    renderDailyReport(dailyReport);

    lucide.createIcons();
}

function updateCircularProgress(elementId, percentage) {
    const container = document.getElementById(elementId);
    if (!container) return;

    const fill = container.querySelector('.progress-fill');
    const value = container.querySelector('.progress-value');

    // Calculate stroke-dashoffset (283 is circumference of radius 45)
    const offset = 283 - (283 * percentage / 100);

    if (fill) fill.style.strokeDashoffset = offset;
    if (value) value.textContent = `${Math.round(percentage)}%`;
}

function updateReportMonthTitle() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const title = document.getElementById('reportMonthTitle');
    if (title) {
        title.textContent = `${monthNames[state.reportDate.getMonth()]} ${state.reportDate.getFullYear()}`;
    }
}

function prevReportMonth() {
    state.reportDate.setMonth(state.reportDate.getMonth() - 1);
    loadReports();
}

function nextReportMonth() {
    state.reportDate.setMonth(state.reportDate.getMonth() + 1);
    loadReports();
}

function renderMonthlyTrendChart(data) {
    if (typeof Chart === 'undefined') return;

    const ctx = document.getElementById('monthlyTrendChart');
    if (!ctx) return;

    // Destroy existing chart
    if (monthlyTrendChart) {
        monthlyTrendChart.destroy();
    }

    const labels = data.daily_data.map(d => d.day);
    const habitRates = data.daily_data.map(d => d.habit_rate);
    const taskRates = data.daily_data.map(d => d.task_rate);

    const isDark = state.theme === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDark ? '#CBD5E1' : '#475569';

    monthlyTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Habits',
                    data: habitRates,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Tasks',
                    data: taskRates,
                    borderColor: '#F59E0B',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: textColor }
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        callback: value => `${value}%`
                    }
                }
            }
        }
    });
}

function renderStreaksGrid(streaks) {
    const grid = document.getElementById('streaksGrid');
    if (!grid) return;

    if (!streaks || streaks.length === 0) {
        grid.innerHTML = '<div class="daily-report-empty">No habits yet</div>';
        return;
    }

    grid.innerHTML = streaks.map(habit => `
        <div class="streak-card">
            <div class="streak-icon">${habit.icon}</div>
            <div class="streak-info">
                <div class="streak-name">${escapeHtml(habit.name)}</div>
                <div class="streak-stats">
                    <span class="streak-current">🔥 ${habit.current_streak} current</span>
                    <span class="streak-best">⭐ ${habit.best_streak} best</span>
                </div>
            </div>
        </div>
    `).join('');
}

async function loadDailyReport(dateStr) {
    const report = await api(`/api/reports/daily/${dateStr}`);
    renderDailyReport(report);
    lucide.createIcons();
}

function renderDailyReport(report) {
    const container = document.getElementById('dailyReportContent');
    if (!container) return;

    const habitsHtml = report.habits.length > 0
        ? report.habits.map(h => `
            <div class="daily-report-item ${h.completed ? 'completed' : ''}">
                <div class="daily-report-icon">${h.icon}</div>
                <div class="daily-report-title">${escapeHtml(h.name)}</div>
                <div class="daily-report-check ${h.completed ? 'done' : 'pending'}">
                    ${h.completed ? '<i data-lucide="check" style="width:12px;height:12px"></i>' : ''}
                </div>
            </div>
        `).join('')
        : '<div class="daily-report-empty">No habits</div>';

    const tasksHtml = report.tasks.length > 0
        ? report.tasks.map(t => `
            <div class="daily-report-item ${t.completed ? 'completed' : ''}">
                <div class="daily-report-check ${t.completed ? 'done' : 'pending'}">
                    ${t.completed ? '<i data-lucide="check" style="width:12px;height:12px"></i>' : ''}
                </div>
                <div class="daily-report-title">${escapeHtml(t.title)}</div>
            </div>
        `).join('')
        : '<div class="daily-report-empty">No tasks</div>';

    container.innerHTML = `
        <div class="daily-report-column">
            <h4>
                <i data-lucide="check-circle"></i>
                Habits
                <span class="rate">${report.habits_completed}/${report.habits_total} (${report.habit_rate}%)</span>
            </h4>
            ${habitsHtml}
        </div>
        <div class="daily-report-column">
            <h4>
                <i data-lucide="list-todo"></i>
                Tasks
                <span class="rate">${report.tasks_completed}/${report.tasks_total} (${report.task_rate}%)</span>
            </h4>
            ${tasksHtml}
        </div>
    `;
}
