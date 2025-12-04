'use client'

import { login } from '@/actions/auth';

export default function Signin() {
    return (
        <form action={login}>
            <input type="email" name="email" />
            <input type="password" name="password" />
            <button type="submit">Sign in</button>
        </form>
    );
}