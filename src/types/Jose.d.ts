declare module 'jose' {
  export const createRemoteJWKSet: any;
  export const jwtVerify: any;
  export interface JWTPayload { [key: string]: any }
}
