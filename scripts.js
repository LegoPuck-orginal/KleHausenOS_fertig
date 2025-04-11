let openApps = [];
    let zIndexCounter = 100;
    let currentExpression = '';
    const GRID_SIZE = 100;
    let tetrisGame = null;
    let pongGame = null;

    class TetrisGame {
        constructor(canvas, windowElement) {
        this.canvas = canvas;
        this.windowElement = windowElement;
        this.ctx = canvas.getContext('2d');
        this.nextCanvas = document.getElementById('tetris-next-canvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        this.scale = 16;
        this.nextScale = 8;
        this.arena = new Array(20).fill().map(() => new Array(10).fill(0));
        this.player = {
            pos: {x: 0, y: 0},
            matrix: null,
            score: 0
        };
        this.colors = [
            null,
            '#FF0D72',
            '#0DC2FF',
            '#0DFF72',
            '#F538FF',
            '#FF8E0D',
            '#FFE138',
            '#3877FF',
        ];
        this.normalDropInterval = 1000;
        this.softDropInterval = 50;
        this.currentDropInterval = this.normalDropInterval;
        this.dropCounter = 0;
        this.lastTime = 0;
        this.paused = false;
        this.gameOver = false;
        this.nextPiece = this.createRandomPiece();

        this.handleKeyDown = (event) => {
            if (this.gameOver || !this.windowElement.classList.contains('focused')) return;
            if (this.paused) return;

            if (event.keyCode === 37) this.playerMove(-1);
            if (event.keyCode === 39) this.playerMove(1);
            if (event.keyCode === 40) {
            this.currentDropInterval = this.softDropInterval;
            this.playerDrop();
            }
            if (event.keyCode === 38) this.playerRotate();
        };

        document.addEventListener('keydown', this.handleKeyDown);
        }

        createPiece(type) {
        const pieces = {
            'T': [[0,1,0], [1,1,1], [0,0,0]],
            'O': [[2,2], [2,2]],
            'L': [[0,0,3], [3,3,3], [0,0,0]],
            'J': [[4,0,0], [4,4,4], [0,0,0]],
            'I': [[0,0,0,0], [5,5,5,5], [0,0,0,0], [0,0,0,0]],
            'S': [[0,6,6], [6,6,0], [0,0,0]],
            'Z': [[7,7,0], [0,7,7], [0,0,0]]
        };
        return pieces[type];
        }

        createRandomPiece() {
        const pieces = ['T','O','L','J','I','S','Z'];
        const piece = pieces[Math.floor(Math.random() * pieces.length)];
        let matrix = this.createPiece(piece);
        const rotations = Math.floor(Math.random() * 4);
        for (let i = 0; i < rotations; i++) {
            matrix = this.rotateMatrix(matrix);
        }
        return matrix;
        }

        collide(matrix, offset) {
        const [m, o] = [matrix, offset || this.player.pos];
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (
                this.arena[y + o.y]?.[x + o.x] !== 0 ||
                x + o.x < 0 ||
                x + o.x >= this.arena[0].length ||
                y + o.y >= this.arena.length
            )) {
                return true;
            }
            }
        }
        return false;
        }

        merge() {
        this.player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
            if (value !== 0) {
                this.arena[y + this.player.pos.y][x + this.player.pos.x] = value;
            }
            });
        });
        }

        playerDrop() {
        this.player.pos.y++;
        if (this.collide(this.player.matrix)) {
            this.player.pos.y--;
            this.merge();
            this.playerReset();
            this.arenaSweep();
            this.updateScore();
            this.currentDropInterval = this.normalDropInterval;
        }
        this.dropCounter = 0;
        }

        playerMove(dir) {
        this.player.pos.x += dir;
        if (this.collide(this.player.matrix)) {
            this.player.pos.x -= dir;
            return false;
        }
        return true;
        }

        playerReset() {
        if (this.gameOver) return;

        this.player.matrix = this.nextPiece;
        this.nextPiece = this.createRandomPiece();
        this.player.pos.y = 0;
        const arenaWidth = this.arena[0].length;
        const pieceWidth = this.player.matrix[0].length;
        this.player.pos.x = Math.floor((arenaWidth - pieceWidth) / 2);

        if (this.collide(this.player.matrix)) {
            this.showGameOver();
        }
        }

        showGameOver() {
        this.gameOver = true;
        this.paused = true;
        document.getElementById('tetris-game-over').style.display = 'block';
        document.getElementById('final-score').textContent = this.player.score;
        }

        resetGame() {
        this.arena = new Array(20).fill().map(() => new Array(10).fill(0));
        this.player.score = 0;
        this.gameOver = false;
        this.paused = false;
        this.nextPiece = this.createRandomPiece();
        document.getElementById('tetris-game-over').style.display = 'none';
        this.updateScore();
        this.playerReset();
        this.update();
        }

        playerRotate() {
        const pos = this.player.pos.x;
        let offset = 1;
        const matrix = this.rotateMatrix(this.player.matrix);
        
        if (!this.collide(matrix)) {
            this.player.matrix = matrix;
            return;
        }

        while (this.collide(matrix, {x: pos + offset, y: this.player.pos.y})) {
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > matrix[0].length) {
            this.player.matrix = this.player.matrix;
            return;
            }
        }
        
        this.player.pos.x += offset;
        this.player.matrix = matrix;
        }

        rotateMatrix(matrix) {
        const N = matrix.length;
        const result = new Array(N).fill(0).map(() => new Array(N).fill(0));
        
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
            result[x][N-1-y] = matrix[y][x];
            }
        }
        return result;
        }

        arenaSweep() {
        let rowCount = 1;
        outer: for (let y = this.arena.length - 1; y > 0; --y) {
            for (let x = 0; x < this.arena[y].length; ++x) {
            if (this.arena[y][x] === 0) {
                continue outer;
            }
            }
            const row = this.arena.splice(y, 1)[0].fill(0);
            this.arena.unshift(row);
            ++y;
            this.player.score += rowCount * 10;
            rowCount *= 2;
        }
        }

        updateScore() {
        document.getElementById('score').textContent = this.player.score;
        }

        draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawMatrix(this.arena, {x: 0, y: 0});
        this.drawMatrix(this.player.matrix, this.player.pos);
        this.drawNextPiece();
        }

        drawMatrix(matrix, offset, ctx = this.ctx, scale = this.scale) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = this.colors[value];
                ctx.fillRect(
                (x + offset.x) * scale,
                (y + offset.y) * scale,
                scale - 1,
                scale - 1
                );
            }
            });
        });
        }

        drawNextPiece() {
        this.nextCtx.fillStyle = '#000';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        const matrix = this.nextPiece;
        const offsetX = (this.nextCanvas.width / this.nextScale - matrix[0].length) / 2;
        const offsetY = (this.nextCanvas.height / this.nextScale - matrix.length) / 2;
        this.drawMatrix(matrix, {x: offsetX, y: offsetY}, this.nextCtx, this.nextScale);
        }

        update(time = 0) {
        if (this.paused || this.gameOver) return;
        
        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        this.dropCounter += deltaTime;

        if (this.dropCounter > this.currentDropInterval) {
            this.playerDrop();
            this.dropCounter = 0;
        }

        this.draw();
        requestAnimationFrame((time) => this.update(time));
        }

        start() {
        this.resetGame();
        }

        togglePause() {
        if (this.gameOver) return;
        this.paused = !this.paused;
        document.getElementById('tetris-pause-btn').textContent = 
            this.paused ? 'Resume' : 'Pause';
        if (!this.paused) this.update();
        }
    }

    class PongGame {
        constructor(canvas, windowElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.windowElement = windowElement;
        this.paddleHeight = 80;
        this.paddleWidth = 10;
        this.ballSize = 8;
        this.winningScore = 5;
        this.keys = {};
        this.running = false;
        this.baseSpeed = 5;
        this.speedMultiplier = 1.0;
        this.paused = false;
        this.gameMode = 'local';
        this.botDifficulty = 0.7;

        this.canvas.width = 600;
        this.canvas.height = 400;

        this.handleKeyDown = (e) => {
            if (e.key === 'Escape') this.togglePause();
            this.keys[e.key] = true;
        };
        this.handleKeyUp = (e) => this.keys[e.key] = false;

        this.showStartScreen();
        }

        showStartScreen() {
        document.getElementById('pong-start-screen').style.display = 'block';
        }

        start(mode) {
        this.gameMode = mode;
        document.getElementById('pong-start-screen').style.display = 'none';
        this.resetGame();
        
        if (!this.running) {
            this.running = true;
            this.gameLoop = setInterval(() => this.update(), 1000/60);
        }
        
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        }

        togglePause() {
        this.paused = !this.paused;
        document.getElementById('pong-pause-btn').textContent = 
            this.paused ? 'Resume' : 'Pause';
        }

        resetGame() {
        this.player1 = { y: this.canvas.height/2 - this.paddleHeight/2, score: 0 };
        this.player2 = { y: this.canvas.height/2 - this.paddleHeight/2, score: 0 };
        this.resetBall();
        this.gameOver = false;
        this.paused = false;
        document.getElementById('pong-game-over').style.display = 'none';
        document.getElementById('player1-score').textContent = '0';
        document.getElementById('player2-score').textContent = '0';
        }

        resetBall() {
        this.speedMultiplier = 1.0;
        this.ball = {
            x: this.canvas.width/2,
            y: this.canvas.height/2,
            speedX: this.baseSpeed * (Math.random() > 0.5 ? 1 : -1),
            speedY: (Math.random() * 3 - 1.5)
        };
        }

        update() {
        if (this.gameOver || this.paused || !this.windowElement.classList.contains('focused')) return;

        if (this.keys.w && this.player1.y > 0) this.player1.y -= 8;
        if (this.keys.s && this.player1.y < this.canvas.height - this.paddleHeight) this.player1.y += 8;

        if (this.gameMode === 'local') {
            if (this.keys.ArrowUp && this.player2.y > 0) this.player2.y -= 8;
            if (this.keys.ArrowDown && this.player2.y < this.canvas.height - this.paddleHeight) this.player2.y += 8;
        } else {
            const botBaseSpeed = 5 * this.botDifficulty;
            const reactionDelay = 0.3 * (1 - this.botDifficulty);
            const predictionError = 40 * (1 - this.botDifficulty);
            const mistakeChance = 0.03 * (1 - this.botDifficulty);
            
            const predictedY = this.ball.y + 
            (this.ball.speedY * reactionDelay) + 
            (Math.random() * predictionError - predictionError/2);

            const targetY = Math.min(
            Math.max(
                predictedY - this.paddleHeight/2,
                0
            ),
            this.canvas.height - this.paddleHeight
            );

            const distance = targetY - this.player2.y;
            const moveThreshold = 15 + (20 * (1 - this.botDifficulty));
            
            if (Math.abs(distance) > moveThreshold) {
            const speed = botBaseSpeed * (0.7 + Math.random() * 0.6);
            this.player2.y += distance > 0 ? speed : -speed;
            }

            if (Math.random() < mistakeChance) {
            this.player2.y += (Math.random() < 0.5 ? -1 : 1) * botBaseSpeed;
            }

            this.player2.y = Math.max(0, 
            Math.min(this.canvas.height - this.paddleHeight, this.player2.y)
            );
        }

        this.ball.x += this.ball.speedX * this.speedMultiplier;
        this.ball.y += this.ball.speedY * this.speedMultiplier;

        if (this.ball.y < 0 || this.ball.y > this.canvas.height - this.ballSize) {
            this.ball.speedY *= -1;
        }

        if (this.ball.speedX < 0 && this.checkPaddleCollision(this.player1)) {
            this.ball.speedX *= -1;
            this.increaseSpeed();
        }

        if (this.ball.speedX > 0 && this.checkPaddleCollision(this.player2)) {
            this.ball.speedX *= -1;
            this.increaseSpeed();
        }

        if (this.ball.x < 0) this.handleScore(2);
        if (this.ball.x > this.canvas.width) this.handleScore(1);

        this.draw();
        }

        checkPaddleCollision(paddle) {
        return this.ball.y + this.ballSize > paddle.y && 
               this.ball.y < paddle.y + this.paddleHeight && 
               ((this.ball.speedX < 0 && this.ball.x < 20 + this.paddleWidth) ||
            (this.ball.speedX > 0 && this.ball.x > this.canvas.width - 20 - this.paddleWidth));
        }

        handleScore(player) {
        if (player === 1) {
            this.player1.score++;
            document.getElementById('player1-score').textContent = this.player1.score;
        } else {
            this.player2.score++;
            document.getElementById('player2-score').textContent = this.player2.score;
        }

        if (this.player1.score >= this.winningScore || this.player2.score >= this.winningScore) {
            this.gameOver = true;
            document.getElementById('pong-winner').textContent = 
            this.player1.score > this.player2.score ? "Player 1" : "Player 2";
            document.getElementById('pong-game-over').style.display = 'block';
            clearInterval(this.gameLoop);
            this.running = false;
        } else {
            this.resetBall();
        }
        }

        increaseSpeed() {
        this.speedMultiplier = Math.min(1.5, this.speedMultiplier * 1.05);
        this.ball.speedY = ((this.ball.y - (this.player1.y + this.paddleHeight/2)) / 16);
        }

        draw() {
        this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--header-bg');
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-color');
        this.ctx.fillRect(20, this.player1.y, this.paddleWidth, this.paddleHeight);
        this.ctx.fillRect(this.canvas.width - 20 - this.paddleWidth, this.player2.y, this.paddleWidth, this.paddleHeight);

        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ballSize, 0, Math.PI * 2);
        this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-color');
        this.ctx.fill();
        this.ctx.closePath();

        this.ctx.setLineDash([5, 15]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-color');
        this.ctx.stroke();
        }

        stop() {
        this.running = false;
        clearInterval(this.gameLoop);
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        }
    }

    function restartPong() {
        if (pongGame) {
        pongGame.stop();
        pongGame.showStartScreen();
        }
    }

    function startPong(mode) {
        if (pongGame) pongGame.start(mode);
    }

    function togglePongPause() {
        if (pongGame) pongGame.togglePause();
    }

    function restartTetris() {
        if (tetrisGame) tetrisGame.resetGame();
    }

    document.addEventListener('keydown', function(event) {
        if (document.getElementById('calculator-app').classList.contains('focused')) {
        const key = event.key;
        if (key >= '0' && key <= '9') appendNumber(key);
        if (key === '.') appendDecimal();
        if (['+', '-', '*', '/'].includes(key)) appendOperator(key);
        if (key === 'Enter') calculate();
        if (key === 'Escape') clearDisplay();
        }
    });

    function toggleTetrisPause() {
        if (tetrisGame) tetrisGame.togglePause();
    }

    function minimizeApp(appName) {
        const appWindow = document.getElementById(`${appName}-app`);
        appWindow.classList.add('hidden');
        openApps = openApps.map(app => {
        if (app.id === appName) return {...app, minimized: true};
        return app;
        });
        updateTaskbar();
    }

    function saveIconPositions() {
        const icons = document.querySelectorAll('.app-icon');
        const positions = {};
        icons.forEach(icon => {
        positions[icon.dataset.app] = {
            left: parseInt(icon.style.left) || 0,
            top: parseInt(icon.style.top) || 0
        };
        });
        localStorage.setItem('iconPositions', JSON.stringify(positions));
    }

    function loadIconPositions() {
        const saved = localStorage.getItem('iconPositions');
        if (saved) {
        const positions = JSON.parse(saved);
        document.querySelectorAll('.app-icon').forEach(icon => {
            const app = icon.dataset.app;
            if (positions[app]) {
            icon.style.left = `${positions[app].left}px`;
            icon.style.top = `${positions[app].top}px`;
            }
        });
        }
    }

    document.querySelectorAll('.app-icon').forEach(icon => {
        let isDragging = false;
        let startX = 0, startY = 0;
        let initialX = 0, initialY = 0;

        icon.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialX = parseInt(icon.style.left) || 0;
        initialY = parseInt(icon.style.top) || 0;
        icon.style.transition = 'none';
        icon.style.zIndex = zIndexCounter++;
        });

        document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        icon.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        });

        document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;

        const finalX = initialX + (parseFloat(icon.style.transform.split(',')[0].replace('translate(', '')) || 0);
        const finalY = initialY + (parseFloat(icon.style.transform.split(',')[1]) || 0);
        const snappedX = Math.round(finalX / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round(finalY / GRID_SIZE) * GRID_SIZE;

        let collision = false;
        document.querySelectorAll('.app-icon').forEach(otherIcon => {
            if (otherIcon === icon) return;
            const otherX = parseInt(otherIcon.style.left) || 0;
            const otherY = parseInt(otherIcon.style.top) || 0;
            if (otherX === snappedX && otherY === snappedY) collision = true;
        });

        if (collision) {
            icon.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
            icon.style.transform = 'none';
            icon.style.left = `${initialX}px`;
            icon.style.top = `${initialY}px`;
        } else {
            icon.style.transition = 'all 0.1s';
            icon.style.transform = 'none';
            icon.style.left = `${snappedX}px`;
            icon.style.top = `${snappedY}px`;
            saveIconPositions();
        }
        });
    });

    function updateAccentColor(color) {
        document.documentElement.style.setProperty('--accent-color', color);
        localStorage.setItem('accentColor', color);
        document.getElementById('accent-preview').style.backgroundColor = color;
    }

    function toggleThemeMode(mode) {
        document.body.classList.toggle('light-mode', mode === 'light');
        localStorage.setItem('themeMode', mode);
    }

    function updateBackground() {
        const url = document.getElementById('bg-image-url').value;
        const desktop = document.getElementById('desktop');
        if (url) {
        desktop.style.backgroundImage = `url('${url}')`;
        localStorage.setItem('backgroundImage', url);
        } else {
        desktop.style.backgroundImage = '';
        localStorage.removeItem('backgroundImage');
        }
    }

    function clearBackgroundImage() {
        document.getElementById('bg-image-url').value = '';
        document.getElementById('desktop').style.backgroundImage = '';
        localStorage.removeItem('backgroundImage');
    }

    function updateBackgroundColor(color) {
        const desktop = document.getElementById('desktop');
        desktop.style.backgroundColor = color;
        localStorage.setItem('backgroundColor', color);
        document.getElementById('bg-color-preview').style.backgroundColor = color;
    }

    function loadThemeSettings() {
        const savedColor = localStorage.getItem('accentColor') || '#00ff00';
        const themeMode = localStorage.getItem('themeMode') || 'dark';
        const bgImage = localStorage.getItem('backgroundImage');
        const bgColor = localStorage.getItem('backgroundColor') || 'var(--bg-color)';
        
        updateAccentColor(savedColor);
        toggleThemeMode(themeMode);
        document.getElementById('accent-picker').value = savedColor;
        document.getElementById('theme-mode').value = themeMode;
        
        const desktop = document.getElementById('desktop');
        if (bgImage) {
        desktop.style.backgroundImage = `url('${bgImage}')`;
        document.getElementById('bg-image-url').value = bgImage;
        }
        if (bgColor) {
        desktop.style.backgroundColor = bgColor;
        document.getElementById('bg-color-picker').value = bgColor;
        document.getElementById('bg-color-preview').style.backgroundColor = bgColor;
        }
    }

    function showSignup() {
        document.getElementById('signup-container').classList.remove('hidden');
        document.getElementById('login-container').classList.add('hidden');
    }

    function showLogin() {
        document.getElementById('signup-container').classList.add('hidden');
        document.getElementById('login-container').classList.remove('hidden');
    }

    function createAccount() {
        const username = document.getElementById('new-username').value;
        const password = document.getElementById('new-password').value;
        
        if (!username || !password) {
        showError('Please fill all fields');
        return;
        }
        
        localStorage.setItem('user', JSON.stringify({ username, password }));
        showLogin();
    }

    function login() {
        const user = JSON.parse(localStorage.getItem('user'));
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!user) return showError('No account found');
        if (user.username === username && user.password === password) {
        document.querySelector('.terminal-window').classList.add('hidden');
        document.getElementById('desktop').classList.remove('hidden');
        } else {
        showError('Invalid credentials');
        }
    }

    function deleteAccount() {
        if (confirm('Permanently delete account?')) {
        localStorage.clear();
        window.location.reload();
        }
    }

    function openApp(appName) {
        const appWindow = document.getElementById(`${appName}-app`);
        if (!openApps.find(a => a.id === appName)) {
        openApps.push({ id: appName, name: appName });
        updateTaskbar();
        
        if (appName === 'tetris' && !tetrisGame) {
            tetrisGame = new TetrisGame(document.getElementById('tetris-canvas'), appWindow);
            tetrisGame.start();
        }
        
        if (appName === 'pong' && !pongGame) {
            pongGame = new PongGame(document.getElementById('pong-canvas'), appWindow);
        }
        
        if (!appWindow.dataset.positioned) {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            appWindow.style.left = `${Math.round((viewportWidth - 300) / 2 / GRID_SIZE) * GRID_SIZE}px`;
            appWindow.style.top = `${Math.round((viewportHeight - 150) / 2 / GRID_SIZE) * GRID_SIZE}px`;
            appWindow.dataset.positioned = true;
        }
        }
        zIndexCounter++;
        appWindow.style.zIndex = zIndexCounter;
        appWindow.classList.remove('hidden');
        focusApp(appName);
    }

    function closeApp(appName) {
        const appWindow = document.getElementById(`${appName}-app`);
        appWindow.classList.add('hidden');
        openApps = openApps.filter(a => a.id !== appName);
        updateTaskbar();
        if (appName === 'tetris') {
        document.removeEventListener('keydown', tetrisGame.handleKeyDown);
        tetrisGame = null;
        }
        if (appName === 'pong') {
        pongGame.stop();
        pongGame = null;
        }
    }

    function updateTaskbar() {
        document.getElementById('taskbar-apps').innerHTML = openApps.map(app => `
        <div class="taskbar-app ${app.minimized ? 'minimized' : ''} ${document.getElementById(`${app.id}-app`).classList.contains('focused') ? 'active' : ''}" 
             onclick="focusApp('${app.id}')">
            <img src="img/${app.id}.png" alt="${app.name}">
            ${app.name}
        </div>
        `).join('');
    }

    function focusApp(appId) {
        const appWindow = document.getElementById(`${appId}-app`);
        zIndexCounter++;
        appWindow.style.zIndex = zIndexCounter;
        appWindow.classList.remove('hidden');
        appWindow.classList.add('focused');
        document.querySelectorAll('.app-window').forEach(win => {
        if (win !== appWindow) win.classList.remove('focused');
        });
        openApps = openApps.map(app => {
        if (app.id === appId) return {...app, minimized: false};
        return app;
        });
        updateTaskbar();
    }

    document.querySelectorAll('.window-header').forEach(header => {
        let isDragging = false;
        let startX = 0, startY = 0;
        let initialX = 0, initialY = 0;
        const window = header.parentElement;

        header.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialX = window.offsetLeft;
        initialY = window.offsetTop;
        window.style.transition = 'none';
        window.style.zIndex = zIndexCounter++;
        focusApp(window.id.replace('-app', ''));
        });

        document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        window.style.left = `${initialX + deltaX}px`;
        window.style.top = `${initialY + deltaY}px`;
        });

        document.addEventListener('mouseup', () => {
        isDragging = false;
        window.style.transition = 'all 0.1s';
        });
    });

    function appendNumber(num) {
        currentExpression += num;
        updateDisplay();
    }

    function appendOperator(op) {
        currentExpression += ` ${op} `;
        updateDisplay();
    }

    function appendDecimal() {
        if (!currentExpression.includes('.')) currentExpression += '.';
        updateDisplay();
    }

    function clearDisplay() {
        currentExpression = '';
        updateDisplay();
    }

    function calculate() {
        try {
        currentExpression = eval(currentExpression.replace(/×/g, '*').replace(/÷/g, '/')).toString();
        updateDisplay();
        } catch {
        currentExpression = '';
        updateDisplay();
        alert('Invalid calculation');
        }
    }

    function updateDisplay() {
        document.getElementById('display').textContent = currentExpression || '0';
    }

    function updateClock() {
        document.getElementById('clock').textContent = new Date().toLocaleTimeString();
    }
    setInterval(updateClock, 1000);

    function toggleAppLauncher() {
        const launcher = document.getElementById('app-launcher');
        launcher.style.display = launcher.style.display === 'block' ? 'none' : 'block';
    }

    document.getElementById('app-search-input').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.app-item').forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(searchTerm) ? 'flex' : 'none';
        });
    });

    window.onload = () => {
        loadThemeSettings();
        loadIconPositions();
        updateClock();
        if (localStorage.getItem('user')) showLogin();
        else showSignup();
    };

    function showError(message) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = message;
        setTimeout(() => errorDiv.textContent = '', 3000);
    }