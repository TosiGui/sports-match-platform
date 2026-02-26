export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

export function getAccessTokenExpiration(): number {
  const expiresIn = JWT_CONFIG.expiresIn;
  
  if (expiresIn.endsWith('m')) {
    return parseInt(expiresIn) * 60;
  }
  if (expiresIn.endsWith('h')) {
    return parseInt(expiresIn) * 60 * 60;
  }
  if (expiresIn.endsWith('d')) {
    return parseInt(expiresIn) * 60 * 60 * 24;
  }
  
  return parseInt(expiresIn);
}

export function getRefreshTokenExpiration(): number {
  const expiresIn = JWT_CONFIG.refreshExpiresIn;
  
  if (expiresIn.endsWith('m')) {
    return parseInt(expiresIn) * 60;
  }
  if (expiresIn.endsWith('h')) {
    return parseInt(expiresIn) * 60 * 60;
  }
  if (expiresIn.endsWith('d')) {
    return parseInt(expiresIn) * 60 * 60 * 24;
  }
  
  return parseInt(expiresIn);
}
