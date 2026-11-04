
import { auth } from '../auth/firebase-config.js';

import { onAuthStateChanged }
from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';

// HTML Elements
const form = document.getElementById('give-form');
const message = document.getElementById('form-message');
const submit = document.getElementById('submit-button');

const photoInput = document.getElementById('photos');
const preview = document.getElementById('photo-preview');

const description = document.getElementById('description');
const price = document.getElementById('price');

let currentUser = null;
let previewURLs = [];

// Backend API
const API_URL = 'http://localhost:5000/api/products';

// Authentication Check
onAuthStateChanged(auth, user => {

    currentUser = user;

    if (!user) {

        message.textContent =
            '出品するにはログインしてください。';

        submit.disabled = true;

        setTimeout(() => {
            location.assign(
                'auth/login.html?next=' +
                encodeURIComponent('../give-item.html')
            );
        }, 1200);

    } else {

        submit.disabled = false;
    }

});

// Description Character Counter
description.addEventListener('input', () => {

    document.getElementById('description-count')
        .textContent = description.value.length;

});

// Price Hint
price.addEventListener('input', () => {

    document.getElementById('price-hint').textContent =
        Number(price.value) === 0
            ? '無料で出品します。'
            : `出品価格：¥${Number(price.value || 0).toLocaleString('ja-JP')}`;

});

// Image Preview
photoInput.addEventListener('change', () => {

    previewURLs.forEach(url => URL.revokeObjectURL(url));

    previewURLs = [];

    preview.replaceChildren();

    const files = [...photoInput.files];

    files.forEach(file => {

        if (!file.type.startsWith('image/')) return;

        const url = URL.createObjectURL(file);

        previewURLs.push(url);

        const img = document.createElement('img');

        img.src = url;
        img.alt = '選択した商品写真';

        preview.append(img);

    });

});

// Form Submission
form.addEventListener('submit', async event => {

    event.preventDefault();

    message.classList.remove('success');

    // Check Login
    if (!currentUser) {

        message.textContent = 'ログインしてください。';

        return;
    }

    // HTML Validation
    if (!form.reportValidity()) return;

    const files = [...photoInput.files];

    // Image Count Validation
    if (files.length < 1 || files.length > 5) {

        message.textContent =
            '写真を1〜5枚選択してください。';

        return;
    }

    // Image Type and Size Validation
    if (files.some(file =>
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 5 * 1024 * 1024
    )) {

        message.textContent =
            '写真は JPEG / PNG / WebP、各5MB以下にしてください。';

        return;
    }

    // Price Validation
    const amount = Number(price.value);

    if (
        !Number.isSafeInteger(amount) ||
        amount < 0 ||
        amount > 1000000
    ) {

        message.textContent =
            '価格は0〜1,000,000円の整数で入力してください。';

        return;
    }

    // Disable Submit Button
    submit.disabled = true;

    message.textContent =
        '商品と写真をアップロードしています…';

    try {

        // Create FormData
        const formData = new FormData();

        // User Information
        formData.append('userId', currentUser.uid);

        // Product Information
        formData.append(
            'title',
            form.elements.title.value.trim()
        );

        formData.append(
            'category',
            form.elements.category.value
        );

        formData.append(
            'condition',
            form.elements.condition.value
        );

        formData.append('price', amount);

        formData.append(
            'location',
            form.elements.location.value.trim()
        );

        formData.append(
            'description',
            form.elements.description.value.trim()
        );

        // Add Multiple Images
        files.forEach(file => {
            formData.append('photos', file);
        });

        // Send to Node.js Backend
        const response = await fetch(API_URL, {

            method: 'POST',

            body: formData

        });

        // Read Server Response
        const responseText = await response.text();

        let result;

        try {

            result = JSON.parse(responseText);

        } catch (error) {

            console.error('Invalid Server Response:', responseText);

            throw new Error(
                'サーバーから正しい応答がありません。'
            );
        }

        // Check API Error
        if (!response.ok || !result.success) {

            throw new Error(
                result.message || '商品を保存できませんでした。'
            );
        }

        // Success
        message.classList.add('success');

        message.textContent =
            '出品が完了しました！ マイページに移動します。';

        console.log('Product Saved:', result.product);

        // Clear Form
        form.reset();

        preview.replaceChildren();

        previewURLs.forEach(url => URL.revokeObjectURL(url));

        previewURLs = [];

        document.getElementById('description-count')
            .textContent = '0';

        document.getElementById('price-hint')
            .textContent = '¥0 は「無料」として出品されます。';

        // Redirect
        setTimeout(() => {

            location.assign('auth/profile.html');

        }, 1300);

    } catch (error) {

        console.error('Listing submission failed:', error);

        message.textContent =
            error.message || '保存に失敗しました。';

        submit.disabled = false;

    }

});
