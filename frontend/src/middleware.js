import { NextResponse } from 'next/server';

/**
 * O original respondia 307 para rotas internas sem o cookie `token`
 * (observado em /companies/:id, /indicators/*, /settings…). Reproduzido aqui.
 * O cookie expira em 1h; com "Lembre-me" o refreshToken renova a sessão em "/".
 */
const PROTECTED = ['/companies', '/indicators', '/users', '/settings'];

export function middleware(request) {
  const { pathname } = request.nextUrl;
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !request.cookies.get('token')) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/companies/:path*', '/indicators/:path*', '/users/:path*', '/settings/:path*'] };
