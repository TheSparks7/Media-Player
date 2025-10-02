function showCustomMessage(title, message) {
    alert(title + ": " + message);
}

class AppleTVPlayer {
    constructor() {
        this.videos = [];
        this.currentVideoIndex = -1;
        this.isDraggingProgress = false;
        this.playbackSpeed = 1.0;
        this.cursorHideTimeout = null;
    this.thumbnailVideo = document.createElement('video');
    this.thumbnailVideo.style.position = 'absolute';
    this.thumbnailVideo.style.left = '-9999px';
    this.thumbnailVideo.style.top = '-9999px';
    this.thumbnailCanvas = document.createElement('canvas');
    this.thumbnailCanvas.width = 160;
    this.thumbnailCanvas.height = 90;
    this.thumbnailCanvas.style.position = 'absolute';
    this.thumbnailCanvas.style.left = '-9999px';
    this.thumbnailCanvas.style.top = '-9999px';
    document.body.appendChild(this.thumbnailVideo);
    document.body.appendChild(this.thumbnailCanvas);
        
    this.initializeDOMElements(); // Call this FIRST
    this.throttledShowThumbnailPreview = this.throttle(this.showThumbnailPreview, 100);
    this.initializeCursor();
    this.initializeTheme();
    this.bindEvents();
    
    // Preload demo video after DOM elements are initialized
    this.addVideo({
        name: "Jujutsu Kaisen -demo .mp4",
        url: "Videos/Jujutsu Kaisen -demo .mp4",
        thumbnail: "Videos/Jujutsu Kaisen -demo .png",
        preload: true
    }, true);
    this.renderLibrary();
    
    window.addEventListener('beforeunload', () => this.cleanup());

        // Now this.pages is defined
        if (this.pages && this.pages.length > 0) {
            this.pages.forEach(page => page.style.display = 'none');
            this.pages[0].style.display = 'block';
            this.pages[0].classList.add('active');
        } else {
            console.warn("No pages found. Ensure your HTML has elements with class 'page'.");
        }
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
    }

    initializeCursor() {
        if (!this.cursor || !this.blob) return;
        this.mouseX = 0;
        this.mouseY = 0;
        this.cursorX = 0;
        this.cursorY = 0;
        this.blobX = 0;
        this.blobY = 0;

        window.addEventListener('mousemove', e => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        gsap.ticker.add(() => {
            this.cursorX += (this.mouseX - this.cursorX) * 0.5;
            this.cursorY += (this.mouseY - this.cursorY) * 0.5;
            this.blobX += (this.mouseX - this.blobX) * 0.1;
            this.blobY += (this.mouseY - this.blobY) * 0.1;
            gsap.set(this.cursor, { x: this.cursorX, y: this.cursorY });
            gsap.set(this.blob, { x: this.blobX, y: this.blobY });
        });

        const hoverElements = document.querySelectorAll('a, button, .control-btn, .nav-link, .upload-btn, .video-card');
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                const rect = el.getBoundingClientRect();
                gsap.to(this.cursor, {
                    width: rect.width,
                    height: rect.height,
                    borderRadius: getComputedStyle(el).borderRadius,
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                    ease: "power2.inOut",
                });
            });
            el.addEventListener('mouseleave', () => {
                gsap.to(this.cursor, {
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    ease: "power2.inOut"
                });
            });
        });
    }

    initializeTheme() {
        if (!this.toggleSwitch) return;
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme) {
            document.body.classList.add(currentTheme);
            if (currentTheme === 'light-mode') {
                this.toggleSwitch.checked = true;
            }
        }
        this.toggleSwitch.addEventListener('change', this.switchTheme.bind(this));
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
        // Back button in video player
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.closePlayer());
        }
        
        this.navLinks.forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                this.showPage(link.dataset.page);
            });
        });

        if (this.uploadArea) {
            this.uploadBtn.addEventListener('click', () => this.fileInput.click());
            this.fileInput.addEventListener('change', e => this.handleFiles(e.target.files));
            this.uploadArea.addEventListener('dragover', e => {
                e.preventDefault();
                this.uploadArea.classList.add('dragover');
            });
            this.uploadArea.addEventListener('dragleave', e => {
                e.preventDefault();
                this.uploadArea.classList.remove('dragover');
            });
            this.uploadArea.addEventListener('drop', e => {
                e.preventDefault();
                this.uploadArea.classList.remove('dragover');
                this.handleFiles(e.dataTransfer.files);
            });
        }

        if (this.playerPage) {
            this.playBtn.addEventListener('click', () => this.togglePlay());
            this.rewindBtn.addEventListener('click', () => this.rewind());
            this.fastForwardBtn.addEventListener('click', () => this.fastForward());
            this.mainVideo.addEventListener('timeupdate', () => this.updateProgress());
            this.mainVideo.addEventListener('play', () => this.updatePlayButton());
            this.mainVideo.addEventListener('pause', () => this.updatePlayButton());
            this.mainVideo.addEventListener('volumechange', () => this.updateVolumeButton());
            this.mainVideo.addEventListener('click', () => this.togglePlay());
            document.addEventListener('keydown', e => this.handleKeyboard(e));

            this.volumeBtn.addEventListener('click', () => this.toggleMute());
            this.volumeSlider.addEventListener('input', e => this.setVolume(e.target.value / 100));
            this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

            this.speedBtn.addEventListener('click', e => {
                e.stopPropagation();
                this.speedPickerContainer.classList.toggle('open');
            });
            document.addEventListener('click', () => {
                if(this.speedPickerContainer.classList.contains('open')) {
                    this.speedPickerContainer.classList.remove('open');
                }
            });

            this.speedPickerContainer.querySelectorAll('.speed-option').forEach(option => {
                option.addEventListener('click', () => {
                    this.updateSpeed(option.dataset.speed);
                });
            });

            this.progressContainer.addEventListener('mousedown', e => this.startSeek(e));
            document.addEventListener('mousemove', e => this.duringSeek(e));
            document.addEventListener('mouseup', () => this.endSeek());
            this.progressContainer.addEventListener('touchstart', e => this.startSeek(e), { passive: false });
            document.addEventListener('touchmove', e => this.duringSeek(e));
            document.addEventListener('touchend', () => this.endSeek());

            this.progressContainer.addEventListener('mousemove', e => this.throttledShowThumbnailPreview(e));
            this.progressContainer.addEventListener('mouseleave', () => this.hideThumbnailPreview());

            this.playerPage.addEventListener('mousemove', () => this.handleCursorVisibility());
        }
    }

    showPage(pageName) {
        // Deactivate all pages and the player page
        this.pages.forEach(p => {
            p.classList.remove('active');
            p.style.display = 'none';
        });
        this.playerPage.classList.remove('active');
        document.body.classList.remove('player-active');

        // Activate the correct page
        if (pageName === 'player') {
            this.playerPage.classList.add('active');
            document.body.classList.add('player-active');
        } else {
            const newPage = document.getElementById(pageName);
            if (newPage) {
                newPage.classList.add('active');
                newPage.style.display = 'block';
            }
        }

        // Update nav links
        this.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.page === pageName);
        });
    }

    handleFiles(files) {
        const videoFiles = Array.from(files).filter(file => file.type.startsWith('video/'));
        if (videoFiles.length === 0) {
            showCustomMessage('No Files', 'Please select valid video files.');
            return;
        }
        videoFiles.forEach(file => this.addVideo(file));
        this.renderLibrary();
        this.showPage('library');
    }

    addVideo(file, isPreloaded = false) {
        let video;
        if (isPreloaded) {
            video = {
                id: "preloaded-demo",
                name: file.name,
                url: file.url,
                thumbnail: file.thumbnail
            };
        } else {
            video = {
                id: Date.now() + Math.random(),
                name: file.name,
                url: URL.createObjectURL(file)
            };
        }
        this.videos.push(video);
    }

    renderLibrary() {
        console.log('Rendering library, videos:', this.videos);
        if (!this.videoGrid) {
            console.error('videoGrid element not found!');
            return;
        }
        this.videoGrid.innerHTML = '';
        if (this.videos.length === 0) {
            this.videoGrid.innerHTML = '<p>Your library is empty.</p>';
            console.log('Library is empty');
            return;
        }

        this.videos.forEach((video, index) => {
            const card = document.createElement('div');
            card.className = 'video-card';
            let thumbnailHtml = '';
            if (video.thumbnail) {
                thumbnailHtml = `<img class="video-thumb-img" src="${video.thumbnail}" alt="${video.name} thumbnail">`;
            } else {
                thumbnailHtml = `<div class="video-icon">🎥</div>`;
            }
            card.innerHTML = `<div class="video-thumbnail">${thumbnailHtml}</div><div class="video-info"><div class="video-title">${video.name}</div></div>`;
            card.addEventListener('click', () => this.playVideo(index));
            this.videoGrid.appendChild(card);
        });
    }


    playVideo(index) {
        if (index < 0 || index >= this.videos.length) return;
        this.currentVideoIndex = index;
        const video = this.videos[index];
        
        // Update video info elements
        const title = document.getElementById('playerVideoTitle');
        const duration = document.getElementById('playerVideoDuration');
        const resolution = document.getElementById('playerVideoResolution');
        const size = document.getElementById('playerVideoSize');
        
        // Set video name without extension
        title.textContent = video.name.replace(/\.[^/.]+$/, "");
        
        // Reset info while loading
        duration.textContent = "...";
        resolution.textContent = "...";
        size.textContent = "...";
        
        // Set video source and show player
        this.mainVideo.src = video.url;
        this.showPage('player');
        
        // Set duration and resolution once metadata is loaded
        this.mainVideo.onloadedmetadata = () => {
            const mins = Math.floor(this.mainVideo.duration / 60);
            const secs = Math.floor(this.mainVideo.duration % 60);
            duration.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            resolution.textContent = `${this.mainVideo.videoWidth}x${this.mainVideo.videoHeight}`;
            
            // Calculate and format video size (for file URLs)
            if (video.url.startsWith('blob:')) {
                fetch(video.url)
                    .then(response => {
                        const sizeInMB = response.headers.get('content-length') / (1024 * 1024);
                        size.textContent = sizeInMB.toFixed(1) + ' MB';
                    })
                    .catch(() => size.textContent = '');
            } else {
                // For local files (preloaded videos), we might not have size info
                size.textContent = '';
            }
        };
        
        this.mainVideo.play().catch(err => {
            showCustomMessage('Playback Error', `Could not play "${video.name}".\n\n${err.message}`);
            this.closePlayer();
        });
        
    }

    togglePlay() {
        if (this.mainVideo.paused) {
            this.mainVideo.play();
        } else {
            this.mainVideo.pause();
        }
    }

    rewind() {
        this.mainVideo.currentTime -= 10;
    }

    fastForward() {
        this.mainVideo.currentTime += 10;
    }

    updateProgress() {
        if (!this.mainVideo.duration) return;
        const percent = (this.mainVideo.currentTime / this.mainVideo.duration);
        this.progressBar.style.width = `${percent * 100}%`;
        if (this.progressThumb) {
            this.progressThumb.style.left = `${percent * 100}%`;
        }
        this.timeDisplay.textContent = `${this.formatTime(this.mainVideo.currentTime)} / ${this.formatTime(this.mainVideo.duration)}`;
    }
    
    handleKeyboard(e) {
        if (this.playerPage.classList.contains('active')) {
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
            }
        }
    }

    closePlayer() {
        this.mainVideo.pause();
        this.playerPage.classList.remove('active');
        document.body.classList.remove('player-active');
        // Potentially show the last active page, e.g., library
        this.showPage('library'); 
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    startSeek(e) {
        e.preventDefault();
        this.isDraggingProgress = true;
        this.seek(e);
    }

    duringSeek(e) {
        if (this.isDraggingProgress) {
            this.seek(e);
        }
    }

    endSeek() {
        this.isDraggingProgress = false;
    }

    seek(e) {
        const rect = this.progressContainer.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        this.mainVideo.currentTime = percent * this.mainVideo.duration;
        this.updateProgress();
    }

    updatePlayButton() {
        this.playBtn.innerHTML = this.mainVideo.paused ?
            '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M5 5.27436V18.7256C5 19.7621 6.03116 20.4253 6.92164 19.8618L18.3123 13.1362C19.1947 12.5774 19.1947 11.4226 18.3123 10.8638L6.92164 4.13819C6.03116 3.57466 5 4.23785 5 5.27436Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' :
            '<svg width="24" height="24" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" stroke="currentColor" stroke-width="2"/><rect x="14" y="4" width="4" height="16" rx="1" stroke="currentColor" stroke-width="2"/></svg>';
    }

    updateVolumeButton() {
        const muted = this.mainVideo.muted || this.mainVideo.volume === 0;
        this.volumeBtn.innerHTML = muted ?
            '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' :
            '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.54 8.46C16.48 9.4 17 10.62 17 12C17 13.38 16.48 14.6 15.54 15.54" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }

    toggleMute() {
        this.mainVideo.muted = !this.mainVideo.muted;
        this.volumeSlider.value = this.mainVideo.muted ? 0 : this.mainVideo.volume * 100;
    }

    setVolume(value) {
        this.mainVideo.volume = value;
        this.mainVideo.muted = value === 0;
    }

    updateSpeed(speed) {
        this.playbackSpeed = parseFloat(speed);
        this.mainVideo.playbackRate = this.playbackSpeed;
        this.speedBtn.textContent = `${this.playbackSpeed}x`;
        this.speedPickerContainer.querySelectorAll('.speed-option').forEach(option => {
            option.classList.toggle('active', option.dataset.speed == this.playbackSpeed);
        });
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.playerPage.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    }

    throttle(func, limit) {
        let inThrottle;
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!inThrottle) {
                func.apply(context, args);
                lastRan = Date.now();
                inThrottle = true;
                setTimeout(function() {
                    inThrottle = false;
                }, limit);
            }
        }
    }

    showThumbnailPreview(e) {
        const rect = this.progressContainer.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const hoverTime = percent * this.mainVideo.duration;

        this.thumbnailTimeIndicator.textContent = this.formatTime(hoverTime);

        if (this.thumbnailVideo.src !== this.mainVideo.src) {
            this.thumbnailVideo.src = this.mainVideo.src;
        }

        this.thumbnailVideo.currentTime = hoverTime;
        this.thumbnailVideo.onseeked = () => {
            const context = this.thumbnailCanvas.getContext('2d');
            context.drawImage(this.thumbnailVideo, 0, 0, this.thumbnailCanvas.width, this.thumbnailCanvas.height);
            this.progressThumbnailImg.src = this.thumbnailCanvas.toDataURL('image/jpeg', 0.7);
            this.progressThumbnailPreview.style.left = `${percent * 100}%`;
            this.progressThumbnailPreview.style.display = 'block';
        };
    }

    hideThumbnailPreview() {
        this.progressThumbnailPreview.style.display = 'none';
    }

    handleCursorVisibility() {
        clearTimeout(this.cursorHideTimeout);
        this.playerPage.classList.remove('hide-cursor');
        if (this.videoControls) {
            this.videoControls.classList.remove('hidden-controls');
        }

        if (this.playerPage.classList.contains('active')) {
            this.cursorHideTimeout = setTimeout(() => {
                this.playerPage.classList.add('hide-cursor');
                if (this.videoControls) {
                     this.videoControls.classList.add('hidden-controls');
                }
            }, 2000);
        }
    }

    this.playerPage.addEventListener('mousemove', () => this.handleCursorVisibility());

    cleanup() {
        this.videos.forEach(video => {
            if (video.url) {
                URL.revokeObjectURL(video.url);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new AppleTVPlayer();
});
