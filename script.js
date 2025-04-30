// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBnCJiaKojTKxTF13RXiPnRCbtP-QT248g",
    authDomain: "fir-m-s-98845.firebaseapp.com",
    projectId: "fir-m-s-98845",
    storageBucket: "fir-m-s-98845.firebasestorage.app",
    messagingSenderId: "817276909875",
    appId: "1:817276909875:web:e90f33610af20c5c06e646"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const authContainer = document.getElementById('authContainer');
const setupContainer = document.getElementById('setupContainer');
const appContainer = document.getElementById('appContainer');
const authForm = document.getElementById('authForm');
const authButton = document.getElementById('authButton');
const authSwitchBtn = document.getElementById('authSwitchBtn');
const authSwitchText = document.getElementById('authSwitchText');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authError = document.getElementById('authError');

const setupForm = document.getElementById('setupForm');
const uniqueIdInput = document.getElementById('uniqueId');
const setupError = document.getElementById('setupError');

const friendsList = document.getElementById('friendsList');
const emptyFriendsList = document.getElementById('emptyFriendsList');
const searchFriends = document.getElementById('searchFriends');
const addFriendBtn = document.getElementById('addFriendBtn');
const addFriendBtnEmpty = document.getElementById('addFriendBtnEmpty');
const logoutBtn = document.getElementById('logoutBtn');
const menuBtn = document.getElementById('menuBtn');
const backBtn = document.getElementById('backBtn');
const sidebar = document.getElementById('sidebar');

const defaultChat = document.getElementById('defaultChat');
const chatArea = document.getElementById('chatArea');
const chatHeader = document.getElementById('chatHeader');
const chatFriendAvatar = document.getElementById('chatFriendAvatar');
const chatFriendName = document.getElementById('chatFriendName');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

const addFriendModal = document.getElementById('addFriendModal');
const addFriendForm = document.getElementById('addFriendForm');
const friendIdInput = document.getElementById('friendId');
const addFriendError = document.getElementById('addFriendError');
const cancelAddFriend = document.getElementById('cancelAddFriend');
const logoutModal = document.getElementById('logoutModal');
const cancelLogout = document.getElementById('cancelLogout');
const confirmLogout = document.getElementById('confirmLogout');

const messageContextMenu = document.getElementById('messageContextMenu');
const deleteMessageBtn = document.getElementById('deleteMessageBtn');

const toast = document.getElementById('toast');
const spinner = document.getElementById('spinner');

// Global variables
let isSignIn = true;
let currentUser = null;
let currentChat = null;
let selectedMessageId = null;
let messagesListener = null;

// Setup User Presence
function setupPresence(user) {
    const userRef = db.collection('users').doc(user.uid);

    // Initialize presence fields
    userRef.get().then(doc => {
        if (doc.exists && (!doc.data().isOnline || !doc.data().lastOnline)) {
            userRef.update({
                isOnline: true,
                lastOnline: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(error => {
                console.error('Error initializing presence:', error);
            });
        }
    }).catch(error => {
        console.error('Error checking presence fields:', error);
    });

    // Set online status
    userRef.update({
        isOnline: true,
        lastOnline: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(error => {
        console.error('Error setting online status:', error);
    });

    // Update periodically
    const interval = setInterval(() => {
        userRef.update({
            isOnline: true,
            lastOnline: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(error => {
            console.error('Error updating lastOnline:', error);
        });
    }, 30000);

    // Set offline on unload
    window.addEventListener('beforeunload', () => {
        userRef.update({
            isOnline: false,
            lastOnline: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(error => {
            console.error('Error setting offline status:', error);
        });
    });

    // Clean up interval on sign-out
    auth.onAuthStateChanged((currentUser) => {
        if (!currentUser) {
            clearInterval(interval);
        }
    });
}

// Authentication state listener
auth.onAuthStateChanged(async (user) => {
    showSpinner(true);
    console.log('Auth state changed:', user ? `User signed in: ${user.uid}` : 'No user signed in');

    if (user) {
        currentUser = user;
        setupPresence(user);
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().uniqueId) {
                authContainer.style.display = 'none';
                setupContainer.style.display = 'none';
                appContainer.style.display = 'flex';
                loadFriends();
            } else {
                authContainer.style.display = 'none';
                setupContainer.style.display = 'flex';
                appContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking user profile:', error);
            showToast('An error occurred while loading your profile. Please try again.', 'error');
        }
    } else {
        authContainer.style.display = 'flex';
        setupContainer.style.display = 'none';
        appContainer.style.display = 'none';
        if (messagesListener) messagesListener();
        currentChat = null;
        chatMessages.innerHTML = '';
    }

    showSpinner(false);
});

// Toggle between Sign In and Sign Up
authSwitchBtn.addEventListener('click', () => {
    isSignIn = !isSignIn;
    authButton.textContent = isSignIn ? 'Sign In' : 'Sign Up';
    authSwitchText.textContent = isSignIn ? "Don't have an account?" : 'Already have an account?';
    authSwitchBtn.textContent = isSignIn ? 'Sign Up' : 'Sign In';
    authError.style.display = 'none';
    authForm.reset();
});

// Handle Authentication
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showSpinner(true);

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    try {
        if (isSignIn) {
            await auth.signInWithEmailAndPassword(email, password);
            showToast('Signed in successfully!', 'success');
        } else {
            await auth.createUserWithEmailAndPassword(email, password);
            showToast('Account created successfully!', 'success');
        }
    } catch (error) {
        console.error('Authentication error:', error);
        authError.textContent = error.message;
        authError.style.display = 'block';
    }

    showSpinner(false);
});

// Handle Unique ID Setup
setupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showSpinner(true);

    const uniqueId = uniqueIdInput.value.trim().toLowerCase();

    if (!/^[a-z0-9_-]{3,16}$/.test(uniqueId)) {
        setupError.textContent = 'Unique ID must be 3-16 characters (letters, numbers, underscores, or hyphens).';
        setupError.style.display = 'block';
        showSpinner(false);
        return;
    }

    try {
        const idQuery = await db.collection('uniqueIds').doc(uniqueId).get();
        if (idQuery.exists) {
            setupError.textContent = 'This unique ID is already taken.';
            setupError.style.display = 'block';
            showSpinner(false);
            return;
        }

        await db.collection('users').doc(currentUser.uid).set({
            uniqueId: uniqueId,
            email: currentUser.email,
            friends: [],
            isOnline: true,
            lastOnline: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await db.collection('uniqueIds').doc(uniqueId).set({
            uid: currentUser.uid
        });

        showToast('Unique ID created successfully!', 'success');
        setupContainer.style.display = 'none';
        appContainer.style.display = 'flex';
        loadFriends();
    } catch (error) {
        console.error('Error setting up unique ID:', error);
        setupError.textContent = error.message || 'Failed to set up unique ID.';
        setupError.style.display = 'block';
    }

    showSpinner(false);
});

// Load Friends List
async function loadFriends() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (!userDoc.exists) {
            console.error('User profile not found for UID:', currentUser.uid);
            showToast('User profile not found.', 'error');
            return;
        }

        const friends = userDoc.data().friends || [];
        console.log('Loaded friends:', friends);

        friendsList.innerHTML = '';
        if (friends.length === 0) {
            emptyFriendsList.style.display = 'flex';
            friendsList.style.display = 'none';
        } else {
            emptyFriendsList.style.display = 'none';
            friendsList.style.display = 'block';

            for (const friendId of friends) {
                try {
                    const friendDoc = await db.collection('users').doc(friendId).get();
                    if (friendDoc.exists) {
                        const friendData = friendDoc.data();
                        if (!friendData.uniqueId) {
                            console.warn(`No uniqueId found for friend UID: ${friendId}`);
                            continue;
                        }
                        const isOnline = friendData.isOnline || false;
                        let statusText;
                        if (isOnline) {
                            statusText = 'Online';
                        } else {
                            try {
                                const lastOnline = friendData.lastOnline
                                    ? friendData.lastOnline.toDate().toLocaleString()
                                    : 'Never online';
                                statusText = `Last online: ${lastOnline}`;
                            } catch (error) {
                                console.error(`Error formatting lastOnline for friend ${friendId}:`, error);
                                statusText = 'Last online: Unknown';
                            }
                        }
                        const li = document.createElement('li');
                        li.className = 'friend-item';
                        li.dataset.uid = friendId;
                        li.innerHTML = `
                            <div class="friend-avatar">${friendData.uniqueId[0].toUpperCase()}</div>
                            <div class="friend-info">
                                <div class="friend-name">${friendData.uniqueId}</div>
                                <div class="friend-status">${statusText}</div>
                            </div>
                        `;
                        li.addEventListener('click', () => openChat(friendId, friendData.uniqueId));
                        friendsList.appendChild(li);
                    } else {
                        console.warn(`Friend document not found for UID: ${friendId}`);
                        await db.collection('users').doc(currentUser.uid).update({
                            friends: firebase.firestore.FieldValue.arrayRemove(friendId)
                        });
                        console.log(`Removed invalid friend UID: ${friendId} from friends list`);
                    }
                } catch (error) {
                    console.error(`Error loading friend ${friendId}:`, error);
                    showToast(`Failed to load friend with ID ${friendId}.`, 'error');
                }
            }
        }
    } catch (error) {
        console.error('Error loading friends:', error);
        showToast('Failed to load friends. Please try again.', 'error');
    }
}

// Open Add Friend Modal
addFriendBtn.addEventListener('click', () => {
    addFriendModal.style.display = 'flex';
    friendIdInput.value = '';
    addFriendError.style.display = 'none';
});

addFriendBtnEmpty.addEventListener('click', () => {
    addFriendModal.style.display = 'flex';
    friendIdInput.value = '';
    addFriendError.style.display = 'none';
});

// Handle Add Friend
addFriendForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showSpinner(true);

    const friendUniqueId = friendIdInput.value.trim().toLowerCase();

    try {
        const idDoc = await db.collection('uniqueIds').doc(friendUniqueId).get();
        if (!idDoc.exists) {
            addFriendError.textContent = 'No user found with this unique ID.';
            addFriendError.style.display = 'block';
            showSpinner(false);
            return;
        }

        const friendUid = idDoc.data().uid;

        if (friendUid === currentUser.uid) {
            addFriendError.textContent = 'You cannot add yourself as a friend.';
            addFriendError.style.display = 'block';
            showSpinner(false);
            return;
        }

        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (!userDoc.exists) {
            addFriendError.textContent = 'User profile not found.';
            addFriendError.style.display = 'block';
            showSpinner(false);
            return;
        }

        const friends = userDoc.data().friends || [];
        if (friends.includes(friendUid)) {
            addFriendError.textContent = 'This user is already your friend.';
            addFriendError.style.display = 'block';
            showSpinner(false);
            return;
        }

        await db.collection('users').doc(currentUser.uid).update({
            friends: firebase.firestore.FieldValue.arrayUnion(friendUid)
        });

        showToast('Friend added successfully!', 'success');
        addFriendModal.style.display = 'none';
        loadFriends();
    } catch (error) {
        console.error('Error adding friend:', error);
        addFriendError.textContent = error.message || 'Failed to add friend.';
        addFriendError.style.display = 'block';
    }

    showSpinner(false);
});

// Cancel Add Friend
cancelAddFriend.addEventListener('click', () => {
    addFriendModal.style.display = 'none';
    addFriendForm.reset();
    addFriendError.style.display = 'none';
});

// Logout Functionality
logoutBtn.addEventListener('click', () => {
    logoutModal.style.display = 'flex';
});

cancelLogout.addEventListener('click', () => {
    logoutModal.style.display = 'none';
});

confirmLogout.addEventListener('click', async () => {
    try {
        await auth.signOut();
        logoutModal.style.display = 'none';
        showToast('Logged out successfully!', 'success');
        if (messagesListener) messagesListener();
        currentChat = null;
        chatMessages.innerHTML = '';
    } catch (error) {
        console.error('Error logging out:', error);
        showToast('Error logging out.', 'error');
    }
});

// Open Chat
async function openChat(friendUid, friendUniqueId) {
    console.log('Opening chat with friendUid:', friendUid, 'friendUniqueId:', friendUniqueId);
    if (!friendUid || !friendUniqueId || typeof friendUid !== 'string' || friendUid.length === 0) {
        showToast('Invalid friend selected.', 'error');
        console.error('Invalid friend data: friendUid=', friendUid, 'friendUniqueId=', friendUniqueId);
        return;
    }

    currentChat = friendUid;

    defaultChat.style.display = 'none';
    chatHeader.style.display = 'flex';
    chatMessages.style.display = 'flex';
    chatInput.style.display = 'flex';

    chatFriendAvatar.textContent = friendUniqueId[0].toUpperCase();
    chatFriendName.textContent = friendUniqueId;

    document.querySelectorAll('.friend-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.uid === friendUid) {
            item.classList.add('active');
        }
    });

    sidebar.classList.remove('active');

    if (messagesListener) messagesListener();
    loadMessages(friendUid);
}

// Create Chats Document
async function ensureChatDocument(chatId, userUid, friendUid) {
    if (!chatId || !userUid || !friendUid || typeof userUid !== 'string' || typeof friendUid !== 'string') {
        console.error('Invalid parameters for ensureChatDocument:', { chatId, userUid, friendUid });
        throw new Error('Invalid chat or user IDs.');
    }

    try {
        const chatDocRef = db.collection('chats').doc(chatId);
        const chatDoc = await chatDocRef.get();
        if (!chatDoc.exists) {
            const chatData = {
                participants: [userUid, friendUid],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            console.log('Creating chats document for chatId:', chatId, 'with data:', chatData);
            await chatDocRef.set(chatData);
            console.log('Chats document created for chatId:', chatId);
        } else {
            const existingData = chatDoc.data();
            console.log('Chats document exists for chatId:', chatId, 'data:', existingData);
            if (!existingData.participants || !Array.isArray(existingData.participants)) {
                console.warn('Invalid participants field, resetting for chatId:', chatId);
                await chatDocRef.set({
                    participants: [userUid, friendUid],
                    createdAt: existingData.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } else if (!existingData.participants.includes(userUid) || !existingData.participants.includes(friendUid)) {
                console.warn('Updating participants for chatId:', chatId);
                await chatDocRef.update({
                    participants: firebase.firestore.FieldValue.arrayUnion(userUid, friendUid),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
    } catch (error) {
        console.error('Error ensuring chats document for chatId:', chatId, 'error:', error);
        throw error;
    }
}

// Load Messages
async function loadMessages(friendUid) {
    if (!friendUid || !currentUser || !currentUser.uid) {
        console.error('Cannot load messages: Invalid friendUid or currentUser', { friendUid, currentUser });
        showToast('Failed to load messages: Invalid user or friend.', 'error');
        return;
    }

    const chatId = [currentUser.uid, friendUid].sort().join('_');
    console.log('Loading messages for chatId:', chatId, 'userUid:', currentUser.uid);

    try {
        await ensureChatDocument(chatId, currentUser.uid, friendUid);

        messagesListener = db.collection('chats').doc(chatId).collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot(snapshot => {
                console.log('Messages snapshot received:', snapshot.size, 'messages for chatId:', chatId);
                chatMessages.innerHTML = '';
                snapshot.forEach(doc => {
                    const message = doc.data();
                    console.log('Rendering message:', doc.id, message);
                    renderMessage(doc.id, message);
                });
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, error => {
                console.error('Error loading messages for chatId:', chatId, 'error:', error);
                showToast(`Failed to load messages: ${error.message}. Please try again later.`, 'error');
            });
    } catch (error) {
        console.error('Error setting up messages listener for chatId:', chatId, 'error:', error);
        showToast(`Failed to load messages: ${error.message}. Please try again later.`, 'error');
    }
}

// Render Message
function renderMessage(messageId, message) {
    console.log('Rendering message:', messageId, message);
    const div = document.createElement('div');
    div.className = `message ${message.sender === currentUser.uid ? 'sent' : 'received'} ${message.deleted ? 'deleted' : ''}`;
    div.dataset.messageId = messageId;
    div.innerHTML = `
        <div>${message.deleted ? 'Message unsent' : message.text}</div>
        <div class="message-time">${formatTimestamp(message.timestamp)}</div>
    `;

    if (message.sender === currentUser.uid && !message.deleted) {
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            selectedMessageId = messageId;
            showContextMenu(e.pageX, e.pageY);
        });
    }

    chatMessages.appendChild(div);
}

// Format Timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    try {
        const date = timestamp.toDate();
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
        console.error('Error formatting timestamp:', error);
        return '';
    }
}

// Send Message
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChat || !currentUser || !currentUser.uid) {
        showToast('Please select a friend or enter a message.', 'error');
        console.error('Invalid input: text=', text, 'currentChat=', currentChat, 'currentUser=', currentUser);
        return;
    }

    showSpinner(true);
    let chatId = null;

    try {
        chatId = [currentUser.uid, currentChat].sort().join('_');
        if (!/^[a-zA-Z0-9_-]+$/.test(chatId)) {
            throw new Error('Invalid chatId format: ' + chatId);
        }

        const messageData = {
            text: text,
            sender: currentUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            deleted: false
        };
        console.log('Sending message to chatId:', chatId, 'with data:', messageData);

        await ensureChatDocument(chatId, currentUser.uid, currentChat);

        await db.collection('chats').doc(chatId).collection('messages').add(messageData);

        messageInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;
        console.log('Message sent successfully to chatId:', chatId);
    } catch (error) {
        console.error('Error sending message for chatId:', chatId || 'undefined', 'error:', error);
        showToast(`Failed to send message: ${error.message}. Please try again later.`, 'error');
    }

    showSpinner(false);
}

// Show Context Menu
function showContextMenu(x, y) {
    messageContextMenu.style.display = 'block';
    messageContextMenu.style.left = `${x}px`;
    messageContextMenu.style.top = `${y}px`;

    document.addEventListener('click', hideContextMenu, { once: true });
}

// Hide Context Menu
function hideContextMenu() {
    messageContextMenu.style.display = 'none';
    selectedMessageId = null;
}

// Delete Message
deleteMessageBtn.addEventListener('click', async () => {
    if (!selectedMessageId) return;

    showSpinner(true);

    try {
        const chatId = [currentUser.uid, currentChat].sort().join('_');
        await db.collection('chats').doc(chatId).collection('messages').doc(selectedMessageId).update({
            text: 'Message unsent',
            deleted: true
        });
        showToast('Message unsent.', 'success');
    } catch (error) {
        console.error('Error unsending message:', error);
        showToast('Error unsending message: ' + error.message, 'error');
    }

    showSpinner(false);
    hideContextMenu();
});

// Search Friends
searchFriends.addEventListener('input', () => {
    const query = searchFriends.value.toLowerCase();
    document.querySelectorAll('.friend-item').forEach(item => {
        const name = item.querySelector('.friend-name').textContent.toLowerCase();
        item.style.display = name.includes(query) ? 'flex' : 'none';
    });
});

// Mobile Menu Toggle
menuBtn.addEventListener('click', () => {
    sidebar.classList.add('active');
});

backBtn.addEventListener('click', () => {
    sidebar.classList.remove('active');
});

// Send Message Event Listeners
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Show Toast Notification
function showToast(message, type) {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// Show/Hide Spinner
function showSpinner(show) {
    spinner.style.display = show ? 'flex' : 'none';
}
