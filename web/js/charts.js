/**
 * RSS Report Viewer - Chart Rendering
 * Uses Chart.js for data visualization
 */

// Chart color palettes
const COLORS = {
  primary: [
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 99, 132, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(75, 192, 192, 0.8)',
    'rgba(153, 102, 255, 0.8)',
    'rgba(255, 159, 64, 0.8)',
    'rgba(199, 199, 199, 0.8)',
    'rgba(83, 102, 255, 0.8)',
    'rgba(255, 99, 255, 0.8)',
    'rgba(99, 255, 132, 0.8)'
  ],
  border: [
    'rgba(54, 162, 235, 1)',
    'rgba(255, 99, 132, 1)',
    'rgba(255, 206, 86, 1)',
    'rgba(75, 192, 192, 1)',
    'rgba(153, 102, 255, 1)',
    'rgba(255, 159, 64, 1)',
    'rgba(199, 199, 199, 1)',
    'rgba(83, 102, 255, 1)',
    'rgba(255, 99, 255, 1)',
    'rgba(99, 255, 132, 1)'
  ]
};

// Chart instances (for cleanup)
let chartInstances = {};

/**
 * Get chart colors based on current theme
 */
function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    text: isDark ? '#e0e0e0' : '#333333',
    grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    background: isDark ? '#1e1e1e' : '#ffffff'
  };
}

/**
 * Common chart options
 */
function getCommonOptions(title) {
  const colors = getChartColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: colors.text
        }
      },
      title: {
        display: !!title,
        text: title,
        color: colors.text,
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    }
  };
}

/**
 * Render tag frequency bar chart
 * @param {object} tagData - Object with tag names as keys and counts as values
 * @param {string} containerId - Canvas container ID
 */
function renderTagChart(tagData, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Destroy existing chart
  if (chartInstances[containerId]) {
    chartInstances[containerId].destroy();
  }

  // Process data - sort by count and take top 15
  const sortedTags = Object.entries(tagData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  if (sortedTags.length === 0) {
    container.innerHTML = '<p class="no-data">No tag data available</p>';
    return;
  }

  const labels = sortedTags.map(([tag]) => tag);
  const data = sortedTags.map(([, count]) => count);
  const colors = getChartColors();

  // Create canvas if needed
  let canvas = container.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    container.innerHTML = '';
    container.appendChild(canvas);
  }

  const ctx = canvas.getContext('2d');

  chartInstances[containerId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Article Count',
        data: data,
        backgroundColor: COLORS.primary,
        borderColor: COLORS.border,
        borderWidth: 1
      }]
    },
    options: {
      ...getCommonOptions('Top Tags'),
      indexAxis: 'y',
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            color: colors.text
          },
          grid: {
            color: colors.grid
          }
        },
        y: {
          ticks: {
            color: colors.text
          },
          grid: {
            color: colors.grid
          }
        }
      }
    }
  });
}

/**
 * Render source distribution pie/doughnut chart
 * @param {object} sourceData - Object with source names as keys and counts as values
 * @param {string} containerId - Canvas container ID
 */
function renderSourceChart(sourceData, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Destroy existing chart
  if (chartInstances[containerId]) {
    chartInstances[containerId].destroy();
  }

  // Process data - sort by count and take top 10
  const sortedSources = Object.entries(sourceData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (sortedSources.length === 0) {
    container.innerHTML = '<p class="no-data">No source data available</p>';
    return;
  }

  const labels = sortedSources.map(([source]) => {
    // Truncate long source names
    return source.length > 30 ? source.substring(0, 27) + '...' : source;
  });
  const data = sortedSources.map(([, count]) => count);
  const colors = getChartColors();

  // Create canvas if needed
  let canvas = container.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    container.innerHTML = '';
    container.appendChild(canvas);
  }

  const ctx = canvas.getContext('2d');

  chartInstances[containerId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: COLORS.primary,
        borderColor: colors.background,
        borderWidth: 2
      }]
    },
    options: {
      ...getCommonOptions('Articles by Source'),
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: colors.text,
            boxWidth: 15,
            padding: 10
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.raw / total) * 100).toFixed(1);
              return `${context.label}: ${context.raw} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

/**
 * Render trend line chart showing daily article counts
 * @param {object} trendData - Array of {date, count} objects or object with dates as keys
 * @param {string} containerId - Canvas container ID
 */
function renderTrendChart(trendData, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Destroy existing chart
  if (chartInstances[containerId]) {
    chartInstances[containerId].destroy();
  }

  // Process data - convert to array if needed
  let dataPoints;
  if (Array.isArray(trendData)) {
    dataPoints = trendData;
  } else {
    dataPoints = Object.entries(trendData).map(([date, count]) => ({ date, count }));
  }

  // Sort by date
  dataPoints.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (dataPoints.length === 0) {
    container.innerHTML = '<p class="no-data">No trend data available</p>';
    return;
  }

  const labels = dataPoints.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  });
  const data = dataPoints.map(d => d.count);
  const colors = getChartColors();

  // Create canvas if needed
  let canvas = container.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    container.innerHTML = '';
    container.appendChild(canvas);
  }

  const ctx = canvas.getContext('2d');

  chartInstances[containerId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Articles',
        data: data,
        borderColor: COLORS.primary[0],
        backgroundColor: COLORS.primary[0].replace('0.8', '0.2'),
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      ...getCommonOptions('Article Trend'),
      scales: {
        x: {
          ticks: {
            color: colors.text,
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            color: colors.grid
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: colors.text
          },
          grid: {
            color: colors.grid
          }
        }
      }
    }
  });
}

/**
 * Update all charts when theme changes
 */
function updateChartsTheme() {
  // This is called by app.js when theme changes
  // Charts will be re-rendered with new colors
  Object.keys(chartInstances).forEach(id => {
    const chart = chartInstances[id];
    if (chart) {
      const colors = getChartColors();
      chart.options.plugins.legend.labels.color = colors.text;
      if (chart.options.scales) {
        Object.values(chart.options.scales).forEach(scale => {
          if (scale.ticks) scale.ticks.color = colors.text;
          if (scale.grid) scale.grid.color = colors.grid;
        });
      }
      chart.update();
    }
  });
}

// Export functions
window.renderTagChart = renderTagChart;
window.renderSourceChart = renderSourceChart;
window.renderTrendChart = renderTrendChart;
window.updateChartsTheme = updateChartsTheme;
