// Type declarations for private secrets module
declare module "@private/secrets" {
  export const firebaseConfig: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };

  export const GOOGLE_MAPS_API_KEY: string;

  export const supabaseConfig: {
    projectId: string;
    url: string;
    anonKey: string;
  };

  export const demoCredentials: {
    email: string;
    password: string;
  };
}
