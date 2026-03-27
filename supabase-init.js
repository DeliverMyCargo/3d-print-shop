// Инициализация Supabase
const SUPABASE_URL = 'https://gdjdbwqprncahbcqjybv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkamRid3Fwcm5jYWhiY3FqeWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NzcyMzIsImV4cCI6MjA5MDE1MzIzMn0.NYDtTZv_UtrBpZZhi-04diaQ7nphhol11TFOWcQL-Ow';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Проверка авторизации
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        document.getElementById('user-email')?.setAttribute('style', 'display:inline; margin-left:1rem; font-size:0.9rem');
        document.getElementById('user-email').textContent = session.user.email;
        document.getElementById('logout-btn').style.display = 'inline-block';
        
        // Сохраняем профиль если его нет
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
        if (!profile) {
            await supabase.from('profiles').insert({
                id: session.user.id,
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name || ''
            });
        }
    }
    
    return session;
}

// Выход
async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

// Добавление в корзину
async function addToCart(modelId) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        alert('Войдите в аккаунт, чтобы добавить в корзину');
        window.location.href = 'profile.html';
        return;
    }
    
    // Проверяем, есть ли уже такой товар в корзине
    const { data: existing } = await supabase
        .from('cart')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('model_id', modelId)
        .single();
        
    if (existing) {
        await supabase
            .from('cart')
            .update({ quantity: existing.quantity + 1 })
            .eq('id', existing.id);
    } else {
        await supabase
            .from('cart')
            .insert({ user_id: session.user.id, model_id: modelId, quantity: 1 });
    }
    
    alert('Добавлено в корзину!');
}

// Загрузка моделей
async function loadModels(containerId, limit = null) {
    let query = supabase.from('models').select('*').order('created_at', { ascending: false });
    
    if (limit) {
        query = query.limit(limit);
    }
    
    const { data: models, error } = await query;
    
    if (error) {
        console.error('Ошибка загрузки моделей:', error);
        return [];
    }
    
    const container = document.getElementById(containerId);
    if (!container) return models;
    
    if (!models || models.length === 0) {
        container.innerHTML = '<div class="loading">Моделей пока нет</div>';
        return [];
    }
    
    container.innerHTML = models.map(model => `
        <div class="model-card">
            <img src="${model.image_url || 'https://via.placeholder.com/300x200?text=3D+Model'}" alt="${model.name}">
            <div class="model-card-content">
                <h3>${model.name}</h3>
                <p>${model.description?.substring(0, 100) || ''}...</p>
                <div class="price">${model.price} ₽</div>
                <button onclick="addToCart(${model.id})">В корзину</button>
            </div>
        </div>
    `).join('');
    
    return models;
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = logout;
    }
});
