document.addEventListener('DOMContentLoaded', () => {
    // Tab Switching Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const isOnline = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.protocol !== 'file:';
            
            if (isOnline && targetId !== 'all-projects' && sessionStorage.getItem('daily_log_unlocked') !== 'true') {
                window.pendingTabTarget = targetId;
                document.getElementById('pin-overlay').classList.add('active');
                document.getElementById('pin-input').focus();
                return;
            }
            
            activateTab(btn, targetId);
        });
    });

    function activateTab(btn, targetId) {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(targetId).classList.add('active');
    }

    // Filter event listeners cho tab All Projects
    document.querySelectorAll('.filter-input').forEach(input => {
        input.addEventListener('change', filterLibrary);
        input.addEventListener('input', filterLibrary);
    });

    fetchData();
    initDailyLog(); // Initialize Daily Log
});

let globalData = {};

async function fetchData() {
    try {
        const response = await fetch('data.json');
        globalData = await response.json();
        
        renderProjectWorking(globalData['Project Working'] || []);
        renderStudyPlan(globalData['Study Plan'] || []);
        
        if (globalData['All Projects']) {
            populateFilters(globalData['All Projects']);
            renderAllProjects(globalData['All Projects']);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('project-grid').innerHTML = `<p class="error" style="color: #ef4444;">Lỗi tải dữ liệu: ${error.message}. Hãy kiểm tra data.json.</p>`;
    }
}

function getStatusClass(status) {
    if (!status) return 'status-default';
    const s = status.toLowerCase();
    if (s.includes('hoàn thành') || s.includes('hoàn thiện')) return 'status-hoanthanh';
    if (s.includes('đang thi công') || s.includes('đang học') || s.includes('đang thực hiện')) return 'status-dangthicong';
    if (s.includes('triển khai')) return 'status-trienkhai';
    if (s.includes('phương án') || s.includes('chuẩn bị')) return 'status-phuongan';
    if (s.includes('tạm dừng') || s.includes('tạm ngưng')) return 'status-tamdung';
    return 'status-default';
}

function getIconHTML(status) {
    if (!status) return '';
    const s = status.toLowerCase();
    if (s.includes('hoàn thành') || s.includes('hoàn thiện')) {
        return `<div class="status-icon-svg" style="color: #10b981;" title="${status}"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></div>`;
    }
    if (s.includes('đang thi công') || s.includes('đang học') || s.includes('đang thực hiện') || s.includes('triển khai')) {
        return `<div class="status-icon-svg" style="color: #3b82f6;" title="${status}"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg></div>`;
    }
    if (s.includes('tạm dừng') || s.includes('tạm ngưng')) {
        return `<div class="status-icon-svg" style="color: #ef4444;" title="${status}"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg></div>`;
    }
    return '';
}

function createLocalLinkHandler(path) {
    const isOnline = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.protocol !== 'file:';
    if (isOnline) return 'style="display: none;"'; // Ẩn nút nếu chạy online
    return `onclick="openLocalFolder('${path.replace(/\\/g, '\\\\')}'); event.stopPropagation(); return false;"`;
}

window.openLocalFolder = async function(path) {
    try {
        const response = await fetch('http://localhost:8081/open-folder?path=' + encodeURIComponent(path));
        const result = await response.json();
        if (result.status === 'error') {
            alert('Lỗi: ' + result.message);
        }
    } catch (err) {
        console.error('Failed to open folder: ', err);
        alert('Lỗi kết nối. Hãy chắc chắn bạn đang chạy Dashboard qua file Start_Dashboard.bat!');
    }
};

function renderProjectWorking(projects) {
    const grid = document.getElementById('project-grid');
    grid.innerHTML = '';
    projects.forEach(project => {
        const statusClass = getStatusClass(project.Status);
        const folderAction = project['Folder Link'] 
            ? `<button class="btn btn-primary" ${createLocalLinkHandler(project['Folder Link'])}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                Mở Thư Mục
               </button>` : '';

        const cardHTML = `
            <div class="card" onclick="openDetailsModal('${project['Project ID']}', 'Project Working')">
                <div class="card-header">
                    <div>
                        <div class="card-title">${project['Project Name'] || 'Dự án không tên'}</div>
                        <div class="card-subtitle">${project['Project ID'] || ''} • CĐT: ${project['Investor'] || ''}</div>
                    </div>
                    <span class="badge ${statusClass}">${project.Status || 'N/A'}</span>
                </div>
                <div class="card-body">
                    <div class="info-row"><span class="info-label">Ưu tiên</span><span class="info-value priority-stars">${project.Priority || ''}</span></div>
                    <div class="info-row"><span class="info-label">Bắt đầu</span><span class="info-value">${project['Start Date'] || '--'}</span></div>
                    <div class="info-row"><span class="info-label">Deadline</span><span class="info-value">${project.Deadline || '--'}</span></div>
                </div>
                ${folderAction ? `<div class="card-actions">${folderAction}</div>` : ''}
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function renderStudyPlan(plans) {
    const grid = document.getElementById('study-grid');
    grid.innerHTML = '';
    plans.forEach(plan => {
        const statusClass = getStatusClass(plan.Status);
        let progress = 0, done = 0, total = 0;
        if (plan['Done / Total lesson ']) {
            const parts = plan['Done / Total lesson '].split('/');
            if (parts.length === 2) {
                done = parseInt(parts[0]); total = parseInt(parts[1]);
                if (total > 0) progress = Math.round((done / total) * 100);
            }
        }

        const resourceAction = plan['Resource Link']
            ? `<a href="${plan['Resource Link']}" target="_blank" class="btn" onclick="event.stopPropagation()">Khóa học</a>` : '';
        const folderAction = plan['Folder Link'] 
            ? `<button class="btn btn-primary" ${createLocalLinkHandler(plan['Folder Link'])}>Tài liệu</button>` : '';

        const cardHTML = `
            <div class="card" onclick="openDetailsModal('${plan['Skill/Topic']}', 'Study Plan')">
                <div class="card-header">
                    <div>
                        <div class="card-title">${plan.Category || 'Không tên'}</div>
                        <div class="card-subtitle">${plan['Skill/Topic'] || ''}</div>
                    </div>
                    <span class="badge ${statusClass}">${plan.Status || 'N/A'}</span>
                </div>
                <div class="card-body">
                    <div class="progress-container">
                        <div class="progress-header">
                            <span class="info-label">Tiến độ (${plan['Done / Total lesson '] || '0/0'})</span>
                            <span class="info-value">${progress}%</span>
                        </div>
                        <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
                    </div>
                </div>
                ${(resourceAction || folderAction) ? `<div class="card-actions">${resourceAction}${folderAction}</div>` : ''}
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function populateFilters(projects) {
    const years = new Set(), types = new Set(), statuses = new Set();
    projects.forEach(p => {
        if(p.Nam) years.add(p.Nam);
        if(p.TheLoai) types.add(p.TheLoai);
        if(p.TrangThai) statuses.add(p.TrangThai);
    });
    
    const fillSelect = (id, set) => {
        const select = document.getElementById(id);
        Array.from(set).sort().reverse().forEach(val => {
            select.insertAdjacentHTML('beforeend', `<option value="${val}">${val}</option>`);
        });
    };
    fillSelect('filterNam', years);
    fillSelect('filterTheLoai', types);
    fillSelect('filterTrangThai', statuses);
}

function renderAllProjects(projects) {
    const grid = document.getElementById('library-grid');
    grid.innerHTML = '';
    const isOnline = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.protocol !== 'file:';

    projects.forEach(project => {
        const statusClass = getStatusClass(project.TrangThai);
        const webPath = project.Path ? project.Path.replace(/\\/g, '|') : '';
        const thumbUrl = isOnline ? `assets/${project.ID}/thumb.jpg` : `http://localhost:8081/thumbnails/${encodeURIComponent(webPath)}`;
        
        const folderAction = project.Path 
            ? `<button class="btn btn-primary" ${createLocalLinkHandler(project.Path)}>Mở Folder</button>` : '';

        const cardHTML = `
            <div class="card library-card" 
                 data-ten="${(project['Tên Dự Án']||'').toLowerCase()} ${(project.DiaDiem||'').toLowerCase()}" 
                 data-nam="${project.Nam}" data-theloai="${project.TheLoai}" data-trangthai="${project.TrangThai}"
                 onclick="openDetailsModal('${project.ID}', 'All Projects')">
                <div class="project-img-container">
                    <img src="${thumbUrl}" onerror="this.src='https://placehold.co/400x200?text=No+Image'" class="project-img">
                    ${getIconHTML(project.TrangThai)}
                </div>
                <div class="card-header" style="padding-top: 0;">
                    <div>
                        <div class="card-title">${project['Tên Dự Án'] || 'Dự án không tên'}</div>
                        <div class="card-subtitle">📍 ${project.DiaDiem || '---'} | 👤 ${project.ChuDauTu || '---'}</div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="info-row"><span class="info-label">Năm</span><span class="info-value">${project.Nam || '--'}</span></div>
                    <div class="info-row"><span class="info-label">Thể loại</span><span class="info-value">${project.TheLoai || '--'}</span></div>
                </div>
                ${folderAction ? `<div class="card-actions">${folderAction}</div>` : ''}
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function filterLibrary() {
    const keyword = document.getElementById('searchKeyword').value.toLowerCase().trim();
    const fNam = document.getElementById('filterNam').value;
    const fTheLoai = document.getElementById('filterTheLoai').value;
    const fTrangThai = document.getElementById('filterTrangThai').value;
    
    document.querySelectorAll('.library-card').forEach(card => {
        const matchesKeyword = !keyword || card.getAttribute('data-ten').includes(keyword);
        const matchesNam = !fNam || card.getAttribute('data-nam') == fNam;
        const matchesTheLoai = !fTheLoai || card.getAttribute('data-theloai') == fTheLoai;
        const matchesTrangThai = !fTrangThai || card.getAttribute('data-trangthai') == fTrangThai;
        
        card.style.display = (matchesKeyword && matchesNam && matchesTheLoai && matchesTrangThai) ? 'flex' : 'none';
    });
}

// Modal Logic
window.openDetailsModal = async function(id, type) {
    const modal = document.getElementById('details-modal');
    const title = document.getElementById('modal-title');
    const infoGrid = document.getElementById('modal-info');
    const gallery = document.getElementById('modal-gallery');
    
    title.innerText = `Chi tiết: ${id}`;
    infoGrid.innerHTML = '';
    gallery.innerHTML = '';
    
    // Tìm chi tiết từ sheet Details nếu có
    const details = (globalData['Details'] || []).find(d => d.ID == id);
    if (details) {
        Object.keys(details).forEach(key => {
            if (key !== 'ID' && details[key]) {
                // Nhận dạng URL
                let val = details[key];
                if (typeof val === 'string' && val.startsWith('http')) {
                    val = `<a href="${val}" target="_blank" style="color: var(--color-accent)">Mở liên kết</a>`;
                }
                infoGrid.insertAdjacentHTML('beforeend', `<div class="info-box"><h4>${key}</h4><div>${val}</div></div>`);
            }
        });
    } else {
        infoGrid.innerHTML = '<div class="info-box"><i>Chưa có thông tin chi tiết trong Sheet "Details".</i></div>';
    }

    // Nếu là dự án All Projects, thử tải ảnh Present
    if (type === 'All Projects') {
        const project = globalData['All Projects'].find(p => p.ID == id);
        if (project && project.Path) {
            const isOnline = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.protocol !== 'file:';
            gallery.innerHTML = '<p>Đang tải ảnh album...</p>';
            try {
                if (!isOnline) {
                    const webPath = encodeURIComponent(project.Path.replace(/\\/g, '|'));
                    const res = await fetch(`http://localhost:8081/get_present_images?path=${webPath}`);
                    const images = await res.json();
                    
                    gallery.innerHTML = '';
                    if (images.length === 0) {
                        gallery.innerHTML = '<p>Thư mục Present trống hoặc không tồn tại.</p>';
                    } else {
                        // Store images for lightbox navigation
                        window.currentGalleryImages = images.map(img => `http://localhost:8081/present_file/${webPath}/${encodeURIComponent(img)}`);
                        images.forEach((img, idx) => {
                            const imgSrc = window.currentGalleryImages[idx];
                            gallery.insertAdjacentHTML('beforeend', `<img src="${imgSrc}" class="gallery-img" onclick="openLightbox(${idx})">`);
                        });
                    }
                } else {
                    // Bản Online: load ảnh từ đường dẫn tĩnh assets/{ID}/Present/
                    const knownImages = project['PresentImages'];
                    if (knownImages) {
                        // Nếu data.json có danh sách ảnh, dùng luôn
                        const imgList = knownImages.split(',').map(s => s.trim()).filter(Boolean);
                        window.currentGalleryImages = imgList.map(f => `assets/${project.ID}/Present/${f}`);
                    } else {
                        // Thử probe các ảnh dựa trên tên file phổ biến từ local sync log
                        // Fallback: hiển thị thông báo hướng dẫn
                        window.currentGalleryImages = [];
                    }

                    gallery.innerHTML = '';
                    if (window.currentGalleryImages.length === 0) {
                        // Probe ảnh bằng cách thử load lần lượt (index-based)
                        gallery.innerHTML = '<p style="color:var(--text-secondary)">Đang tải album ảnh...</p>';
                        const probeImages = async () => {
                            const found = [];
                            const basePath = `assets/${project.ID}/Present/`;
                            // Thử fetch manifest file trước
                            try {
                                const mRes = await fetch(`${basePath}manifest.json`);
                                if (mRes.ok) {
                                    const manifest = await mRes.json();
                                    manifest.forEach(f => found.push(basePath + f));
                                }
                            } catch(e) {}
                            
                            if (found.length === 0) {
                                gallery.innerHTML = '<p style="color:var(--text-secondary)">Chưa có ảnh Present được đồng bộ lên Online. Hãy chạy "Publish Online" để cập nhật.</p>';
                                return;
                            }
                            window.currentGalleryImages = found;
                            gallery.innerHTML = '';
                            found.forEach((src, idx) => {
                                gallery.insertAdjacentHTML('beforeend', `<img src="${src}" class="gallery-img" onclick="openLightbox(${idx})" onerror="this.parentElement.removeChild(this)">`);
                            });
                        };
                        probeImages();
                    } else {
                        window.currentGalleryImages.forEach((src, idx) => {
                            gallery.insertAdjacentHTML('beforeend', `<img src="${src}" class="gallery-img" onclick="openLightbox(${idx})" onerror="this.parentElement.removeChild(this)">`);
                        });
                    }
                }
            } catch (e) {
                gallery.innerHTML = '<p>Lỗi tải ảnh album.</p>';
            }
        }
    }
    
    modal.classList.add('active');
};

window.closeModal = function(e) {
    if (e) e.stopPropagation();
    document.getElementById('details-modal').classList.remove('active');
};

// Đóng modal khi click ra ngoài vùng nội dung
document.getElementById('details-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal(e);
    }
});

// Lightbox Logic
let currentLightboxIndex = 0;
window.openLightbox = function(index) {
    currentLightboxIndex = index;
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    img.src = window.currentGalleryImages[index];
    lightbox.classList.add('active');
};

window.closeLightbox = function(e) {
    if (e && e.target !== e.currentTarget && !e.target.classList.contains('lightbox-close')) return;
    if (e) e.stopPropagation();
    document.getElementById('lightbox').classList.remove('active');
};

window.changeLightboxImage = function(step, e) {
    if (e) e.stopPropagation();
    if (!window.currentGalleryImages || window.currentGalleryImages.length === 0) return;
    
    currentLightboxIndex += step;
    if (currentLightboxIndex < 0) currentLightboxIndex = window.currentGalleryImages.length - 1;
    if (currentLightboxIndex >= window.currentGalleryImages.length) currentLightboxIndex = 0;
    
    document.getElementById('lightbox-img').src = window.currentGalleryImages[currentLightboxIndex];
};

// ==========================================
// DAILY TASK MANAGER LOGIC
// ==========================================
const DAILY_STORAGE_KEY = 'daily_tasks';
let dailyTasks = {};
let currentDailyFilter = 'all';

// Simple SHA-256 hash for PIN (Pin is "123456" for example: 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92)
const SECRET_PIN_HASH = '630e95c2622e5cbd4d83a65394ebb142b8161201982ed4b8eafce98c98234ade';

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function initDailyLog() {
    const isOnline = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.protocol !== 'file:';
    
    // Security setup
    setupPinProtection();

    if (!isOnline || sessionStorage.getItem('daily_log_unlocked') === 'true') {
        loadDailyTasks();
        if (!isOnline) {
            autoArchiveOldTasks();
        } else {
            console.warn("Chạy Online: Tính năng Auto-Archive bị vô hiệu hóa. Dữ liệu cũ sẽ lưu trong localStorage.");
        }
        renderDailyTasks();
    }
}

function setupPinProtection() {
    // 1. Keyboard Shortcut
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') {
            e.preventDefault();
            document.getElementById('pin-overlay').classList.add('active');
            document.getElementById('pin-input').focus();
        }
    });

    // 2. Triple Tap on Logo
    const logo = document.querySelector('.site-logo');
    let tapCount = 0;
    let tapTimeout;
    if (logo) {
        logo.addEventListener('click', (e) => {
            tapCount++;
            clearTimeout(tapTimeout);
            if (tapCount >= 3) {
                tapCount = 0;
                document.getElementById('pin-overlay').classList.add('active');
                document.getElementById('pin-input').focus();
            } else {
                tapTimeout = setTimeout(() => { tapCount = 0; }, 500); // Reset after 500ms
            }
        });
    }

    // Auto verify on 6 chars input
    const pinInput = document.getElementById('pin-input');
    pinInput.addEventListener('input', (e) => {
        document.getElementById('pin-error').style.display = 'none';
        if (e.target.value.length === 6) {
            verifyPin();
        }
    });
    
    // Enter key
    pinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyPin();
    });
}

window.closePinOverlay = function(e) {
    if (e) e.stopPropagation();
    document.getElementById('pin-overlay').classList.remove('active');
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-error').style.display = 'none';
};

window.verifyPin = async function() {
    const input = document.getElementById('pin-input').value;
    const hash = await sha256(input);
    
    if (hash === SECRET_PIN_HASH) {
        sessionStorage.setItem('daily_log_unlocked', 'true');
        closePinOverlay();
        loadDailyTasks();
        renderDailyTasks();
        
        if (window.pendingTabTarget) {
            const targetBtn = document.querySelector(`.tab-btn[data-target="${window.pendingTabTarget}"]`);
            if (targetBtn) {
                const tabBtns = document.querySelectorAll('.tab-btn');
                const tabContents = document.querySelectorAll('.tab-content');
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                targetBtn.classList.add('active');
                document.getElementById(window.pendingTabTarget).classList.add('active');
            }
            window.pendingTabTarget = null;
        }
    } else {
        document.getElementById('pin-error').style.display = 'block';
    }
};

function loadDailyTasks() {
    const stored = localStorage.getItem(DAILY_STORAGE_KEY);
    if (stored) {
        try {
            dailyTasks = JSON.parse(stored);
        } catch (e) {
            console.error("Error parsing daily tasks:", e);
            dailyTasks = {};
        }
    }
}

function saveDailyTasks() {
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(dailyTasks));
}

function getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

// Rendering
function renderDailyTasks() {
    const today = getTodayString();
    
    // Render Today's tasks
    const d = new Date();
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    document.getElementById('daily-date-title').innerText = `${days[d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
    
    let todayTasks = dailyTasks[today] || [];
    todayTasks.sort((a, b) => (a.startTime || '24:00').localeCompare(b.startTime || '24:00'));

    const listEl = document.getElementById('daily-tasks-list');
    
    let tableHTML = `
        <div class="daily-table-container">
            <div style="background: #1e40af; color: white; padding: 15px; text-align: center; font-weight: bold; font-size: 1.1rem; text-transform: uppercase;">
                CHECKLIST CÔNG VIỆC HÀNG NGÀY
            </div>
            <table class="daily-table">
                <thead>
                    <tr>
                        <th style="width: 50px;">STT</th>
                        <th style="text-align: left; min-width: 200px;">Công việc</th>
                        <th style="text-align: left; min-width: 150px;">Mô tả chi tiết</th>
                        <th style="width: 100px;">Bắt đầu</th>
                        <th style="width: 100px;">Kết thúc</th>
                        <th style="width: 80px;">Sửa/Xóa</th>
                        <th style="width: 140px;">Trạng thái</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let hasTasks = false;
    let stt = 1;
    
    todayTasks.forEach(task => {
        if (currentDailyFilter !== 'all' && task.type !== currentDailyFilter) return;
        hasTasks = true;
        
        let typeInfo = getTaskTypeInfo(task.type);
        const selectClass = task.done ? 'status-done' : 'status-waiting';
        
        tableHTML += `
            <tr>
                <td style="text-align: center;">${stt}</td>
                <td>
                    <span style="margin-right: 8px;" title="${typeInfo.name}">${typeInfo.icon}</span>
                    <span style="font-weight: 500; ${task.done ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${task.title}</span>
                </td>
                <td style="color: var(--text-secondary); font-size: 0.9em;">${task.note || ''}</td>
                <td style="text-align: center;">${task.startTime || '-'}</td>
                <td style="text-align: center;">${task.endTime || '-'}</td>
                <td style="text-align: center;">
                    <button style="background:none; border:none; cursor:pointer; margin-right:5px; font-size:1.1rem;" onclick="editTask('${today}', '${task.id}')">✏️</button>
                    <button style="background:none; border:none; cursor:pointer; font-size:1.1rem;" onclick="deleteTask('${today}', '${task.id}')">🗑</button>
                </td>
                <td style="text-align: center;">
                    <select class="status-select ${selectClass}" onchange="changeTaskStatus('${today}', '${task.id}', this.value)">
                        <option value="waiting" ${!task.done ? 'selected' : ''}>Đang chờ</option>
                        <option value="done" ${task.done ? 'selected' : ''}>Hoàn thành</option>
                    </select>
                </td>
            </tr>
        `;
        stt++;
    });

    if (!hasTasks) {
        tableHTML += `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-secondary);">Chưa có công việc nào. Bấm "+ Thêm việc" để bắt đầu.</td></tr>`;
    }

    tableHTML += `</tbody></table></div>`;
    listEl.innerHTML = tableHTML;

    renderWeekLog();
}

window.changeTaskStatus = function(date, id, val) {
    const task = dailyTasks[date].find(t => t.id === id);
    if (task) {
        task.done = (val === 'done');
        saveDailyTasks();
        renderDailyTasks();
    }
};

function getTaskTypeInfo(type) {
    if (type === 'work') return { bg: '#3b82f6', icon: '💼 CV', name: 'Công Việc' };
    if (type === 'study') return { bg: '#8b5cf6', icon: '📚 HT', name: 'Học Tập' };
    if (type === 'meeting') return { bg: '#10b981', icon: '🤝 CH', name: 'Cuộc Hẹn' };
    return { bg: '#64748b', icon: '📌', name: 'Khác' };
}

function renderWeekLog() {
    const tbody = document.getElementById('daily-history-tbody');
    tbody.innerHTML = '';
    
    // Sort dates descending
    const dates = Object.keys(dailyTasks).sort().reverse();
    const todayStr = getTodayString();
    
    let rowCount = 0;
    
    dates.forEach(date => {
        if (date === todayStr) return; // Không hiển thị hôm nay ở bảng lịch sử
        
        const tasks = dailyTasks[date] || [];
        tasks.sort((a, b) => (a.startTime || '24:00').localeCompare(b.startTime || '24:00'));
        
        tasks.forEach(task => {
            let typeInfo = getTaskTypeInfo(task.type);
            let timeStr = task.startTime ? `${task.startTime}` : '--:--';
            if (task.endTime) timeStr += ` - ${task.endTime}`;
            
            const html = `
                <tr>
                    <td style="white-space: nowrap;">${formatDateDisplay(date)}</td>
                    <td style="white-space: nowrap;">${timeStr}</td>
                    <td><span style="color: ${typeInfo.bg}">${typeInfo.icon}</span></td>
                    <td>${task.title}</td>
                    <td style="color: var(--text-secondary); font-size: 0.85em;">${task.note || ''}</td>
                    <td>
                        ${task.done 
                            ? '<span style="color: var(--color-success);">✅ Xong</span>' 
                            : '<span style="color: var(--color-danger);">❌ Chưa làm</span>'}
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', html);
            rowCount++;
        });
    });

    if (rowCount === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-secondary);">Chưa có lịch sử 7 ngày qua.</td></tr>';
    }
}

// Interactions
window.filterDailyTasks = function(type) {
    currentDailyFilter = type;
    document.querySelectorAll('.task-filters .filter-badge').forEach(b => {
        if (b.dataset.type === type) b.classList.add('active');
        else b.classList.remove('active');
    });
    renderDailyTasks();
};

window.toggleTaskDone = function(date, id) {
    const task = dailyTasks[date].find(t => t.id === id);
    if (task) {
        task.done = !task.done;
        saveDailyTasks();
        renderDailyTasks();
    }
};

window.deleteTask = function(date, id) {
    if (confirm("Bạn có chắc chắn muốn xóa công việc này?")) {
        dailyTasks[date] = dailyTasks[date].filter(t => t.id !== id);
        // Clean empty dates
        if (dailyTasks[date].length === 0) delete dailyTasks[date];
        saveDailyTasks();
        renderDailyTasks();
    }
};

// Modal functions
window.openTaskModal = function() {
    document.getElementById('task-form').reset();
    document.getElementById('task-id').value = '';
    document.getElementById('task-modal-title').innerText = 'Thêm công việc';
    document.getElementById('task-modal').classList.add('active');
};

window.closeTaskModal = function(e) {
    if (e) e.stopPropagation();
    document.getElementById('task-modal').classList.remove('active');
};

window.editTask = function(date, id) {
    const task = dailyTasks[date].find(t => t.id === id);
    if (!task) return;
    
    document.getElementById('task-id').value = id; // Store ID means Edit mode
    document.getElementById('task-type').value = task.type || 'work';
    document.getElementById('task-start-time').value = task.startTime || '';
    document.getElementById('task-end-time').value = task.endTime || '';
    document.getElementById('task-title').value = task.title || '';
    document.getElementById('task-note').value = task.note || '';
    
    document.getElementById('task-modal-title').innerText = 'Sửa công việc';
    document.getElementById('task-modal').classList.add('active');
};

document.getElementById('task-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('task-id').value;
    const today = getTodayString();
    
    if (!dailyTasks[today]) dailyTasks[today] = [];
    
    const newTask = {
        id: id || Date.now().toString(),
        type: document.getElementById('task-type').value,
        startTime: document.getElementById('task-start-time').value,
        endTime: document.getElementById('task-end-time').value,
        title: document.getElementById('task-title').value,
        note: document.getElementById('task-note').value,
        done: false
    };

    if (id) {
        // Edit mode (preserve done status)
        const idx = dailyTasks[today].findIndex(t => t.id === id);
        if (idx !== -1) {
            newTask.done = dailyTasks[today][idx].done;
            dailyTasks[today][idx] = newTask;
        }
    } else {
        // Add mode
        dailyTasks[today].push(newTask);
    }
    
    saveDailyTasks();
    closeTaskModal();
    renderDailyTasks();
});

// Auto Archive Logic
async function autoArchiveOldTasks() {
    const dates = Object.keys(dailyTasks);
    if (dates.length === 0) return;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let datesToArchive = [];
    
    dates.forEach(dateStr => {
        const parts = dateStr.split('-');
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        const diffTime = Math.abs(today - d);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Archive dates older than 7 days
        if (diffDays > 7) {
            datesToArchive.push(dateStr);
        }
    });

    if (datesToArchive.length === 0) return;
    
    console.log(`Found ${datesToArchive.length} dates to archive.`);
    
    let successCount = 0;
    for (let dateStr of datesToArchive) {
        const tasks = dailyTasks[dateStr];
        try {
            const response = await fetch('http://localhost:8081/archive-tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dateStr, tasks: tasks })
            });
            const result = await response.json();
            if (result.status === 'ok') {
                delete dailyTasks[dateStr]; // Remove from local after success
                successCount++;
            }
        } catch (err) {
            console.error(`Failed to archive date ${dateStr}:`, err);
        }
    }
    
    if (successCount > 0) {
        saveDailyTasks();
        renderWeekLog(); // Re-render history
        console.log(`Successfully archived ${successCount} dates.`);
    }
}

// ==========================================
// VOICE INPUT LOGIC
// ==========================================
window.startVoiceInput = function(inputId, btnId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    
    if (!('webkitSpeechRecognition' in window)) {
        alert('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói. Vui lòng dùng Chrome hoặc Edge.');
        return;
    }
    
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = function() {
        btn.style.backgroundColor = '#ef4444';
        btn.style.color = 'white';
        btn.innerText = '🔴';
    };
    
    recognition.onresult = function(event) {
        const speechResult = event.results[0][0].transcript;
        if (input.tagName.toLowerCase() === 'textarea') {
            input.value += (input.value ? '\n' : '') + speechResult;
        } else {
            input.value += (input.value ? ' ' : '') + speechResult;
        }
    };
    
    recognition.onspeechend = function() {
        recognition.stop();
    };
    
    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        alert('Lỗi nhận diện giọng nói: ' + event.error);
    };
    
    recognition.onend = function() {
        btn.style.backgroundColor = '';
        btn.style.color = '';
        btn.innerText = '🎤';
    };
    
    recognition.start();
};
