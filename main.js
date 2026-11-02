class AppleTVPlayer {
    constructor() {
        this.videos = [];
        this.currentVideoIndex = -1;
        this.lastPage = 'home';
        this.isDraggingProgress = false;
        this.playbackSpeed = 1;
        this.cursorHideTimeout = null;
        this.thumbnailVideo = document.createElement('video');
        this.thumbnailCanvas = document.createElement('canvas');
        this.animationFrame = null;
        this.previewTimer = null;
        this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.setupOffscreenElements();
        this.initializeDOMElements();
        this.initializeCursor();
        this.initializeTheme();
        this.bindEvents();

        this.throttledShowThumbnailPreview = this.throttle(this.showThumbnailPreview, 120);

        this.addVideo({
            name: 'Jujutsu Kaisen -demo .webm',
            url: 'Videos/Jujutsu Kaisen -demo .webm',
            thumbnail: 'Videos/Jujutsu Kaisen -demo .png',
            preload: true
        }, true);

        this.renderLibrary();

        window.addEventListener('beforeunload', () => this.cleanup());

        if (this.pages && this.pages.length > 0) {
            this.pages.forEach(page => {
                page.style.display = 'none';
                page.classList.remove('active');
            });
            this.showPage('home');
        }
    }

    setupOffscreenElements() {
        const offscreenStyle = {
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            opacity: '0',
            visibility: 'hidden'
        };

        Object.assign(this.thumbnailVideo.style, offscreenStyle);
        this.thumbnailVideo.preload = 'metadata';
        this.thumbnailVideo.muted = true;

        this.thumbnailCanvas.width = 160;
        this.thumbnailCanvas.height = 90;
        Object.assign(this.thumbnailCanvas.style, offscreenStyle);

        document.body.appendChild(this.thumbnailVideo);
        document.body.appendChild(this.thumbnailCanvas);
    }

    initializeDOMElements() {
        this.cursor = document.querySelector('.cursor');
        this.blob = document.querySelector('.blob');
        this.toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.pages = document.querySelectorAll('.page');
        this.playerPage = document.getElementById('player');
        this.mainVideo = document.getElementById('mainVideo');
        this.videoGrid = document.getElementById('videoGrid');
        this.fileInput = document.getElementById('fileInput');
        this.uploadArea = document.getElementById('uploadArea');
        this.uploadBtn = document.querySelector('.upload-btn');
        this.videoControls = document.getElementById('videoControls');
        this.playBtn = document.getElementById('playBtn');
        this.rewindBtn = document.getElementById('rewindBtn');
        this.fastForwardBtn = document.getElementById('fastForwardBtn');
        this.progressContainer = document.querySelector('.progress-container');
        this.progressBar = document.querySelector('.progress-bar');
        this.progressThumb = document.querySelector('.progress-thumb');
        this.progressThumbnailPreview = document.getElementById('progressThumbnailPreview');
        this.progressThumbnailImg = document.getElementById('progressThumbnailImg');
        this.thumbnailTimeIndicator = document.querySelector('.thumbnail-time-indicator');
        this.timeDisplay = document.querySelector('.time-display');
        this.volumeBtn = document.getElementById('volumeBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.speedBtn = document.getElementById('speedBtn');
        this.speedPickerContainer = document.getElementById('speedPickerContainer');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');

        if (this.playBtn) {
            const playBtnSvg = this.playBtn.querySelector('svg');
            const pauseIcon = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            pauseIcon.classList.add('pause-icon');
            pauseIcon.innerHTML = '<rect x="6" y="4" width="4" height="16" rx="1" stroke="currentColor" stroke-width="2"/><rect x="14" y="4" width="4" height="16" rx="1" stroke="currentColor" stroke-width="2"/>';
            if (playBtnSvg) {
                playBtnSvg.appendChild(pauseIcon);
            }
        }
    }

    initializeCursor() {
        if (!this.cursor || !this.blob) return;

        if (this.reduceMotion) {
            this.cursor.style.display = 'none';
            this.blob.style.display = 'none';
            return;
        }

        this.mouseX = window.innerWidth / 2;
        this.mouseY = window.innerHeight / 2;
        this.cursorX = this.mouseX;
        this.cursorY = this.mouseY;
        this.blobX = this.mouseX;
        this.blobY = this.mouseY;

        window.addEventListener('pointermove', e => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        const tick = () => {
            this.cursorX += (this.mouseX - this.cursorX) * 0.18;
            this.cursorY += (this.mouseY - this.cursorY) * 0.18;
            this.blobX += (this.mouseX - this.blobX) * 0.08;
            this.blobY += (this.mouseY - this.blobY) * 0.08;

            this.cursor.style.transform = `translate3d(${this.cursorX}px, ${this.cursorY}px, 0)`;
            this.blob.style.transform = `translate3d(${this.blobX}px, ${this.blobY}px, 0)`;

            this.animationFrame = requestAnimationFrame(tick);
        };

        this.animationFrame = requestAnimationFrame(tick);

        const hoverElements = document.querySelectorAll('a, button, .control-btn, .nav-link, .upload-btn, .video-card');
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                const rect = el.getBoundingClientRect();
                this.cursor.style.width = `${rect.width}px`;
                this.cursor.style.height = `${rect.height}px`;
                this.cursor.style.borderRadius = getComputedStyle(el).borderRadius;
                this.cursor.style.transform = `translate3d(${rect.left + rect.width / 2}px, ${rect.top + rect.height / 2}px, 0)`;
            });

            el.addEventListener('mouseleave', () => {
                this.cursor.style.width = '18px';
                this.cursor.style.height = '18px';
                this.cursor.style.borderRadius = '50%';
            });
        });
    }

    initializeTheme() {
        if (!this.toggleSwitch) return;

        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light-mode') {
            document.body.classList.add('light-mode');
            this.toggleSwitch.checked = true;
        }

        this.toggleSwitch.addEventListener('change', e => this.switchTheme(e));
    }

    switchTheme(e) {
        if (e.target.checked) {
            document.body.classList.add('light-mode');
            localStorage.setItem('theme', 'light-mode');
        } else {
            document.body.classList.remove('light-mode');
            localStorage.setItem('theme', 'dark-mode');
        }
    }

    bindEvents() {
        const backBtn = document.getElementById('backBtn');
        if (backBtn) backBtn.addEventListener('click', () => this.closePlayer());

        this.navLinks.forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                this.showPage(link.dataset.page);
            });
        });

        if (this.uploadArea && this.uploadBtn && this.fileInput) {
            const toggleDragover = (e, add) => {
                e.preventDefault();
                this.uploadArea.classList.toggle('dragover', add);
            };

            this.uploadBtn.addEventListener('click', () => this.fileInput.click());
            this.fileInput.addEventListener('change', e => this.handleFiles(e.target.files));
            this.uploadArea.addEventListener('dragover', e => toggleDragover(e, true));
            this.uploadArea.addEventListener('dragleave', e => toggleDragover(e, false));
            this.uploadArea.addEventListener('drop', e => {
                e.preventDefault();
                this.uploadArea.classList.remove('dragover');
                this.handleFiles(e.dataTransfer.files);
            });
        }

        if (this.playerPage) {
            this.playBtn?.addEventListener('click', () => this.togglePlay());
            this.rewindBtn?.addEventListener('click', () => this.rewind());
            this.fastForwardBtn?.addEventListener('click', () => this.fastForward());
            this.mainVideo?.addEventListener('timeupdate', () => this.updateProgress());
            this.mainVideo?.addEventListener('play', () => this.updatePlayButton());
            this.mainVideo?.addEventListener('pause', () => this.updatePlayButton());
            this.mainVideo?.addEventListener('volumechange', () => this.updateVolumeButton());
            this.mainVideo?.addEventListener('click', () => this.togglePlay());
            document.addEventListener('keydown', e => this.handleKeyboard(e));
            this.volumeBtn?.addEventListener('click', () => this.toggleMute());
            this.volumeSlider?.addEventListener('input', e => this.setVolume(e.target.value / 100));
            this.fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen());

            this.speedBtn?.addEventListener('click', e => {
                e.stopPropagation();
                this.speedPickerContainer?.classList.toggle('open');
            });

            document.addEventListener('click', e => {
                if (!this.speedPickerContainer) return;
                if (e.target && (e.target.closest('#speedBtn') || e.target.closest('.speed-option'))) return;
                this.speedPickerContainer.classList.remove('open');
            });

            this.speedPickerContainer?.addEventListener('click', e => {
                const option = e.target.closest('.speed-option');
                if (option) this.updateSpeed(option.dataset.speed);
            });

            this.progressContainer?.addEventListener('mousedown', e => this.startSeek(e));
            document.addEventListener('mousemove', e => this.duringSeek(e));
            document.addEventListener('mouseup', () => this.endSeek());
            this.progressContainer?.addEventListener('touchstart', e => this.startSeek(e), { passive: false });
            document.addEventListener('touchmove', e => this.duringSeek(e));
            document.addEventListener('touchend', () => this.endSeek());

            this.progressContainer?.addEventListener('mousemove', e => this.throttledShowThumbnailPreview(e));
            this.progressContainer?.addEventListener('mouseleave', () => this.hideThumbnailPreview());
            this.playerPage.addEventListener('mousemove', () => this.handleCursorVisibility());
        }
    }

    showPage(pageName) {
        if (!this.pages || !this.playerPage) return;

        this.pages.forEach(page => {
            page.classList.remove('active');
            page.style.display = 'none';
        });

        this.playerPage.classList.remove('active');
        document.body.classList.remove('player-active');

        if (pageName === 'player') {
            this.playerPage.classList.add('active');
            document.body.classList.add('player-active');
        } else {
            const target = document.getElementById(pageName);
            if (target) {
                target.classList.add('active');
                target.style.display = 'block';
                this.lastPage = pageName;
            }
        }

        this.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.page === pageName);
        });
    }

    handleFiles(files) {
        const videoFiles = Array.from(files || []).filter(file => {
            const validType = file.type && file.type.startsWith('video/');
            const validExt = /\.(mp4|webm|mov|m4v|mkv|avi|wmv|ogg|ogv)$/i.test(file.name || '');
            return validType || validExt;
        });

        if (videoFiles.length === 0) {
            alert('No Files: Please select valid video files.');
            return;
        }

        videoFiles.forEach(file => this.addVideo(file));
        this.renderLibrary();
        this.showPage('library');
    }

    addVideo(file, isPreloaded = false) {
        const video = isPreloaded ? {
            id: 'preloaded-demo',
            name: file.name,
            url: file.url,
            thumbnail: file.thumbnail || null
        } : {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: file.name,
            url: URL.createObjectURL(file),
            thumbnail: null
        };

        this.videos.push(video);
    }

    renderLibrary() {
        if (!this.videoGrid) return;

        if (this.videos.length === 0) {
            this.videoGrid.innerHTML = '<p>Your library is empty.</p>';
            return;
        }

        this.videoGrid.innerHTML = this.videos.map(video => `
            <div class="video-card liquidGlass-wrapper">
                <div class="liquidGlass-effect"></div>
                <div class="liquidGlass-tint"></div>
                <div class="liquidGlass-shine"></div>
                <div class="liquidGlass-text">
                    <div class="video-thumbnail">
                        ${video.thumbnail ? `<img class="video-thumb-img" data-src="${video.thumbnail}" alt="${video.name} thumbnail" loading="lazy"/>` : '<div class="video-icon">🎥</div>'}
                        <video class="card-video" data-src="${video.url}" muted loop preload="metadata" playsinline></video>
                    </div>
                    <div class="video-info">
                        <div class="video-title">${video.name}</div>
                    </div>
                    <div class="video-card-controls">
                        <button class="card-play-btn" type="button" aria-label="Play video">
                            <svg width="24" height="24" viewBox="0 0 24 24"><path d="M5 5.27436V18.7256C5 19.7621 6.03116 20.4253 6.92164 19.8618L18.3123 13.1362C19.1947 12.5774 19.1947 11.4226 18.3123 10.8638L6.92164 4.13819C6.03116 3.57466 5 4.23 5 5.27436Z" fill="currentColor"/></svg>
                        </button>
                        <button class="card-share-btn" type="button" aria-label="Share video">
                            <svg width="24" height="24" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8m-4-6-4-4-4 4m4-4v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        const lazyLoad = (selector, attr) => {
            const elements = this.videoGrid.querySelectorAll(selector);
            if (!elements.length) return;

            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries, obs) => {
                    entries.forEach(entry => {
                        if (!entry.isIntersecting) return;
                        const el = entry.target;
                        const val = el.dataset[attr];
                        if (val) {
                            el[attr] = val;
                            el.removeAttribute('data-' + attr);
                        }
                        obs.unobserve(el);
                    });
                }, { rootMargin: '100px' });

                elements.forEach(el => observer.observe(el));
                return;
            }

            elements.forEach(el => {
                const val = el.dataset[attr];
                if (val) {
                    el[attr] = val;
                    el.removeAttribute('data-' + attr);
                }
            });
        };

        lazyLoad('img[data-src]', 'src');
        lazyLoad('video[data-src]', 'src');

        this.videoGrid.querySelectorAll('.video-card').forEach((card, index) => {
            const video = card.querySelector('.card-video');
            const shareBtn = card.querySelector('.card-share-btn');
            const playBtn = card.querySelector('.card-play-btn');

            card.addEventListener('click', e => {
                if (e.target.closest('.card-share-btn') || e.target.closest('.card-play-btn')) return;
                this.playVideo(index);
            });

            card.addEventListener('mouseenter', () => {
                if (video && video.src) {
                    video.play().catch(() => {});
                }
            });

            card.addEventListener('mouseleave', () => {
                if (video) {
                    video.pause();
                    video.currentTime = 0;
                }
            });

            shareBtn.addEventListener('click', e => {
                e.stopPropagation();
                const currentVideo = this.videos[index];
                if (!currentVideo) return;

                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(currentVideo.url).then(() => alert('Video URL copied to clipboard!')).catch(() => this.fallbackCopyText(currentVideo.url));
                } else {
                    this.fallbackCopyText(currentVideo.url);
                }
            });

            playBtn.addEventListener('click', e => {
                e.stopPropagation();
                this.playVideo(index);
            });
        });
    }

    fallbackCopyText(value) {
        const temp = document.createElement('textarea');
        temp.value = value;
        temp.setAttribute('readonly', '');
        temp.style.position = 'fixed';
        temp.style.left = '-9999px';
        document.body.appendChild(temp);
        temp.select();

        try {
            if (document.execCommand('copy')) {
                alert('Video URL copied to clipboard!');
            } else {
                alert('Failed to copy video URL to clipboard.');
            }
        } catch {
            alert('Failed to copy video URL to clipboard.');
        }

        document.body.removeChild(temp);
    }

    playVideo(index) {
        if (index < 0 || index >= this.videos.length || !this.mainVideo) return;

        const video = this.videos[index];
        const title = document.getElementById('playerVideoTitle');
        const duration = document.getElementById('playerVideoDuration');
        const resolution = document.getElementById('playerVideoResolution');
        const size = document.getElementById('playerVideoSize');

        if (!title || !duration || !resolution || !size) return;

        this.currentVideoIndex = index;
        title.textContent = video.name.replace(/\.[^/.]+$/, '');
        duration.textContent = resolution.textContent = size.textContent = '...';

        this.mainVideo.src = video.url;
        this.mainVideo.load();
        this.mainVideo.preload = 'metadata';
        this.showPage('player');

        this.mainVideo.onloadedmetadata = () => {
            const mins = Math.floor(this.mainVideo.duration / 60);
            const secs = Math.floor(this.mainVideo.duration % 60);
            duration.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            resolution.textContent = `${this.mainVideo.videoWidth}x${this.mainVideo.videoHeight}`;

            if (video.url.startsWith('blob:')) {
                fetch(video.url)
                    .then(response => {
                        const length = response.headers.get('content-length');
                        if (length) size.textContent = `${(Number(length) / 1048576).toFixed(1)} MB`;
                    })
                    .catch(() => {
                        size.textContent = '';
                    });
            }
        };

        this.mainVideo.play().catch(err => {
            alert(`Playback Error: Could not play "${video.name}".\n\n${err.message}`);
            this.closePlayer();
        });
    }

    togglePlay() {
        if (!this.mainVideo) return;
        if (this.mainVideo.paused) this.mainVideo.play().catch(() => {});
        else this.mainVideo.pause();
    }

    rewind() {
        if (!this.mainVideo) return;
        this.mainVideo.currentTime = Math.max(0, this.mainVideo.currentTime - 10);
    }

    fastForward() {
        if (!this.mainVideo) return;
        this.mainVideo.currentTime = Math.min(this.mainVideo.duration || 0, this.mainVideo.currentTime + 10);
    }

    updateProgress() {
        if (!this.mainVideo || !this.mainVideo.duration) return;
        const percent = Math.min(1, Math.max(0, this.mainVideo.currentTime / this.mainVideo.duration));
        this.progressBar.style.width = `${percent * 100}%`;
        if (this.progressThumb) this.progressThumb.style.left = `${percent * 100}%`;
        this.timeDisplay.textContent = `${this.formatTime(this.mainVideo.currentTime)} / ${this.formatTime(this.mainVideo.duration)}`;
    }

    handleKeyboard(e) {
        if (!this.playerPage || !this.playerPage.classList.contains('active')) return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlay();
                break;
            case 'ArrowLeft':
                this.rewind();
                break;
            case 'ArrowRight':
                this.fastForward();
                break;
            case 'Escape':
                this.closePlayer();
                break;
            default:
                break;
        }
    }

    closePlayer() {
        if (this.mainVideo) this.mainVideo.pause();
        if (this.playerPage) this.playerPage.classList.remove('active');
        document.body.classList.remove('player-active');
        this.showPage(this.lastPage || 'library');
    }

    formatTime(seconds) {
        const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
        const minutes = Math.floor(safeSeconds / 60);
        const secs = Math.floor(safeSeconds % 60);
        return `${minutes}:${String(secs).padStart(2, '0')}`;
    }

    startSeek(e) {
        if (!this.progressContainer || !this.mainVideo || !this.mainVideo.duration) return;
        e.preventDefault();
        this.isDraggingProgress = true;
        this.seek(e);
    }

    duringSeek(e) {
        if (this.isDraggingProgress) this.seek(e);
    }

    endSeek() {
        this.isDraggingProgress = false;
    }

    seek(e) {
        if (!this.progressContainer || !this.mainVideo || !this.mainVideo.duration) return;

        const rect = this.progressContainer.getBoundingClientRect();
        const clientX = e.touches && e.touches.length ? e.touches[0].clientX : e.clientX;
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        this.mainVideo.currentTime = percent * this.mainVideo.duration;
        this.updateProgress();
    }

    updatePlayButton() {
        if (!this.playBtn || !this.mainVideo) return;
        this.playBtn.classList.toggle('paused', !this.mainVideo.paused);
    }

    updateVolumeButton() {
        if (!this.volumeBtn || !this.mainVideo) return;
        const muted = this.mainVideo.muted || this.mainVideo.volume === 0;
        this.volumeBtn.innerHTML = muted ?
            '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="18" y1="9" x2="22" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="22" y1="9" x2="18" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' :
            '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5a9 9 0 0 1 0 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
    }

    toggleMute() {
        if (!this.mainVideo) return;
        this.mainVideo.muted = !this.mainVideo.muted;
        if (this.volumeSlider) this.volumeSlider.value = this.mainVideo.muted ? 0 : this.mainVideo.volume * 100;
    }

    setVolume(value) {
        if (!this.mainVideo) return;
        const safeValue = Math.max(0, Math.min(1, Number(value) || 0));
        this.mainVideo.volume = safeValue;
        this.mainVideo.muted = safeValue === 0;
        this.updateVolumeButton();
    }

    updateSpeed(speed) {
        const value = Number(speed);
        if (!Number.isFinite(value) || value <= 0) return;
        this.playbackSpeed = value;
        if (this.mainVideo) this.mainVideo.playbackRate = this.playbackSpeed;
        if (this.speedBtn) this.speedBtn.textContent = `${this.playbackSpeed}x`;
        if (this.speedPickerContainer) {
            this.speedPickerContainer.querySelectorAll('.speed-option').forEach(option => {
                option.classList.toggle('active', Number(option.dataset.speed) === this.playbackSpeed);
            });
        }
    }

    toggleFullscreen() {
        if (!this.playerPage) return;
        if (!document.fullscreenElement) {
            this.playerPage.requestFullscreen?.().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen?.();
        }
    }

    throttle(func, limit) {
        let inThrottle = false;
        return (...args) => {
            if (inThrottle) return;
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => { inThrottle = false; }, limit);
        };
    }

    showThumbnailPreview(e) {
        if (!this.mainVideo || !this.progressContainer || !this.progressThumbnailPreview || !this.thumbnailTimeIndicator || !this.mainVideo.duration) return;

        const rect = this.progressContainer.getBoundingClientRect();
        const clientX = e.touches && e.touches.length ? e.touches[0].clientX : e.clientX;
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const hoverTime = percent * this.mainVideo.duration;

        this.thumbnailTimeIndicator.textContent = this.formatTime(hoverTime);

        if (this.previewTimer) clearTimeout(this.previewTimer);

        this.previewTimer = setTimeout(() => {
            const source = this.mainVideo.currentSrc || this.mainVideo.src;
            if (!source) return;

            if (this.thumbnailVideo.src !== source) {
                this.thumbnailVideo.src = source;
                this.thumbnailVideo.load();
                return;
            }

            if (this.thumbnailVideo.readyState < 2) return;

            try {
                this.thumbnailVideo.currentTime = hoverTime;
            } catch {
                return;
            }

            this.thumbnailVideo.onseeked = () => {
                const ctx = this.thumbnailCanvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(this.thumbnailVideo, 0, 0, this.thumbnailCanvas.width, this.thumbnailCanvas.height);
                this.progressThumbnailImg.src = this.thumbnailCanvas.toDataURL('image/jpeg', 0.7);
                this.progressThumbnailPreview.style.left = `${percent * 100}%`;
                this.progressThumbnailPreview.style.display = 'block';
            };
        }, 30);
    }

    hideThumbnailPreview() {
        if (this.previewTimer) {
            clearTimeout(this.previewTimer);
            this.previewTimer = null;
        }
        if (this.progressThumbnailPreview) {
            this.progressThumbnailPreview.style.display = 'none';
        }
    }

    handleCursorVisibility() {
        if (!this.playerPage) return;
        clearTimeout(this.cursorHideTimeout);
        this.playerPage.classList.remove('hide-cursor');
        if (this.videoControls) this.videoControls.classList.remove('hidden-controls');

        if (this.playerPage.classList.contains('active')) {
            this.cursorHideTimeout = setTimeout(() => {
                this.playerPage.classList.add('hide-cursor');
                if (this.videoControls) this.videoControls.classList.add('hidden-controls');
            }, 2000);
        }
    }

    cleanup() {
        cancelAnimationFrame(this.animationFrame);
        if (this.previewTimer) clearTimeout(this.previewTimer);

        this.videos.forEach(video => {
            if (video && video.url && video.url.startsWith('blob:')) {
                URL.revokeObjectURL(video.url);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AppleTVPlayer();
});
