import { SENHA_DEV } from '@kgb/db/seed'

interface AppTestavel {
  request: (caminho: string, init?: RequestInit) => Response | Promise<Response>
}

/** Faz login pelo Better Auth e devolve o header Bearer usado pelo app do prestador. */
export async function entrar(app: AppTestavel, email: string, senha = SENHA_DEV) {
  const r = await app.request('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
    body: JSON.stringify({ email, password: senha }),
  })
  const token = r.headers.get('set-auth-token')
  if (r.status !== 200 || !token) throw new Error(`Login de ${email} falhou: HTTP ${r.status}`)
  return { Authorization: `Bearer ${token}` }
}
