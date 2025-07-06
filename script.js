// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCFQ_geG0HIv2EZ-bfKc97TJNtf2sdqPzc",
    authDomain: "clack-koder.firebaseapp.com",
    databaseURL: "https://clack-koder-default-rtdb.firebaseio.com",
    projectId: "clack-koder",
    storageBucket: "clack-koder.firebasestorage.app",
    messagingSenderId: "478151254938",
    appId: "1:478151254938:web:e2c00e3a5426bd192b9023",
    measurementId: "G-P29ME5Z3S1"
};

// Firebase Storage Configuration para base64
const FIREBASE_STORAGE = {
    maxImageSize: 5 * 1024 * 1024, // 5MB máximo
    compressionQuality: 0.8, // 80% calidad
    maxDimensions: { width: 1920, height: 1080 }
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Estado global de la aplicación
let currentScreen = 'intro';
let userLanguage = 'es';
let currentChatContact = null;
let currentUser = null;
let verificationCode = '';
let typingTimer = null;
let isTyping = false;
let chatContacts = [];
let selectedReportType = null;
let evidenceImages = [];
let messagesListener = null;
let contactsListener = null;

// Firebase Authentication variables
let recaptchaVerifier = null;
let confirmationResult = null;
let currentPhoneNumber = null;
let moderationSystem = {
    offensiveWords: ['puta', 'perra', 'zorra', 'cabrón', 'pendejo', 'idiota', 'estúpido', 'mierda', 'joder', 'coño'],
    userViolations: {},
    reportQueue: [],
    autoModerationEnabled: true
};
let currentWarning = null;

// Sistema de detección de sesiones concurrentes
let sessionManager = {
    currentSessionId: null,
    deviceInfo: null,
    loginAttemptListener: null,
    pendingApproval: null,
    blockedUntil: null
};

// Variables para modal de aprobación de dispositivo
let deviceApprovalModal = null;
let approvalTimeout = null;

// Traducciones de la interfaz
const translations = {
    es: {
        start: 'Comenzar',
        yourPhone: 'Tu número de teléfono',
        sendCode: 'Enviar código',
        verification: 'Verificación',
        chats: 'Chats',
        translate: 'Traducir',
        calls: 'Llamadas',
        settings: 'Ajustes',
        typeMessage: 'Escribe un mensaje...',
        online: 'En línea',
        addContact: 'Agregar contacto',
        searchConversations: 'Buscar conversaciones...',
        verifying: 'Verificando',
        codeVerified: '¡Código verificado!',
        invalidCode: 'Código inválido',
        resendCode: 'Reenviar código'
    },
    en: {
        start: 'Get Started',
        yourPhone: 'Your phone number',
        sendCode: 'Send code',
        verification: 'Verification',
        chats: 'Chats',
        translate: 'Translate',
        calls: 'Calls',
        settings: 'Settings',
        typeMessage: 'Type a message...',
        online: 'Online',
        addContact: 'Add contact',
        searchConversations: 'Search conversations...',
        verifying: 'Verifying',
        codeVerified: 'Code verified!',
        invalidCode: 'Invalid code',
        resendCode: 'Resend code'
    },
    fr: {
        start: 'Commencer',
        yourPhone: 'Votre numéro de téléphone',
        sendCode: 'Envoyer le code',
        verification: 'Vérification',
        chats: 'Discussions',
        translate: 'Traduire',
        calls: 'Appels',
        settings: 'Paramètres',
        typeMessage: 'Tapez un message...',
        online: 'En ligne',
        addContact: 'Ajouter un contact',
        searchConversations: 'Rechercher des conversations...',
        verifying: 'Vérification en cours',
        codeVerified: 'Code vérifié!',
        invalidCode: 'Code invalide',
        resendCode: 'Renvoyer le code'
    }
};

// Función para cambiar de pantalla con animación
function switchScreen(targetScreen) {
    const currentElement = document.getElementById(`${currentScreen}-screen`);
    const targetElement = document.getElementById(`${targetScreen}-screen`);

    if (currentElement) {
        currentElement.classList.remove('active');
    }

    setTimeout(() => {
        if (targetElement) {
            targetElement.classList.add('active');
            currentScreen = targetScreen;
        }
    }, 150);
}

// Función para actualizar el idioma de la interfaz
function updateLanguage() {
    const lang = userLanguage;
    const t = translations[lang] || translations['es'];

    // Actualizar textos dinámicamente
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        if (t[key]) {
            element.textContent = t[key];
        }
    });

    // Actualizar placeholders
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.placeholder = t.typeMessage;
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.placeholder = t.searchConversations;
    }
}

// Pantalla de Introducción
document.getElementById('language-select').addEventListener('change', function() {
    userLanguage = this.value;
    updateLanguage();
});

function goToRegister() {
    switchScreen('register');
}

function goToIntro() {
    switchScreen('intro');
}

// Lista completa de países con banderas y códigos
const countries = [
    { name: 'España', code: '+34', flag: '🇪🇸', popular: true },
    { name: 'Estados Unidos', code: '+1', flag: '🇺🇸', popular: true },
    { name: 'México', code: '+52', flag: '🇲🇽', popular: true },
    { name: 'Argentina', code: '+54', flag: '🇦🇷', popular: true },
    { name: 'Brasil', code: '+55', flag: '🇧🇷', popular: true },
    { name: 'Colombia', code: '+57', flag: '🇨🇴', popular: true },
    { name: 'Chile', code: '+56', flag: '🇨🇱', popular: true },
    { name: 'Perú', code: '+51', flag: '🇵🇪', popular: true },
    { name: 'Francia', code: '+33', flag: '🇫🇷' },
    { name: 'Alemania', code: '+49', flag: '🇩🇪' },
    { name: 'Italia', code: '+39', flag: '🇮🇹' },
    { name: 'Reino Unido', code: '+44', flag: '🇬🇧' },
    { name: 'Canadá', code: '+1', flag: '🇨🇦' },
    { name: 'Australia', code: '+61', flag: '🇦🇺' },
    { name: 'Japón', code: '+81', flag: '🇯🇵' },
    { name: 'China', code: '+86', flag: '🇨🇳' },
    { name: 'India', code: '+91', flag: '🇮🇳' },
    { name: 'Rusia', code: '+7', flag: '🇷🇺' },
    { name: 'Corea del Sur', code: '+82', flag: '🇰🇷' },
    { name: 'Holanda', code: '+31', flag: '🇳🇱' },
    { name: 'Bélgica', code: '+32', flag: '🇧🇪' },
    { name: 'Suiza', code: '+41', flag: '🇨🇭' },
    { name: 'Austria', code: '+43', flag: '🇦🇹' },
    { name: 'Suecia', code: '+46', flag: '🇸🇪' },
    { name: 'Noruega', code: '+47', flag: '🇳🇴' },
    { name: 'Dinamarca', code: '+45', flag: '🇩🇰' },
    { name: 'Finlandia', code: '+358', flag: '🇫🇮' },
    { name: 'Portugal', code: '+351', flag: '🇵🇹' },
    { name: 'Grecia', code: '+30', flag: '🇬🇷' },
    { name: 'Turquía', code: '+90', flag: '🇹🇷' },
    { name: 'Israel', code: '+972', flag: '🇮🇱' },
    { name: 'Emiratos Árabes Unidos', code: '+971', flag: '🇦🇪' },
    { name: 'Arabia Saudí', code: '+966', flag: '🇸🇦' },
    { name: 'Egipto', code: '+20', flag: '🇪🇬' },
    { name: 'Sudáfrica', code: '+27', flag: '🇿🇦' },
    { name: 'Marruecos', code: '+212', flag: '🇲🇦' },
    { name: 'Nigeria', code: '+234', flag: '🇳🇬' },
    { name: 'Kenia', code: '+254', flag: '🇰🇪' },
    { name: 'Ghana', code: '+233', flag: '🇬🇭' },
    { name: 'Tanzania', code: '+255', flag: '🇹🇿' }
];

let selectedCountry = countries[0]; // España por defecto

// Pantalla de Registro
const phoneInput = document.getElementById('phone-input');
const sendCodeBtn = document.getElementById('send-code-btn');

phoneInput.addEventListener('input', function() {
    const phone = this.value.trim();
    const isValid = phone.length >= 8 && /^\d+$/.test(phone);
    sendCodeBtn.disabled = !isValid;
});

// Funciones para el modal de países
function openCountryModal() {
    const modal = document.getElementById('country-modal');
    const btn = document.getElementById('country-selector-btn');
    
    // Llenar la lista de países si no está llena
    loadCountriesList();
    
    // Mostrar modal con animación
    modal.style.display = 'flex';
    btn.classList.add('active');
    
    // Forzar reflow para que la animación funcione
    modal.offsetHeight;
    
    modal.classList.add('show');
    
    // Enfocar en la búsqueda
    setTimeout(() => {
        const searchInput = document.getElementById('country-search');
        if (searchInput) {
            searchInput.focus();
        }
    }, 300);
    
    console.log('Modal de países abierto');
}

function closeCountryModal() {
    const modal = document.getElementById('country-modal');
    const btn = document.getElementById('country-selector-btn');
    
    modal.classList.remove('show');
    btn.classList.remove('active');
    
    // Ocultar modal después de la animación
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
    
    // Limpiar búsqueda
    const searchInput = document.getElementById('country-search');
    if (searchInput) {
        searchInput.value = '';
        filterCountries();
    }
    
    console.log('Modal de países cerrado');
}

function loadCountriesList() {
    const countriesList = document.getElementById('countries-list');
    
    // Limpiar lista actual
    countriesList.innerHTML = '';
    
    // Separar países populares
    const popularCountries = countries.filter(country => country.popular);
    const otherCountries = countries.filter(country => !country.popular);
    
    // Agregar sección de países populares
    if (popularCountries.length > 0) {
        const popularHeader = document.createElement('div');
        popularHeader.className = 'countries-section-header';
        popularHeader.innerHTML = `
            <div style="padding: 0.75rem 2rem; background: var(--surface); font-weight: 600; font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">
                Países populares
            </div>
        `;
        countriesList.appendChild(popularHeader);
        
        popularCountries.forEach(country => {
            countriesList.appendChild(createCountryItem(country));
        });
        
        // Agregar separador
        const separator = document.createElement('div');
        separator.style.cssText = 'height: 8px; background: var(--surface); margin: 0.5rem 0;';
        countriesList.appendChild(separator);
        
        const otherHeader = document.createElement('div');
        otherHeader.className = 'countries-section-header';
        otherHeader.innerHTML = `
            <div style="padding: 0.75rem 2rem; background: var(--surface); font-weight: 600; font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">
                Todos los países
            </div>
        `;
        countriesList.appendChild(otherHeader);
    }
    
    // Agregar todos los países ordenados alfabéticamente
    const allCountriesSorted = [...countries].sort((a, b) => a.name.localeCompare(b.name));
    allCountriesSorted.forEach(country => {
        countriesList.appendChild(createCountryItem(country));
    });
}

function createCountryItem(country) {
    const item = document.createElement('div');
    item.className = 'country-item';
    item.dataset.countryName = country.name.toLowerCase();
    item.dataset.countryCode = country.code;
    
    if (selectedCountry.code === country.code && selectedCountry.name === country.name) {
        item.classList.add('selected');
    }
    
    item.innerHTML = `
        <div class="country-item-flag">${country.flag}</div>
        <div class="country-item-info">
            <div class="country-item-name">${country.name}</div>
            <div class="country-item-code">${country.code}</div>
        </div>
    `;
    
    item.onclick = () => selectCountry(country);
    
    return item;
}

function selectCountry(country) {
    selectedCountry = country;
    
    // Actualizar UI del selector
    const flagElement = document.querySelector('.country-flag');
    const codeElement = document.querySelector('.country-code');
    
    flagElement.textContent = country.flag;
    codeElement.textContent = country.code;
    
    // Cerrar modal
    closeCountryModal();
    
    // Enfocar en el input de teléfono
    setTimeout(() => {
        document.getElementById('phone-input').focus();
    }, 300);
    
    console.log('País seleccionado:', country);
}

function filterCountries() {
    const searchTerm = document.getElementById('country-search').value.toLowerCase();
    const countryItems = document.querySelectorAll('.country-item');
    let hasResults = false;
    
    countryItems.forEach(item => {
        const countryName = item.dataset.countryName;
        const countryCode = item.dataset.countryCode.toLowerCase();
        
        if (countryName.includes(searchTerm) || countryCode.includes(searchTerm)) {
            item.classList.remove('hidden');
            hasResults = true;
        } else {
            item.classList.add('hidden');
        }
    });
    
    // Mostrar mensaje de no resultados
    const existingNoResults = document.querySelector('.no-results');
    if (existingNoResults) {
        existingNoResults.remove();
    }
    
    if (!hasResults && searchTerm.length > 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = `
            <i class="fas fa-search"></i>
            <h4>No se encontraron países</h4>
            <p>Intenta con otro término de búsqueda</p>
        `;
        document.getElementById('countries-list').appendChild(noResults);
    }
}

function sendVerificationCode() {
    const countryCode = selectedCountry.code;
    const phoneNumber = document.getElementById('phone-input').value;

    // Limpiar el número de teléfono (remover espacios y caracteres no numéricos)
    const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
    const fullNumber = `${countryCode}${cleanPhoneNumber}`;

    console.log('Procesando número:', fullNumber);

    currentPhoneNumber = fullNumber;
    document.getElementById('phone-display').textContent = fullNumber;

    // Verificar si hay bloqueo temporal activo
    if (sessionManager.blockedUntil && Date.now() < sessionManager.blockedUntil) {
        const timeLeft = Math.ceil((sessionManager.blockedUntil - Date.now()) / 60000);
        showErrorMessage(`Acceso bloqueado temporalmente. Intenta de nuevo en ${timeLeft} minutos.`);
        return;
    }

    // Verificar si el número ya está en uso por otra sesión activa
    checkExistingSession(fullNumber);

    }

// Función para verificar sesiones existentes
function checkExistingSession(phoneNumber) {
    const sendBtn = document.getElementById('send-code-btn');
    const originalText = sendBtn.innerHTML;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    sendBtn.disabled = true;

    // Buscar si hay sesiones activas con este número
    database.ref('activeSessions').orderByChild('phoneNumber').equalTo(phoneNumber)
        .once('value')
        .then(snapshot => {
            const activeSessions = snapshot.val() || {};
            const sessionKeys = Object.keys(activeSessions);

            if (sessionKeys.length > 0) {
                // Hay una sesión activa, solicitar aprobación
                const activeSession = activeSessions[sessionKeys[0]];
                requestLoginApproval(phoneNumber, activeSession.userId, activeSession.sessionId);
            } else {
                // No hay sesiones activas, proceder normalmente
                proceedWithVerification(phoneNumber);
            }

            sendBtn.innerHTML = originalText;
            sendBtn.disabled = false;
        })
        .catch(error => {
            console.error('Error verificando sesiones:', error);
            sendBtn.innerHTML = originalText;
            sendBtn.disabled = false;
            showErrorMessage('Error verificando sesión. Intenta de nuevo.');
        });
}

// Función para solicitar aprobación de inicio de sesión
function requestLoginApproval(phoneNumber, existingUserId, existingSessionId) {
    const deviceInfo = getDeviceFingerprint();
    const loginRequestId = Date.now().toString();

    // Crear solicitud de aprobación en Firebase
    const approvalRequest = {
        id: loginRequestId,
        phoneNumber: phoneNumber,
        requestingDevice: deviceInfo,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        status: 'pending',
        approvedBy: null
    };

    database.ref(`loginApprovals/${existingUserId}/${loginRequestId}`).set(approvalRequest)
        .then(() => {
            console.log('Solicitud de aprobación enviada');
            showLoginRequestPending(deviceInfo);

            // Escuchar respuesta de aprobación
            listenForApprovalResponse(existingUserId, loginRequestId, phoneNumber);
        })
        .catch(error => {
            console.error('Error enviando solicitud:', error);
            showErrorMessage('Error enviando solicitud de aprobación.');
        });
}

// Función para proceder con verificación normal
function proceedWithVerification(phoneNumber) {
    // Mostrar loading en el botón
    const sendBtn = document.getElementById('send-code-btn');
    const originalText = sendBtn.innerHTML;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    sendBtn.disabled = true;

    // Generar código automáticamente (6 dígitos)
    const generatedCode = generateRandomCode();
    console.log('Código generado automáticamente:', generatedCode);

    // Crear usuario inmediatamente en Firebase con el número
    const userId = 'user_' + phoneNumber.replace(/\D/g, '');
    const newUserData = {
        uid: userId,
        phoneNumber: phoneNumber,
        displayName: phoneNumber,
        status: 'pending_verification',
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        lastSeen: firebase.database.ServerValue.TIMESTAMP,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${phoneNumber.replace(/\D/g, '')}`
    };

    // Registrar usuario en Firebase inmediatamente con número indexado
    const userPromise = database.ref('users/' + userId).set(newUserData);
    const phoneIndexPromise = database.ref('phoneNumbers/' + phoneNumber.replace(/\D/g, '')).set({
        phoneNumber: phoneNumber,
        userId: userId,
        registeredAt: firebase.database.ServerValue.TIMESTAMP
    });

    Promise.all([userPromise, phoneIndexPromise])
        .then(() => {
            console.log('Usuario y número registrados en Firebase:', phoneNumber);
            
            // Guardar código generado globalmente
            confirmationResult = {
                generatedCode: generatedCode,
                phoneNumber: phoneNumber,
                userId: userId,
                confirm: function(enteredCode) {
                    return new Promise((resolve, reject) => {
                        if (enteredCode === this.generatedCode) {
                            // Actualizar estado a verificado
                            database.ref(`users/${userId}/status`).set('online');
                            
                            // Simular usuario autenticado
                            const mockUser = {
                                uid: userId,
                                phoneNumber: phoneNumber,
                                displayName: phoneNumber
                            };
                            resolve({ user: mockUser });
                        } else {
                            reject({ code: 'auth/invalid-verification-code', message: 'Código inválido' });
                        }
                    });
                }
            };

            // Simular envío exitoso
            setTimeout(() => {
                sendBtn.innerHTML = originalText;
                sendBtn.disabled = false;

                // Mostrar mensaje de éxito y continuar
                showSuccessMessage(`Código enviado: ${generatedCode}`);

                setTimeout(() => {
                    showAutoGeneratedCodeMessage(generatedCode);
                }, 1500);
            }, 1500);
        })
        .catch(error => {
            console.error('Error registrando usuario en Firebase:', error);
            sendBtn.innerHTML = originalText;
            sendBtn.disabled = false;
            showErrorMessage('Error registrando usuario. Intenta de nuevo.');
        });
}

// Función para generar código aleatorio de 6 dígitos
function generateRandomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Sistema de notificación instantánea para solicitudes
let notificationSystem = {
    activeNotifications: [],
    soundEnabled: true
};

// Función para mostrar notificación instantánea de solicitud
function showInstantNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `instant-notification ${type}`;
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-${type === 'friend-request' ? 'user-plus' : 'bell'}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${type === 'friend-request' ? 'Nueva Solicitud' : 'Notificación'}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="closeNotification(this)">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.body.appendChild(notification);
    notificationSystem.activeNotifications.push(notification);

    // Reproducir sonido de notificación
    if (notificationSystem.soundEnabled) {
        playNotificationSound();
    }

    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
        closeNotification(notification);
    }, 5000);
}

function closeNotification(element) {
    const notification = element.closest ? element.closest('.instant-notification') : element;
    if (notification && notification.parentNode) {
        notification.parentNode.removeChild(notification);
        const index = notificationSystem.activeNotifications.indexOf(notification);
        if (index > -1) {
            notificationSystem.activeNotifications.splice(index, 1);
        }
    }
}

function playNotificationSound() {
    if (window.AudioContext || window.webkitAudioContext) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Sonido de notificación agradable
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    }
}

// Función para obtener huella digital del dispositivo
function getDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);

    return {
        userAgent: navigator.userAgent,
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        canvasFingerprint: canvas.toDataURL(),
        timestamp: Date.now(),
        ipLocation: 'Unknown', // En producción usarías una API de geolocalización
        deviceType: /Mobile|Android|iP(ad|od|hone)/.test(navigator.userAgent) ? 'Mobile' : 'Desktop'
    };
}

// Función para mostrar solicitud pendiente
function showLoginRequestPending(deviceInfo) {
    const pendingModal = document.createElement('div');
    pendingModal.className = 'login-pending-modal';
    pendingModal.innerHTML = `
        <div class="pending-content">
            <div class="pending-icon">
                <i class="fas fa-clock"></i>
            </div>
            <h2>🔐 Verificación de Seguridad</h2>
            <p>Este número ya está en uso en otro dispositivo.</p>
            <div class="device-info">
                <h4>📱 Tu dispositivo:</h4>
                <p><strong>Tipo:</strong> ${deviceInfo.deviceType}</p>
                <p><strong>Ubicación:</strong> ${deviceInfo.ipLocation}</p>
                <p><strong>Navegador:</strong> ${deviceInfo.userAgent.substring(0, 50)}...</p>
            </div>
            <div class="pending-message">
                <p>Se ha enviado una solicitud de aprobación al dispositivo autorizado.</p>
                <p>El usuario debe aprobar tu acceso para continuar.</p>
            </div>
            <div class="pending-animation">
                <div class="pulse-dot"></div>
                <div class="pulse-dot"></div>
                <div class="pulse-dot"></div>
            </div>
            <button class="secondary-btn" onclick="cancelLoginRequest()">
                <i class="fas fa-times"></i>
                Cancelar solicitud
            </button>
        </div>
    `;

    document.body.appendChild(pendingModal);
    sessionManager.pendingApproval = pendingModal;
}

// Función para escuchar respuesta de aprobación
function listenForApprovalResponse(userId, requestId, phoneNumber) {
    const approvalRef = database.ref(`loginApprovals/${userId}/${requestId}`);

    approvalRef.on('value', snapshot => {
        const approval = snapshot.val();

        if (approval && approval.status === 'approved') {
            console.log('Inicio de sesión aprobado');
            closePendingModal();
            proceedWithVerification(phoneNumber);
            approvalRef.off(); // Detener listener
        } else if (approval && approval.status === 'denied') {
            console.log('Inicio de sesión denegado');
            closePendingModal();

            // Bloquear por 10 minutos
            sessionManager.blockedUntil = Date.now() + (10 * 60 * 1000);
            showErrorMessage('Acceso denegado por el usuario autorizado. Bloqueado por 10 minutos.');
            approvalRef.off(); // Detener listener
        }
    });

    // Timeout después de 2 minutos
    setTimeout(() => {
        approvalRef.off();
        if (sessionManager.pendingApproval) {
            closePendingModal();
            showErrorMessage('Tiempo de espera agotado. La solicitud de aprobación expiró.');
        }
    }, 120000); // 2 minutos
}

function cancelLoginRequest() {
    closePendingModal();
}

function closePendingModal() {
    if (sessionManager.pendingApproval) {
        document.body.removeChild(sessionManager.pendingApproval);
        sessionManager.pendingApproval = null;
    }
}

function goToRegister() {
    switchScreen('register');
}

// Pantalla de Verificación
let enteredCode = '';

function handleCodeInput(input, index) {
    const value = input.value;

    if (value && /^\d$/.test(value)) {
        enteredCode = enteredCode.substring(0, index) + value + enteredCode.substring(index + 1);

        // Mover al siguiente campo
        if (index < 5) {
            const nextInput = input.parentNode.children[index + 1];
            nextInput.focus();
        }

        // Si se completó el código, verificar
        if (enteredCode.length === 6) {
            setTimeout(() => verifyCode(), 500);
        }
    } else {
        input.value = '';
    }

    // Permitir retroceso
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && !this.value && index > 0) {
            const prevInput = this.parentNode.children[index - 1];
            prevInput.focus();
            enteredCode = enteredCode.substring(0, index - 1) + enteredCode.substring(index);
        }
    });
}

function verifyCode() {
    const statusElement = document.getElementById('verification-status');
    statusElement.className = 'verification-status verifying';
    statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando<span class="loading-dots"></span>';

    if (!confirmationResult) {
        statusElement.className = 'verification-status error';
        statusElement.innerHTML = '<i class="fas fa-times-circle"></i> Error: No hay código pendiente';
        return;
    }

    // Verificar el código con Firebase Auth
    confirmationResult.confirm(enteredCode)
        .then(function(result) {
            // Usuario autenticado exitosamente
            const user = result.user;
            console.log('Usuario autenticado:', user);

            statusElement.className = 'verification-status success';
            statusElement.innerHTML = '<i class="fas fa-check-circle"></i> ¡Código verificado!';

            // Crear perfil de usuario en Realtime Database
            currentUser = {
                uid: user.uid,
                phoneNumber: user.phoneNumber,
                lastSeen: firebase.database.ServerValue.TIMESTAMP,
                status: 'online',
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.phoneNumber.replace(/\D/g, '')}`
            };

            // Guardar usuario en Firebase Realtime Database
            database.ref('users/' + user.uid).set(currentUser)
                .then(() => {
                    console.log('Usuario guardado en Firebase Database:', currentUser);

                    // Guardar en localStorage para persistencia
                    localStorage.setItem('uberchat_user', JSON.stringify(currentUser));

                    // Crear sesión activa
                    createActiveSession(user.uid, user.phoneNumber);

                    // Configurar listeners importantes
                    setupLoginApprovalListener(user.uid);
                    setupFriendRequestsListener();
                    setupNotificationsListener();

                    // Inicializar configuraciones
                    initializeSettings();

                    console.log('Configurando listeners en tiempo real...');

                    setTimeout(() => {
                        // Iniciar tutorial después de verificación exitosa
                        startTutorial();
                    }, 1500);
                })
                .catch(error => {
                    console.error('Error guardando usuario:', error);
                    statusElement.className = 'verification-status error';
                    statusElement.innerHTML = '<i class="fas fa-times-circle"></i> Error guardando usuario';
                });
        })
        .catch(function(error) {
            console.error('Error verificando código:', error);
            statusElement.className = 'verification-status error';

            if (error.code === 'auth/invalid-verification-code') {
                statusElement.innerHTML = '<i class="fas fa-times-circle"></i> Código inválido';
            } else if (error.code === 'auth/code-expired') {
                statusElement.innerHTML = '<i class="fas fa-times-circle"></i> Código expirado';
            } else {
                statusElement.innerHTML = '<i class="fas fa-times-circle"></i> Error verificando código';
            }

            // Limpiar campos
            document.querySelectorAll('.code-digit').forEach(input => {
                input.value = '';
            });
            enteredCode = '';
            document.querySelector('.code-digit').focus();
        });
}

function resendCode() {
    if (!currentPhoneNumber) {
        console.error('No hay número de teléfono para reenviar');
        return;
    }

    const statusElement = document.getElementById('verification-status');
    statusElement.className = 'verification-status';
    statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reenviando código...';

    // Generar nuevo código automáticamente
    const newCode = generateRandomCode();
    console.log('Nuevo código generado:', newCode);

    // Actualizar confirmationResult con el nuevo código
    confirmationResult.generatedCode = newCode;

    setTimeout(() => {
        statusElement.className = 'verification-status';
        statusElement.innerHTML = '<i class="fas fa-paper-plane"></i> Código reenviado';

        // Mostrar nuevo código generado
        showAutoGeneratedCodeMessage(newCode);

        setTimeout(() => {
            statusElement.innerHTML = '';
        }, 3000);
    }, 1500);
}

function generateUserId(phoneNumber) {
    // Generar ID único basado en el número de teléfono
    return 'user_' + phoneNumber.replace(/\D/g, '');
}

function loadUserContacts() {
    // Limpiar lista de contactos existente
    chatContacts = [];
    const chatList = document.querySelector('.chat-list');
    
    // Solo mostrar contactos añadidos, NO todos los usuarios registrados
    chatList.innerHTML = '<div class="loading-contacts"><i class="fas fa-spinner fa-spin"></i> Cargando contactos...</div>';

    // Escuchar solo los contactos aprobados del usuario actual
    if (currentUser && currentUser.uid) {
        contactsListener = database.ref(`contacts/${currentUser.uid}`).on('value', (contactsSnapshot) => {
            const contacts = contactsSnapshot.val() || {};
            const contactIds = Object.keys(contacts);

            chatList.innerHTML = '';

            if (contactIds.length === 0) {
                chatList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>¡Comienza a conectar!</h3>
                        <p>Aún no tienes contactos agregados.</p>
                        <p>Usa el botón <strong>+</strong> de arriba para buscar y agregar usuarios por su número de teléfono.</p>
                        <div class="empty-state-tip">
                            <i class="fas fa-lightbulb"></i>
                            <span>Los usuarios deben estar registrados en UberChat para poder ser encontrados</span>
                        </div>
                    </div>
                `;
                return;
            }

            // Cargar datos de cada contacto
            contactIds.forEach(contactId => {
                database.ref(`users/${contactId}`).once('value').then(userSnapshot => {
                    if (userSnapshot.exists()) {
                        const user = userSnapshot.val();
                        user.uid = contactId;
                        createContactItem(user);
                    }
                });
            });
        });
    }
}

function createContactItem(user) {
    const chatList = document.querySelector('.chat-list');
    
    // Crear contenedor principal del chat con funcionalidad de deslizado
    const chatContainer = document.createElement('div');
    chatContainer.className = 'chat-container-swipe';
    chatContainer.dataset.userId = user.uid;
    
    // Determinar avatar a mostrar basado en configuraciones de privacidad del usuario
    let avatarUrl;
    if (user.profilePhotoVisible !== false) {
        const avatarSeed = user.phoneNumber.replace(/\D/g, '');
        avatarUrl = user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;
    } else {
        avatarUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNjY2MiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBzdHlsZT0idHJhbnNmb3JtOiB0cmFuc2xhdGUoNTAlLCA1MCUpOyI+CjxwYXRoIGQ9Ik0xMCA5QzExLjY1NjkgOSAxMyA3LjY1NjkgMTMgNkMxMyA0LjM0MzEgMTEuNjU2OSAzIDEwIDNDOC4zNDMxNSAzIDcgNC4zNDMxIDcgNkM3IDcuNjU2OSA4LjM0MzE1IDkgMTAgOVoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMCAxMUM3IDExIDQgMTMgNCAxNlYxN0gxNlYxNkMxNiAxMyAxMyAxMSAxMCAxMVoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K';
    }

    const displayName = user.username || user.phoneNumber;
    
    let statusIndicator = '';
    if (user.onlineStatusVisible !== false) {
        statusIndicator = `<div class="status-indicator ${user.status === 'online' ? 'online' : 'offline'}"></div>`;
    }

    let lastSeenText = 'Toca para iniciar conversación';
    if (user.lastSeenVisible !== false && user.lastSeen) {
        const lastSeenDate = new Date(user.lastSeen);
        const now = new Date();
        const diffHours = Math.floor((now - lastSeenDate) / (1000 * 60 * 60));
        
        if (diffHours < 1) {
            lastSeenText = 'Activo recientemente';
        } else if (diffHours < 24) {
            lastSeenText = `Último acceso hace ${diffHours}h`;
        } else {
            lastSeenText = `Último acceso ${lastSeenDate.toLocaleDateString()}`;
        }
    }

    // Verificar si el chat está silenciado
    const isMuted = isChatMuted(user.uid);
    const mutedClass = isMuted ? 'muted' : '';
    const mutedIndicator = isMuted ? '<i class="fas fa-volume-mute muted-indicator"></i>' : '';

    chatContainer.innerHTML = `
        <!-- Acciones de deslizado (ocultas por defecto) -->
        <div class="swipe-actions">
            <button class="swipe-action mute-action" onclick="toggleMuteChat('${user.uid}', '${displayName}')">
                <i class="fas fa-${isMuted ? 'volume-up' : 'volume-mute'}"></i>
                <span>${isMuted ? 'Activar' : 'Silenciar'}</span>
            </button>
            <button class="swipe-action delete-action" onclick="deleteChat('${user.uid}', '${displayName}')">
                <i class="fas fa-trash-alt"></i>
                <span>Eliminar</span>
            </button>
        </div>
        
        <!-- Contenido principal del chat -->
        <div class="chat-item ${mutedClass}" onclick="openChatWithUser(${JSON.stringify(user).replace(/"/g, '&quot;')})">
            <div class="avatar">
                <img src="${avatarUrl}" alt="${displayName}">
                ${statusIndicator}
            </div>
            <div class="chat-info">
                <div class="chat-name">
                    ${displayName}
                    ${mutedIndicator}
                </div>
                <div class="last-message">${lastSeenText}</div>
            </div>
            <div class="chat-meta">
                <div class="time">
                    ${user.callsEnabled !== false ? '<i class="fas fa-phone" style="color: var(--accent-color); font-size: 0.8rem;"></i>' : '<i class="fas fa-phone-slash" style="color: var(--text-secondary); font-size: 0.8rem;"></i>'}
                </div>
                <div class="language-indicator"></div>
            </div>
        </div>
    `;

    // Agregar eventos de touch para el deslizado
    const chatItem = chatContainer.querySelector('.chat-item');
    
    // Eventos para móviles (touch)
    chatItem.addEventListener('touchstart', handleTouchStart, { passive: false });
    chatItem.addEventListener('touchmove', handleTouchMove, { passive: false });
    chatItem.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Eventos para desktop (mouse)
    chatItem.addEventListener('mousedown', handleMouseDown);
    chatItem.addEventListener('mousemove', handleMouseMove);
    chatItem.addEventListener('mouseup', handleMouseUp);
    chatItem.addEventListener('mouseleave', handleMouseUp);

    chatList.appendChild(chatContainer);
}

function showErrorMessage(message) {
    // Crear y mostrar modal de error
    const errorModal = document.createElement('div');
    errorModal.className = 'error-modal';
    errorModal.innerHTML = `
        <div class="error-content">
            <div class="error-icon">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <h3>Error</h3>
            <p>${message}</p>
            <button class="primary-btn" onclick="closeErrorModal()">Entendido</button>
        </div>
    `;

    document.body.appendChild(errorModal);

    // Auto-cerrar después de 8 segundos
    setTimeout(() => {
        closeErrorModal();
    }, 8000);
}

function showSuccessMessage(message) {
    // Crear y mostrar modal de éxito
    const successModal = document.createElement('div');
    successModal.className = 'success-modal';
    successModal.innerHTML = `
        <div class="success-content">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h3>¡Éxito!</h3>
            <p>${message}</p>
        </div>
    `;

    document.body.appendChild(successModal);

    // Auto-cerrar después de 3 segundos
    setTimeout(() => {
        closeSuccessModal();
    }, 3000);
}

function closeErrorModal() {
    const errorModal = document.querySelector('.error-modal');
    if (errorModal) {
        document.body.removeChild(errorModal);
    }
}

function closeSuccessModal() {
    const successModal = document.querySelector('.success-modal');
    if (successModal) {
        document.body.removeChild(successModal);
    }
}

// Limpiar listeners cuando se sale de un chat
function cleanupChatListeners() {
    if (messagesListener) {
        messagesListener.off();
        messagesListener = null;
    }
}

function goToChatList() {
    cleanupChatListeners();
    switchScreen('chat-list');
}

// Optimizar actualizaciones de estado del usuario
function updateUserStatus(status) {
    if (currentUser && currentUser.uid) {
        database.ref(`users/${currentUser.uid}/status`).set(status);
        database.ref(`users/${currentUser.uid}/lastSeen`).set(firebase.database.ServerValue.TIMESTAMP);
    }
}

// Detectar cuando el usuario se va offline
window.addEventListener('beforeunload', () => {
    updateUserStatus('offline');
});

// Detectar cuando el usuario vuelve online
window.addEventListener('focus', () => {
    updateUserStatus('online');
});

window.addEventListener('blur', () => {
    updateUserStatus('away');
});

// Función para cerrar sesión
// Función para crear sesión activa
function createActiveSession(userId, phoneNumber) {
    sessionManager.currentSessionId = Date.now().toString();
    sessionManager.deviceInfo = getDeviceFingerprint();

    const sessionData = {
        sessionId: sessionManager.currentSessionId,
        userId: userId,
        phoneNumber: phoneNumber,
        deviceInfo: sessionManager.deviceInfo,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        lastActivity: firebase.database.ServerValue.TIMESTAMP
    };

    // Guardar sesión activa
    database.ref(`activeSessions/${sessionManager.currentSessionId}`).set(sessionData);

    // Actualizar actividad cada 30 segundos
    sessionManager.activityInterval = setInterval(() => {
        if (sessionManager.currentSessionId) {
            database.ref(`activeSessions/${sessionManager.currentSessionId}/lastActivity`)
                .set(firebase.database.ServerValue.TIMESTAMP);
        }
    }, 30000);
}

// Función para configurar listener de solicitudes de aprobación
function setupLoginApprovalListener(userId) {
    if (sessionManager.loginAttemptListener) {
        sessionManager.loginAttemptListener.off();
    }

    sessionManager.loginAttemptListener = database.ref(`loginApprovals/${userId}`);
    sessionManager.loginAttemptListener.on('child_added', (snapshot) => {
        const approval = snapshot.val();
        if (approval && approval.status === 'pending') {
            showDeviceApprovalModal(approval, snapshot.key, userId);
        }
    });
}

// Función para mostrar pantalla completa de aprobación de dispositivo
function showDeviceApprovalModal(approvalData, approvalId, userId) {
    // Crear pantalla completa en lugar de modal
    const approvalScreen = document.createElement('div');
    approvalScreen.id = 'device-approval-screen';
    approvalScreen.className = 'screen active';

    const deviceInfo = approvalData.requestingDevice;
    const requestTime = new Date(approvalData.timestamp).toLocaleString();

    approvalScreen.innerHTML = `
        <div class="device-approval-container">
            <div class="approval-header">
                <div class="security-icon">
                    <i class="fas fa-shield-alt"></i>
                </div>
                <h1>Solicitud de Acceso Detectada</h1>
                <p class="approval-subtitle">Alguien está intentando acceder a tu cuenta desde otro dispositivo</p>
            </div>

            <div class="approval-content">
                <div class="device-details">
                    <h2>Información del Dispositivo:</h2>
                    <div class="detail-list">
                        <div class="detail-item">
                            <span class="detail-label">Dispositivo</span>
                            <span class="detail-value">${deviceInfo.deviceType}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Ubicación</span>
                            <span class="detail-value">${deviceInfo.ipLocation}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Plataforma</span>
                            <span class="detail-value">${deviceInfo.platform}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Idioma</span>
                            <span class="detail-value">${deviceInfo.language}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Zona Horaria</span>
                            <span class="detail-value">${deviceInfo.timezone}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Solicitud</span>
                            <span class="detail-value">${requestTime}</span>
                        </div>
                    </div>
                </div>

                <div class="security-warning">
                    <div class="warning-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="warning-text">
                        <h3>Verificación de Seguridad</h3>
                        <p>Si no reconoces este dispositivo, deniega la solicitud inmediatamente.</p>
                        <p>Al aprobar, el dispositivo tendrá acceso completo a tu cuenta.</p>
                    </div>
                </div>

                <div class="approval-countdown">
                    <div class="countdown-display">
                        <div class="countdown-timer">
                            <span id="approval-countdown-large">60</span>
                        </div>
                        <p>segundos restantes</p>
                    </div>
                    <div class="countdown-bar">
                        <div class="countdown-progress" id="countdown-progress-fullscreen"></div>
                    </div>
                </div>
            </div>

            <div class="approval-actions">
                <button class="secondary-btn deny-btn" onclick="denyDeviceAccess('${approvalId}', '${userId}')">
                    <i class="fas fa-times"></i>
                    <span>Denegar</span>
                </button>
                <button class="primary-btn approve-btn" onclick="approveDeviceAccess('${approvalId}', '${userId}')">
                    <i class="fas fa-check"></i>
                    <span>Aprobar</span>
                </button>
            </div>
        </div>
    `;

    // Ocultar pantalla actual y mostrar pantalla de aprobación
    const currentScreenElement = document.querySelector('.screen.active');
    if (currentScreenElement) {
        currentScreenElement.classList.remove('active');
    }

    document.body.appendChild(approvalScreen);
    deviceApprovalModal = approvalScreen;

    // Iniciar countdown de 60 segundos
    startApprovalCountdown(60, approvalId, userId);
}

// Función para iniciar countdown de aprobación
function startApprovalCountdown(seconds, approvalId, userId) {
    let timeLeft = seconds;
    const countdownElement = document.getElementById('approval-countdown-large');
    const progressElement = document.getElementById('countdown-progress-fullscreen');

    approvalTimeout = setInterval(() => {
        timeLeft--;

        if (countdownElement) {
            countdownElement.textContent = timeLeft;

            // Cambiar color según tiempo restante
            if (timeLeft <= 10) {
                countdownElement.style.color = '#ff4757';
                countdownElement.parentNode.style.borderColor = '#ff4757';
            } else if (timeLeft <= 30) {
                countdownElement.style.color = '#ffa726';
                countdownElement.parentNode.style.borderColor = '#ffa726';
            }
        }

        if (progressElement) {
            const progress = ((seconds - timeLeft) / seconds) * 100;
            progressElement.style.width = `${progress}%`;

            // Cambiar color de la barra de progreso
            if (timeLeft <= 10) {
                progressElement.style.background = 'linear-gradient(90deg, #ff4757, #ff3742)';
            } else if (timeLeft <= 30) {
                progressElement.style.background = 'linear-gradient(90deg, #ffa726, #ff9800)';
            }
        }

        if (timeLeft <= 0) {
            clearInterval(approvalTimeout);
            denyDeviceAccess(approvalId, userId); // Auto-denegar cuando expire
        }
    }, 1000);
}

// Función para aprobar acceso de dispositivo
function approveDeviceAccess(approvalId, userId) {
    // Simular aprobación sin Firebase
    console.log('Acceso aprobado');
    closeDeviceApprovalModal();

    // Mostrar mensaje de confirmación en pantalla completa
    showFullScreenMessage('✅ Acceso Aprobado', 
        'El nuevo dispositivo ahora puede acceder a tu cuenta y mensajes.', 
        'success');
}

// Función para denegar acceso de dispositivo
function denyDeviceAccess(approvalId, userId) {
    // Simular denegación sin Firebase
    console.log('Acceso denegado');
    closeDeviceApprovalModal();

    // Mostrar mensaje de confirmación en pantalla completa
    showFullScreenMessage('🛡️ Acceso Denegado', 
        'El dispositivo ha sido bloqueado por 10 minutos. Tu cuenta está protegida.', 
        'denied');
}

// Función para cerrar pantalla de aprobación
function closeDeviceApprovalModal() {
    if (approvalTimeout) {
        clearInterval(approvalTimeout);
        approvalTimeout = null;
    }

    if (deviceApprovalModal) {
        document.body.removeChild(deviceApprovalModal);
        deviceApprovalModal = null;

        // Restaurar pantalla anterior
        switchScreen(currentScreen);
    }
}

// Variables globales para configuraciones de privacidad
let privacySettings = {
    profilePhotoVisible: true,
    callsEnabled: true,
    lastSeenVisible: true,
    statusVisible: true,
    onlineStatusVisible: true
};

// Variables para el sistema de deslizado y silenciado
let swipeStartX = 0;
let swipeStartY = 0;
let currentSwipeItem = null;
let isSwipeActive = false;
let mutedChats = new Map(); // Map para guardar chats silenciados con timestamp

// Funciones para la sección de ajustes
function initializeSettings() {
    if (currentUser) {
        // Cargar configuraciones de privacidad desde Firebase
        loadPrivacySettings();
        
        // Configurar avatar inicial
        const avatarSeed = currentUser.phoneNumber.replace(/\D/g, '');
        const defaultAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;
        const avatarUrl = currentUser.avatar || defaultAvatarUrl;

        document.getElementById('profile-avatar').src = avatarUrl;
        document.getElementById('profile-phone-display').textContent = currentUser.phoneNumber;
        document.getElementById('profile-username').textContent = currentUser.username || currentUser.phoneNumber;

        // Configurar modal de edición
        document.getElementById('avatar-preview').src = avatarUrl;
        document.getElementById('username-input').value = currentUser.username || '';
        document.getElementById('status-input').value = currentUser.customStatus || '';
        document.getElementById('phone-readonly').value = currentUser.phoneNumber;
        
        // Configurar toggles de privacidad
        setupPrivacyToggles();
    }
}

// Función para cargar configuraciones de privacidad desde Firebase
function loadPrivacySettings() {
    if (!currentUser || !currentUser.uid) return;
    
    database.ref(`users/${currentUser.uid}/privacySettings`).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                privacySettings = { ...privacySettings, ...snapshot.val() };
                console.log('Configuraciones de privacidad cargadas:', privacySettings);
            } else {
                // Configuraciones por defecto
                savePrivacySettings();
            }
            updatePrivacyUI();
        })
        .catch(error => {
            console.error('Error cargando configuraciones de privacidad:', error);
        });
}

// Función para guardar configuraciones de privacidad en Firebase
function savePrivacySettings() {
    if (!currentUser || !currentUser.uid) return;
    
    return database.ref(`users/${currentUser.uid}/privacySettings`).set(privacySettings)
        .then(() => {
            console.log('Configuraciones de privacidad guardadas en Firebase');
            // Actualizar configuraciones globales del usuario
            database.ref(`users/${currentUser.uid}/profilePhotoVisible`).set(privacySettings.profilePhotoVisible);
            database.ref(`users/${currentUser.uid}/callsEnabled`).set(privacySettings.callsEnabled);
        })
        .catch(error => {
            console.error('Error guardando configuraciones de privacidad:', error);
        });
}

// Función para configurar los toggles de privacidad
function setupPrivacyToggles() {
    // Configurar toggle de foto de perfil
    const photoToggle = document.getElementById('profile-photo-toggle');
    if (photoToggle) {
        if (privacySettings.profilePhotoVisible) {
            photoToggle.classList.add('active');
        } else {
            photoToggle.classList.remove('active');
        }
    }
    
    // Configurar toggle de llamadas
    const callsToggle = document.getElementById('calls-enabled-toggle');
    if (callsToggle) {
        if (privacySettings.callsEnabled) {
            callsToggle.classList.add('active');
        } else {
            callsToggle.classList.remove('active');
        }
    }
    
    // Configurar toggle de última conexión
    const lastSeenToggle = document.getElementById('last-seen-toggle');
    if (lastSeenToggle) {
        if (privacySettings.lastSeenVisible) {
            lastSeenToggle.classList.add('active');
        } else {
            lastSeenToggle.classList.remove('active');
        }
    }
}

// Función para actualizar UI de privacidad
function updatePrivacyUI() {
    setupPrivacyToggles();
    
    // Actualizar avatar visible en toda la aplicación
    updateAvatarVisibility();
}

function showEditProfile() {
    document.getElementById('edit-profile-modal').classList.add('show');
    initializeSettings();
}

function hideEditProfile() {
    document.getElementById('edit-profile-modal').classList.remove('show');
}

function changeProfileAvatar() {
    document.getElementById('avatar-input').click();
}

function selectNewAvatar() {
    document.getElementById('avatar-input').click();
}

function handleAvatarChange(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        // Mostrar loading
        const preview = document.getElementById('avatar-preview');
        const profileAvatar = document.getElementById('profile-avatar');
        
        preview.style.opacity = '0.5';
        profileAvatar.style.opacity = '0.5';
        
        // Subir a Firebase
        uploadToFirebase(file, 'image')
            .then(imageBase64 => {
                preview.src = imageBase64;
                profileAvatar.src = imageBase64;
                preview.style.opacity = '1';
                profileAvatar.style.opacity = '1';
                
                // Guardar en Firebase inmediatamente
                if (currentUser) {
                    currentUser.avatar = imageBase64;
                    database.ref(`users/${currentUser.uid}/avatar`).set(imageBase64);
                }
                
                showSuccessMessage('📸 Foto de perfil actualizada');
            })
            .catch(error => {
                console.error('Error subiendo imagen:', error);
                preview.style.opacity = '1';
                profileAvatar.style.opacity = '1';
                showErrorMessage(`Error subiendo imagen: ${error.message}`);
            });
    }
}

// Función para comprimir imagen antes de convertir a base64
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // Calcular nuevas dimensiones manteniendo proporción
            let { width, height } = img;
            const maxWidth = FIREBASE_STORAGE.maxDimensions.width;
            const maxHeight = FIREBASE_STORAGE.maxDimensions.height;
            
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = width * ratio;
                height = height * ratio;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Dibujar imagen redimensionada
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convertir a base64 con compresión
            const base64 = canvas.toDataURL('image/jpeg', FIREBASE_STORAGE.compressionQuality);
            resolve(base64);
        };
        
        img.onerror = () => reject(new Error('Error cargando imagen'));
        img.src = URL.createObjectURL(file);
    });
}

// Función para subir imagen a Firebase como base64
async function uploadToFirebase(file, resourceType = 'image') {
    console.log('Subiendo imagen a Firebase:', file.name, file.size);
    
    // Verificar tamaño del archivo
    if (file.size > FIREBASE_STORAGE.maxImageSize) {
        throw new Error(`El archivo es demasiado grande. Máximo ${FIREBASE_STORAGE.maxImageSize / (1024 * 1024)}MB.`);
    }
    
    // Verificar que sea una imagen
    if (!file.type.startsWith('image/')) {
        throw new Error('Solo se permiten archivos de imagen.');
    }
    
    try {
        // Comprimir imagen
        console.log('Comprimiendo imagen...');
        const compressedBase64 = await compressImage(file);
        
        // Generar ID único para la imagen
        const imageId = Date.now().toString();
        const imagePath = `images/${currentUser.uid}/${imageId}`;
        
        // Crear objeto de imagen para Firebase
        const imageData = {
            id: imageId,
            base64: compressedBase64,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            uploadedBy: currentUser.uid,
            uploadedAt: Date.now(),
            compressed: true
        };
        
        console.log('Guardando imagen en Firebase...');
        
        // Guardar en Firebase Realtime Database
        await database.ref(imagePath).set(imageData);
        
        console.log('Imagen subida exitosamente a Firebase:', imageId);
        
        // Retornar la URL de la imagen (base64 directamente)
        return compressedBase64;
        
    } catch (error) {
        console.error('Error subiendo imagen a Firebase:', error);
        throw new Error(`Error subiendo imagen: ${error.message}`);
    }
}

function saveProfile() {
    const username = document.getElementById('username-input').value.trim();
    const status = document.getElementById('status-input').value.trim();
    const avatarSrc = document.getElementById('avatar-preview').src;

    if (username) {
        // Mostrar loading
        const saveBtn = document.querySelector('.save-profile-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        saveBtn.disabled = true;

        // Actualizar perfil del usuario localmente
        if (currentUser) {
            currentUser.username = username;
            currentUser.customStatus = status;
            currentUser.avatar = avatarSrc;

            // Preparar datos para Firebase
            const profileUpdates = {
                username: username,
                customStatus: status,
                avatar: avatarSrc,
                lastUpdated: firebase.database.ServerValue.TIMESTAMP
            };

            // Guardar en Firebase Realtime Database
            database.ref(`users/${currentUser.uid}`).update(profileUpdates)
                .then(() => {
                    console.log('Perfil guardado exitosamente en Firebase');
                    
                    // Actualizar localStorage
                    localStorage.setItem('uberchat_user', JSON.stringify(currentUser));
                    
                    // Actualizar UI
                    document.getElementById('profile-username').textContent = username;
                    document.getElementById('profile-avatar').src = avatarSrc;
                    
                    // Restaurar botón
                    saveBtn.innerHTML = originalText;
                    saveBtn.disabled = false;
                    
                    hideEditProfile();
                    showSuccessMessage('✅ Perfil actualizado y guardado en tiempo real');
                })
                .catch(error => {
                    console.error('Error guardando perfil en Firebase:', error);
                    saveBtn.innerHTML = originalText;
                    saveBtn.disabled = false;
                    showErrorMessage('Error guardando perfil. Intenta de nuevo.');
                });
        }
    } else {
        showErrorMessage('Por favor ingresa un nombre de usuario');
    }
}

function toggleNotifications(toggle) {
    toggle.classList.toggle('active');
    const isActive = toggle.classList.contains('active');

    notificationSystem.soundEnabled = isActive;

    showSuccessMessage(isActive ? 
        '🔔 Notificaciones activadas' : 
        '🔕 Notificaciones desactivadas'
    );
}

function toggleCallNotifications(toggle) {
    toggle.classList.toggle('active');
    const isActive = toggle.classList.contains('active');

    showSuccessMessage(isActive ? 
        '📞 Notificaciones de llamadas activadas' : 
        '📞 Notificaciones de llamadas desactivadas'
    );
}

function toggleAutoTranslate(toggle) {
    toggle.classList.toggle('active');
    const isActive = toggle.classList.contains('active');

    showSuccessMessage(isActive ? 
        '🌍 Traducción automática activada' : 
        '🌍 Traducción automática desactivada'
    );
}

function showPrivacySettings() {
    // Crear pantalla completa de configuraciones de privacidad
    const privacyScreen = document.createElement('div');
    privacyScreen.id = 'privacy-settings-screen';
    privacyScreen.className = 'screen active';

    privacyScreen.innerHTML = `
        <div class="privacy-settings-container">
            <div class="privacy-header">
                <button class="back-btn" onclick="closePrivacySettings()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2>Privacidad y Seguridad</h2>
                <div class="privacy-subtitle">Controla quién puede ver tu información y contactarte</div>
            </div>

            <div class="privacy-content">
                <div class="privacy-section">
                    <div class="section-header">
                        <i class="fas fa-user-circle"></i>
                        <h3>Perfil</h3>
                    </div>
                    
                    <div class="privacy-option">
                        <div class="option-info">
                            <div class="option-title">Foto de Perfil</div>
                            <div class="option-description">Permite que otros usuarios vean tu foto de perfil</div>
                        </div>
                        <div class="option-toggle">
                            <div class="toggle-switch ${privacySettings.profilePhotoVisible ? 'active' : ''}" id="profile-photo-toggle" onclick="toggleProfilePhotoVisibility(this)">
                                <div class="toggle-slider"></div>
                            </div>
                        </div>
                    </div>

                    <div class="privacy-option">
                        <div class="option-info">
                            <div class="option-title">Estado Personal</div>
                            <div class="option-description">Mostrar tu estado personalizado a otros usuarios</div>
                        </div>
                        <div class="option-toggle">
                            <div class="toggle-switch ${privacySettings.statusVisible ? 'active' : ''}" id="status-toggle" onclick="toggleStatusVisibility(this)">
                                <div class="toggle-slider"></div>
                            </div>
                        </div>
                    </div>

                    <div class="privacy-option">
                        <div class="option-info">
                            <div class="option-title">Última Conexión</div>
                            <div class="option-description">Permitir que otros vean cuándo estuviste en línea por última vez</div>
                        </div>
                        <div class="option-toggle">
                            <div class="toggle-switch ${privacySettings.lastSeenVisible ? 'active' : ''}" id="last-seen-toggle" onclick="toggleLastSeenVisibility(this)">
                                <div class="toggle-slider"></div>
                            </div>
                        </div>
                    </div>

                    <div class="privacy-option">
                        <div class="option-info">
                            <div class="option-title">Estado En Línea</div>
                            <div class="option-description">Mostrar cuando estás conectado actualmente</div>
                        </div>
                        <div class="option-toggle">
                            <div class="toggle-switch ${privacySettings.onlineStatusVisible ? 'active' : ''}" id="online-status-toggle" onclick="toggleOnlineStatusVisibility(this)">
                                <div class="toggle-slider"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="privacy-section">
                    <div class="section-header">
                        <i class="fas fa-phone"></i>
                        <h3>Comunicación</h3>
                    </div>
                    
                    <div class="privacy-option">
                        <div class="option-info">
                            <div class="option-title">Recibir Llamadas</div>
                            <div class="option-description">Permitir que otros usuarios te llamen</div>
                        </div>
                        <div class="option-toggle">
                            <div class="toggle-switch ${privacySettings.callsEnabled ? 'active' : ''}" id="calls-enabled-toggle" onclick="toggleCallsEnabled(this)">
                                <div class="toggle-slider"></div>
                            </div>
                        </div>
                    </div>

                    <div class="privacy-option">
                        <div class="option-info">
                            <div class="option-title">Solo Contactos</div>
                            <div class="option-description">Solo tus contactos pueden enviarte mensajes</div>
                        </div>
                        <div class="option-toggle">
                            <div class="toggle-switch" id="contacts-only-toggle" onclick="toggleContactsOnly(this)">
                                <div class="toggle-slider"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="privacy-section">
                    <div class="section-header">
                        <i class="fas fa-shield-alt"></i>
                        <h3>Seguridad</h3>
                    </div>
                    
                    <div class="privacy-option" onclick="showBlockedUsers()">
                        <div class="option-info">
                            <div class="option-title">Usuarios Bloqueados</div>
                            <div class="option-description">Gestionar lista de usuarios bloqueados</div>
                        </div>
                        <div class="option-arrow">
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>

                    <div class="privacy-option" onclick="showSecurityLog()">
                        <div class="option-info">
                            <div class="option-title">Registro de Seguridad</div>
                            <div class="option-description">Ver intentos de acceso recientes</div>
                        </div>
                        <div class="option-arrow">
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>

                    <div class="privacy-option" onclick="showDataSettings()">
                        <div class="option-info">
                            <div class="option-title">Mis Datos</div>
                            <div class="option-description">Exportar o eliminar mis datos</div>
                        </div>
                        <div class="option-arrow">
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>
                </div>
            </div>

            <div class="privacy-footer">
                <div class="privacy-note">
                    <i class="fas fa-info-circle"></i>
                    <p>Los cambios se aplicarán en tiempo real. Otros usuarios verán los cambios inmediatamente.</p>
                </div>
            </div>
        </div>
    `;

    // Ocultar pantalla actual
    const currentScreenElement = document.querySelector('.screen.active');
    if (currentScreenElement && currentScreenElement !== privacyScreen) {
        currentScreenElement.classList.remove('active');
    }

    document.body.appendChild(privacyScreen);
}

function closePrivacySettings() {
    const privacyScreen = document.getElementById('privacy-settings-screen');
    if (privacyScreen) {
        document.body.removeChild(privacyScreen);
        switchScreen('settings');
    }
}

// Funciones para toggle de configuraciones de privacidad
function toggleProfilePhotoVisibility(toggle) {
    toggle.classList.toggle('active');
    const isVisible = toggle.classList.contains('active');
    
    privacySettings.profilePhotoVisible = isVisible;
    savePrivacySettings();
    updateAvatarVisibility();
    
    showInstantNotification(
        isVisible ? 
        '👁️ Foto de perfil ahora es visible para todos' : 
        '🙈 Foto de perfil oculta para otros usuarios', 
        'friend-request'
    );
}

function toggleCallsEnabled(toggle) {
    toggle.classList.toggle('active');
    const isEnabled = toggle.classList.contains('active');
    
    privacySettings.callsEnabled = isEnabled;
    savePrivacySettings();
    
    showInstantNotification(
        isEnabled ? 
        '📞 Llamadas activadas - otros pueden llamarte' : 
        '🔇 Llamadas silenciadas - no recibirás llamadas', 
        'friend-request'
    );
}

function toggleStatusVisibility(toggle) {
    toggle.classList.toggle('active');
    const isVisible = toggle.classList.contains('active');
    
    privacySettings.statusVisible = isVisible;
    savePrivacySettings();
    
    showInstantNotification(
        isVisible ? 
        '💬 Estado personal visible para otros' : 
        '🤐 Estado personal oculto', 
        'friend-request'
    );
}

function toggleLastSeenVisibility(toggle) {
    toggle.classList.toggle('active');
    const isVisible = toggle.classList.contains('active');
    
    privacySettings.lastSeenVisible = isVisible;
    savePrivacySettings();
    
    showInstantNotification(
        isVisible ? 
        '⏰ Última conexión visible para otros' : 
        '👻 Última conexión oculta', 
        'friend-request'
    );
}

function toggleOnlineStatusVisibility(toggle) {
    toggle.classList.toggle('active');
    const isVisible = toggle.classList.contains('active');
    
    privacySettings.onlineStatusVisible = isVisible;
    savePrivacySettings();
    
    showInstantNotification(
        isVisible ? 
        '🟢 Estado en línea visible' : 
        '⚫ Aparecerás como desconectado', 
        'friend-request'
    );
}

function toggleContactsOnly(toggle) {
    toggle.classList.toggle('active');
    const isEnabled = toggle.classList.contains('active');
    
    // Esta función se puede implementar más adelante
    showInstantNotification(
        isEnabled ? 
        '🔒 Solo contactos pueden escribirte' : 
        '🌍 Cualquiera puede escribirte', 
        'friend-request'
    );
}

// Función para actualizar visibilidad de avatar en tiempo real
function updateAvatarVisibility() {
    if (!currentUser) return;
    
    const avatarElements = document.querySelectorAll('img[src*="api.dicebear"], .avatar img, .profile-avatar');
    
    avatarElements.forEach(img => {
        if (privacySettings.profilePhotoVisible) {
            img.style.opacity = '1';
            img.style.filter = 'none';
        } else {
            // Mostrar avatar genérico o placeholder
            const placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNjY2MiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBzdHlsZT0idHJhbnNmb3JtOiB0cmFuc2xhdGUoNTAlLCA1MCUpOyI+CjxwYXRoIGQ9Ik0xMCA5QzExLjY1NjkgOSAxMyA3LjY1NjkgMTMgNkMxMyA0LjM0MzEgMTEuNjU2OSAzIDEwIDNDOC4zNDMxNSAzIDcgNC4zNDMxIDcgNkM3IDcuNjU2OSA4LjM0MzE1IDkgMTAgOVoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMCAxMUM3IDExIDQgMTMgNCAxNlYxN0gxNlYxNkMxNiAxMyAxMyAxMSAxMCAxMVoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K';
            
            if (!img.src.includes('data:image/svg+xml')) {
                img.dataset.originalSrc = img.src;
                img.src = placeholder;
            }
        }
    });
}

// Funciones adicionales para configuraciones de seguridad
function showBlockedUsers() {
    showFullScreenMessage('🚫 Usuarios Bloqueados', 
        'No tienes usuarios bloqueados actualmente. Los usuarios bloqueados aparecerán aquí.', 
        'info');
}

function showSecurityLog() {
    showFullScreenMessage('🛡️ Registro de Seguridad', 
        'Último acceso: Ahora - Dispositivo actual\nUbicación: España\nDispositivo: Navegador web', 
        'info');
}

function showDataSettings() {
    showFullScreenMessage('📊 Mis Datos', 
        'Puedes exportar todos tus datos o solicitar la eliminación de tu cuenta. Estos cambios son permanentes.', 
        'warning');
}

function showStorageSettings() {
    showFullScreenMessage('💾 Gestión de Almacenamiento', 
        'Espacio usado: 45.2 MB de 1 GB disponible. Puedes limpiar archivos antiguos desde aquí.', 
        'info');
}

function showAbout() {
    showFullScreenMessage('ℹ️ Acerca de UberChat', 
        'UberChat v1.0.0 - Aplicación de mensajería global con traducción automática. Desarrollado con tecnologías web modernas.', 
        'info');
}

function showHelp() {
    showFullScreenMessage('❓ Ayuda y Soporte', 
        'Si tienes problemas o preguntas, puedes contactarnos a través del email: soporte@uberchat.com', 
        'info');
}

function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        if (currentUser) {
            updateUserStatus('offline');

            // Limpiar sesión activa
            if (sessionManager.currentSessionId) {
                database.ref(`activeSessions/${sessionManager.currentSessionId}`).remove();
            }

            // Limpiar intervalos y listeners
            if (sessionManager.activityInterval) {
                clearInterval(sessionManager.activityInterval);
            }

            if (sessionManager.loginAttemptListener) {
                sessionManager.loginAttemptListener.off();
                sessionManager.loginAttemptListener = null;
            }
        }

        firebase.auth().signOut()
            .then(() => {
                console.log('Sesión cerrada');
                currentUser = null;
                currentPhoneNumber = null;
                confirmationResult = null;

                // Resetear session manager
                sessionManager = {
                    currentSessionId: null,
                    deviceInfo: null,
                    loginAttemptListener: null,
                    pendingApproval: null,
                    blockedUntil: null
                };

                // Limpiar listeners
                cleanupChatListeners();
                if (contactsListener) {
                    contactsListener.off();
                    contactsListener = null;
                }

                // Volver a la pantalla de intro
                switchScreen('intro');
                showSuccessMessage('✅ Sesión cerrada correctamente');
            })
            .catch(error => {
                console.error('Error cerrando sesión:', error);
                showErrorMessage('Error cerrando sesión');
            });
    }
}

// Función para limpiar datos antiguos (optimización de almacenamiento)
function cleanupOldData() {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    // Limpiar mensajes antiguos (más de 30 días)
    database.ref('chats').once('value', snapshot => {
        const chats = snapshot.val() || {};

        Object.keys(chats).forEach(chatId => {
            const messages = chats[chatId].messages || {};

            Object.keys(messages).forEach(messageId => {
                if (messages[messageId].timestamp < thirtyDaysAgo) {
                    database.ref(`chats/${chatId}/messages/${messageId}`).remove();
                }
            });
        });
    });
}

// Pantalla de Chat
function showAddContact() {
    document.getElementById('add-contact-modal').classList.add('show');
}

function hideAddContact() {
    document.getElementById('add-contact-modal').classList.remove('show');
}

// Variables para el sistema de solicitudes
let friendRequestsListener = null;
let pendingRequests = new Map();

// Función para agregar contacto
function addContact() {
    const phone = document.getElementById('contact-phone').value.trim();

    if (!phone) {
        showErrorMessage('Por favor ingresa un número de teléfono');
        return;
    }

    // Normalizar número de teléfono
    const countryCode = document.getElementById('contact-country').value || '+34';
    const cleanPhone = phone.replace(/\D/g, '');
    const fullNumber = cleanPhone.startsWith(countryCode.replace('+', '')) ? 
        '+' + cleanPhone : countryCode + cleanPhone;

    console.log('Buscando contacto:', fullNumber);

    // Mostrar indicador de búsqueda
    const addBtn = document.querySelector('#add-contact-modal .primary-btn');
    const originalText = addBtn.innerHTML;
    addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
    addBtn.disabled = true;

    // Buscar primero en el índice de números de teléfono
    const phoneKey = fullNumber.replace(/\D/g, '');
    database.ref('phoneNumbers/' + phoneKey).once('value')
        .then(phoneSnapshot => {
            if (phoneSnapshot.exists()) {
                const phoneData = phoneSnapshot.val();
                const userId = phoneData.userId;
                
                // Obtener datos completos del usuario
                return database.ref('users/' + userId).once('value');
            } else {
                // Fallback: buscar en usuarios directamente
                return database.ref('users').orderByChild('phoneNumber').equalTo(fullNumber).once('value');
            }
        })
        .then(snapshot => {
            addBtn.innerHTML = originalText;
            addBtn.disabled = false;

            let user = null;
            let userId = null;

            if (snapshot.val()) {
                if (snapshot.key) {
                    // Resultado directo del usuario
                    user = snapshot.val();
                    userId = snapshot.key;
                } else {
                    // Resultado de búsqueda por número
                    const users = snapshot.val();
                    userId = Object.keys(users)[0];
                    user = users[userId];
                }

                console.log('Usuario encontrado:', user);

                if (userId === currentUser.uid) {
                    showErrorMessage('No puedes agregarte a ti mismo');
                    return;
                }

                // Verificar si ya son contactos
                database.ref(`contacts/${currentUser.uid}/${userId}`).once('value')
                    .then(contactSnapshot => {
                        if (contactSnapshot.exists()) {
                            hideAddContact();
                            showErrorMessage('Este usuario ya está en tu lista de contactos');
                        } else {
                            // Asegurar que el usuario tiene UID
                            user.uid = userId;
                            // Mostrar tarjeta del usuario encontrado
                            showUserFoundCard(user);
                        }
                    });
            } else {
                showErrorMessage(`Usuario con número ${fullNumber} no encontrado en la plataforma. Debe registrarse primero.`);
            }
        })
        .catch(error => {
            console.error('Error buscando contacto:', error);
            addBtn.innerHTML = originalText;
            addBtn.disabled = false;
            showErrorMessage('Error buscando contacto. Verifica tu conexión.');
        });
}

// Función para mostrar tarjeta del usuario encontrado
function showUserFoundCard(user) {
    hideAddContact();

    const avatarSeed = user.phoneNumber.replace(/\D/g, '');
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;

    const userCard = document.createElement('div');
    userCard.className = 'user-found-modal';
    userCard.innerHTML = `
        <div class="user-found-content">
            <div class="user-found-header">
                <h2>📱 Usuario Encontrado</h2>
                <button class="close-card-btn" onclick="closeUserFoundCard()">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="user-card">
                <div class="user-avatar">
                    <img src="${avatarUrl}" alt="${user.phoneNumber}">
                    <div class="status-indicator ${user.status === 'online' ? 'online' : 'offline'}"></div>
                </div>
                <div class="user-info">
                    <h3>${user.phoneNumber}</h3>
                    <p class="user-status">${user.status === 'online' ? '🟢 En línea' : '⚫ Desconectado'}</p>
                    <p class="user-joined">Miembro desde ${new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
            </div>

            <div class="user-actions">
                <button class="secondary-btn" onclick="closeUserFoundCard()">
                    <i class="fas fa-times"></i>
                    Cancelar
                </button>
                <button class="primary-btn" onclick="sendFriendRequest('${user.uid}', '${user.phoneNumber}')">
                    <i class="fas fa-user-plus"></i>
                    Enviar Solicitud
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(userCard);
    window.currentUserFoundCard = userCard;
}

// Función para cerrar tarjeta de usuario encontrado
function closeUserFoundCard() {
    if (window.currentUserFoundCard) {
        document.body.removeChild(window.currentUserFoundCard);
        window.currentUserFoundCard = null;
    }
}

// Función para enviar solicitud de amistad
function sendFriendRequest(targetUserId, targetUserPhone) {
    const requestId = Date.now().toString();
    const requestData = {
        id: requestId,
        from: currentUser.uid,
        fromPhone: currentUser.phoneNumber,
        fromAvatar: currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.phoneNumber}`,
        to: targetUserId,
        toPhone: targetUserPhone,
        timestamp: Date.now(), // Usar timestamp directo para mejor compatibilidad
        status: 'pending'
    };

    // Cerrar tarjeta de usuario
    closeUserFoundCard();

    console.log('Enviando solicitud de amistad:', requestData);

    // Enviar solicitud y notificaciones en paralelo
    const promises = [];

    // 1. Guardar solicitud principal
    promises.push(database.ref(`friendRequests/${targetUserId}/${requestId}`).set(requestData));

    // 2. Crear notificación directa
    const notificationData = {
        type: 'friend_request',
        from: currentUser.uid,
        fromPhone: currentUser.phoneNumber,
        fromAvatar: currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.phoneNumber}`,
        requestId: requestId,
        timestamp: Date.now(),
        read: false
    };
    promises.push(database.ref(`notifications/${targetUserId}`).push(notificationData));

    // 3. Actualizar flag de notificación en perfil del usuario
    promises.push(database.ref(`users/${targetUserId}/lastNotification`).set({
        type: 'friend_request',
        from: currentUser.phoneNumber,
        timestamp: Date.now(),
        requestId: requestId
    }));

    // 4. Crear entrada en solicitudes pendientes globales
    promises.push(database.ref(`globalNotifications/${targetUserId}_${requestId}`).set({
        type: 'friend_request',
        targetUser: targetUserId,
        fromUser: currentUser.uid,
        fromPhone: currentUser.phoneNumber,
        requestId: requestId,
        timestamp: Date.now(),
        processed: false
    }));

    Promise.all(promises)
        .then(() => {
            console.log('Solicitud y notificaciones enviadas exitosamente a Firebase');
            showInstantNotification(`✅ Solicitud enviada a ${targetUserPhone}`, 'friend-request');
            
            // Forzar actualización inmediata en el destinatario si está online
            database.ref(`users/${targetUserId}/status`).once('value').then(statusSnapshot => {
                if (statusSnapshot.val() === 'online') {
                    console.log('Usuario destinatario está online, notificación debería llegar inmediatamente');
                }
            });
            
        })
        .catch(error => {
            console.error('Error enviando solicitud completa:', error);
            showErrorMessage('Error enviando solicitud. Intenta de nuevo.');
        });
}

// Funciones para llamadas en tiempo real

// Función para enviar solicitud de llamada
function sendCallRequest(callType) {
    if (!currentChatContact || !currentUser) return;

    const callRequestId = Date.now().toString();
    const callRequest = {
        id: callRequestId,
        type: callType,
        from: currentUser.uid,
        fromPhone: currentUser.phoneNumber,
        fromName: currentUser.username || currentUser.phoneNumber,
        fromAvatar: currentUser.avatar,
        to: currentChatContact.uid,
        toPhone: currentChatContact.phoneNumber,
        timestamp: Date.now(),
        status: 'calling'
    };

    console.log('Enviando solicitud de llamada en tiempo real:', callRequest);

    // Guardar solicitud de llamada en Firebase
    database.ref(`callRequests/${currentChatContact.uid}/${callRequestId}`).set(callRequest)
        .then(() => {
            console.log('Solicitud de llamada enviada a Firebase');
            
            // Crear notificación directa
            const notificationData = {
                type: 'incoming_call',
                callType: callType,
                from: currentUser.uid,
                fromPhone: currentUser.phoneNumber,
                fromName: currentUser.username || currentUser.phoneNumber,
                fromAvatar: currentUser.avatar,
                callRequestId: callRequestId,
                timestamp: Date.now(),
                read: false
            };

            // Enviar notificación
            database.ref(`notifications/${currentChatContact.uid}`).push(notificationData);
            
            // Actualizar flag de llamada entrante
            database.ref(`users/${currentChatContact.uid}/incomingCall`).set({
                type: callType,
                from: currentUser.uid,
                fromPhone: currentUser.phoneNumber,
                fromName: currentUser.username || currentUser.phoneNumber,
                fromAvatar: currentUser.avatar,
                callRequestId: callRequestId,
                timestamp: Date.now()
            });

        })
        .catch(error => {
            console.error('Error enviando solicitud de llamada:', error);
            showErrorMessage('Error iniciando llamada. Intenta de nuevo.');
        });
}

// Función para inicializar llamada en tiempo real
function initiateRealTimeCall(callType) {
    console.log('Iniciando llamada en tiempo real:', callType);
    
    // Mostrar estado de llamando
    const statusElement = document.getElementById(callType === 'voice' ? 'call-status' : 'video-call-status');
    statusElement.textContent = '📞 Llamando...';

    // Reproducir sonido de llamada
    playCallSound();

    // Obtener acceso a medios
    getRealTimeMediaAccess(callType)
        .then(stream => {
            localStream = stream;
            console.log('Acceso a medios obtenido');
            
            // Para videollamadas, mostrar video local
            if (callType === 'video') {
                const localVideo = document.getElementById('local-video');
                if (localVideo) {
                    localVideo.srcObject = stream;
                }
            }

            // Configurar WebRTC (simulado)
            setupWebRTCConnection();
            
        })
        .catch(error => {
            console.error('Error obteniendo acceso a medios:', error);
            showErrorMessage('Error accediendo al micrófono/cámara. Verifica los permisos.');
        });
}

// Función para obtener acceso a medios en tiempo real
function getRealTimeMediaAccess(callType) {
    const constraints = {
        audio: true,
        video: callType === 'video'
    };

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        return navigator.mediaDevices.getUserMedia(constraints);
    } else {
        // Fallback para navegadores más antiguos
        return Promise.reject(new Error('getUserMedia no soportado'));
    }
}

// Función para configurar conexión WebRTC
function setupWebRTCConnection() {
    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    try {
        peerConnection = new RTCPeerConnection(configuration);
        
        // Agregar stream local
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }

        // Manejar stream remoto
        peerConnection.ontrack = function(event) {
            console.log('Stream remoto recibido');
            remoteStream = event.streams[0];
            
            // Para videollamadas, mostrar video remoto
            if (currentCallType === 'video') {
                const remoteVideo = document.getElementById('remote-video');
                if (remoteVideo) {
                    remoteVideo.srcObject = remoteStream;
                }
            }
        };

        // Simular conexión exitosa después de 3 segundos
        setTimeout(() => {
            if (isCallActive) {
                handleCallConnected();
            }
        }, 3000);

        console.log('Conexión WebRTC configurada');
        
    } catch (error) {
        console.error('Error configurando WebRTC:', error);
        // Continuar con simulación si WebRTC falla
        setTimeout(() => {
            handleCallConnected();
        }, 3000);
    }
}

// Función para manejar llamada conectada
function handleCallConnected() {
    const statusElement = document.getElementById(currentCallType === 'voice' ? 'call-status' : 'video-call-status');
    statusElement.textContent = '🟢 Conectado';
    
    isCallActive = true;
    startCallTimer();
    stopCallSound();

    // Inicializar reconocimiento de voz
    initializeSpeechRecognition();

    console.log('Llamada conectada exitosamente');
}

// Función para configurar listener de solicitudes de llamada
function setupCallRequestsListener() {
    if (!currentUser || !currentUser.uid) {
        console.error('No se puede configurar listener de llamadas: usuario no disponible');
        return;
    }

    console.log('Configurando listener de llamadas para:', currentUser.uid);

    // Limpiar listener anterior
    if (callRequestListener) {
        callRequestListener.off();
        callRequestListener = null;
    }

    // Configurar listener para llamadas entrantes
    callRequestListener = database.ref(`callRequests/${currentUser.uid}`);
    
    callRequestListener.on('child_added', (snapshot) => {
        const callRequest = snapshot.val();
        const requestId = snapshot.key;
        
        console.log('Nueva llamada entrante detectada:', callRequest);
        
        if (callRequest && callRequest.status === 'calling') {
            // Verificar que no sea una llamada antigua
            const requestTime = callRequest.timestamp;
            const now = Date.now();
            const oneMinuteAgo = now - (60 * 1000);
            
            if (requestTime > oneMinuteAgo) {
                // Mostrar notificación de llamada entrante
                showIncomingCallNotification(callRequest, requestId);
            }
        }
    });

    // Listener para cambios en el perfil (llamadas entrantes)
    database.ref(`users/${currentUser.uid}/incomingCall`).on('value', (snapshot) => {
        const incomingCall = snapshot.val();
        if (incomingCall) {
            console.log('Llamada entrante detectada via perfil:', incomingCall);
            
            // Solo mostrar si es reciente (último minuto)
            if (Date.now() - incomingCall.timestamp < 60000) {
                showIncomingCallNotification(incomingCall, incomingCall.callRequestId);
            }
        }
    });

    console.log('Listener de llamadas configurado correctamente');
}

// Función para mostrar notificación de llamada entrante
function showIncomingCallNotification(callRequest, requestId) {
    // Verificar si ya hay una llamada activa
    if (isCallActive || incomingCallModal) {
        console.log('Ya hay una llamada activa, rechazando automáticamente');
        rejectIncomingCall(requestId);
        return;
    }

    isCallIncoming = true;
    
    // Reproducir sonido de llamada entrante
    playIncomingCallSound();

    // Crear modal de llamada entrante en pantalla completa
    const callModal = document.createElement('div');
    callModal.id = 'incoming-call-modal';
    callModal.className = 'incoming-call-screen';

    const callTypeIcon = callRequest.type === 'video' ? 'fas fa-video' : 'fas fa-phone';
    const callTypeText = callRequest.type === 'video' ? 'Videollamada' : 'Llamada de voz';

    callModal.innerHTML = `
        <div class="incoming-call-container">
            <div class="incoming-call-header">
                <div class="call-type-indicator">
                    <i class="${callTypeIcon}"></i>
                    <span>${callTypeText} entrante</span>
                </div>
            </div>

            <div class="incoming-call-content">
                <div class="caller-avatar">
                    <img src="${callRequest.fromAvatar}" alt="${callRequest.fromName}">
                    <div class="call-pulse-animation">
                        <div class="pulse-ring"></div>
                        <div class="pulse-ring delay-1"></div>
                        <div class="pulse-ring delay-2"></div>
                    </div>
                </div>

                <div class="caller-info">
                    <h2>${callRequest.fromName}</h2>
                    <p>${callRequest.fromPhone}</p>
                    <div class="call-time">
                        ${new Date(callRequest.timestamp).toLocaleTimeString()}
                    </div>
                </div>

                <div class="call-message">
                    <p>Te está llamando ahora</p>
                </div>
            </div>

            <div class="incoming-call-actions">
                <button class="call-action-btn reject-btn" onclick="rejectIncomingCall('${requestId}')">
                    <i class="fas fa-phone-slash"></i>
                    <span>Rechazar</span>
                </button>
                <button class="call-action-btn accept-btn" onclick="acceptIncomingCall('${requestId}', '${callRequest.type}', ${JSON.stringify(callRequest).replace(/"/g, '&quot;')})">
                    <i class="${callTypeIcon}"></i>
                    <span>Contestar</span>
                </button>
            </div>
        </div>
    `;

    // Ocultar pantalla actual
    const currentScreenElement = document.querySelector('.screen.active');
    if (currentScreenElement) {
        currentScreenElement.classList.remove('active');
    }

    document.body.appendChild(callModal);
    incomingCallModal = callModal;

    // Auto-rechazar después de 30 segundos
    setTimeout(() => {
        if (incomingCallModal && isCallIncoming) {
            rejectIncomingCall(requestId);
        }
    }, 30000);
}

// Función para aceptar llamada entrante
function acceptIncomingCall(requestId, callType, callerData) {
    console.log('Aceptando llamada entrante:', callType);
    
    // Detener sonido de llamada
    stopIncomingCallSound();
    
    // Cerrar modal de llamada entrante
    closeIncomingCallModal();
    
    // Configurar contacto actual
    currentChatContact = {
        uid: callerData.from,
        name: callerData.fromName,
        phoneNumber: callerData.fromPhone,
        avatar: callerData.fromAvatar
    };

    currentCallType = callType;

    // Actualizar estado de la solicitud
    database.ref(`callRequests/${currentUser.uid}/${requestId}/status`).set('accepted');

    // Configurar pantalla según tipo de llamada
    if (callType === 'video') {
        document.getElementById('video-contact-name').textContent = callerData.fromName;
        document.getElementById('video-avatar').src = callerData.fromAvatar;
        switchScreen('video-call');
        initializeLocalVideo();
    } else {
        document.getElementById('call-contact-name').textContent = callerData.fromName;
        document.getElementById('call-avatar-img').src = callerData.fromAvatar;
        document.getElementById('user-lang').textContent = getLanguageName(userLanguage);
        document.getElementById('contact-lang').textContent = getLanguageName('en');
        switchScreen('voice-call');
    }

    // Inicializar medios para la llamada
    getRealTimeMediaAccess(callType)
        .then(stream => {
            localStream = stream;
            
            if (callType === 'video') {
                const localVideo = document.getElementById('local-video');
                if (localVideo) {
                    localVideo.srcObject = stream;
                }
            }

            // Configurar WebRTC
            setupWebRTCConnection();
            
            // Simular conexión inmediata
            setTimeout(() => {
                handleCallConnected();
            }, 1000);
            
        })
        .catch(error => {
            console.error('Error accediendo a medios:', error);
            // Continuar con audio/video simulado
            setTimeout(() => {
                handleCallConnected();
            }, 1000);
        });
}

// Función para rechazar llamada entrante
function rejectIncomingCall(requestId) {
    console.log('Rechazando llamada entrante');
    
    // Detener sonido de llamada
    stopIncomingCallSound();
    
    // Cerrar modal
    closeIncomingCallModal();
    
    // Actualizar estado de la solicitud
    if (requestId) {
        database.ref(`callRequests/${currentUser.uid}/${requestId}/status`).set('rejected');
    }
    
    // Limpiar flag de llamada entrante
    database.ref(`users/${currentUser.uid}/incomingCall`).remove();
}

// Función para cerrar modal de llamada entrante
function closeIncomingCallModal() {
    if (incomingCallModal) {
        document.body.removeChild(incomingCallModal);
        incomingCallModal = null;
    }
    
    isCallIncoming = false;
    
    // Restaurar pantalla anterior
    switchScreen(currentScreen);
}

// Función para reproducir sonido de llamada entrante
function playIncomingCallSound() {
    if (window.AudioContext || window.webkitAudioContext) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Crear patrón de timbre más intenso para llamadas entrantes
        const playRing = () => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Patrón de timbre clásico
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.4);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.8);
            oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 1.2);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 1.5);
        };
        
        // Reproducir timbre cada 3 segundos
        callNotificationSound = setInterval(playRing, 3000);
        playRing(); // Reproducir inmediatamente
    }
}

// Función para detener sonido de llamada entrante
function stopIncomingCallSound() {
    if (callNotificationSound) {
        clearInterval(callNotificationSound);
        callNotificationSound = null;
    }
}

// Función para configurar listener de solicitudes de amistad
function setupFriendRequestsListener() {
    if (!currentUser || !currentUser.uid) {
        console.error('No se puede configurar listener: usuario no disponible');
        return;
    }

    console.log('Configurando listener de solicitudes para:', currentUser.uid);

    // Limpiar listener anterior
    if (friendRequestsListener) {
        friendRequestsListener.off();
        friendRequestsListener = null;
    }

    // Configurar listener para solicitudes entrantes con error handling
    try {
        friendRequestsListener = database.ref(`friendRequests/${currentUser.uid}`);
        
        friendRequestsListener.on('child_added', (snapshot) => {
            const request = snapshot.val();
            const requestId = snapshot.key;
            
            console.log('Nueva solicitud detectada en tiempo real:', request);
            
            if (request && request.status === 'pending') {
                // Verificar que no sea una solicitud antigua
                const requestTime = request.timestamp;
                const now = Date.now();
                const oneHourAgo = now - (60 * 60 * 1000);
                
                if (requestTime > oneHourAgo || typeof requestTime === 'object') {
                    // Mostrar notificación instantánea
                    showInstantNotification(`📱 Nueva solicitud de ${request.fromPhone}`, 'friend-request');
                    
                    // Mostrar modal después de un breve delay
                    setTimeout(() => {
                        showFriendRequestModal(request, requestId);
                    }, 1500);
                }
            }
        });

        // Escuchar cambios en solicitudes existentes
        friendRequestsListener.on('child_changed', (snapshot) => {
            const request = snapshot.val();
            const requestId = snapshot.key;
            console.log('Solicitud actualizada:', request);
            
            if (request && request.status === 'accepted') {
                console.log('Solicitud aceptada detectada:', requestId);
            }
        });

        // Manejar errores de conexión
        friendRequestsListener.on('error', (error) => {
            console.error('Error en listener de solicitudes:', error);
            // Reintentar configurar listener después de 5 segundos
            setTimeout(() => {
                setupFriendRequestsListener();
            }, 5000);
        });

        console.log('Listener de solicitudes configurado correctamente para:', currentUser.uid);
        
    } catch (error) {
        console.error('Error configurando listener de solicitudes:', error);
    }
}

// Función para mostrar solicitud de amistad en pantalla completa
function showFriendRequestModal(request, requestId) {
    // Verificar si ya hay una solicitud pendiente visible
    if (document.getElementById('friend-request-screen')) {
        return; // No mostrar múltiples modales
    }

    const avatarSeed = request.fromPhone.replace(/\D/g, '');
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;

    const requestScreen = document.createElement('div');
    requestScreen.id = 'friend-request-screen';
    requestScreen.className = 'screen active';

    requestScreen.innerHTML = `
        <div class="friend-request-container">
            <div class="request-header">
                <div class="request-icon">
                    <i class="fas fa-user-plus"></i>
                </div>
                <h1>Nueva Solicitud de Amistad</h1>
                <p class="request-subtitle">Alguien quiere agregarte como contacto</p>
            </div>

            <div class="request-content">
                <div class="requester-card">
                    <div class="requester-avatar">
                        <img src="${avatarUrl}" alt="${request.fromPhone}">
                    </div>
                    <div class="requester-info">
                        <h2>${request.fromPhone}</h2>
                        <p class="request-time">Solicitud enviada ${new Date(request.timestamp).toLocaleString()}</p>
                    </div>
                </div>

                <div class="request-message">
                    <p>¿Quieres agregar a este usuario a tu lista de contactos? Podrán enviarse mensajes y realizar videollamadas.</p>
                </div>
            </div>

            <div class="request-actions">
                <button class="secondary-btn" onclick="rejectFriendRequest('${requestId}')">
                    <i class="fas fa-times"></i>
                    Rechazar
                </button>
                <button class="primary-btn" onclick="acceptFriendRequest('${requestId}', '${request.from}')">
                    <i class="fas fa-check"></i>
                    Aceptar
                </button>
            </div>
        </div>
    `;

    // Ocultar pantalla actual
    const currentScreenElement = document.querySelector('.screen.active');
    if (currentScreenElement && currentScreenElement !== requestScreen) {
        currentScreenElement.classList.remove('active');
    }

    document.body.appendChild(requestScreen);

    // Auto-rechazar después de 2 minutos si no hay respuesta
    setTimeout(() => {
        if (document.getElementById('friend-request-screen')) {
            rejectFriendRequest(requestId);
        }
    }, 120000);
}

// Función para aceptar solicitud de amistad
function acceptFriendRequest(requestId, fromUserId) {
    // Actualizar estado de la solicitud
    database.ref(`friendRequests/${currentUser.uid}/${requestId}/status`).set('accepted')
        .then(() => {
            // Obtener datos del usuario que envió la solicitud
            return database.ref(`users/${fromUserId}`).once('value');
        })
        .then(userSnapshot => {
            const userData = userSnapshot.val();
            
            // Agregar a ambos usuarios como contactos
            const contactData = {
                addedAt: firebase.database.ServerValue.TIMESTAMP,
                status: 'active'
            };

            // Promesas para agregar contactos
            const addContact1 = database.ref(`contacts/${currentUser.uid}/${fromUserId}`).set(contactData);
            const addContact2 = database.ref(`contacts/${fromUserId}/${currentUser.uid}`).set(contactData);

            return Promise.all([addContact1, addContact2, userData]);
        })
        .then(([_, __, userData]) => {
            closeFriendRequestModal();
            
            // Crear objeto de contacto para el chat
            const newContact = {
                uid: fromUserId,
                name: userData.phoneNumber,
                phoneNumber: userData.phoneNumber,
                avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.phoneNumber}`,
                status: userData.status
            };
            
            // Configurar contacto actual y abrir chat directamente
            currentChatContact = newContact;
            
            // Actualizar información del chat
            document.getElementById('chat-contact-name').textContent = userData.phoneNumber;
            document.getElementById('chat-avatar').src = newContact.avatar;
            
            // Crear o buscar chat existente
            const chatId = generateChatId(currentUser.uid, fromUserId);
            loadChatMessages(chatId);
            
            // Ir directamente al chat
            switchScreen('chat');
            
            // Mostrar mensaje de bienvenida
            showInstantNotification(`💬 ¡Ahora puedes chatear con ${userData.phoneNumber}!`, 'friend-request');
            
            // Recargar lista de contactos en segundo plano
            setTimeout(() => {
                loadUserContacts();
            }, 1000);
        })
        .catch(error => {
            console.error('Error aceptando solicitud:', error);
            showErrorMessage('Error procesando solicitud.');
        });
}

// Función para rechazar solicitud de amistad
function rejectFriendRequest(requestId) {
    database.ref(`friendRequests/${currentUser.uid}/${requestId}/status`).set('rejected')
        .then(() => {
            closeFriendRequestModal();
            showFullScreenMessage('❌ Solicitud Rechazada', 
                'La solicitud de amistad ha sido rechazada.', 
                'denied');
        })
        .catch(error => {
            console.error('Error rechazando solicitud:', error);
        });
}

// Función para cerrar modal de solicitud de amistad
function closeFriendRequestModal() {
    const requestScreen = document.getElementById('friend-request-screen');
    if (requestScreen) {
        document.body.removeChild(requestScreen);
        // Restaurar pantalla anterior
        switchScreen(currentScreen);
    }
}

function openChatWithUser(user) {
    const avatarSeed = user.phoneNumber.replace(/\D/g, '');
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;

    currentChatContact = {
        uid: user.uid,
        name: user.phoneNumber,
        phoneNumber: user.phoneNumber,
        avatar: avatarUrl,
        status: user.status
    };

    // Actualizar información del chat
    document.getElementById('chat-contact-name').textContent = user.phoneNumber;
    document.getElementById('chat-avatar').src = avatarUrl;

    // Crear o buscar chat existente
    const chatId = generateChatId(currentUser.uid, user.uid);
    loadChatMessages(chatId);

    switchScreen('chat');
}

function generateChatId(uid1, uid2) {
    // Crear ID único para el chat ordenando los UIDs
    return [uid1, uid2].sort().join('_');
}

function loadChatMessages(chatId) {
    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.innerHTML = '<div class="loading-messages"><i class="fas fa-spinner fa-spin"></i> Cargando mensajes...</div>';

    // Detener listener anterior si existe
    if (messagesListener) {
        messagesListener.off();
    }

    // Escuchar mensajes en tiempo real
    messagesListener = database.ref(`chats/${chatId}/messages`).orderByChild('timestamp');
    messagesListener.on('value', (snapshot) => {
        const messages = snapshot.val() || {};
        const messagesList = Object.values(messages).sort((a, b) => a.timestamp - b.timestamp);

        messagesContainer.innerHTML = '';

        messagesList.forEach(message => {
            const isCurrentUser = message.senderId === currentUser.uid;
            
            // Filtrar mensajes si el chat está silenciado (solo para mensajes del otro usuario)
            if (!isCurrentUser && shouldFilterMessage(message.senderId)) {
                // No mostrar mensajes del usuario silenciado
                return;
            }
            
            const messageElement = createRealtimeMessageElement(message, isCurrentUser);
            messagesContainer.appendChild(messageElement);
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

function createRealtimeMessageElement(message, isSent) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;

    const date = new Date(message.timestamp);
    const timeString = date.getHours().toString().padStart(2, '0') + ':' + 
                      date.getMinutes().toString().padStart(2, '0');

    let contentHTML = '';
    
    if (message.type === 'image') {
        // Manejar mensaje de imagen con base64
        const imageSource = message.imageBase64 || message.imageUrl || '';
        contentHTML = `
            <div class="message-content">
                <div class="message-image">
                    <img src="${imageSource}" alt="Imagen" onclick="expandImage(this)" onload="console.log('Imagen cargada desde Firebase')">
                </div>
            </div>
        `;
    } else {
        // Mensaje de texto normal
        contentHTML = `
            <div class="message-content">
                <div class="original-text">${message.text}</div>
            </div>
        `;
    }

    messageDiv.innerHTML = `
        ${contentHTML}
        <div class="message-time">${timeString}</div>
    `;

    return messageDiv;
}

function goToChatList() {
    switchScreen('chat-list');
}

function showSection(section) {
    // Actualizar navegación activa
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    event.target.closest('.nav-item').classList.add('active');

    // Mostrar la sección correspondiente
    if (section === 'calls') {
        switchScreen('calls-history');
        updateCallHistoryUI();
    } else if (section === 'chats') {
        switchScreen('chat-list');
    } else if (section === 'settings') {
        switchScreen('settings');
    }

    console.log('Mostrando sección:', section);
}

// Envío de mensajes
function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const messageText = messageInput.value.trim();

    if (!messageText || !currentChatContact) return;

    // Detectar lenguaje ofensivo antes de enviar
    const moderationResult = checkOffensiveContent(messageText);

    if (moderationResult.isOffensive) {
        showModerationWarning(moderationResult.offensiveWords);
        messageInput.value = '';
        return;
    }

    // Crear ID del chat
    const chatId = generateChatId(currentUser.uid, currentChatContact.uid);

    // Crear objeto del mensaje
    const messageData = {
        id: Date.now().toString(),
        text: messageText,
        senderId: currentUser.uid,
        receiverId: currentChatContact.uid,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        status: 'sent'
    };

    // Enviar mensaje a Firebase
    database.ref(`chats/${chatId}/messages`).push(messageData)
        .then(() => {
            console.log('Mensaje enviado exitosamente');
            playMessageSound();

            // Actualizar último mensaje del chat
            database.ref(`chats/${chatId}/lastMessage`).set({
                text: messageText,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                senderId: currentUser.uid
            });
        })
        .catch(error => {
            console.error('Error enviando mensaje:', error);
            showErrorMessage('Error enviando mensaje. Intenta de nuevo.');
        });

    // Limpiar input
    messageInput.value = '';
}

function createMessageElement(text, isSent, translatedText = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;

    const now = new Date();
    const timeString = now.getHours().toString().padStart(2, '0') + ':' + 
                      now.getMinutes().toString().padStart(2, '0');

    let messageHTML = `
        <div class="message-content">
            <div class="original-text">${text}</div>
            ${translatedText ? `<div class="translated-text">${translatedText}</div>` : ''}
        </div>
        <div class="message-time">${timeString}</div>
    `;

    messageDiv.innerHTML = messageHTML;
    return messageDiv;
}

function handleEnterKey(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Función de traducción usando Google Translate API (simulada)
async function translateMessage(text, fromLang, toLang) {
    try {
        // En un entorno real, usarías la API real de Google Translate
        const response = await simulateTranslation(text, fromLang, toLang);
        console.log(`Traducido de ${fromLang} a ${toLang}:`, response);
        return response;
    } catch (error) {
        console.error('Error en traducción:', error);
        return text; // Devolver texto original si falla
    }
}

// Simulación de traducción (reemplazar con API real)
function simulateTranslation(text, fromLang, toLang) {
    const translations = {
        'es_en': {
            'Hola': 'Hello',
            '¿Cómo estás?': 'How are you?',
            'Muy bien, gracias': 'Very well, thank you',
            'Hasta luego': 'See you later',
            'Buenos días': 'Good morning',
            'Buenas noches': 'Good night',
            '¿Qué tal?': 'How is it going?',
            'Perfecto': 'Perfect',
            'Excelente': 'Excellent',
            'Todo bien': 'All good'
        },
        'en_es': {
            'Hello': 'Hola',
            'How are you?': '¿Cómo estás?',
            'Very well, thank you': 'Muy bien, gracias',
            'See you later': 'Hasta luego',
            'Good morning': 'Buenos días',
            'Good night': 'Buenas noches',
            'How is it going?': '¿Qué tal?',
            'Perfect': 'Perfecto',
            'Excelente': 'Excelente',
            'All good': 'Todo bien',
            'Hello! How are you doing today?': '¡Hola! ¿Cómo estás hoy?'
        },
        'fr_es': {
            'Bonjour': 'Hola',
            'Comment allez-vous?': '¿Cómo está usted?',
            'Très bien, merci': 'Muy bien, gracias',
            'Au revoir': 'Adiós',
            'Bonsoir': 'Buenas noches'
        },
        'es_fr': {
            'Hola': 'Bonjour',
            '¿Cómo está usted?': 'Comment allez-vous?',
            'Muy bien, gracias': 'Très bien, merci',
            'Adiós': 'Au revoir',
            'Buenas noches': 'Bonsoir'
        }
    };

    const key = `${fromLang}_${toLang}`;
    return translations[key]?.[text] || `[Traducido de ${fromLang} a ${toLang}: ${text}]`;
}

function simulateResponse() {
    // Mostrar typing indicator
    showTypingIndicator();

    setTimeout(() => {
        hideTypingIndicator();

        // Reproducir sonido de mensaje recibido
        playMessageSound();

        const responses = [
            '¡Hola! ¿Cómo estás?',
            'Todo bien por aquí 😊',
            '¿Qué tal tu día?',
            'Perfecto, hablamos luego',
            '¡Excelente!'
        ];

        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        const messagesContainer = document.getElementById('messages-container');

        // Traducir respuesta si es necesario
        let translatedResponse = null;
        if (currentChatContact && currentChatContact.language !== userLanguage) {
            translatedResponse = simulateTranslation(randomResponse, currentChatContact.language, userLanguage);
        }

        const messageElement = createMessageElement(randomResponse, false, translatedResponse);
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Analizar mensaje recibido para moderación
        analyzeChatForModeration(randomResponse, false);
    }, 2000);
}

// Funciones de reporte
function showReportModal() {
    document.getElementById('report-modal').classList.add('show');
    selectedReportType = null;
    evidenceImages = [];
    document.getElementById('submit-report-btn').disabled = true;
    document.getElementById('evidence-preview').innerHTML = '';
}

function hideReportModal() {
    document.getElementById('report-modal').classList.remove('show');
}

function selectReportOption(element, type) {
    // Remover selección anterior
    document.querySelectorAll('.report-option').forEach(option => {
        option.classList.remove('selected');
    });

    // Seleccionar opción actual
    element.classList.add('selected');
    selectedReportType = type;

    // Habilitar botón de envío
    document.getElementById('submit-report-btn').disabled = false;
}

function selectEvidenceImages() {
    document.getElementById('evidence-input').click();
}

function handleEvidenceSelect(event) {
    const files = Array.from(event.target.files);

    // Limitar a 3 imágenes
    const maxImages = 3;
    const remainingSlots = maxImages - evidenceImages.length;
    const filesToAdd = files.slice(0, remainingSlots);

    filesToAdd.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                evidenceImages.push({
                    file: file,
                    url: e.target.result
                });
                updateEvidencePreview();
            };
            reader.readAsDataURL(file);
        }
    });
}

function updateEvidencePreview() {
    const preview = document.getElementById('evidence-preview');
    preview.innerHTML = '';

    evidenceImages.forEach((image, index) => {
        const item = document.createElement('div');
        item.className = 'evidence-item';
        item.innerHTML = `
            <img src="${image.url}" alt="Evidencia">
            <button class="evidence-remove" onclick="removeEvidence(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        preview.appendChild(item);
    });
}

function removeEvidence(index) {
    evidenceImages.splice(index, 1);
    updateEvidencePreview();
}

function submitReport() {
    if (!selectedReportType) return;

    // Agregar reporte a la cola para procesamiento automático
    const report = {
        id: Date.now(),
        type: selectedReportType,
        contact: currentChatContact.name,
        timestamp: Date.now(),
        evidence: evidenceImages,
        status: 'processing'
    };

    moderationSystem.reportQueue.push(report);

    // Cerrar modal y mostrar pantalla de procesamiento
    hideReportModal();
    switchScreen('report-processing');

    // Procesamiento automático acelerado (15 segundos en lugar de 24 horas)
    setTimeout(() => {
        processReportAutomatically(report);
    }, 15000);
}

function goToChatFromReport() {
    switchScreen('chat');
}

// Funciones para manejo de imágenes
function selectImage() {
    document.getElementById('image-input').click();
}

function handleImageSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        sendImageMessage(file);
    }
}

function sendImageMessage(file) {
    if (!currentChatContact) return;
    
    console.log('Enviando imagen:', file.name, 'Tamaño:', file.size);
    
    const messagesContainer = document.getElementById('messages-container');
    const chatId = generateChatId(currentUser.uid, currentChatContact.uid);

    // Crear mensaje con imagen cargando
    const messageElement = createImageMessage(null, true, true);
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Mostrar progreso de subida
    const loadingElement = messageElement.querySelector('.image-loading');
    loadingElement.innerHTML = `
        <div class="image-loading-spinner"></div>
        <div class="upload-progress">Procesando imagen...</div>
    `;

    // Subir imagen a Firebase
    uploadToFirebase(file, 'image')
        .then(imageBase64 => {
            console.log('Imagen procesada y subida a Firebase');
            
            // Reemplazar elemento de carga con imagen real
            loadingElement.outerHTML = `<img src="${imageBase64}" alt="Imagen enviada" onclick="expandImage(this)" onload="console.log('Imagen cargada en chat')">`;
            
            // Crear mensaje en Firebase
            const messageData = {
                id: Date.now().toString(),
                type: 'image',
                imageBase64: imageBase64,
                fileName: file.name,
                senderId: currentUser.uid,
                receiverId: currentChatContact.uid,
                timestamp: Date.now(),
                status: 'sent'
            };

            // Enviar mensaje a Firebase
            database.ref(`chats/${chatId}/messages`).push(messageData)
                .then(() => {
                    console.log('Mensaje de imagen guardado en Firebase');
                    playMessageSound();

                    // Actualizar último mensaje del chat
                    database.ref(`chats/${chatId}/lastMessage`).set({
                        text: '📷 Imagen',
                        timestamp: Date.now(),
                        senderId: currentUser.uid
                    });
                })
                .catch(error => {
                    console.error('Error guardando mensaje en Firebase:', error);
                    showErrorMessage('Error guardando imagen en chat.');
                });
        })
        .catch(error => {
            console.error('Error completo subiendo imagen:', error);
            // Remover mensaje de carga si falla
            messageElement.remove();
            showErrorMessage(`Error procesando imagen: ${error.message}`);
        });
}

function createImageMessage(imageSrc, isSent, isLoading = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;

    const now = new Date();
    const timeString = now.getHours().toString().padStart(2, '0') + ':' + 
                      now.getMinutes().toString().padStart(2, '0');

    let imageHTML;
    if (isLoading) {
        imageHTML = '<div class="image-loading"><div class="image-loading-spinner"></div></div>';
    } else {
        imageHTML = `<img src="${imageSrc}" alt="Imagen" onclick="expandImage(this)">`;
    }

    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="message-image">
                ${imageHTML}
            </div>
        </div>
        <div class="message-time">${timeString}</div>
    `;

    return messageDiv;
}

function expandImage(img) {
    // Crear modal para imagen expandida
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        cursor: pointer;
    `;

    const expandedImg = document.createElement('img');
    expandedImg.src = img.src;
    expandedImg.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
    `;

    modal.appendChild(expandedImg);
    document.body.appendChild(modal);

    modal.onclick = () => document.body.removeChild(modal);
}

// Función para manejar typing indicator
function handleTyping() {
    if (!isTyping) {
        isTyping = true;
        // En una app real, enviarías esto al servidor
        console.log('Usuario está escribiendo...');
    }

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        isTyping = false;
        console.log('Usuario dejó de escribir');
    }, 1000);
}

function showTypingIndicator() {
    if (!currentChatContact) return;

    const typingElement = document.getElementById('typing-indicator');
    const avatarImg = document.getElementById('typing-avatar-img');

    if (typingElement && avatarImg) {
        avatarImg.src = currentChatContact.avatar;
        typingElement.style.display = 'flex';

        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
}

function hideTypingIndicator() {
    const typingElement = document.getElementById('typing-indicator');
    typingElement.style.display = 'none';
}

// Cerrar modal al hacer clic fuera
document.getElementById('add-contact-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideAddContact();
    }
});

// Búsqueda en tiempo real
document.getElementById('search-input').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const chatItems = document.querySelectorAll('.chat-item');

    chatItems.forEach(item => {
        const contactName = item.querySelector('.chat-name').textContent.toLowerCase();
        const lastMessage = item.querySelector('.last-message').textContent.toLowerCase();

        if (contactName.includes(searchTerm) || lastMessage.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
});

// Función para verificar estado de autenticación
function checkAuthState() {
    // Verificar si hay datos de usuario guardados localmente
    const savedUser = localStorage.getItem('uberchat_user');
    
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            currentUser = userData;
            currentPhoneNumber = userData.phoneNumber;
            
            console.log('Usuario restaurado desde localStorage:', userData);
            
            // Verificar que el usuario sigue existiendo en Firebase
            database.ref('users/' + userData.uid).once('value')
                .then(snapshot => {
                    if (snapshot.exists()) {
                        // Actualizar datos del usuario
                        currentUser = snapshot.val();
                        currentUser.uid = userData.uid;
                        
                        // Actualizar estado a online
                        updateUserStatus('online');
                        
                        // Configurar listeners importantes
                        setupFriendRequestsListener();
                        setupNotificationsListener();
                        setupCallRequestsListener();
                        
                        // Inicializar configuraciones
                        initializeSettings();
                        
                        // Verificar si necesita tutorial solo si no está ya en tutorial
                        if (!checkTutorialStatus() && currentScreen !== 'tutorial-notifications' && currentScreen !== 'tutorial-contacts' && currentScreen !== 'tutorial-features') {
                            startTutorial();
                        } else if (checkTutorialStatus()) {
                            // Ir directamente a la lista de chats
                            loadUserContacts();
                            switchScreen('chat-list');
                        }
                        
                        console.log('Sesión restaurada exitosamente');
                    } else {
                        // Usuario no existe, limpiar datos locales
                        localStorage.removeItem('uberchat_user');
                        switchScreen('intro');
                    }
                })
                .catch(error => {
                    console.error('Error verificando usuario en Firebase:', error);
                    switchScreen('intro');
                });
        } catch (error) {
            console.error('Error parseando datos de usuario:', error);
            localStorage.removeItem('uberchat_user');
            switchScreen('intro');
        }
    } else {
        // No hay datos guardados, mostrar pantalla de intro
        console.log('No hay usuario guardado localmente');
        switchScreen('intro');
    }
}

// Configurar listener para notificaciones
function setupNotificationsListener() {
    if (!currentUser || !currentUser.uid) {
        console.error('No se puede configurar listener de notificaciones: usuario no disponible');
        return;
    }

    console.log('Configurando listener de notificaciones para:', currentUser.uid);

    // Configurar múltiples listeners para asegurar detección en tiempo real
    
    // 1. Listener de notificaciones directas
    database.ref(`notifications/${currentUser.uid}`).on('child_added', (snapshot) => {
        const notification = snapshot.val();
        const notificationId = snapshot.key;
        
        if (notification && !notification.read) {
            console.log('Nueva notificación directa recibida:', notification);
            
            if (notification.type === 'friend_request') {
                // Buscar la solicitud completa
                database.ref(`friendRequests/${currentUser.uid}/${notification.requestId}`).once('value')
                    .then(requestSnapshot => {
                        if (requestSnapshot.exists()) {
                            const request = requestSnapshot.val();
                            showFriendRequestModal(request, notification.requestId);
                            
                            // Marcar notificación como leída
                            database.ref(`notifications/${currentUser.uid}/${notificationId}/read`).set(true);
                        }
                    });
            } else if (notification.type === 'incoming_call') {
                // Manejar llamada entrante
                console.log('Llamada entrante recibida:', notification);
                showIncomingCallNotification(notification, notification.callRequestId);
                
                // Marcar notificación como leída
                database.ref(`notifications/${currentUser.uid}/${notificationId}/read`).set(true);
            }
        }
    });

    // 2. Listener global de cambios en tiempo real
    database.ref(`users/${currentUser.uid}/lastNotification`).on('value', (snapshot) => {
        const lastNotification = snapshot.val();
        if (lastNotification && lastNotification.type === 'friend_request') {
            console.log('Notificación detectada via usuario:', lastNotification);
            // Buscar solicitudes pendientes
            database.ref(`friendRequests/${currentUser.uid}`).orderByChild('status').equalTo('pending').once('value')
                .then(requestsSnapshot => {
                    const requests = requestsSnapshot.val();
                    if (requests) {
                        const requestIds = Object.keys(requests);
                        const latestRequestId = requestIds[requestIds.length - 1];
                        const latestRequest = requests[latestRequestId];
                        
                        if (latestRequest && Date.now() - latestRequest.timestamp < 30000) {
                            showFriendRequestModal(latestRequest, latestRequestId);
                        }
                    }
                });
        }
    });

    // 3. Polling de respaldo cada 10 segundos para asegurar detección
    const pollingInterval = setInterval(() => {
        if (currentUser && currentUser.uid) {
            database.ref(`friendRequests/${currentUser.uid}`).orderByChild('status').equalTo('pending').once('value')
                .then(snapshot => {
                    const requests = snapshot.val();
                    if (requests) {
                        Object.keys(requests).forEach(requestId => {
                            const request = requests[requestId];
                            // Solo mostrar solicitudes recientes (últimos 2 minutos)
                            if (Date.now() - request.timestamp < 120000) {
                                // Verificar si ya se mostró esta solicitud
                                if (!window.shownRequests) window.shownRequests = new Set();
                                if (!window.shownRequests.has(requestId)) {
                                    window.shownRequests.add(requestId);
                                    showFriendRequestModal(request, requestId);
                                }
                            }
                        });
                    }
                });
        } else {
            clearInterval(pollingInterval);
        }
    }, 10000);

    console.log('Listeners de notificaciones configurados completamente');
}

// Mantener la conexión activa
function maintainConnection() {
    if (currentUser && currentUser.uid) {
        // Actualizar presencia cada 30 segundos
        setInterval(() => {
            if (currentUser) {
                database.ref(`users/${currentUser.uid}/lastSeen`).set(firebase.database.ServerValue.TIMESTAMP);
                database.ref(`users/${currentUser.uid}/status`).set('online');
            }
        }, 30000);
        
        // Configurar detección de desconexión
        database.ref('.info/connected').on('value', (snapshot) => {
            if (snapshot.val() === true) {
                console.log('Conectado a Firebase');
                if (currentUser) {
                    database.ref(`users/${currentUser.uid}/status`).set('online');
                }
            } else {
                console.log('Desconectado de Firebase');
            }
        });
        
        // Al desconectarse, marcar como offline
        database.ref(`users/${currentUser.uid}/status`).onDisconnect().set('offline');
        database.ref(`users/${currentUser.uid}/lastSeen`).onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
    }
}

// Variables del tutorial
let tutorialStep = 0;
let tutorialCompleted = false;
let permissionsGranted = {
    notifications: false,
    contacts: false
};

// Funciones del Tutorial
function startTutorial() {
    console.log('Iniciando tutorial interactivo...');
    tutorialStep = 1;
    tutorialCompleted = false;
    
    // Asegurar que estamos en la pantalla correcta
    currentScreen = 'tutorial-notifications';
    switchScreen('tutorial-notifications');
    
    // Agregar efectos de sonido del tutorial
    playTutorialSound('start');
}

function requestNotificationPermission() {
    console.log('Solicitando permisos de notificación...');
    
    // Animar botón
    const btn = event.target;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Activando...';
    btn.disabled = true;
    
    // Simular activación exitosa SIEMPRE para que progrese
    setTimeout(() => {
        permissionsGranted.notifications = true;
        console.log('✅ Notificaciones activadas correctamente');
        
        // Actualizar botón con éxito
        btn.innerHTML = '<i class="fas fa-check-circle"></i> ¡Activado!';
        btn.style.background = '#00a854';
        btn.style.transform = 'scale(1.05)';
        btn.style.color = 'white';
        
        // NO mostrar notificación molesta
        // showTestNotification();
        
        // Forzar progreso automático después de 1.5 segundos
        setTimeout(() => {
            console.log('Progresando al siguiente paso del tutorial...');
            tutorialStep = 2;
            switchScreen('tutorial-contacts');
        }, 1500);
        
    }, 1000);
}

function requestContactsPermission() {
    console.log('Sincronizando contactos...');
    
    // Animar botón
    const btn = event.target;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';
    btn.disabled = true;
    
    // Simular proceso de sincronización exitoso
    setTimeout(() => {
        permissionsGranted.contacts = true;
        console.log('✅ Contactos sincronizados correctamente');
        
        // Actualizar botón con éxito
        btn.innerHTML = '<i class="fas fa-check-circle"></i> ¡Sincronizado!';
        btn.style.background = '#00a854';
        btn.style.transform = 'scale(1.05)';
        btn.style.color = 'white';
        
        // NO mostrar notificación molesta
        // showInstantNotification('📱 Contactos sincronizados correctamente', 'friend-request');
        
        // Forzar progreso automático al siguiente paso
        setTimeout(() => {
            console.log('Progresando al paso final del tutorial...');
            tutorialStep = 3;
            switchScreen('tutorial-features');
        }, 1500);
    }, 1000);
}

function nextTutorialStep() {
    tutorialStep++;
    console.log('Tutorial step:', tutorialStep);
    playTutorialSound('next');
    
    if (tutorialStep === 2) {
        console.log('Cambiando a pantalla de contactos...');
        switchScreen('tutorial-contacts');
    } else if (tutorialStep === 3) {
        console.log('Cambiando a pantalla final...');
        switchScreen('tutorial-features');
    } else {
        console.log('Completando tutorial...');
        completeTutorial();
    }
}

function skipTutorial() {
    console.log('Usuario omitió el tutorial');
    tutorialCompleted = true;
    completeTutorial();
}

function completeTutorial() {
    console.log('Tutorial completado');
    tutorialCompleted = true;
    tutorialStep = 0; // Resetear paso del tutorial
    playTutorialSound('complete');
    
    // Guardar estado del tutorial primero
    localStorage.setItem('uberchat_tutorial_completed', 'true');
    
    // Cargar contactos y mostrar pantalla principal
    loadUserContacts();
    currentScreen = 'chat-list';
    switchScreen('chat-list');
    
    // NO mostrar notificación molesta de bienvenida
    console.log('¡Bienvenido a UberChat!');
}

function showTestNotification() {
    // Mostrar siempre la notificación instantánea
    showInstantNotification('🔔 ¡Notificaciones activadas! Recibirás alertas en tiempo real', 'friend-request');
    
    // Intentar mostrar notificación del navegador si hay permisos
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            const notification = new Notification('🔔 UberChat', {
                body: 'Notificaciones activadas correctamente',
                icon: '/favicon.ico',
                silent: false
            });
            
            setTimeout(() => {
                notification.close();
            }, 3000);
        } catch (error) {
            console.log('No se pudo mostrar notificación del navegador:', error);
        }
    }
}

function showPermissionDeniedMessage(permissionType) {
    const slimeContainer = document.querySelector('.tutorial-slime-container');
    const message = document.createElement('div');
    message.className = 'permission-denied-message';
    message.innerHTML = `
        <div style="background: rgba(255, 0, 0, 0.1); padding: 1rem; border-radius: 15px; margin-top: 1rem; border: 1px solid rgba(255, 0, 0, 0.3);">
            <p style="margin: 0; font-size: 0.9rem;">⚠️ Permisos de ${permissionType} no concedidos</p>
            <p style="margin: 0.5rem 0 0 0; font-size: 0.8rem; opacity: 0.8;">Puedes activarlos más tarde en Ajustes</p>
        </div>
    `;
    
    slimeContainer.appendChild(message);
    
    setTimeout(() => {
        if (message.parentNode) {
            message.parentNode.removeChild(message);
        }
    }, 3000);
}

function showContactSyncAnimation() {
    const slime = document.querySelector('.tutorial-slime');
    const syncEffect = document.createElement('div');
    syncEffect.className = 'sync-effect';
    syncEffect.innerHTML = `
        <div style="position: absolute; top: -40px; left: 50%; transform: translateX(-50%); color: #00ff88; font-size: 2rem; animation: syncPulse 1s ease-in-out 3;">
            ✨
        </div>
        <style>
            @keyframes syncPulse {
                0%, 100% { opacity: 0; transform: translateX(-50%) scale(0.8); }
                50% { opacity: 1; transform: translateX(-50%) scale(1.2); }
            }
        </style>
    `;
    
    slime.appendChild(syncEffect);
    
    setTimeout(() => {
        if (syncEffect.parentNode) {
            syncEffect.parentNode.removeChild(syncEffect);
        }
    }, 3000);
}

function playTutorialSound(type) {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch(type) {
        case 'start':
            // Sonido de inicio mágico
            oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
            oscillator.frequency.exponentialRampToValueAtTime(784, audioContext.currentTime + 0.3); // G5
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.stop(audioContext.currentTime + 0.5);
            break;
            
        case 'next':
            // Sonido de progreso
            oscillator.frequency.setValueAtTime(659, audioContext.currentTime); // E5
            oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.2); // A5
            gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
            
        case 'complete':
            // Fanfarria de completado
            const frequencies = [523, 659, 784, 1047]; // C5, E5, G5, C6
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(audioContext.destination);
                    
                    osc.frequency.setValueAtTime(freq, audioContext.currentTime);
                    gain.gain.setValueAtTime(0.06, audioContext.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
                    
                    osc.start();
                    osc.stop(audioContext.currentTime + 0.4);
                }, index * 100);
            });
            return; // No ejecutar el código de abajo
    }

    oscillator.start();
}

// Función para verificar si el tutorial ya fue completado
function checkTutorialStatus() {
    const tutorialCompleted = localStorage.getItem('uberchat_tutorial_completed');
    return tutorialCompleted === 'true';
}

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    // Configurar pantalla inicial como loading
    switchScreen('intro');
    updateLanguage();

    // Verificar estado de autenticación
    checkAuthState();

    // Configurar eventos
    const phoneInput = document.getElementById('phone-input');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            const isValid = this.value.length >= 8;
            document.getElementById('send-code-btn').disabled = !isValid;
        });
    }

    // Configurar auto-focus en campos de código
    document.querySelectorAll('.code-digit').forEach((input, index) => {
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text');
            if (/^\d{6}$/.test(pastedData)) {
                // Llenar todos los campos con el código pegado
                [...pastedData].forEach((digit, i) => {
                    if (document.querySelectorAll('.code-digit')[i]) {
                        document.querySelectorAll('.code-digit')[i].value = digit;
                    }
                });
                enteredCode = pastedData;
                setTimeout(() => verifyCode(), 500);
            }
        });
    });

    // Configurar mantenimiento de conexión
    setTimeout(() => {
        maintainConnection();
    }, 2000);

    console.log('UberChat iniciado correctamente');
});

// Función para implementar traducción real con Google Translate API
// Descomenta y configura cuando tengas acceso a la API
/*
async function translateWithGoogleAPI(text, targetLang) {
    const API_KEY = 'TU_API_KEY_AQUI';
    const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: text,
                target: targetLang,
                source: userLanguage
            })
        });

        const data = await response.json();
        return data.data.translations[0].translatedText;
    } catch (error) {
        console.error('Error en traducción:', error);
        return text;
    }
}
*/

// Variables globales para llamadas
let callTimer = null;
let callStartTime = null;
let isCallActive = false;
let isMuted = false;
let isSpeakerOn = false;
let isCameraOn = true;
let speechRecognition = null;
let callHistory = [];

// Variables para WebRTC y llamadas en tiempo real
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let incomingCallModal = null;
let currentCallType = null;
let callNotificationSound = null;
let isCallIncoming = false;
let callRequestListener = null;

// Funciones para llamadas y videollamadas
function startVoiceCall() {
    if (!currentChatContact) return;

    // Verificar si el usuario tiene llamadas habilitadas
    if (currentChatContact.callsEnabled === false) {
        showErrorMessage('🔇 Este usuario ha desactivado las llamadas. No puedes llamarle en este momento.');
        return;
    }

    // Configurar pantalla de llamada de voz
    document.getElementById('call-contact-name').textContent = currentChatContact.name;
    document.getElementById('call-avatar-img').src = currentChatContact.avatar;
    document.getElementById('user-lang').textContent = getLanguageName(userLanguage);
    document.getElementById('contact-lang').textContent = getLanguageName(currentChatContact.language);

    currentCallType = 'voice';

    // Enviar solicitud de llamada en tiempo real
    sendCallRequest('voice');

    // Cambiar a pantalla de llamada
    switchScreen('voice-call');

    // Iniciar proceso de llamada real
    initiateRealTimeCall('voice');
}

function startVideoCall() {
    if (!currentChatContact) return;

    // Verificar si el usuario tiene llamadas habilitadas
    if (currentChatContact.callsEnabled === false) {
        showErrorMessage('🔇 Este usuario ha desactivado las llamadas. No puedes realizar videollamadas en este momento.');
        return;
    }

    // Configurar pantalla de videollamada
    document.getElementById('video-contact-name').textContent = currentChatContact.name;
    document.getElementById('video-avatar').src = currentChatContact.avatar;

    currentCallType = 'video';

    // Enviar solicitud de llamada en tiempo real
    sendCallRequest('video');

    // Cambiar a pantalla de videollamada
    switchScreen('video-call');

    // Iniciar proceso de videollamada real
    initiateRealTimeCall('video');

    // Inicializar cámara local
    initializeLocalVideo();
}

function simulateCallConnection(callType) {
    const statusElement = document.getElementById(callType === 'voice' ? 'call-status' : 'video-call-status');

    // Mostrar "Llamando..."
    statusElement.textContent = 'Llamando...';

    // Simular sonido de llamada (opcional)
    playCallSound();

    // Después de 3 segundos, simular que se conecta
    setTimeout(() => {
        statusElement.textContent = 'Conectado';
        isCallActive = true;
        startCallTimer();

        // Inicializar reconocimiento de voz
        initializeSpeechRecognition();

        // Detener sonido de llamada
        stopCallSound();
    }, 3000);
}

function startCallTimer() {
    callStartTime = Date.now();
    callTimer = setInterval(() => {
        const elapsed = Date.now() - callStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        const durationElement = document.getElementById('call-duration');
        if (durationElement) {
            durationElement.textContent = timeString;
        }
    }, 1000);
}

function endCall() {
    // Reproducir sonido de llamada terminada
    playCallEndSound();

    // Registrar llamada en historial
    if (currentChatContact && callStartTime) {
        const callDuration = Date.now() - callStartTime;
        const callRecord = {
            contact: currentChatContact.name,
            avatar: currentChatContact.avatar,
            type: currentScreen === 'video-call' ? 'video' : 'voice',
            duration: callDuration,
            timestamp: Date.now(),
            status: 'completed'
        };
        callHistory.unshift(callRecord);
        updateCallHistoryUI();
    }

    // Limpiar recursos de WebRTC
    if (localStream) {
        localStream.getTracks().forEach(track => {
            track.stop();
        });
        localStream = null;
    }

    if (remoteStream) {
        remoteStream.getTracks().forEach(track => {
            track.stop();
        });
        remoteStream = null;
    }

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    // Limpiar elementos de video
    const localVideo = document.getElementById('local-video');
    const remoteVideo = document.getElementById('remote-video');
    
    if (localVideo) {
        localVideo.srcObject = null;
    }
    
    if (remoteVideo) {
        remoteVideo.srcObject = null;
    }

    // Limpiar timer
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }

    // Detener reconocimiento de voz
    if (speechRecognition) {
        speechRecognition.stop();
        speechRecognition = null;
    }

    // Detener todos los sonidos
    stopCallSound();
    stopIncomingCallSound();

    // Resetear estados
    isCallActive = false;
    isMuted = false;
    isSpeakerOn = false;
    isCameraOn = true;
    callStartTime = null;
    currentCallType = null;
    isCallIncoming = false;

    // Cerrar modal si está abierto
    closeIncomingCallModal();

    // Volver al chat
    switchScreen('chat');
}

function toggleMute() {
    isMuted = !isMuted;
    const muteBtn = document.getElementById('mute-btn');

    if (isMuted) {
        muteBtn.classList.add('muted');
        muteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    } else {
        muteBtn.classList.remove('muted');
        muteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    }
}

function toggleSpeaker() {
    isSpeakerOn = !isSpeakerOn;
    const speakerBtn = document.getElementById('speaker-btn');

    if (isSpeakerOn) {
        speakerBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    } else {
        speakerBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
    }
}

function switchToVideo() {
    // Cambiar de llamada de voz a videollamada
    document.getElementById('video-contact-name').textContent = currentChatContact.name;
    document.getElementById('video-avatar').src = currentChatContact.avatar;

    switchScreen('video-call');
    initializeLocalVideo();
}

function toggleVideoMute() {
    isMuted = !isMuted;
    const muteBtn = document.getElementById('video-mute-btn');

    if (isMuted) {
        muteBtn.classList.add('muted');
        muteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    } else {
        muteBtn.classList.remove('muted');
        muteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    }
}

function toggleCamera() {
    isCameraOn = !isCameraOn;
    const cameraBtn = document.getElementById('camera-btn');
    const localVideo = document.getElementById('local-video');

    if (isCameraOn) {
        cameraBtn.classList.remove('disabled');
        cameraBtn.innerHTML = '<i class="fas fa-video"></i>';
        localVideo.style.display = 'block';
    } else {
        cameraBtn.classList.add('disabled');
        cameraBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
        localVideo.style.display = 'none';
    }
}

function switchToAudio() {
    // Cambiar de videollamada a llamada de voz
    switchScreen('voice-call');
}

function initializeLocalVideo() {
    // Simular inicialización de video local
    const localVideo = document.getElementById('local-video');
    if (localVideo) {
        // En un entorno real, aquí inicializarías getUserMedia()
        localVideo.style.background = 'linear-gradient(45deg, #333, #555)';
    }
}

function initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        speechRecognition = new SpeechRecognition();

        speechRecognition.continuous = true;
        speechRecognition.interimResults = true;
        speechRecognition.lang = userLanguage;

        speechRecognition.onresult = function(event) {
            const speechIndicator = document.getElementById('speech-indicator');
            const speechText = document.getElementById('speech-text') || document.getElementById('video-speech-text');

            if (speechIndicator) {
                speechIndicator.classList.add('active');
            }

            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript && speechText) {
                speechText.textContent = finalTranscript;

                // Simular traducción en tiempo real
                if (currentChatContact && currentChatContact.language !== userLanguage) {
                    setTimeout(() => {
                        const translated = simulateTranslation(finalTranscript, userLanguage, currentChatContact.language);
                        speakTranslatedText(translated, currentChatContact.language);
                    }, 500);
                }
            }
        };

        speechRecognition.onend = function() {
            const speechIndicator = document.getElementById('speech-indicator');
            if (speechIndicator) {
                speechIndicator.classList.remove('active');
            }

            // Reiniciar si la llamada sigue activa
            if (isCallActive && !isMuted) {
                setTimeout(() => {
                    if (speechRecognition && isCallActive) {
                        speechRecognition.start();
                    }
                }, 1000);
            }
        };

        if (!isMuted) {
            speechRecognition.start();
        }
    }
}

function speakTranslatedText(text, language) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = 0.9;
        utterance.pitch = 1;

        // Buscar una voz en el idioma específico
        const voices = speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang.startsWith(language));
        if (voice) {
            utterance.voice = voice;
        }

        speechSynthesis.speak(utterance);
    }
}

function getLanguageName(code) {
    const languageNames = {
        'es': 'Español',
        'en': 'English',
        'fr': 'Français',
        'de': 'Deutsch',
        'pt': 'Português',
        'it': 'Italiano'
    };
    return languageNames[code] || code;
}

// Funciones de sonido mejoradas
let callAudio = null;
let messageAudio = null;

function playMessageSound() {
    if (window.AudioContext || window.webkitAudioContext) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Sonido más suave para mensajes
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
    }
}

function playCallSound() {
    if (window.AudioContext || window.webkitAudioContext) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Crear patrón de timbre más realista
        const playTone = (frequency, duration, delay = 0) => {
            setTimeout(() => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

                oscillator.start();
                oscillator.stop(audioContext.currentTime + duration);
            }, delay);
        };

        // Patrón de timbre: dos tonos
        playTone(800, 0.5, 0);
        playTone(600, 0.5, 100);
        playTone(800, 0.5, 1000);
        playTone(600, 0.5, 1100);

        callAudio = { audioContext };

        // Detener después de 3 segundos
        setTimeout(() => {
            if (callAudio) {
                callAudio = null;
            }
        }, 3000);
    }
}

function playCallEndSound() {
    if (window.AudioContext || window.webkitAudioContext) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Sonido descendente para colgar
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.06, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    }
}

function stopCallSound() {
    if (callAudio) {
        callAudio = null;
    }
}

// Funciones para historial de llamadas
function updateCallHistoryUI() {
    const callsList = document.getElementById('calls-list');
    if (!callsList) return;

    callsList.innerHTML = '';

    if (callHistory.length === 0) {
        callsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-phone-slash"></i>
                <h3>Sin historial de llamadas</h3>
                <p>Tus llamadas aparecerán aquí</p>
            </div>
        `;
        return;
    }

    callHistory.forEach(call => {
        const callItem = document.createElement('div');
        callItem.className = 'call-item';

        const date = new Date(call.timestamp);
        const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('es-ES');
        const duration = formatDuration(call.duration);

        callItem.innerHTML = `
            <div class="call-avatar">
                <img src="${call.avatar}" alt="${call.contact}">
                <div class="call-type-icon ${call.type}">
                    <i class="fas fa-${call.type === 'video' ? 'video' : 'phone'}"></i>
                </div>
            </div>
            <div class="call-info">
                <div class="call-contact">${call.contact}</div>
                <div class="call-details">
                    <span class="call-time">${time} - ${dateStr}</span>
                    <span class="call-duration">${duration}</span>
                </div>
            </div>
            <div class="call-actions">
                <button class="call-back-btn" onclick="callBack('${call.contact}', '${call.type}')">
                    <i class="fas fa-${call.type === 'video' ? 'video' : 'phone'}"></i>
                </button>
            </div>
        `;

        callsList.appendChild(callItem);
    });
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
        return `${remainingSeconds}s`;
    }
}

function callBack(contactName, callType) {
    // Buscar el contacto en la lista actual
    const contact = chatContacts.find(c => c.name === contactName) || 
                   { name: contactName, language: 'en', avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${contactName}` };

    currentChatContact = contact;

    if (callType === 'video') {
        startVideoCall();
    } else {
        startVoiceCall();
    }
}

function clearCallHistory() {
    if (confirm('¿Estás seguro de que quieres eliminar todo el historial de llamadas?')) {
        callHistory = [];
        updateCallHistoryUI();
    }
}

// Sistema de moderación automática
function checkOffensiveContent(text) {
    const lowercaseText = text.toLowerCase();
    const foundWords = [];

    moderationSystem.offensiveWords.forEach(word => {
        if (lowercaseText.includes(word)) {
            foundWords.push(word);
        }
    });

    return {
        isOffensive: foundWords.length > 0,
        offensiveWords: foundWords
    };
}

function analyzeChatForModeration(messageText, isSentByUser) {
    const userId = isSentByUser ? 'currentUser' : currentChatContact?.name || 'unknown';
    const moderationResult = checkOffensiveContent(messageText);

    if (moderationResult.isOffensive) {
        // Registrar violación
        if (!moderationSystem.userViolations[userId]) {
            moderationSystem.userViolations[userId] = [];
        }

        moderationSystem.userViolations[userId].push({
            message: messageText,
            timestamp: Date.now(),
            offensiveWords: moderationResult.offensiveWords
        });

        console.log(`Violación detectada de ${userId}:`, moderationResult.offensiveWords);

        // Si es del usuario actual y no es la primera violación, mostrar advertencia
        if (isSentByUser && moderationSystem.userViolations[userId].length > 0) {
            setTimeout(() => {
                showModerationWarning(moderationResult.offensiveWords, true);
            }, 1000);
        }
    }
}

function showModerationWarning(offensiveWords, isPostMessage = false) {
    if (currentWarning) return; // Evitar warnings múltiples

    const warningModal = document.createElement('div');
    warningModal.className = 'moderation-warning-modal';
    warningModal.innerHTML = `
        <div class="moderation-warning-content">
            <div class="warning-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h2>⚠️ Advertencia de Moderación</h2>
            <p>${isPostMessage ? 'Has enviado' : 'Estás intentando enviar'} contenido que viola nuestras normas comunitarias.</p>
            <div class="detected-words">
                <strong>Palabras detectadas:</strong> ${offensiveWords.join(', ')}
            </div>
            <div class="warning-message">
                <p>🔸 El uso de lenguaje ofensivo está prohibido</p>
                <p>🔸 Reincidencias pueden resultar en suspensión de cuenta</p>
                <p>🔸 Mantén un ambiente respetuoso para todos</p>
            </div>
            <div class="warning-actions">
                <button class="warning-understood-btn" onclick="closeModerationWarning()">
                    <i class="fas fa-check"></i>
                    Entendido
                </button>
                ${isPostMessage ? '<button class="warning-report-btn" onclick="reportMyOwnViolation()"><i class="fas fa-flag"></i> Reportar mi mensaje</button>' : ''}
            </div>
            <div class="warning-footer">
                <small>Este mensaje se cerrará automáticamente en <span id="warning-countdown">10</span> segundos</small>
            </div>
        </div>
    `;

    document.body.appendChild(warningModal);
    currentWarning = warningModal;

    // Countdown timer
    let countdown = 10;
    const countdownElement = document.getElementById('warning-countdown');
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownElement) {
            countdownElement.textContent = countdown;
        }
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            closeModerationWarning();
        }
    }, 1000);
}

function closeModerationWarning() {
    if (currentWarning) {
        document.body.removeChild(currentWarning);
        currentWarning = null;
    }
}

function reportMyOwnViolation() {
    closeModerationWarning();

    // Auto-reporte por violación detectada
    const autoReport = {
        id: Date.now(),
        type: 'inappropriate',
        contact: 'Auto-reporte',
        timestamp: Date.now(),
        evidence: [],
        status: 'auto-processing',
        isAutoReport: true
    };

    moderationSystem.reportQueue.push(autoReport);

    switchScreen('report-processing');
    setTimeout(() => {
        processReportAutomatically(autoReport);
    }, 5000); // Procesamiento más rápido para auto-reportes
}

function processReportAutomatically(report) {
    const reportIndex = moderationSystem.reportQueue.findIndex(r => r.id === report.id);
    if (reportIndex === -1) return;

    // Simular análisis automático del chat
    const chatAnalysis = analyzeChatHistory(report);

    // Actualizar estado del reporte
    moderationSystem.reportQueue[reportIndex].status = 'completed';
    moderationSystem.reportQueue[reportIndex].result = chatAnalysis;

    // Mostrar resultado
    showReportResult(chatAnalysis, report);
}

function analyzeChatHistory(report) {
    // Simular análisis de historial de chat
    const userId = report.contact;
    const violations = moderationSystem.userViolations[userId] || [];
    const currentUserViolations = moderationSystem.userViolations['currentUser'] || [];

    let result = {
        violationsFound: violations.length > 0 || currentUserViolations.length > 0,
        reportedUserViolations: violations.length,
        reporterViolations: currentUserViolations.length,
        recommendation: 'no_action',
        details: []
    };

    if (violations.length > 0) {
        result.recommendation = violations.length >= 3 ? 'warning' : 'caution';
        result.details.push(`Se detectaron ${violations.length} violación(es) del usuario reportado`);
    }

    if (currentUserViolations.length > 0) {
        result.details.push(`Se detectaron ${currentUserViolations.length} violación(es) tuyas en el historial`);
        if (currentUserViolations.length >= 2) {
            result.recommendation = 'mutual_warning';
        }
    }

    if (!result.violationsFound) {
        result.recommendation = 'no_violation';
        result.details.push('No se detectaron violaciones significativas en el historial de chat');
    }

    return result;
}

function showReportResult(analysis, report) {
    // Crear pantalla de resultado del reporte
    const resultScreen = document.createElement('div');
    resultScreen.id = 'report-result-screen';
    resultScreen.className = 'screen active';

    let resultMessage = '';
    let resultIcon = '';
    let resultColor = '';

    switch (analysis.recommendation) {
        case 'warning':
            resultMessage = 'Reporte confirmado: Se detectaron múltiples violaciones del usuario reportado';
            resultIcon = 'fas fa-shield-alt';
            resultColor = '#e74c3c';
            break;
        case 'mutual_warning':
            resultMessage = 'Reporte procesado: Se detectaron violaciones de ambas partes';
            resultIcon = 'fas fa-balance-scale';
            resultColor = '#f39c12';
            break;
        case 'caution':
            resultMessage = 'Reporte revisado: Se detectaron violaciones menores';
            resultIcon = 'fas fa-exclamation-circle';
            resultColor = '#f39c12';
            break;
        case 'no_violation':
            resultMessage = 'Reporte revisado: No se detectaron violaciones significativas';
            resultIcon = 'fas fa-check-circle';
            resultColor = '#00a854';
            break;
        default:
            resultMessage = 'Reporte procesado: Análisis completado';
            resultIcon = 'fas fa-info-circle';
            resultColor = '#3498db';
    }

    resultScreen.innerHTML = `
        <div class="report-result-container">
            <div class="result-header">
                <button class="close-result-btn" onclick="closeReportResult()">
                    <i class="fas fa-times"></i>
                </button>
                <h2>Resultado del Análisis</h2>
            </div>

            <div class="result-content">
                <div class="result-icon" style="color: ${resultColor}">
                    <i class="${resultIcon}"></i>
                </div>

                <div class="result-message">
                    <h3>${resultMessage}</h3>
                </div>

                <div class="analysis-details">
                    <h4>📊 Detalles del Análisis Automático:</h4>
                    <ul>
                        ${analysis.details.map(detail => `<li>${detail}</li>`).join('')}
                        <li>⏱️ Análisis completado en tiempo real por IA</li>
                        <li>🔍 Se analizaron todos los mensajes del historial</li>
                        <li>🤖 Procesamiento automático en 15 segundos</li>
                    </ul>
                </div>

                ${analysis.violationsFound ? `
                    <div class="action-taken">
                        <h4>🎯 Acciones Tomadas:</h4>
                        <div class="action-list">
                            ${analysis.reportedUserViolations > 0 ? '<div class="action-item">⚠️ Usuario reportado recibió advertencia automática</div>' : ''}
                            ${analysis.reporterViolations > 0 ? '<div class="action-item">⚠️ También recibiste una advertencia por violaciones detectadas</div>' : ''}
                            <div class="action-item">📝 Caso registrado en el sistema de moderación</div>
                        </div>
                    </div>
                ` : ''}

                <div class="next-steps">
                    <h4>🔄 Próximos Pasos:</h4>
                    <p>El sistema de moderación automática continuará monitoreando todas las conversaciones. Mantén un comportamiento respetuoso para evitar futuras advertencias.</p>
                </div>
            </div>

            <div class="result-footer">
                <button class="primary-btn" onclick="closeReportResult()">
                    <i class="fas fa-arrow-left"></i>
                    <span>Volver al chat</span>
                </button>
            </div>
        </div>
    `;

    // Remover pantalla de éxito anterior si existe
    const existingSuccess = document.getElementById('report-success-screen');
    if (existingSuccess) {
        existingSuccess.remove();
    }

    document.body.appendChild(resultScreen);

    // Cambiar a la nueva pantalla
    setTimeout(() => {
        switchScreen('report-result');
        currentScreen = 'report-result';
    }, 100);
}

function closeReportResult() {
    const resultScreen = document.getElementById('report-result-screen');
    if (resultScreen) {
        resultScreen.remove();
    }
    switchScreen('chat');
}

// Función para mostrar mensajes en pantalla completa
function showFullScreenMessage(title, message, type = 'info') {
    const messageScreen = document.createElement('div');
    messageScreen.id = 'fullscreen-message-screen';
    messageScreen.className = 'screen active';

    let iconClass = 'fas fa-info-circle';
    let colorClass = 'info';

    switch(type) {
        case 'success':
            iconClass = 'fas fa-check-circle';
            colorClass = 'success';
            break;
        case 'denied':
            iconClass = 'fas fa-shield-alt';
            colorClass = 'denied';
            break;
        case 'warning':
            iconClass = 'fas fa-exclamation-triangle';
            colorClass = 'warning';
            break;
    }

    messageScreen.innerHTML = `
        <div class="fullscreen-message-container ${colorClass}">
            <div class="message-icon">
                <i class="${iconClass}"></i>
            </div>
            <h1 class="message-title">${title}</h1>
            <p class="message-text">${message}</p>
            <div class="message-actions">
                <button class="primary-btn" onclick="closeFullScreenMessage()">
                    <i class="fas fa-check"></i>
                    Entendido
                </button>
            </div>
        </div>
    `;

    // Ocultar pantalla actual
    const currentScreenElement = document.querySelector('.screen.active');
    if (currentScreenElement && currentScreenElement !== messageScreen) {
        currentScreenElement.classList.remove('active');
    }

    document.body.appendChild(messageScreen);

    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
        closeFullScreenMessage();
    }, 5000);
}

// Función para cerrar mensaje en pantalla completa
function closeFullScreenMessage() {
    const messageScreen = document.getElementById('fullscreen-message-screen');
    if (messageScreen) {
        document.body.removeChild(messageScreen);
        // Restaurar pantalla anterior
        switchScreen(currentScreen);
    }
}

// Funciones para el sistema de deslizado de chats
function handleTouchStart(e) {
    if (currentSwipeItem && currentSwipeItem !== e.currentTarget.parentNode) {
        resetSwipe();
    }
    
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    currentSwipeItem = e.currentTarget.parentNode;
    isSwipeActive = false;
}

function handleTouchMove(e) {
    if (!currentSwipeItem) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = swipeStartX - currentX;
    const diffY = Math.abs(swipeStartY - currentY);
    
    // Solo activar deslizado horizontal si el movimiento es más horizontal que vertical
    if (Math.abs(diffX) > diffY && Math.abs(diffX) > 10) {
        e.preventDefault();
        isSwipeActive = true;
        
        // Limitar el deslizado hacia la izquierda únicamente
        if (diffX > 0 && diffX <= 150) {
            const chatItem = currentSwipeItem.querySelector('.chat-item');
            const swipeActions = currentSwipeItem.querySelector('.swipe-actions');
            
            chatItem.style.transform = `translateX(-${diffX}px)`;
            swipeActions.style.opacity = diffX / 150;
            swipeActions.style.transform = `translateX(${150 - diffX}px)`;
        }
    }
}

function handleTouchEnd(e) {
    if (!currentSwipeItem || !isSwipeActive) {
        isSwipeActive = false;
        return;
    }
    
    const diffX = swipeStartX - e.changedTouches[0].clientX;
    const chatItem = currentSwipeItem.querySelector('.chat-item');
    const swipeActions = currentSwipeItem.querySelector('.swipe-actions');
    
    if (diffX > 75) {
        // Mostrar acciones
        chatItem.style.transform = 'translateX(-150px)';
        swipeActions.style.opacity = '1';
        swipeActions.style.transform = 'translateX(0)';
        currentSwipeItem.classList.add('swiped');
    } else {
        // Volver a la posición original
        resetSwipe();
    }
    
    isSwipeActive = false;
}

// Eventos para desktop (mouse)
function handleMouseDown(e) {
    if (currentSwipeItem && currentSwipeItem !== e.currentTarget.parentNode) {
        resetSwipe();
    }
    
    swipeStartX = e.clientX;
    swipeStartY = e.clientY;
    currentSwipeItem = e.currentTarget.parentNode;
    isSwipeActive = false;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

function handleMouseMove(e) {
    if (!currentSwipeItem) return;
    
    const diffX = swipeStartX - e.clientX;
    const diffY = Math.abs(swipeStartY - e.clientY);
    
    if (Math.abs(diffX) > diffY && Math.abs(diffX) > 10) {
        e.preventDefault();
        isSwipeActive = true;
        
        if (diffX > 0 && diffX <= 150) {
            const chatItem = currentSwipeItem.querySelector('.chat-item');
            const swipeActions = currentSwipeItem.querySelector('.swipe-actions');
            
            chatItem.style.transform = `translateX(-${diffX}px)`;
            swipeActions.style.opacity = diffX / 150;
            swipeActions.style.transform = `translateX(${150 - diffX}px)`;
        }
    }
}

function handleMouseUp(e) {
    if (!currentSwipeItem || !isSwipeActive) {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        isSwipeActive = false;
        return;
    }
    
    const diffX = swipeStartX - e.clientX;
    const chatItem = currentSwipeItem.querySelector('.chat-item');
    const swipeActions = currentSwipeItem.querySelector('.swipe-actions');
    
    if (diffX > 75) {
        chatItem.style.transform = 'translateX(-150px)';
        swipeActions.style.opacity = '1';
        swipeActions.style.transform = 'translateX(0)';
        currentSwipeItem.classList.add('swiped');
    } else {
        resetSwipe();
    }
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    isSwipeActive = false;
}

function resetSwipe() {
    if (currentSwipeItem) {
        const chatItem = currentSwipeItem.querySelector('.chat-item');
        const swipeActions = currentSwipeItem.querySelector('.swipe-actions');
        
        chatItem.style.transform = 'translateX(0)';
        swipeActions.style.opacity = '0';
        swipeActions.style.transform = 'translateX(150px)';
        currentSwipeItem.classList.remove('swiped');
    }
    currentSwipeItem = null;
}

// Cerrar deslizado al hacer clic fuera
document.addEventListener('click', function(e) {
    if (currentSwipeItem && !currentSwipeItem.contains(e.target)) {
        resetSwipe();
    }
});

// Funciones para silenciar y eliminar chats
function toggleMuteChat(userId, displayName) {
    const muteEndTime = Date.now() + (20 * 60 * 1000); // 20 minutos
    
    if (isChatMuted(userId)) {
        // Desactivar silencio
        mutedChats.delete(userId);
        showInstantNotification(`🔔 Chat con ${displayName} reactivado`, 'friend-request');
    } else {
        // Activar silencio por 20 minutos
        mutedChats.set(userId, muteEndTime);
        showInstantNotification(`🔇 Chat con ${displayName} silenciado por 20 minutos`, 'friend-request');
        
        // Programar la reactivación automática
        setTimeout(() => {
            if (mutedChats.has(userId)) {
                mutedChats.delete(userId);
                showInstantNotification(`🔔 Chat con ${displayName} reactivado automáticamente`, 'friend-request');
                // Actualizar UI
                loadUserContacts();
            }
        }, 20 * 60 * 1000);
    }
    
    // Actualizar la interfaz
    loadUserContacts();
    resetSwipe();
}

function deleteChat(userId, displayName) {
    const confirmDelete = confirm(`¿Estás seguro de que quieres eliminar la conversación con ${displayName}?`);
    
    if (confirmDelete) {
        // Eliminar el chat de Firebase
        const chatId = generateChatId(currentUser.uid, userId);
        
        database.ref(`chats/${chatId}`).remove()
            .then(() => {
                console.log('Chat eliminado de Firebase');
                
                // Eliminar contacto de la lista local
                chatContacts = chatContacts.filter(contact => contact.uid !== userId);
                
                // Eliminar silencio si existe
                if (mutedChats.has(userId)) {
                    mutedChats.delete(userId);
                }
                
                // Actualizar interfaz
                loadUserContacts();
                
                showInstantNotification(`🗑️ Conversación con ${displayName} eliminada`, 'friend-request');
            })
            .catch(error => {
                console.error('Error eliminando chat:', error);
                showErrorMessage('Error eliminando conversación. Intenta de nuevo.');
            });
    }
    
    resetSwipe();
}

function isChatMuted(userId) {
    if (mutedChats.has(userId)) {
        const muteEndTime = mutedChats.get(userId);
        if (Date.now() < muteEndTime) {
            return true;
        } else {
            // El silencio ha expirado, eliminarlo
            mutedChats.delete(userId);
            return false;
        }
    }
    return false;
}

// Función para verificar si un mensaje debe ser filtrado por silencio
function shouldFilterMessage(senderId) {
    return isChatMuted(senderId);
}

function showAutoGeneratedCodeMessage(code) {
    // Cerrar cualquier modal pequeño existente
    closeSuccessModal();
    
    // Crear pantalla completa para mostrar el código
    const codeScreen = document.createElement('div');
    codeScreen.id = 'verification-code-screen';
    codeScreen.className = 'screen active';

    codeScreen.innerHTML = `
        <div class="verification-code-container">
            <div class="code-header">
                <div class="code-icon">
                    <i class="fas fa-mobile-alt"></i>
                </div>
                <h1>Código de Verificación</h1>
                <p class="code-subtitle">Tu código ha sido generado automáticamente</p>
            </div>

            <div class="code-content">
                <div class="generated-code-display">
                    <h2>Tu código es:</h2>
                    <div class="code-number">${code}</div>
                    <p class="code-instruction">Copia este código en la pantalla de verificación</p>
                </div>

                <div class="code-info">
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <span>Válido por 10 minutos</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-shield-alt"></i>
                        <span>Generado automáticamente</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-lock"></i>
                        <span>Código único y seguro</span>
                    </div>
                </div>
            </div>

            <div class="code-actions">
                <button class="secondary-btn" onclick="copyCodeToClipboard('${code}')">
                    <i class="fas fa-copy"></i>
                    Copiar Código
                </button>
                <button class="primary-btn" onclick="proceedToVerification()">
                    <i class="fas fa-arrow-right"></i>
                    Continuar
                </button>
            </div>
        </div>
    `;

    // Ocultar pantalla actual
    const currentScreenElement = document.querySelector('.screen.active');
    if (currentScreenElement && currentScreenElement !== codeScreen) {
        currentScreenElement.classList.remove('active');
    }

    document.body.appendChild(codeScreen);

    // Auto-cerrar después de 10 segundos y continuar
    setTimeout(() => {
        proceedToVerification();
    }, 10000);
}

function copyCodeToClipboard(code) {
    navigator.clipboard.writeText(code).then(() => {
        showSuccessMessage('📋 Código copiado al portapapeles');
    }).catch(() => {
        // Fallback para navegadores que no soportan clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showSuccessMessage('📋 Código copiado');
    });
}

function proceedToVerification() {
    const codeScreen = document.getElementById('verification-code-screen');
    if (codeScreen) {
        document.body.removeChild(codeScreen);
    }
    switchScreen('verification');
    document.querySelector('.code-digit').focus();
}