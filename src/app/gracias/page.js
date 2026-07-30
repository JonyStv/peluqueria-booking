export default function ThanksPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-green-600">¡Reserva confirmada!</h1>
        <p>Hemos recibido tu depósito. Te esperamos en la peluquería.</p>
        <a href="/" className="text-primary underline">Volver al inicio</a>
      </div>
    </main>
  );
}