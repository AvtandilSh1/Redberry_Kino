const TOKEN_KEY = 'kinoxii.token'

export function readToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function writeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}
