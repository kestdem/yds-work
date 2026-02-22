import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
iimport { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
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

// Kendi Firebase Config bilgilerinizi buraya yapıştırın
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

// OTURUM HATIRLAMAYI KAPAT (Sadece sekme açıkken hatırlar, kapatınca çıkış yapar)
setPersistence(auth, browserSessionPersistence);

// --- GİRİŞ YAPMA FONKSİYONU ---
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Admin onayını kontrol et
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, `users/${user.uid}/isApproved`));
        
        if (snapshot.exists() && snapshot.val() === true) {
            alert("Giriş Başarılı! Sorular Yükleniyor...");
            // Burada questions node'undan soruları çekip quizScreen'i açan fonksiyonu çağırın
            // loadQuestionsFromFirebase();
        } else {
            alert("Hesabınız henüz yönetici tarafından onaylanmamış! Lütfen bekleyin.");
            await signOut(auth); // Onaysızsa anında sistemden at
        }
    } catch (error) {
        alert("Giriş başarısız: Bilgilerinizi kontrol edin.");
    }
}

// --- KAYIT OLMA FONKSİYONU ---
export async function registerUser(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Veritabanına kullanıcıyı ekle ama ONAYSIZ (isApproved: false) olarak
        await set(ref(db, 'users/' + user.uid), {
            email: email,
            isApproved: false // Admin bunu DB üzerinden true yapana kadar giremez
        });
        
        alert("Kayıt başarılı! Ancak sisteme girebilmeniz için Admin onayı gerekmektedir.");
        await signOut(auth); // Kayıt olunca otomatik girmesini engelle
    } catch (error) {
        alert("Kayıt hatası: " + error.message);
    }
}
// Bu satırlar HTML'deki onclick="" kısımlarının fonksiyonları bulmasını sağlar
window.loginBtnClick = loginBtnClick;
window.registerBtnClick = registerBtnClick;
window.logout = logout;

