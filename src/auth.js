// src/auth.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL});
const prisma = new PrismaClient({adapter});

export const authOptions = {
    secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = credentials;
        // Verificar contra variables de entorno
        if (
          email === process.env.ADMIN_EMAIL &&
          password === process.env.ADMIN_PASSWORD
        ) {
          // Devolver un objeto usuario (debe existir en la BD o crearse)
          let user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            // Crear usuario administrador en la BD si no existe
            user = await prisma.user.create({
              data: {
                email,
                name: "Administrador",
                emailVerified: new Date(),
              },
            });
          }
          return user;
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // Guardamos el id del usuario en el token al iniciar sesión
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Pasamos el id del token a la sesión
      if (session.user) {
        session.user.id = token.id;
      }
      return session;
    },
  },
};

// Opcional: exporta también auth y signIn/signOut si los usas en cliente
const { auth, signIn, signOut, handlers } = NextAuth(authOptions);

export { auth, signIn, signOut, handlers };