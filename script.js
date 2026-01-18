const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const calendarSection = document.getElementById("calendarSection");
const monthSelect = document.getElementById("monthSelect");
const yearSelect = document.getElementById("yearSelect");
const calendar = document.getElementById("calendar");
const selectedTaskTitle = document.getElementById("selectedTaskTitle");
const summary = document.getElementById("summary");
const taskGraphSection = document.getElementById("taskGraphSection");
const overallGraphSection = document.getElementById("overallGraphSection");

let currentTask = null;
let allTasks = JSON.parse(localStorage.getItem("tasks")) || [];
let attendanceData = JSON.parse(localStorage.getItem("attendance")) || {};
let taskChartInstance = null;
let overallChartInstance = null;
let monthlyTrendChartInstance = null;
let taskPerformanceChartInstance = null;

function saveData() {
  localStorage.setItem("tasks", JSON.stringify(allTasks));
  localStorage.setItem("attendance", JSON.stringify(attendanceData));
}

function addTask() {
  const task = taskInput.value.trim();
  if (!task || allTasks.includes(task)) return;
  allTasks.push(task);
  attendanceData[task] = {};
  taskInput.value = "";
  saveData();
  renderTasks();
  showOverallGraph(); // Refresh overall graphs
}

function deleteTask(task) {
  const confirmDelete = confirm(`Are you sure you want to delete the task "${task}"?`);
  if (!confirmDelete) return;

  allTasks = allTasks.filter(t => t !== task);
  delete attendanceData[task];
  if (currentTask === task) calendarSection.classList.add("hidden");
  saveData();
  renderTasks();
  showOverallGraph(); // Refresh overall graphs
}

function renderTasks() {
  taskList.innerHTML = "";
  allTasks.forEach(task => {
    const div = document.createElement("div");
    div.className = "task";
    div.id = `task-${task}`;
    div.innerHTML = `
      <span id="task-name-${task}">${task}</span>
      <div>
        <button onclick="selectTask('${task}')">📅</button>
        <button onclick="editTask('${task}')">✏️</button>
        <button onclick="deleteTask('${task}')">🗑</button>
      </div>
    `;
    taskList.appendChild(div);
  });
}

function editTask(oldTaskName) {
  const taskDiv = document.getElementById(`task-${oldTaskName}`);
  const taskNameSpan = document.getElementById(`task-name-${oldTaskName}`);
  const oldName = oldTaskName;
  
  // Create input field
  const input = document.createElement("input");
  input.type = "text";
  input.value = oldName;
  input.className = "task-edit-input";
  
  // Create new span to restore if canceled
  const restoreSpan = () => {
    const newSpan = document.createElement("span");
    newSpan.id = `task-name-${oldName}`;
    newSpan.textContent = oldName;
    return newSpan;
  };
  
  // Replace span with input
  taskNameSpan.replaceWith(input);
  input.focus();
  input.select();
  
  // Save function
  const saveEdit = () => {
    const newName = input.value.trim();
    if (!newName || newName === oldName) {
      // Cancel edit - restore span
      input.replaceWith(restoreSpan());
      return;
    }
    
    if (allTasks.includes(newName)) {
      alert("A task with this name already exists!");
      input.focus();
      return;
    }
    
    // Update task name in allTasks array
    const index = allTasks.indexOf(oldName);
    allTasks[index] = newName;
    
    // Update attendanceData
    if (attendanceData[oldName]) {
      attendanceData[newName] = attendanceData[oldName];
      delete attendanceData[oldName];
    }
    
    // Update currentTask if it's the one being edited
    if (currentTask === oldName) {
      currentTask = newName;
      selectedTaskTitle.textContent = `📌 ${newName}`;
    }
    
    saveData();
    renderTasks();
    if (currentTask === newName) {
      renderCalendar();
    }
  };
  
  // Handle Enter key
  input.onkeydown = (e) => {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      input.replaceWith(restoreSpan());
    }
  };
  
  // Handle blur (click outside)
  input.onblur = saveEdit;
}

function selectTask(task) {
  currentTask = task;
  selectedTaskTitle.textContent = `📌 ${task}`;
  calendarSection.classList.remove("hidden");
  renderCalendar();
  showTaskGraph(); // Automatically show task graph
}

function renderCalendar() {
  const selectedMonth = parseInt(monthSelect.value);
  const selectedYear = parseInt(yearSelect.value);
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  calendar.innerHTML = "";

  const taskData = attendanceData[currentTask] || {};
  let present = 0, absent = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${selectedYear}-${selectedMonth}-${day}`;
    // Don't set default - keep it blank if not already set

    const status = taskData[dateKey]; // true = present, false = absent, undefined = blank
    const div = document.createElement("div");
    div.textContent = day;
    if (status === true) div.classList.add("present");
    else if (status === false) div.classList.add("absent");

    div.onclick = () => {
      // Cycle through: blank -> present -> absent -> blank
      if (taskData[dateKey] === undefined || taskData[dateKey] === null) {
        taskData[dateKey] = true; // blank -> present
      } else if (taskData[dateKey] === true) {
        taskData[dateKey] = false; // present -> absent
      } else {
        delete taskData[dateKey]; // absent -> blank (remove the key)
      }
      saveData();
      renderCalendar();
    };

    calendar.appendChild(div);
    if (status === true) present++;
    else if (status === false) absent++;
  }

  summary.textContent = `✅ Present: ${present} | ❌ Absent: ${absent}`;
  attendanceData[currentTask] = taskData;
  saveData();
  
  // Update task graph if it's visible
  if (taskChartInstance && !taskGraphSection.classList.contains("hidden")) {
    showTaskGraph();
  }
  
  // Update overall graphs
  showOverallGraph();
}

function populateMonthSelect() {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  months.forEach((m, i) => {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = m;
    monthSelect.appendChild(option);
  });
  monthSelect.value = new Date().getMonth();
}

function populateYearSelect() {
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    const option = document.createElement("option");
    option.value = y;
    option.textContent = y;
    if (y === currentYear) option.selected = true;
    yearSelect.appendChild(option);
  }
}

monthSelect.onchange = () => {
  renderCalendar();
  if (taskChartInstance) {
    showTaskGraph();
  }
};
yearSelect.onchange = () => {
  renderCalendar();
  if (taskChartInstance) {
    showTaskGraph();
  }
};

function showTaskGraph() {
  if (!currentTask) {
    alert("Please select a task first!");
    return;
  }
  
  taskGraphSection.classList.remove("hidden");
  
  // Destroy existing chart if it exists
  if (taskChartInstance) {
    taskChartInstance.destroy();
  }
  
  const taskData = attendanceData[currentTask] || {};
  
  // Calculate total present and absent for this task
  let totalPresent = 0;
  let totalAbsent = 0;
  
  Object.keys(taskData).forEach(dateKey => {
    const status = taskData[dateKey];
    if (status === true) totalPresent++;
    else if (status === false) totalAbsent++;
  });
  
  const total = totalPresent + totalAbsent;
  const presentPercent = total > 0 ? ((totalPresent / total) * 100).toFixed(1) : 0;
  const absentPercent = total > 0 ? ((totalAbsent / total) * 100).toFixed(1) : 0;
  
  const ctx = document.getElementById("taskChart").getContext("2d");
  taskChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: [`Present (${presentPercent}%)`, `Absent (${absentPercent}%)`],
      datasets: [
        {
          data: [totalPresent, totalAbsent],
          backgroundColor: ["#10b981", "#ef4444"],
          borderColor: ["#ffffff", "#ffffff"],
          borderWidth: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            padding: 15,
            font: {
              size: 14,
              weight: '500'
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label.split(' (')[0]}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

function showOverallGraph() {
  // Destroy existing charts if they exist
  if (overallChartInstance) overallChartInstance.destroy();
  if (monthlyTrendChartInstance) monthlyTrendChartInstance.destroy();
  if (taskPerformanceChartInstance) taskPerformanceChartInstance.destroy();
  
  // Calculate total present and absent across all tasks
  let totalPresent = 0;
  let totalAbsent = 0;
  
  allTasks.forEach(task => {
    const taskData = attendanceData[task] || {};
    Object.keys(taskData).forEach(dateKey => {
      const status = taskData[dateKey];
      if (status === true) totalPresent++;
      else if (status === false) totalAbsent++;
    });
  });
  
  const total = totalPresent + totalAbsent;
  const presentPercent = total > 0 ? ((totalPresent / total) * 100).toFixed(1) : 0;
  const absentPercent = total > 0 ? ((totalAbsent / total) * 100).toFixed(1) : 0;
  
  // Chart 1: Overall Pie Chart
  const ctx1 = document.getElementById("overallChart").getContext("2d");
  overallChartInstance = new Chart(ctx1, {
    type: "pie",
    data: {
      labels: [`Present (${presentPercent}%)`, `Absent (${absentPercent}%)`],
      datasets: [{
        data: [totalPresent, totalAbsent],
        backgroundColor: ["#10b981", "#ef4444"],
        borderColor: ["#ffffff", "#ffffff"],
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: { padding: 10, font: { size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label.split(' (')[0];
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
  
  // Chart 2: Monthly Trend Line Chart
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  const monthLabels = [];
  const monthPresentData = [];
  const monthAbsentData = [];
  
  for (let i = 5; i >= 0; i--) {
    const month = (currentMonth - i + 12) % 12;
    const year = currentMonth - i < 0 ? currentYear - 1 : currentYear;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let monthPresent = 0;
    let monthAbsent = 0;
    
    allTasks.forEach(task => {
      const taskData = attendanceData[task] || {};
      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${month}-${day}`;
        const status = taskData[dateKey];
        if (status === true) monthPresent++;
        else if (status === false) monthAbsent++;
      }
    });
    
    monthLabels.push(`${months[month]}`);
    monthPresentData.push(monthPresent);
    monthAbsentData.push(monthAbsent);
  }
  
  const ctx2 = document.getElementById("monthlyTrendChart").getContext("2d");
  monthlyTrendChartInstance = new Chart(ctx2, {
    type: "line",
    data: {
      labels: monthLabels,
      datasets: [{
        label: "Present",
        data: monthPresentData,
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.4,
        fill: true
      }, {
        label: "Absent",
        data: monthAbsentData,
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: { padding: 10, font: { size: 12 } }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
  
  // Chart 3: Task Performance Bar Chart
  const taskLabels = [];
  const taskPresentData = [];
  const taskAbsentData = [];
  
  allTasks.forEach(task => {
    const taskData = attendanceData[task] || {};
    let present = 0;
    let absent = 0;
    
    Object.keys(taskData).forEach(dateKey => {
      const status = taskData[dateKey];
      if (status === true) present++;
      else if (status === false) absent++;
    });
    
    if (present > 0 || absent > 0) {
      taskLabels.push(task.length > 15 ? task.substring(0, 15) + '...' : task);
      taskPresentData.push(present);
      taskAbsentData.push(absent);
    }
  });
  
  const ctx3 = document.getElementById("taskPerformanceChart").getContext("2d");
  taskPerformanceChartInstance = new Chart(ctx3, {
    type: "bar",
    data: {
      labels: taskLabels,
      datasets: [{
        label: "Present",
        data: taskPresentData,
        backgroundColor: "#10b981"
      }, {
        label: "Absent",
        data: taskAbsentData,
        backgroundColor: "#ef4444"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: { padding: 10, font: { size: 12 } }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  populateMonthSelect();
  populateYearSelect();
  renderTasks();
  showOverallGraph(); // Initialize overall graphs on page load
});
