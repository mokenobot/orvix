document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const statusOverlay = document.getElementById('status-overlay');
    const statusMessage = document.getElementById('status-message');
    const reloginBtn = document.getElementById('relogin-btn');
    
    // Views
    const viewServers = document.getElementById('view-servers');
    const viewSettings = document.getElementById('view-settings');
    const serversGrid = document.getElementById('servers-grid');
    
    // Navigation / Header Elements
    const navServersBtn = document.getElementById('nav-servers-btn');
    const backToServersBtn = document.getElementById('back-to-servers-btn');
    const userAvatarImg = document.getElementById('user-avatar-img');
    const userTagTxt = document.getElementById('user-tag-txt');
    const settingsGuildTitle = document.getElementById('settings-guild-title');
    
    // Form Action
    const saveConfigBtn = document.getElementById('saveConfigBtn');
    
    // Toast elements
    const toastNotif = document.getElementById('toast-notif');
    const toastTitle = document.getElementById('toast-title');
    const toastMessageTxt = document.getElementById('toast-message-txt');

    // Config Fields
    const toggleAntiEveryone = document.getElementById('toggle-antiEveryone');
    const sancionAntiEveryone = document.getElementById('sancion-antiEveryone');
    const toggleAntiFlood = document.getElementById('toggle-antiFlood');
    const sancionAntiFlood = document.getElementById('sancion-antiFlood');
    const toggleAntiPalabras = document.getElementById('toggle-antiPalabras');
    const sancionAntiPalabras = document.getElementById('sancion-antiPalabras');
    const wordsAntiPalabras = document.getElementById('words-antiPalabras');
    const toggleGlobalBans = document.getElementById('toggle-globalBans');
    const toggleAntiBots = document.getElementById('toggle-antiBots');

    let currentToken = null;
    let activeGuildId = null;
    let allGuilds = [];

    // Check for token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');

    if (tokenFromUrl) {
        localStorage.setItem('discord_token', tokenFromUrl);
        window.history.replaceState({}, document.title, window.location.pathname);
        currentToken = tokenFromUrl;
    } else {
        currentToken = localStorage.getItem('discord_token');
    }

    if (!currentToken) {
        showError('No has iniciado sesión.');
        return;
    }

    // Init
    initDashboard();

    async function initDashboard() {
        try {
            // Fetch User Guilds
            const response = await fetch('/api/user/guilds', {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });

            if (response.status === 401) {
                localStorage.removeItem('discord_token');
                showError('Sesión expirada o inválida.');
                return;
            }

            if (!response.ok) throw new Error('Error de red');

            allGuilds = await response.json();
            
            // Set User info (getting from discord api /users/@me)
            fetchUserInfo();

            statusOverlay.style.display = 'none';
            showServersView();

        } catch (error) {
            console.error(error);
            showError('Hubo un error al contactar con la API.');
        }
    }
    
    async function fetchUserInfo() {
        try {
            const res = await fetch('https://discord.com/api/users/@me', {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            if (res.ok) {
                const user = await res.json();
                userTagTxt.textContent = user.username;
                if(user.avatar) {
                    userAvatarImg.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
                }
            }
        } catch(e) {}
    }

    function showServersView() {
        viewSettings.style.display = 'none';
        viewServers.style.display = 'block';
        navServersBtn.classList.add('active');
        renderGuilds(allGuilds);
    }

    function renderGuilds(guilds) {
        serversGrid.innerHTML = '';

        if (guilds.length === 0) {
            serversGrid.innerHTML = '<p class="dash-subtitle">No administras ningún servidor.</p>';
            return;
        }

        guilds.forEach(guild => {
            const card = document.createElement('div');
            card.className = 'premium-server-card';
            
            let iconHtml = '';
            if (guild.icon) {
                iconHtml = `<img class="card-icon" src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png" alt="Icon">`;
            } else {
                const initials = guild.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
                iconHtml = `<div class="card-icon">${initials}</div>`;
            }

            card.innerHTML = `
                ${iconHtml}
                <div class="card-info">
                    <div class="card-name">${guild.name}</div>
                    <div class="card-id">ID: ${guild.id}</div>
                </div>
                <button class="btn-card-action">Configurar <i class="fa-solid fa-arrow-right" style="margin-left: 5px;"></i></button>
            `;

            card.addEventListener('click', () => openSettings(guild));
            serversGrid.appendChild(card);
        });
    }

    async function openSettings(guild) {
        activeGuildId = guild.id;
        settingsGuildTitle.textContent = `Configurar: ${guild.name}`;
        
        viewServers.style.display = 'none';
        viewSettings.style.display = 'block';
        navServersBtn.classList.remove('active');
        
        saveConfigBtn.disabled = true;
        saveConfigBtn.innerHTML = 'Cargando...';

        try {
            const response = await fetch(`/api/config/${guild.id}`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });

            if (response.ok) {
                const config = await response.json();
                populateSettings(config);
                saveConfigBtn.disabled = false;
                saveConfigBtn.innerHTML = 'Guardar Configuración <i class="fa-solid fa-check" style="margin-left: 8px;"></i>';
            } else {
                showToast('Error', 'Error al cargar la configuración.', 'error');
                saveConfigBtn.innerHTML = 'Error';
            }
        } catch (error) {
            console.error(error);
            showToast('Error', 'Error de conexión a la API.', 'error');
        }
    }

    backToServersBtn.addEventListener('click', showServersView);
    navServersBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showServersView();
    });

    function populateSettings(config) {
        toggleAntiEveryone.checked = config.antiEveryone?.enabled || false;
        sancionAntiEveryone.value = config.antiEveryone?.sancion || 'warn';
        toggleAntiFlood.checked = config.antiFlood?.enabled || false;
        sancionAntiFlood.value = config.antiFlood?.sancion || 'warn';
        toggleAntiPalabras.checked = config.antiPalabras?.enabled || false;
        sancionAntiPalabras.value = config.antiPalabras?.sancion || 'warn';
        wordsAntiPalabras.value = config.antiPalabras?.words ? config.antiPalabras.words.join(', ') : '';
        toggleGlobalBans.checked = !!config.globalBansEnabled;
        toggleAntiBots.checked = !!config.antiBotsEnabled;
    }

    saveConfigBtn.addEventListener('click', async () => {
        if (!activeGuildId) return;

        try {
            saveConfigBtn.innerHTML = 'Guardando...';
            saveConfigBtn.disabled = true;

            const wordsRaw = wordsAntiPalabras.value;
            const wordsArray = wordsRaw ? wordsRaw.split(',').map(w => w.trim()).filter(w => w) : [];

            const newConfig = {
                antiEveryone: { enabled: toggleAntiEveryone.checked, sancion: sancionAntiEveryone.value },
                antiFlood: { enabled: toggleAntiFlood.checked, sancion: sancionAntiFlood.value },
                antiPalabras: { enabled: toggleAntiPalabras.checked, sancion: sancionAntiPalabras.value, words: wordsArray },
                globalBansEnabled: toggleGlobalBans.checked,
                antiBotsEnabled: toggleAntiBots.checked
            };

            const response = await fetch(`/api/config/${activeGuildId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newConfig)
            });

            if (response.ok) {
                showToast('Guardado', '¡Tu configuración se ha actualizado correctamente!', 'success');
            } else {
                showToast('Error', 'Hubo un problema al guardar la configuración.', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Error', 'Error de red al intentar guardar.', 'error');
        } finally {
            saveConfigBtn.innerHTML = 'Guardar Configuración <i class="fa-solid fa-check" style="margin-left: 8px;"></i>';
            saveConfigBtn.disabled = false;
        }
    });

    function showError(msg) {
        statusMessage.textContent = msg;
        statusMessage.style.color = 'var(--error)';
        reloginBtn.style.display = 'inline-block';
        document.querySelector('.animated-spinner').style.display = 'none';
    }

    function showToast(title, message, type = 'success') {
        toastTitle.textContent = title;
        toastMessageTxt.textContent = message;
        
        if(type === 'error') {
            toastNotif.classList.add('error');
        } else {
            toastNotif.classList.remove('error');
        }
        
        toastNotif.classList.add('show');
        
        setTimeout(() => {
            toastNotif.classList.remove('show');
        }, 4000);
    }
});
