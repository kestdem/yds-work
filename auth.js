import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    setPersistence, 
    browserSessionPersistence, 
    signOut 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    get, 
    set,
    child 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCZZ8Sm1zeQX2Da0jdW8-KRse4YdvObLyw",
  authDomain: "yds-work-exam.firebaseapp.com",
  databaseURL: "https://yds-work-exam-default-rtdb.firebaseio.com",
  projectId: "yds-work-exam",
  storageBucket: "yds-work-exam.firebasestorage.app",
  messagingSenderId: "300470113357",
  appId: "1:300470113357:web:4557353b23aeaee9bdb804"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// OTURUM HATIRLAMAYI KAPAT
setPersistence(auth, browserSessionPersistence);

async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, `users/${user.uid}/isApproved`));
        
        if (snapshot.exists() && snapshot.val() === true) {
            alert("Giriş Başarılı! Sorular Yükleniyor...");
            return true;
        } else {
            alert("Hesabınız henüz yönetici tarafından onaylanmamış! Lütfen bekleyin.");
            await signOut(auth); 
            throw new Error("Onaysız hesap.");
        }
    } catch (error) {
        throw new Error("Giriş başarısız: Bilgilerinizi kontrol edin.");
    }
}

async function registerUser(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await set(ref(db, 'users/' + user.uid), {
            email: email,
            isApproved: false 
        });
        
        alert("Kayıt başarılı! Ancak sisteme girebilmeniz için Admin onayı gerekmektedir.");
        await signOut(auth); 
    } catch (error) {
        throw new Error(error.message);
    }
}

async function loginBtnClick() {
    const email = document.getElementById('emailInput').value;
    const pass = document.getElementById('passwordInput').value;
    const errBox = document.getElementById('authError');
    
    if(!email || !pass) {
        errBox.innerText = "Lütfen e-posta ve şifre girin.";
        return;
    }

    errBox.innerText = "Giriş yapılıyor, lütfen bekleyin...";
    
    try {
        await loginUser(email, pass); 
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('menuScreen').style.display = 'flex';
    } catch (error) {
        errBox.innerText = error.message;
    }
}

async function registerBtnClick() {
    const email = document.getElementById('emailInput').value;
    const pass = document.getElementById('passwordInput').value;
    const errBox = document.getElementById('authError');
    
    if(!email || !pass) {
        errBox.innerText = "Lütfen e-posta ve şifre girin.";
        return;
    }

    errBox.innerText = "Kayıt yapılıyor...";
    
    try {
        await registerUser(email, pass);
        errBox.innerText = "Kayıt başarılı! Admin onayından sonra giriş yapabilirsiniz.";
        errBox.style.color = "green";
    } catch (error) {
        errBox.innerText = "Kayıt hatası!";
    }
}

function logout() {
    location.reload(); 
}

// HTML'den bu fonksiyonlara erişebilmek için:
window.loginBtnClick = loginBtnClick;
window.registerBtnClick = registerBtnClick;
window.logout = logout;
