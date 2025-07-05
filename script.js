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

// Pantalla de Registro
const phoneInput = document.getElementById('phone-input');
const sendCodeBtn = document.getElementById('send-code-btn');

phoneInput.addEventListener('input', function() {
    const phone = this.value.trim();
    const isValid = phone.length >= 8 && /^\d+$/.test(phone);
    sendCodeBtn.disabled = !isValid;
});

function sendVerificationCode() {
    const countryCode = document.getElementById('country-select').value;
    const phoneNumber = document.getElementById('phone-input').value;
    
    // Limpiar el número de teléfono (remover espacios y caracteres no numéricos)
    const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
    const fullNumber = `${countryCode}${cleanPhoneNumber}`;
    
    console.log('Procesando número:', fullNumber);
    
    currentPhoneNumber = fullNumber;
    document.getElementById('phone-display').textContent = fullNumber;

    // Mostrar loading en el botón
    const sendBtn = document.getElementById('send-code-btn');
    const originalText = sendBtn.innerHTML;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    sendBtn.disabled = true;

    // Configurar reCAPTCHA para Firebase Auth
    if (!recaptchaVerifier) {
        recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            'size': 'invisible',
            'callback': function(response) {
                console.log('reCAPTCHA resuelto');
            },
            'expired-callback': function() {
                console.log('reCAPTCHA expirado');
            }
        });
    }

    // Enviar SMS real con Firebase
    firebase.auth().signInWithPhoneNumber(fullNumber, recaptchaVerifier)
        .then(function(result) {
            confirmationResult = result;
            console.log('SMS enviado exitosamente');
            
            sendBtn.innerHTML = originalText;
            sendBtn.disabled = false;
            
            showSuccessMessage(`Código enviado a ${fullNumber}`);
            
            setTimeout(() => {
                switchScreen('verification');
                document.querySelector('.code-digit').focus();
            }, 2000);
        })
        .catch(function(error) {
            console.error('Error enviando SMS:', error);
            sendBtn.innerHTML = originalText;
            sendBtn.disabled = false;
            
            if (error.code === 'auth/too-many-requests') {
                showErrorMessage('Demasiados intentos. Intenta más tarde.');
            } else if (error.code === 'auth/invalid-phone-number') {
                showErrorMessage('Número de teléfono inválido.');
            } else {
                showErrorMessage('Error enviando código. Intenta de nuevo.');
            }
            
            // Limpiar reCAPTCHA en caso de error
            if (recaptchaVerifier) {
                recaptchaVerifier.clear();
                recaptchaVerifier = null;
            }
        });
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
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };

            // Guardar usuario en Firebase Realtime Database
            database.ref('users/' + user.uid).set(currentUser)
                .then(() => {
                    console.log('Usuario guardado en Firebase Database:', currentUser);
                    
                    // Configurar persistencia de autenticación
                    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                        .then(() => {
                            console.log('Persistencia configurada');
                            setTimeout(() => {
                                loadUserContacts();
                                switchScreen('chat-list');
                            }, 1500);
                        });
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

    // Resetear reCAPTCHA
    if (recaptchaVerifier) {
        recaptchaVerifier.clear();
        recaptchaVerifier = null;
    }

    // Crear nuevo reCAPTCHA verifier
    recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        'size': 'invisible',
        'callback': function(response) {
            console.log('reCAPTCHA resuelto para reenvío');
        }
    });

    // Reenviar código usando Firebase Auth
    firebase.auth().signInWithPhoneNumber(currentPhoneNumber, recaptchaVerifier)
        .then(function(result) {
            confirmationResult = result;
            statusElement.className = 'verification-status';
            statusElement.innerHTML = '<i class="fas fa-paper-plane"></i> Código reenviado';
            
            setTimeout(() => {
                statusElement.innerHTML = '';
            }, 3000);
        })
        .catch(function(error) {
            console.error('Error reenviando código:', error);
            statusElement.className = 'verification-status error';
            
            if (error.code === 'auth/too-many-requests') {
                statusElement.innerHTML = '<i class="fas fa-times-circle"></i> Demasiados intentos. Espera un momento.';
            } else {
                statusElement.innerHTML = '<i class="fas fa-times-circle"></i> Error reenviando código';
            }
            
            setTimeout(() => {
                statusElement.innerHTML = '';
            }, 3000);
            
            // Limpiar reCAPTCHA en caso de error
            if (recaptchaVerifier) {
                recaptchaVerifier.clear();
                recaptchaVerifier = null;
            }
        });
}

function generateUserId(phoneNumber) {
    // Generar ID único basado en el número de teléfono
    return 'user_' + phoneNumber.replace(/\D/g, '');
}

function loadUserContacts() {
    // Limpiar lista de contactos existente
    chatContacts = [];
    const chatList = document.querySelector('.chat-list');
    chatList.innerHTML = '<div class="loading-contacts"><i class="fas fa-spinner fa-spin"></i> Cargando contactos...</div>';

    // Escuchar usuarios activos en Firebase
    contactsListener = database.ref('users').on('value', (snapshot) => {
        const users = snapshot.val() || {};
        const usersList = Object.values(users).filter(user => user.uid !== currentUser.uid);
        
        chatList.innerHTML = '';
        
        if (usersList.length === 0) {
            chatList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No hay contactos aún</h3>
                    <p>Agrega contactos para comenzar a chatear</p>
                </div>
            `;
            return;
        }

        usersList.forEach(user => {
            createContactItem(user);
        });
    });
}

function createContactItem(user) {
    const chatList = document.querySelector('.chat-list');
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.onclick = () => openChatWithUser(user);
    
    // Generar avatar basado en el número de teléfono
    const avatarSeed = user.phoneNumber.replace(/\D/g, '');
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;
    
    // Formatear número de teléfono para mostrar
    const displayNumber = user.phoneNumber;
    
    chatItem.innerHTML = `
        <div class="avatar">
            <img src="${avatarUrl}" alt="${displayNumber}">
            <div class="status-indicator ${user.status === 'online' ? 'online' : 'offline'}"></div>
        </div>
        <div class="chat-info">
            <div class="chat-name">${displayNumber}</div>
            <div class="last-message">Toca para iniciar conversación</div>
        </div>
        <div class="chat-meta">
            <div class="time">Activo</div>
            <div class="language-indicator"></div>
        </div>
    `;
    
    chatList.appendChild(chatItem);
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
function logout() {
    if (currentUser) {
        updateUserStatus('offline');
    }
    
    firebase.auth().signOut()
        .then(() => {
            console.log('Sesión cerrada');
            currentUser = null;
            currentPhoneNumber = null;
            confirmationResult = null;
            
            // Limpiar listeners
            cleanupChatListeners();
            if (contactsListener) {
                contactsListener.off();
                contactsListener = null;
            }
            
            // Volver a la pantalla de intro
            switchScreen('intro');
        })
        .catch(error => {
            console.error('Error cerrando sesión:', error);
        });
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

    // Buscar usuario en Firebase por número de teléfono
    database.ref('users').orderByChild('phoneNumber').equalTo(fullNumber).once('value')
        .then(snapshot => {
            const users = snapshot.val();
            
            if (users) {
                const userId = Object.keys(users)[0];
                const user = users[userId];
                
                if (user.uid === currentUser.uid) {
                    showErrorMessage('No puedes agregarte a ti mismo');
                    return;
                }
                
                showSuccessMessage(`¡Contacto encontrado! ${user.phoneNumber}`);
                hideAddContact();
                
                // Limpiar campos
                document.getElementById('contact-phone').value = '';
                
                // Actualizar lista de contactos
                loadUserContacts();
            } else {
                showErrorMessage('Usuario no encontrado en la plataforma. Invítalo a unirse.');
            }
        })
        .catch(error => {
            console.error('Error buscando contacto:', error);
            showErrorMessage('Error buscando contacto. Intenta de nuevo.');
        });
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

    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="original-text">${message.text}</div>
        </div>
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
            'Excellent': 'Excelente',
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
    const reader = new FileReader();
    reader.onload = function(e) {
        const messagesContainer = document.getElementById('messages-container');
        
        // Crear mensaje con imagen cargando
        const messageElement = createImageMessage(null, true, true);
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Simular carga de imagen
        setTimeout(() => {
            // Reemplazar con imagen real
            const imageElement = messageElement.querySelector('.image-loading');
            imageElement.outerHTML = `<img src="${e.target.result}" alt="Imagen enviada" onclick="expandImage(this)">`;
        }, 2000);
        
        // Simular respuesta
        setTimeout(() => {
            simulateResponse();
        }, 4000);
    };
    reader.readAsDataURL(file);
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
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // Usuario ya autenticado
            console.log('Usuario ya autenticado:', user);
            currentPhoneNumber = user.phoneNumber;
            
            // Obtener datos del usuario desde Realtime Database
            database.ref('users/' + user.uid).once('value')
                .then(snapshot => {
                    if (snapshot.exists()) {
                        currentUser = snapshot.val();
                        currentUser.uid = user.uid; // Asegurar que el UID esté presente
                        
                        // Actualizar estado a online
                        updateUserStatus('online');
                        
                        // Ir directamente a la lista de chats
                        loadUserContacts();
                        switchScreen('chat-list');
                    } else {
                        // Crear perfil si no existe
                        currentUser = {
                            uid: user.uid,
                            phoneNumber: user.phoneNumber,
                            lastSeen: firebase.database.ServerValue.TIMESTAMP,
                            status: 'online',
                            createdAt: firebase.database.ServerValue.TIMESTAMP
                        };
                        
                        database.ref('users/' + user.uid).set(currentUser)
                            .then(() => {
                                loadUserContacts();
                                switchScreen('chat-list');
                            });
                    }
                })
                .catch(error => {
                    console.error('Error obteniendo datos del usuario:', error);
                    // En caso de error, mostrar pantalla de intro
                    switchScreen('intro');
                });
        } else {
            // Usuario no autenticado, mostrar pantalla de intro
            console.log('Usuario no autenticado');
            switchScreen('intro');
        }
    });
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

// Funciones para llamadas y videollamadas
function startVoiceCall() {
    if (!currentChatContact) return;
    
    // Configurar pantalla de llamada de voz
    document.getElementById('call-contact-name').textContent = currentChatContact.name;
    document.getElementById('call-avatar-img').src = currentChatContact.avatar;
    document.getElementById('user-lang').textContent = getLanguageName(userLanguage);
    document.getElementById('contact-lang').textContent = getLanguageName(currentChatContact.language);
    
    // Cambiar a pantalla de llamada
    switchScreen('voice-call');
    
    // Simular proceso de llamada
    simulateCallConnection('voice');
}

function startVideoCall() {
    if (!currentChatContact) return;
    
    // Configurar pantalla de videollamada
    document.getElementById('video-contact-name').textContent = currentChatContact.name;
    document.getElementById('video-avatar').src = currentChatContact.avatar;
    
    // Cambiar a pantalla de videollamada
    switchScreen('video-call');
    
    // Simular proceso de videollamada
    simulateCallConnection('video');
    
    // Inicializar cámara local (simulada)
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
    
    // Detener sonidos
    stopCallSound();
    
    // Resetear estados
    isCallActive = false;
    isMuted = false;
    isSpeakerOn = false;
    isCameraOn = true;
    callStartTime = null;
    
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
