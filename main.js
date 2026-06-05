var app = {
    // 1. Firebase URL-ni bura dəqiq yaz (Mötərizə daxilindəki URL-i özünkü ilə dəyiş)
    fbUrl: "https://kuiptv-ce646-default-rtdb.europe-west1.firebasedatabase.app/",
    sharedLib: null,
    isMenuOpen: false,

    init: function() {
        console.log("App başlatıldı...");

        // Kotlin Shared Modul yoxlanışı
        this.sharedLib = window['kur_iptv-shared'] || window['kur_iptv_shared'];

        // Pult düymələrini dinləmək
        document.addEventListener('keydown', this.handleKeys.bind(this));

        // Giriş yoxlanışı (Avtomatik giriş)
        var savedId = localStorage.getItem("user_id");
        if (savedId) {
            document.getElementById('user-id-input').value = savedId;
            this.checkLogin();
        } else {
            document.getElementById('user-id-input').focus();
        }
    },

    // --- ADMİN MƏKTUBU SİSTEMİ (YENİ ƏLAVƏ EDİLDİ) ---
    setupAdminListener: function(userCode) {
        if (!userCode) return;
        console.log("Məktub dinləyicisi aktiv edildi: " + userCode);

        try {
            // Firebase canlı dinləyicisi
            var msgRef = firebase.database().ref(userCode + '/message');
            
            msgRef.on('value', (snapshot) => {
                var msg = snapshot.val();
                if (msg && msg.trim() !== "") {
                    // Ekranda bildiriş çıxır
                    alert("🔔 ADMİN BİLDİRİŞİ:\n\n" + msg);
                    
                    // Oxunduqdan sonra bazadan silirik (Android-dəki kimi)
                    msgRef.set("");
                }
            });
        } catch (e) {
            console.error("Firebase SDK tapılmadı və ya xəta: ", e);
        }
    },

    // --- LOGIN FUNKSIYASI ---
    checkLogin: async function() {
        var userCodeInput = document.getElementById('user-id-input');
        var statusDiv = document.getElementById('login-status');
        var userCode = userCodeInput.value.trim();

        if (!userCode) {
            statusDiv.innerText = "ID kodunu yazın!";
            return;
        }

        // Firebase REST API formatı (.json mütləqdir)
        var url = this.fbUrl + userCode + ".json";
        statusDiv.innerText = "Yoxlanılır...";

        try {
            const response = await fetch(url);
            const userData = await response.json();

            if (!userData) {
                statusDiv.innerText = "ID tapılmadı!";
                return;
            }

            var today = new Date().toISOString().split('T')[0];
            if (userData.status === "blocked" || (userData.expire_date && userData.expire_date < today)) {
                statusDiv.innerText = "Abunəlik aktiv deyil!";
                return;
            }

            // UĞURLU GİRİŞ: ID-ni saxla və məktubları dinləməyə başla
            localStorage.setItem("user_id", userCode);
            this.setupAdminListener(userCode); 
            
            this.startApp(userData);

        } catch (e) {
            statusDiv.innerText = "Bağlantı xətası!";
        }
    },

    startApp: function(data) {
        document.getElementById('login-fragment').style.display = 'none';
        document.getElementById('splash').style.display = 'flex';

        setTimeout(() => {
            document.getElementById('splash').style.display = 'none';
            const mainUi = document.getElementById('main-ui');
            if(mainUi) mainUi.style.display = 'block';
            this.loadChannels(data.m3u_url);
        }, 2000);
    },

    playVideo: function(url) {
        if (!url) return;
        var videoElement = document.getElementById('tvPlayer');

        if (window.webapis && window.webapis.avplay) {
            try {
                webapis.avplay.open(url);
                webapis.avplay.setDisplayRect(0, 0, 1920, 1080);
                webapis.avplay.prepareAsync(function() {
                    webapis.avplay.play();
                });
            } catch (e) {
                this.fallbackPlayer(url, videoElement);
            }
        } else {
            this.fallbackPlayer(url, videoElement);
        }
    },

    fallbackPlayer: function(url, el) {
        el.src = url;
        el.play().catch(e => console.log("Video xətası"));
    },

    handleKeys: function(e) {
        if (e.keyCode == 10009 || e.keyCode == 461) {
            if (this.isMenuOpen) {
                this.toggleMenu(false);
            } else {
                window.tizen ? tizen.application.getCurrentApplication().exit() : window.close();
            }
            return;
        }

        switch(e.keyCode) {
            case 13: // ENTER
                if (document.activeElement.id === "user-id-input") {
                    this.checkLogin();
                } else if (document.activeElement.classList.contains('channel-card')) {
                    var stream = document.activeElement.getAttribute('data-url');
                    this.playVideo(stream);
                }
                break;
            case 37: // SOL
                this.toggleMenu(true);
                break;
            case 39: // SAĞ
                this.toggleMenu(false);
                break;
        }
    },

    toggleMenu: function(open) {
        this.isMenuOpen = open;
        const menu = document.getElementById('side-menu');
        if (menu) {
            menu.className = open ? "side-menu open" : "side-menu";
            if(open) menu.querySelector('.menu-item')?.focus();
        }
    },

    loadChannels: async function(url) {
        if(!url) return;
        // M3U Fetch və Parse məntiqi...
    }
};

window.onload = function() { app.init(); };
function checkLogin() { app.checkLogin(); }
