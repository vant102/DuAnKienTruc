document.addEventListener('DOMContentLoaded', () => {
    // Tab Switching Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Filter event listeners cho tab All Projects
    document.querySelectorAll('.filter-input').forEach(input => {
        input.addEventListener('change', filterLibrary);
        input.addEventListener('input', filterLibrary);
    });

    fetchData();
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
    const isOnline = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
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
    const isOnline = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

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
            const isOnline = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
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
                    gallery.innerHTML = '<p>Chức năng xem ảnh chất lượng cao bị tắt trên bản Online.</p>';
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
