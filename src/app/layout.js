import { getServerSession } from "next-auth";
import { authOptions } from "@/auth"; // Importa tus opciones
import Providers from "./providers";
import "./globals.css";

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="es">
      <body>
        <Providers>
        {children}
        </Providers>
      </body>
    </html>
  );
}