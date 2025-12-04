import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = [
    '/dashboard',
    '/property',
    '/settings',
    '/admin',
    '/owners',
    '/tenants',
    '/reports'
];

export default function proxy(req: NextRequest, res: NextResponse) {
    // const { pathname } = req.nextUrl;
    // if (protectedRoutes.includes(pathname)) {
    //     const session = req.cookies.get('session');
    //     if (!session) {
    //         return NextResponse.redirect(new URL('/', req.url));
    //     }
    // }
    return NextResponse.next();
}