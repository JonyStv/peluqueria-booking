import NextAuth from "next-auth";
import { authOptions } from "@/auth"; // o la ruta relativa si el alias no funciona

const handler = NextAuth(authOptions);

export const GET = handler;
export const POST = handler;