document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const workflowContainer = document.getElementById('workflowContainer');
    const resultsContainer = document.getElementById('resultsContainer');
    const toolItems = document.querySelectorAll('.tool-item');

    // File Upload Handling
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#4CAF50';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '#ccc';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
        const files = e.dataTransfer.files;
        if (files.length) {
            handleFileUpload(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // Drag and Drop Tool Items
    toolItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', item.dataset.tool);
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });
    });

    workflowContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    workflowContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const toolType = e.dataTransfer.getData('text/plain');
        if (toolType) {
            const workflowItem = createWorkflowItem(toolType);
            workflowContainer.appendChild(workflowItem);
            executeWorkflowItem(toolType);
        }
    });

    // File Upload Function
    function handleFileUpload(file) {
        const formData = new FormData();
        formData.append('file', file);

        fetch('http://localhost:5000/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showError(data.error);
            } else {
                showSuccess(`File uploaded successfully. Columns: ${data.columns.join(', ')}`);
            }
        })
        .catch(error => {
            showError('Error uploading file: ' + error.message);
        });
    }

    // Create Workflow Item
    function createWorkflowItem(toolType) {
        const item = document.createElement('div');
        item.className = 'workflow-item';
        item.innerHTML = `
            <div>${getToolName(toolType)}</div>
            <div class="workflow-item-results"></div>
        `;
        return item;
    }

    // Execute Workflow Item
    function executeWorkflowItem(toolType) {
        switch (toolType) {
            case 'check_null':
                fetch('http://localhost:5000/check_null')
                    .then(response => response.json())
                    .then(data => {
                        if (data.error) {
                            showError(data.error);
                        } else {
                            const nullSummary = Object.entries(data.null_counts)
                                .map(([col, count]) => `${col}: ${count}`)
                                .join('<br>');
                            showResults(`Null Values Summary:<br>${nullSummary}<br>Total nulls: ${data.total_nulls}`);
                        }
                    })
                    .catch(error => showError('Error checking null values: ' + error.message));
                break;

            case 'remove_null':
                fetch('http://localhost:5000/remove_null', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ method: 'dropna' })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.error) {
                            showError(data.error);
                        } else {
                            showSuccess(`Null values removed. New shape: ${data.new_shape[0]} rows × ${data.new_shape[1]} columns`);
                        }
                    })
                    .catch(error => showError('Error removing null values: ' + error.message));
                break;

            case 'get_summary':
                fetch('http://localhost:5000/get_summary')
                    .then(response => response.json())
                    .then(data => {
                        if (data.error) {
                            showError(data.error);
                        } else {
                            const summary = `
                                Shape: ${data.shape[0]} rows × ${data.shape[1]} columns<br>
                                Columns: ${data.columns.join(', ')}<br>
                                Data Types:<br>${Object.entries(data.dtypes).map(([col, type]) => `${col}: ${type}`).join('<br>')}
                            `;
                            showResults(summary);
                        }
                    })
                    .catch(error => showError('Error getting summary: ' + error.message));
                break;
        }
    }

    // Helper Functions
    function getToolName(toolType) {
        const names = {
            'check_null': 'Check Null Values',
            'remove_null': 'Remove Null Values',
            'get_summary': 'Get Data Summary'
        };
        return names[toolType] || toolType;
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        resultsContainer.prepend(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        resultsContainer.prepend(successDiv);
        setTimeout(() => successDiv.remove(), 5000);
    }

    function showResults(html) {
        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = html;
        resultsContainer.prepend(resultDiv);
    }
}); 