<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from "vue-router";

const router = useRouter()

const username = ref('');
const password = ref('');

const handleSubmit = async () => {
    try {
        const response = await fetch('/api/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username.value,
                password: password.value,
            }),
        });

        if (!response.ok) {
            throw new Error('Login failed');
        }

        const data = await response.json();
        localStorage.setItem('wardrobe-access-token', data.access);
        localStorage.setItem('wardrobe-refresh-token', data.refresh);
        alert('Login successful');
        router.push('/');
    } catch (error) {
        console.error('There was a problem with the login request:', error);
    }
};
</script>

<template>
    <div class="login-container">
            <h2>Login</h2>
            <form @submit.prevent="handleSubmit" method="post">
                <div class="form-group">
                    <label for="username">Username:</label>
                    <input type="text" id="username" v-model="username" required />
                </div>
                <div class="form-group">
                    <label for="password">Password:</label>
                    <input type="password" id="password" v-model="password" required />
                </div>
                <button type="submit">Login</button>
            </form>
        </div>
</template>

<style scoped>
.login-container {
    margin-left: auto;
    margin-right: auto;
    margin-top: 100px;
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    width: 70%;
    max-width: 400px;
    text-align: center;
}

h2 {
    margin-bottom: 20px;
    color: #333;
}

.form-group {
    margin-bottom: 15px;
    text-align: left;
}

label {
    display: block;
    margin-bottom: 5px;
    color: #555;
}

input[type="text"],
input[type="password"] {
    width: 100%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
}

button[type="submit"] {
    width: 100%;
    padding: 10px;
    background-color: #007bff;
    border: none;
    border-radius: 4px;
    color: #fff;
    font-size: 16px;
    cursor: pointer;
}

button[type="submit"]:hover {
    background-color: #0056b3;
}

/* Media Queries for responsive design */
@media (min-width: 768px) {
    .login-container {
        width: 400px;
    }
}
</style>